/* AXIOM — tutor service. The only entry point the UI uses. Owns sessions,
   the live/mock mode, exercises, structured-action execution (with
   confirmation for destructive ones), and the look-at-result follow-up. */

import { create } from "zustand";
import type { Lang } from "@/store/ui";
import { useUi } from "@/store/ui";
import { STR } from "@/i18n";
import type {
  AiAction,
  AiExercise,
  AiScope,
  ChatMessage,
  TutorRequest,
  TutorProvider,
} from "./types";
import {
  isDestructive,
  signalTimedOut,
  toAiErrorKind,
  TutorCancelledError,
  TutorInvalidResponseError,
  TutorTimeoutError,
  TutorUnavailableError,
  type AiErrorKind,
  type AiExercisePayload,
  type TutorRequestOptions,
} from "./types";
import { HttpTutorProvider, MockTutorProvider, selectAiProvider, type TutorMode } from "./provider";
import { buildStudyContext, buildStudioContext, buildSystemPrompt } from "./prompts";
import {
  executeActions,
  parseCoursePayload,
  parseActionsBlock,
  parseExerciseBlock,
  parseLessonBlock,
  type ExecResult,
} from "./actions";
import { persistCourseAsCourse, persistLessonAsCourse, normalizeGeneratedCourse } from "@/store/generated";

export type TutorStatus = "idle" | "thinking" | "streaming" | "response" | "error";

export interface AiPending {
  actions: AiAction[];
  note: string;
}

export interface TutorSession {
  messages: ChatMessage[];
  status: TutorStatus;
  lastQuestion?: string;
  pending: AiPending | null;
  /** Why the last request failed (null when idle/successful). Lets callers
      distinguish timeout vs cancellation vs network vs provider vs invalid. */
  errorKind: AiErrorKind | null;
}

/** Per-ask controls (Commit #9). `timeoutMs` bounds the whole request;
    `signal` lets an outer owner cancel it. Both are optional. */
export interface AiAskOptions {
  timeoutMs?: number;
  signal?: AbortSignal;
}

/** Hard deadline for one ask() (service owns it; the provider only sees the
    resulting AbortSignal). Exported for tests. */
export const DEFAULT_AI_TIMEOUT_MS = 30_000;
/** Deadline for the look-at-result follow-up (best-effort, never blocks). */
export const FOLLOWUP_TIMEOUT_MS = 15_000;
/** Deadline for the live-probe inside getProvider. */
export const REACHABLE_TIMEOUT_MS = 5_000;

export interface ActionFlash {
  summary: string;
  ids: string[];
  stamp: number;
}

const freshSession = (): TutorSession => ({ messages: [], status: "idle", pending: null, errorKind: null });

/* --------------------------------------- in-flight request identity --- */
/* Commit #9: one AbortController + one monotonically increasing id per scope.
   Every patch first checks isCurrent(id); late/stale completions are dropped
   so they can never clobber a newer request or resurrect loading state. */
const controllers: Record<AiScope, AbortController | null> = { study: null, studio: null };
const activeSeq: Record<AiScope, number> = { study: 0, studio: 0 };

function timeoutAbortReason(): unknown {
  try {
    return new DOMException("timeout", "TimeoutError");
  } catch {
    const e = new Error("timeout");
    (e as { name: string }).name = "TimeoutError";
    return e;
  }
}

function linkExternalSignal(ctrl: AbortController, ext?: AbortSignal | null): void {
  if (!ext) return;
  if (ext.aborted) {
    try {
      ctrl.abort((ext as { reason?: unknown }).reason ?? new DOMException("aborted", "AbortError"));
    } catch {
      ctrl.abort();
    }
    return;
  }
  ext.addEventListener(
    "abort",
    () => {
      try {
        ctrl.abort((ext as { reason?: unknown }).reason ?? new DOMException("aborted", "AbortError"));
      } catch {
        ctrl.abort();
      }
    },
    { once: true }
  );
}

