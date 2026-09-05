/* AXIOM — tutor service. The only entry point the UI uses. Owns sessions,
   the live/mock mode, exercises, and the Study→Studio practice bridge. */

import { create } from "zustand";
import type { Lang } from "@/store/ui";
import { useUi } from "@/store/ui";
import type { AiExercise, AiScope, ChatMessage, TutorAction, TutorRequest, TutorProvider } from "./types";
import { TutorUnavailableError } from "./types";
import { HttpTutorProvider, MockTutorProvider, type TutorMode } from "./provider";
import { buildStudyContext, buildStudioContext, buildSystemPrompt } from "./prompts";

export type TutorStatus = "idle" | "thinking" | "response" | "error";

export interface TutorSession {
  messages: ChatMessage[];
  status: TutorStatus;
  lastQuestion?: string;
}

const freshSession = (): TutorSession => ({ messages: [], status: "idle" });

interface TutorState {
  sessions: Record<AiScope, TutorSession>;
  mode: TutorMode;
  exercise: AiExercise | null;
  exerciseFresh: boolean;
  ask: (scope: AiScope, question: string) => Promise<void>;
  retry: (scope: AiScope) => Promise<void>;
  clear: (scope: AiScope) => void;
  setExercise: (e: AiExercise) => void;
  clearExercise: () => void;
  consumeExercise: () => void;
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
  const ctx = scope === "study" ? buildStudyContext() : buildStudioContext(useTutor.getState().exercise);
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
  useTutor.setState({
    sessions: {
      ...useTutor.getState().sessions,
      [scope]: { ...useTutor.getState().sessions[scope], ...patch },
    },
  });
}

/** Convert the "PRACTICE: <title> | <instructions>" instruction into an action. */
function extractActions(reply: string, lang: Lang): { text: string; actions?: TutorAction[] } {
  const m = reply.match(/PRACTICE:\s*([^\n|]+?)\s*\|\s*([^\n]+)/i);
  if (!m) return { text: reply };
  const actions: TutorAction[] = [{ type: "practice", lang, title: m[1].trim(), instructions: m[2].trim() }];
  return { text: reply.replace(/PRACTICE:[\s\S]*$/i, "").trim(), actions };
}

export const useTutor = create<TutorState>()((set, get) => ({
  sessions: { study: freshSession(), studio: freshSession() },
  mode: "unknown",
  exercise: null,
  exerciseFresh: false,

  ask: async (scope, question) => {
    const q = question.trim();
    if (!q || get().sessions[scope].status === "thinking") return;
    const session = get().sessions[scope];
    patchSession(scope, {
      messages: [...session.messages, { role: "user", content: q }],
      lastQuestion: q,
    });
    patchSession(scope, { status: "thinking" });

    const req = buildRequest(scope, q);
    try {
      const provider = await getProvider();
      const res = await provider.chat(req);
      const { text, actions } = extractActions(res.reply, req.lang);
      patchSession(scope, {
        messages: [...useTutor.getState().sessions[scope].messages, { role: "assistant", content: text || res.reply, actions: res.actions ?? actions }],
        status: "response",
      });
    } catch (e) {
      if (e instanceof TutorUnavailableError && get().mode !== "mock") {
        set({ mode: "mock" });
        try {
          const res = await mock.chat(req);
          const { text, actions } = extractActions(res.reply, req.lang);
          patchSession(scope, {
            messages: [...useTutor.getState().sessions[scope].messages, { role: "assistant", content: text || res.reply, actions: res.actions ?? actions }],
            status: "response",
          });
        } catch {
          patchSession(scope, { status: "error" });
        }
      } else {
        patchSession(scope, { status: "error" });
      }
    }
  },

  retry: async (scope) => {
    const last = get().sessions[scope].lastQuestion;
    if (last) await get().ask(scope, last);
  },

  clear: (scope) => set({ sessions: { ...get().sessions, [scope]: freshSession() } }),

  setExercise: (e) => set({ exercise: e, exerciseFresh: true }),

  clearExercise: () => set({ exercise: null, exerciseFresh: false }),

  consumeExercise: () => set({ exerciseFresh: false }),
}));

/** Ties a "Practice in Studio" action to navigation + carries the exercise. */
export function practiceAction(scope: AiScope) {
  const s = useTutor.getState();
  const msgs = s.sessions[scope].messages;
  const action = msgs.length ? msgs[msgs.length - 1]?.actions?.[0] : undefined;
  if (action) {
    s.setExercise({ id: action.title, lang: action.lang, title: action.title, instructions: action.instructions });
  }
  useUi.getState().setView("studio");
}

export const _providers = { http, mock };