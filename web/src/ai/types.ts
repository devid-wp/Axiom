/* AXIOM — AI tutor types. The provider boundary lives here so the UI only ever
   talks to TutorProvider; which provider handles a request is decided upstream. */

import type { Lang } from "@/store/ui";

export type AiScope = "study" | "studio";

export interface AiExercise {
  id: string;
  lang: Lang;
  title: string;
  instructions: string;
}

export interface TutorAction {
  type: "practice";
  lang: Lang;
  title: string;
  instructions: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  actions?: TutorAction[];
}

export interface TutorChatMsg {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface TutorRequest {
  messages: TutorChatMsg[];
  lang: Lang;
}

export interface TutorResult {
  reply: string;
  actions?: TutorAction[];
}

/** Provider boundary — replaceable. Implementations must not assume a UI. */
export interface TutorProvider {
  name: string;
  chat(req: TutorRequest): Promise<TutorResult>;
}

/** Raised when the provider is not configured/reachable (falls back to Mock). */
export class TutorUnavailableError extends Error {
  constructor(msg = "tutor unavailable") {
    super(msg);
    this.name = "TutorUnavailableError";
  }
}

/* --- Minimal, intentional context payloads (never dump app state) --- */

export interface SelectedElInfo {
  id: string;
  kind: string;
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
  material: string;
}

export interface StudyContext {
  scope: "study";
  lang: Lang;
  courseId: string;
  courseName: string;
  lessonNum: number;
  lessonId: string;
  lessonTitle: string;
  level: string;
  duration: string;
  body: string[];
  quiz?: { q: string; opts: string[]; correct: number };
  lessonCompleted: boolean;
  done: number;
  total: number;
}

export interface StudioContext {
  scope: "studio";
  lang: Lang;
  projectName: string;
  elementCount: number;
  counts: Record<string, number>;
  selected: SelectedElInfo | null;
  exercise: AiExercise | null;
}

export type TutorContext = StudyContext | StudioContext;