interface TutorState {
  sessions: Record<AiScope, TutorSession>;
  mode: TutorMode;
  exercise: AiExercise | null;
  exerciseFresh: boolean;
  lastAction: ActionFlash | null;
  ask: (scope: AiScope, question: string, opts?: AiAskOptions) => Promise<void>;
  retry: (scope: AiScope) => Promise<void>;
  clear: (scope: AiScope) => void;
  /** Abort the in-flight ask() for this scope, if any. Loading always
      clears; the user's question is kept so they can retry. */
  cancel: (scope: AiScope) => void;
  confirmPending: (scope: AiScope) => Promise<void>;
  cancelPending: (scope: AiScope) => void;
  setExercise: (e: AiExercise) => void;
  clearExercise: () => void;
  consumeExercise: () => void;
  setFlash: (flash: ActionFlash) => void;
  clearFlash: (stamp: number) => void;
}

const http = new HttpTutorProvider();
const mock = new MockTutorProvider();

async function getProvider(signal?: AbortSignal): Promise<TutorProvider> {
  const mode = useTutor.getState().mode;
  if (mode === "live") return http;
  if (mode === "mock") return mock;
  const reachable = await http.reachable({ signal, timeoutMs: REACHABLE_TIMEOUT_MS });
  if (signal?.aborted) {
    if (signalTimedOut(signal)) throw new TutorTimeoutError();
    throw new TutorCancelledError();
  }
  const selection = selectAiProvider(mode, reachable);
  useTutor.setState({ mode: selection.provider === "axiom-api" ? "live" : "mock" });
  return selection.provider === "axiom-api" ? http : mock;
}

function buildRequest(scope: AiScope, question: string): TutorRequest {
  const lang = useUi.getState().lang;
  const exercise = useTutor.getState().exercise;
  const base = scope === "study" ? buildStudyContext() : buildStudioContext(exercise);
  const ctx = scope === "study" && exercise ? { ...base, exercise } : base;
  const history = useTutor.getState().sessions[scope].messages
    .slice(-10)
    .filter((m) => m.content.trim().length > 0)
    .map((m) => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.content }));
  return {
    messages: [
      { role: "system", content: buildSystemPrompt(ctx) },
      ...(history as TutorRequest["messages"]),
      { role: "user", content: question },
    ],
    lang,
  };
}

function patchSession(scope: AiScope, patch: Partial<TutorSession>) {
  useTutor.setState((s) => ({
    sessions: { ...s.sessions, [scope]: { ...s.sessions[scope], ...patch } },
  }));
}

/** Merge structured actions/exercise from the provider with embedded reply
    blocks (live models emit blocks; mock returns structured fields). */
function mergeResult(res: { reply: string; actions?: AiAction[]; exercise?: AiExercisePayload }) {
  const b = parseActionsBlock(res.reply);
  const ex = parseExerciseBlock(b.text);
  const course = parseCoursePayload(ex.text);
  const lesson = course.course ? { text: course.text } : parseLessonBlock(ex.text);
  return {
    text: lesson.text.trim() || res.reply.trim(),
    actions: res.actions ?? b.actions,
    exercise: res.exercise ?? ex.exercise,
    lesson: "lesson" in lesson ? lesson.lesson : undefined,
    course: course.course,
  };
}

function stripReBlocks(text: string): string {
  const a = parseActionsBlock(text);
  const e = parseExerciseBlock(a.text);
  return e.text.trim();
}

function kindLabel(lang: Lang, kind: string): string {
  return STR[lang][`aiKind${kind[0].toUpperCase()}${kind.slice(1)}`] ?? kind;
}

export function summaryFor(res: ExecResult, lang: Lang): string {
  const created: Record<string, number> = {};
  for (const e of res.created) created[e.kind] = (created[e.kind] ?? 0) + 1;
  const parts = Object.entries(created).map(([k, n]) => `${n} × ${kindLabel(lang, k)}`);
  if (res.cleared) return STR[lang].aiCleared;
  if (parts.length) return `${STR[lang].aiCreated} — ${parts.join(", ")}`;
  if (res.skipped === 0 && res.changed) return STR[lang].aiUpdated;
  return "";
}

function flashFor(res: ExecResult, lang: Lang, msg?: string): ActionFlash {
  return {
    summary: summaryFor(res, lang) || msg || STR[lang].aiUpdated,
    ids: res.changedIds,
    stamp: Date.now(),
  };
}

