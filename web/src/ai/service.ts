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
  AiExercisePayload,
  AiScope,
  ChatMessage,
  TutorRequest,
  TutorProvider,
  TutorChunk,
} from "./types";
import { isDestructive, TutorUnavailableError } from "./types";
import { HttpTutorProvider, MockTutorProvider, type TutorMode } from "./provider";
import { buildStudyContext, buildStudioContext, buildSystemPrompt } from "./prompts";
import {
  executeActions,
  parseActionsBlock,
  parseExerciseBlock,
  parseLessonBlock,
  type ExecResult,
} from "./actions";
import { useGenerated, type GeneratedLesson } from "@/store/generated";

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
}

export interface ActionFlash {
  summary: string;
  ids: string[];
  stamp: number;
}

const freshSession = (): TutorSession => ({ messages: [], status: "idle", pending: null });

interface TutorState {
  sessions: Record<AiScope, TutorSession>;
  mode: TutorMode;
  exercise: AiExercise | null;
  exerciseFresh: boolean;
  lastAction: ActionFlash | null;
  ask: (scope: AiScope, question: string) => Promise<void>;
  retry: (scope: AiScope) => Promise<void>;
  clear: (scope: AiScope) => void;
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

async function getProvider(): Promise<TutorProvider> {
  const mode = useTutor.getState().mode;
  if (mode === "live") return http;
  if (mode === "mock") return mock;
  const reachable = await http.reachable();
  if (reachable) {
    useTutor.setState({ mode: "live" });
    return http;
  }
  useTutor.setState({ mode: "mock" });
  return mock;
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
  const lesson = parseLessonBlock(ex.text);
  return {
    text: lesson.text.trim() || res.reply.trim(),
    actions: res.actions ?? b.actions,
    exercise: res.exercise ?? ex.exercise,
    lesson: lesson.lesson,
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
    look-at-result follow-up for the live provider. Returns the final text. */
async function performActions(scope: AiScope, actions: AiAction[], text: string, providerName: string, lang: Lang): Promise<ChatMessage> {
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
  if (providerName === "axiom-api") {
    try {
      const follow = await http.chat({
        lang,
        messages: [
          { role: "system", content: buildSystemPrompt(buildStudioContext(useTutor.getState().exercise)) },
          { role: "user", content: lastUserQuestion(scope) },
          { role: "assistant", content: text },
          { role: "user", content: `OUTCOME: ${flash.summary}. Now reply to the student describing what just happened on the sheet.` },
        ],
      });
      finalText = stripReBlocks(follow.reply) || text;
    } catch {
      finalText = `${text}\n\n${flash.summary}`;
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

  ask: async (scope, question) => {
    const q = question.trim();
    if (!q || get().sessions[scope].status === "thinking") return;
    const session = get().sessions[scope];
    patchSession(scope, { messages: [...session.messages, { role: "user", content: q }], lastQuestion: q });
    patchSession(scope, { status: "thinking" });

    const req = buildRequest(scope, q);
    let provider: TutorProvider;
    try {
      provider = await getProvider();
    } catch {
      patchSession(scope, { status: "error" });
      return;
    }

    const deliver = async (p: TutorProvider): Promise<void> => {
      if (p.chatStream) {
        try {
          const streamReq = buildRequest(scope, q);
          patchSession(scope, { status: "streaming" });
          pushMessage(scope, { role: "assistant", content: "" });
          let accumulated = "";

          for await (const chunk of p.chatStream(streamReq)) {
            if (chunk.type === "text") {
              accumulated += chunk.delta;
              const msgs = useTutor.getState().sessions[scope].messages;
              const lastIdx = msgs.length - 1;
              patchSession(scope, {
                messages: msgs.map((m, i) => (i === lastIdx ? { ...m, content: accumulated } : m)),
              });
            } else if (chunk.type === "done") {
              break;
            }
          }

          const merged = mergeResult({ reply: accumulated });
          const { actions, exercise, lesson } = merged;

          if (lesson) {
            const id = `gen-${Date.now().toString(36)}`;
            useGenerated.getState().addLesson({
              id,
              courseTag: lesson.courseTag,
              title: lesson.title,
              duration: lesson.duration,
              level: lesson.level,
              body: lesson.body,
              quiz: lesson.quiz,
              createdAt: new Date().toISOString(),
            });
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
            const msg = await performActions(scope, actions, accumulated, p.name, req.lang);
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
          return;
        } catch {
          /* streaming failed, fall through to non-streaming */
        }
      }

      const res = await p.chat(req);
      const { text, actions, exercise, lesson } = mergeResult(res);

      if (lesson) {
        const id = `gen-${Date.now().toString(36)}`;
        const generated: GeneratedLesson = {
          id,
          courseTag: lesson.courseTag,
          title: lesson.title,
          duration: lesson.duration,
          level: lesson.level,
          body: lesson.body,
          quiz: lesson.quiz,
          createdAt: new Date().toISOString(),
        };
        useGenerated.getState().addLesson(generated);
        pushMessage(scope, {
          role: "assistant",
          content: `${text}\n\n✓ Lesson "${lesson.title.en}" added to courses. Refresh the Study page to see it.`,
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
        const msg = await performActions(scope, actions, text, p.name, req.lang);
        pushMessage(scope, msg);
        patchSession(scope, { status: "response" });
        return;
      }
      pushMessage(scope, exercise ? { role: "assistant", content: text, exercise } : { role: "assistant", content: text });
      patchSession(scope, { status: "response" });
    };

    try {
      await deliver(provider);
    } catch (e) {
      if (e instanceof TutorUnavailableError && get().mode !== "mock") {
        set({ mode: "mock" });
        try {
          await deliver(mock);
          return;
        } catch {
          patchSession(scope, { status: "error" });
          return;
        }
      }
      patchSession(scope, { status: "error" });
    }
  },

  retry: async (scope) => {
    const last = get().sessions[scope].lastQuestion;
    if (last) await get().ask(scope, last);
  },

  clear: (scope) => set({ sessions: { ...get().sessions, [scope]: freshSession() } }),

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