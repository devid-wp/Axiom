/* AXIOM — AI tutor types. The provider boundary lives here so the UI only ever
   talks to TutorProvider; which provider handles a request is decided upstream. */

import type { Lang } from "@/store/ui";
import type { ElementKind, Material } from "@/studio/types";

export type AiScope = "study" | "studio";

/* ------------------------------------------------------------------ UI ---- */

export interface AiExercise {
  id: string;
  lang: Lang;
  title: string;
  instructions: string;
}

/** Structured exercise the tutor can offer (TITLE / OBJECTIVE / TASK / HINT). */
export interface AiExercisePayload {
  title: string;
  objective: string;
  task: string;
  hint?: string;
}

/** One executed AXIOM action batch, shown as a chip on an assistant message. */
export interface UiActionInfo {
  summary: string;
  undoable: boolean;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  actions?: UiActionInfo[];
  exercise?: AiExercisePayload;
  pending?: boolean;
}

/* --------------------------------------------------------- action layer --- */
/* The only way the model can affect Studio. The executor (ai/actions.ts)
   validates these and applies them through the existing store/history. */

export type AiActionKind =
  | "create_element"
  | "delete_element"
  | "move_element"
  | "resize_element"
  | "rotate_element"
  | "set_material"
  | "duplicate_element"
  | "select_element"
  | "enter_element"
  | "clear_selection"
  | "clear_project";

/** How an action finds its target element without knowing opaque ids. */
export interface AiTarget {
  /** matches the element with this id (rarely available to the model) */
  id?: string;
  /** the most recently added element of this kind */
  kind?: ElementKind;
  /** the most recently added element overall */
  last?: boolean;
  /** the currently selected element */
  selected?: boolean;
  /** the parent of the current editing context (for navigating up) */
  up?: boolean;
}

export interface AiCreateElement {
  kind: "create_element";
  elementType: ElementKind;
  material?: Material;
  x?: number;
  y?: number;
  w?: number;
  h?: number;
  /**
   * Where to create: "current" (default) = inside the user's current editing
   * context, or an element id to create inside that element. The containment
   * rules are enforced at execution — illegal placements are skipped safely.
   */
  parent?: string;
}
export interface AiDeleteElement {
  kind: "delete_element";
  target?: AiTarget;
}
export interface AiMoveElement {
  kind: "move_element";
  target?: AiTarget;
  dx?: number;
  dy?: number;
}
export interface AiResizeElement {
  kind: "resize_element";
  target?: AiTarget;
  w?: number;
  h?: number;
}
export interface AiRotateElement {
  kind: "rotate_element";
  target?: AiTarget;
  /** degrees to rotate clockwise (negative = counter-clockwise) */
  degrees?: number;
}
export interface AiSetMaterial {
  kind: "set_material";
  target?: AiTarget;
  material: Material;
}
export interface AiDuplicateElement {
  kind: "duplicate_element";
  target?: AiTarget;
  dx?: number;
  dy?: number;
}
export interface AiSelectElement {
  kind: "select_element";
  target?: AiTarget;
}
export interface AiEnterElement {
  /** Open a container (building/floor/room/…) so it becomes the editing context. */
  kind: "enter_element";
  target?: AiTarget;
}
export interface AiClearSelection {
  kind: "clear_selection";
}
export interface AiClearProject {
  kind: "clear_project";
}

export type AiAction =
  | AiCreateElement
  | AiDeleteElement
  | AiMoveElement
  | AiResizeElement
  | AiRotateElement
  | AiSetMaterial
  | AiDuplicateElement
  | AiSelectElement
  | AiEnterElement
  | AiClearSelection
  | AiClearProject;

const DESTRUCTIVE: ReadonlySet<AiActionKind> = new Set(["delete_element", "clear_project"]);

export function isDestructive(action: AiAction): boolean {
  return DESTRUCTIVE.has(action.kind);
}

/* ------------------------------------------------------------- provider --- */

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
  /** structured AXIOM actions the model proposeed (validated before use) */
  actions?: AiAction[];
  /** structured exercise offer (TITLE/OBJECTIVE/TASK/HINT) */
  exercise?: AiExercisePayload;
}

/** Provider boundary — replaceable. Implementations must not assume a UI. */
export interface TutorProvider {
  name: string;
  chat(req: TutorRequest): Promise<TutorResult>;
  chatStream?(req: TutorRequest): AsyncGenerator<TutorChunk>;
}

export type TutorChunk =
  | { type: "text"; delta: string }
  | { type: "done" };

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
  kind: ElementKind;
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
  material: Material;
  parentId: string | null;
  rotation: number;
}

/** Compact geometry used by the tutor to reason / review / place. Capped. */
export interface StudioElementBrief {
  type: ElementKind;
  x: number;
  y: number;
  width: number;
  height: number;
  material: Material;
}

export interface QuizState {
  /** The last quiz shown to the student in this session */
  active: boolean;
  /** Index of the option the student picked (-1 if none yet) */
  picked: number;
  /** Number of attempts in this quiz exchange */
  attempts: number;
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
  /** Tracks whether the student is currently answering a quiz in the chat */
  quizState?: QuizState;
  /** How deep the student wants the explanation: "simple" | "standard" | "deep" */
  depthHint?: "simple" | "standard" | "deep";
  lessonCompleted: boolean;
  done: number;
  total: number;
  exercise: AiExercise | null;
}

export interface StudioContext {
  scope: "studio";
  lang: Lang;
  projectName: string;
  elementCount: number;
  counts: Record<string, number>;
  selected: SelectedElInfo | null;
  exercise: AiExercise | null;
  elements: StudioElementBrief[];
  /** The element whose children are currently being edited (null = project root). */
  currentElement: { id: string; type: ElementKind; x: number; y: number; w: number; h: number } | null;
  parent: { id: string; type: ElementKind } | null;
  children: Array<{ id: string; type: ElementKind; x: number; y: number; w: number; h: number }>;
  /** Breadcrumb chain from the project root to the current context. */
  breadcrumbs: Array<{ id: string; type: ElementKind }>;
  /** Action kinds the model may emit in this context. */
  availableActions: AiActionKind[];
}

export type TutorContext = StudyContext | StudioContext;