/** Execute a batch; on success flash the affected objects and run the bounded
    look-at-result follow-up for the live provider. Returns the final text.
    `signal` (Commit #9) skips the follow-up when the request was cancelled
    and bounds it with FOLLOWUP_TIMEOUT_MS so it can never hang the ask. */
async function performActions(scope: AiScope, actions: AiAction[], text: string, providerName: string, lang: Lang, signal?: AbortSignal): Promise<ChatMessage> {
  const res = executeActions(actions);
  if (!res.changed) {
    return {
      role: "assistant",
      content: res.skipped > 0 ? `${text}\n\n${STR[lang].aiNoTarget}` : text,
    };
  }

  const flash = flashFor(res, lang);
  useTutor.getState().setFlash(flash);

  let finalText = text;
  if (providerName === "axiom-api" && !signal?.aborted) {
    const followCtrl = new AbortController();
    // Best-effort follow-up: bounded, never hangs the ask.
    const followTimer = setTimeout(() => {
      try {
        followCtrl.abort();
      } catch {
        /* ignore */
      }
    }, FOLLOWUP_TIMEOUT_MS);
    if (signal) {
      signal.addEventListener(
        "abort",
        () => {
          try {
            followCtrl.abort();
          } catch {
            /* ignore */
          }
        },
        { once: true }
      );
    }
    try {
      const follow = await http.chat(
        {
          lang,
          messages: [
            { role: "system", content: buildSystemPrompt(buildStudioContext(useTutor.getState().exercise)) },
            { role: "user", content: lastUserQuestion(scope) },
            { role: "assistant", content: text },
            { role: "user", content: `OUTCOME: ${flash.summary}. Now reply to the student describing what just happened on the sheet.` },
          ],
        },
        { signal: followCtrl.signal }
      );
      finalText = stripReBlocks(follow.reply) || text;
    } catch {
      finalText = `${text}\n\n${flash.summary}`;
    } finally {
      clearTimeout(followTimer);
    }
  } else {
    finalText = `${text}\n\n${flash.summary}`;
  }

  return {
    role: "assistant",
    content: finalText,
    actions: [{ summary: flash.summary, undoable: true }],
  };
}

function lastUserQuestion(scope: AiScope): string {
  const msgs = useTutor.getState().sessions[scope].messages;
  return [...msgs].reverse().find((m) => m.role === "user")?.content ?? "";
}

function pushMessage(scope: AiScope, msg: ChatMessage) {
  patchSession(scope, { messages: [...useTutor.getState().sessions[scope].messages, msg] });
}

