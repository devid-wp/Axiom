/* AXIOM — Guided Learning types.
   GuidedStep is DATA. It describes what the student must do; it never
   mutates anything. Mutations happen only through the existing Studio
   actions (useStudio) and the existing validated batch layer (AiAction). */

import type { AiAction } from "@/ai/types";
import type { ElementKind, Material, Project, Tool } from "@/studio/types";

/** Minimal read-only view of the Studio store the validator needs.
    useStudio state satisfies this structurally — no store changes needed. */
export interface StudioSnapshot {
  projects: Project[];
  currentIdx: number;
  selectedId: string;
  contextId: string | null;
}

export type GuidedStepKind = "create" | "enter" | "select" | "set_material";

/** What counts as "done" for one step. Every field except kind is optional:
    the validator checks only what is specified. */
export interface GuidedExpect {
  kind: GuidedStepKind;
  /** element kind the student must produce / open / select */
  elementType?: ElementKind;
  /** where the student must be: null-root or inside an element of this kind */
  context?: "root" | ElementKind;
  /** required parent of the matched element: null-root or a kind */
  parent?: "root" | ElementKind;
  /** expected size (px) with tolerance; omitted = any size accepted */
  w?: number;
  h?: number;
  tol?: number;
  material?: Material;
  /** minimum number of matching new elements (default 1) */
  count?: number;
}

export interface GuidedStep {
  id: string;
  expect: GuidedExpect;
  instruction: { en: string; ru: string };
  hint: { en: string; ru: string };
  /** Demonstration batch. Same AiAction schema the AI tutor emits —
      executed through the existing executeActions(), never directly. */
  demo: AiAction[];
  /** tools the student needs for this step (select/move always allowed) */
  allowTools: Tool[];
  /** context the demo starts from; the runner navigates there first */
  demoStartContext?: "root" | null;
}

export interface GuidedLesson {
  /** e.g. "guided/foundation" */
  id: string;
  title: { en: string; ru: string };
  steps: GuidedStep[];
}

export type FailedCheck =
  | "context"
  | "missing-element"
  | "parent"
  | "dimensions"
  | "material"
  | "count"
  | "selection";

export interface ValidationResult {
  ok: boolean;
  failedCheck: FailedCheck | null;
  detail: { en: string; ru: string } | null;
  matchedIds: string[];
}

export type GuidedPhase = "brief" | "demo" | "student" | "done";