export const useTutor = create<TutorState>()((set, get) => ({
  sessions: { study: freshSession(), studio: freshSession() },
  mode: "unknown",
  exercise: null,
  exerciseFresh: false,
  lastAction: null,

  ask: async (scope, question, askOpts) => {
    const q = question.trim();
    // One in-flight request per scope: overlapping asks interleave their
    // message patches and the later one is contextualized from stale state.
    const busy = get().sessions[scope].status === "thinking" || get().sessions[scope].status === "streaming";
    if (!q || busy) return;

    /* Request identity (Commit #9): one id + one AbortController per ask.
       Every state patch below applies only while this id is current; late
       completions from a cancelled/superseded request are dropped. */
    const id = activeSeq[scope] + 1;
    activeSeq[scope] = id;
    const ctrl = new AbortController();
    controllers[scope] = ctrl;
    linkExternalSignal(ctrl, askOpts?.signal);
    const timeoutMs = askOpts?.timeoutMs ?? DEFAULT_AI_TIMEOUT_MS;
    let timer: ReturnType<typeof setTimeout> | null = null;
    // Not unref'd: an in-flight ask must keep the loop alive until it
    // settles; release() clears this timer on every settle path.
    if (timeoutMs > 0 && Number.isFinite(timeoutMs)) {
      timer = setTimeout(() => {
        try {
          ctrl.abort(timeoutAbortReason() as DOMException);
        } catch {
          ctrl.abort();
        }
      }, timeoutMs);
    }
    const signal = ctrl.signal;
    const reqOpts: TutorRequestOptions = { signal };
    const isCurrent = () => activeSeq[scope] === id && controllers[scope] === ctrl;
    const release = () => {
      if (timer) clearTimeout(timer);
      if (controllers[scope] === ctrl) controllers[scope] = null;
    };
    const dropPlaceholderIfEmpty = (idx: number) => {
      const msgs = useTutor.getState().sessions[scope].messages;
      const m = msgs[idx];
      if (m && m.role === "assistant" && m.content === "" && !m.actions && !m.exercise && !m.pending) {
        patchSession(scope, { messages: msgs.filter((_, i) => i !== idx) });
      }
    };
    const abortedError = (): Error =>
      signalTimedOut(signal) ? new TutorTimeoutError() : new TutorCancelledError("stale");

    /* Classify any failure exactly once. Deadline expiry is an error
       (retryable timeout); explicit cancellation goes idle so the user can
       simply ask again. Loading always clears via the caller's patch. */
    const classify = (e: unknown): { status: TutorStatus; errorKind: AiErrorKind } => {
      if (signalTimedOut(signal) || e instanceof TutorTimeoutError) return { status: "error", errorKind: "timeout" };
      if (signal.aborted || e instanceof TutorCancelledError) return { status: "idle", errorKind: "cancelled" };
      return { status: "error", errorKind: toAiErrorKind(e) };
    };

    const session = get().sessions[scope];
    patchSession(scope, { messages: [...session.messages, { role: "user", content: q }], lastQuestion: q, errorKind: null });
    patchSession(scope, { status: "thinking" });

    const req = buildRequest(scope, q);
    let provider: TutorProvider;
    try {
      provider = await getProvider(signal);
    } catch (e) {
      // Probe failed or was aborted: never leave loading behind, and never
      // let a stale probe touch a newer request.
      if (!isCurrent()) {
        release();
        return;
      }
      release();
      patchSession(scope, classify(e));
      return;
    }

    /* Persist exactly once, only for a current, non-aborted completion.
       Malformed payloads never reach the stores: the persist helpers
       validate strictly and no-op on anything invalid. */
    const persistOnce = (
      lesson: Parameters<typeof persistLessonAsCourse>[0] | undefined,
      course: Parameters<typeof persistCourseAsCourse>[0] | undefined
    ) => {
      if (!isCurrent() || signal.aborted) return;
      try {
        if (course) persistCourseAsCourse(course);
        else if (lesson) persistLessonAsCourse(lesson);
      } catch {
        /* persistence is best-effort; the chat answer still stands */
      }
    };

    /* Single exit for failures: clears loading in every case and records
       the exact error kind (timeout vs cancelled vs network vs
       provider vs invalid). */
    const fail = (e: unknown, placeholderIdx: number | null) => {
      if (!isCurrent()) return;
      release();
      if (placeholderIdx !== null) dropPlaceholderIfEmpty(placeholderIdx);
      patchSession(scope, classify(e));
    };

    const deliverChat = async (p: TutorProvider): Promise<void> => {
      const res = await p.chat(req, reqOpts);
      if (!isCurrent()) throw new TutorCancelledError("stale");
      if (signal.aborted) throw abortedError();
      const { text, actions, exercise, lesson, course } = mergeResult(res);

      if (course) {
        // Strict gate: malformed courses never reach persistence and never
        // get a false "saved" claim — they surface as invalid responses.
        if (!normalizeGeneratedCourse(course, true)) {
          throw new TutorInvalidResponseError("invalid course payload");
        }
        persistOnce(undefined, course);
        if (!isCurrent()) throw new TutorCancelledError("stale");
        pushMessage(scope, {
          role: "assistant",
          content: `${text || "Course generated."}\n\n✓ Course saved to your generated courses.`,
        });
        patchSession(scope, { status: "response" });
        return;
      }

      if (lesson) {
        persistOnce(lesson, undefined);
        if (!isCurrent()) throw new TutorCancelledError("stale");
        pushMessage(scope, {
          role: "assistant",
          content: `${text}\n\n✓ Lesson "${lesson.title.en}" saved as a generated course.`,
        });
        patchSession(scope, { status: "response" });
        return;
      }

      if (actions.length > 0 && actions.some(isDestructive)) {
        patchSession(scope, { pending: { actions, note: text }, status: "response" });
        pushMessage(scope, { role: "assistant", content: text, pending: true });
        return;
      }
      if (actions.length > 0) {
        const msg = await performActions(scope, actions, text, p.name, req.lang, signal);
        if (!isCurrent()) throw new TutorCancelledError("stale");
        pushMessage(scope, msg);
        patchSession(scope, { status: "response" });
        return;
      }
      pushMessage(scope, exercise ? { role: "assistant", content: text, exercise } : { role: "assistant", content: text });
      patchSession(scope, { status: "response" });
    };

    const deliverStream = async (p: TutorProvider): Promise<void> => {
      const streamReq = buildRequest(scope, q);
      patchSession(scope, { status: "streaming" });
      pushMessage(scope, { role: "assistant", content: "" });
      const placeholderIdx = useTutor.getState().sessions[scope].messages.length - 1;
      let accumulated = "";
      let gotText = false;
      let done = false;
      let streamActions: AiAction[] = [];
      let streamExercise: AiExercisePayload | undefined;
      try {
        for await (const chunk of p.chatStream!(streamReq, reqOpts)) {
          if (!isCurrent()) throw new TutorCancelledError("stale");
          if (signal.aborted) throw abortedError();
          if (chunk.type === "text") {
            gotText = true;
            accumulated += chunk.delta;
            const msgs = useTutor.getState().sessions[scope].messages;
            const lastIdx = msgs.length - 1;
            patchSession(scope, {
              messages: msgs.map((m, i) => (i === lastIdx ? { ...m, content: accumulated } : m)),
            });
          } else if (chunk.type === "actions") {
            streamActions = chunk.actions;
          } else if (chunk.type === "exercise") {
            streamExercise = chunk.exercise;
          } else if (chunk.type === "done") {
            done = true;
            break;
          }
        }
      } catch (e) {
        if (!isCurrent()) throw new TutorCancelledError("stale");
        // A stream that already delivered content must NOT fall back to a
        // second generation request: that would generate twice, apply
        // actions twice, and persist twice. Surface the failure instead.
        if (gotText || done) throw e;
        // Nothing arrived yet, so no generation happened: exactly one
        // non-streaming attempt. A fallback, not a duplicate.
        dropPlaceholderIfEmpty(placeholderIdx);
        return await deliverChat(p);
      }
      if (!isCurrent()) throw new TutorCancelledError("stale");
      if (signal.aborted) throw abortedError();

      // Structured payloads arrive as stream chunks (mock) or embedded
      // blocks (live) — either way, a single generation, no second chat().
      const merged = mergeResult({
        reply: accumulated,
        actions: streamActions.length > 0 ? streamActions : undefined,
        exercise: streamExercise,
      });
      const { actions, exercise, lesson, course } = merged;

      if (course) persistOnce(undefined, course);
      else if (lesson) persistOnce(lesson, undefined);

      if (!isCurrent()) throw new TutorCancelledError("stale");
      if (signal.aborted) throw abortedError();

      // An empty completed stream with no payload is an invalid response,
      // not a silent success.
      if (!accumulated.trim() && actions.length === 0 && !exercise && !lesson && !course) {
        dropPlaceholderIfEmpty(placeholderIdx);
        throw new TutorInvalidResponseError("empty stream result");
      }

      const msgs = useTutor.getState().sessions[scope].messages;
      const lastIdx = msgs.length - 1;

      if (actions.length > 0 && actions.some(isDestructive)) {
        patchSession(scope, {
          messages: msgs.map((m, i) => (i === lastIdx ? { ...m, pending: true } : m)),
          pending: { actions, note: accumulated },
          status: "response",
        });
        return;
      }
      if (actions.length > 0) {
        const msg = await performActions(scope, actions, accumulated, p.name, req.lang, signal);
        if (!isCurrent()) throw new TutorCancelledError("stale");
        patchSession(scope, {
          messages: [...msgs.slice(0, lastIdx), msg],
          status: "response",
        });
        return;
      }
      patchSession(scope, {
        messages: msgs.map((m, i) =>
          i === lastIdx ? { ...m, content: accumulated, exercise: exercise ?? undefined } : m
        ),
        status: "response",
      });
    };

    const deliver = async (p: TutorProvider): Promise<void> => {
      if (p.chatStream) return await deliverStream(p);
      return await deliverChat(p);
    };

    try {
      await deliver(provider);
      if (!isCurrent()) {
        release();
        return;
      }
      release();
    } catch (e) {
      if (!isCurrent()) {
        release();
        return;
      }
      if (e instanceof TutorUnavailableError && get().mode !== "mock") {
        // Offline fallback (preserved): only for unconfigured/unreachable,
        // never for timeout/cancel/provider/invalid — those must surface.
        set({ mode: "mock" });
        try {
          await deliver(mock);
          if (!isCurrent()) {
            release();
            return;
          }
          release();
          return;
        } catch (e2) {
          if (!isCurrent()) {
            release();
            return;
          }
          release();
          // The fallback ran under the same signal/identity: classify it.
          patchSession(scope, classify(e2));
          return;
        }
      }
      const tail = useTutor.getState().sessions[scope].messages.length - 1;
      fail(e, provider.chatStream ? tail : null);
    }
  },

  retry: async (scope) => {
    const last = get().sessions[scope].lastQuestion;
    if (last) await get().ask(scope, last);
  },

  clear: (scope) => {
    // Invalidate any in-flight ask so its late completion is dropped, then
    // abort it and reset the session. Loading can never survive a clear.
    activeSeq[scope] += 1;
    const c = controllers[scope];
    controllers[scope] = null;
    if (c) {
      try {
        c.abort();
      } catch {
        /* ignore */
      }
    }
    set({ sessions: { ...get().sessions, [scope]: freshSession() } });
  },

  cancel: (scope) => {
    const c = controllers[scope];
    if (!c) return;
    const s = get().sessions[scope].status;
    if (s !== "thinking" && s !== "streaming") return;
    try {
      c.abort();
    } catch {
      /* the ask's catch still settles the session */
    }
  },

  confirmPending: async (scope) => {
    const pending = get().sessions[scope].pending;
    if (!pending) return;
    patchSession(scope, { pending: null, status: "thinking" });
    const msg = await performActions(scope, pending.actions, `${pending.note}\n\n${STR[useUi.getState().lang].aiApplied}`, "mock-ui", useUi.getState().lang);
    pushMessage(scope, msg);
    patchSession(scope, { status: "response" });
  },

  cancelPending: (scope) => {
    if (!get().sessions[scope].pending) return;
    patchSession(scope, { pending: null });
    pushMessage(scope, { role: "assistant", content: STR[useUi.getState().lang].aiCancelled });
    patchSession(scope, { status: "response" });
  },

  setExercise: (e) => {
    set({ exercise: e, exerciseFresh: true });
    useUi.getState().setView("studio");
  },

  clearExercise: () => set({ exercise: null, exerciseFresh: false }),
  consumeExercise: () => set({ exerciseFresh: false }),

  setFlash: (flash) => {
    set({ lastAction: flash });
    window.setTimeout(() => get().clearFlash(flash.stamp), 4000);
  },
  clearFlash: (stamp) => {
    const cur = get().lastAction;
    if (cur && cur.stamp === stamp) set({ lastAction: null });
  },
}));

/** Start the exercise carried by an assistant message (from card button). */
export function startExerciseFromMessage(scope: AiScope, payload: AiExercisePayload): void {
  const lang = useUi.getState().lang;
  const id = `ex-${Date.now().toString(36)}`;
  useTutor.getState().setExercise({
    id,
    lang,
    title: payload.title,
    instructions: payload.task,
  });
  void scope;
}

/** Compatibility alias kept for older imports (Practice-in-Studio). */
export function practiceAction(scope: AiScope): void {
  const s = useTutor.getState();
  const msgs = s.sessions[scope].messages;
  const offer = msgs.length ? msgs[msgs.length - 1]?.exercise : undefined;
  if (offer) startExerciseFromMessage(scope, offer);
  else useUi.getState().setView("studio");
}

export const _providers = { http, mock };
