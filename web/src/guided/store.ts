/* AXIOM — Guided Learning store. Owns ONLY the step loop
   (lesson / step / phase / attempts / position). It NEVER writes Studio
   elements directly: demos run through the existing executeActions(),
   handoff uses the existing undo(), validation only READS useStudio. */

import { create } from "zustand";
import { useStudio } from "@/store/studio";
import { executeActions } from "@/ai/actions";
import { guidedLessonById, guidedTrackForLesson } from "./lessons";
import { validate } from "./validate";
import type { GuidedLesson, GuidedPhase } from "./types";

const KEY = "axiom_guided";
const MAX_UNDO_LOOP = 10;

interface GuidedPersist {
  activeLessonId: string | null;
  stepIndex: number;
  done: Record<string, boolean>;
}

function loadPersist(): GuidedPersist {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const p = JSON.parse(raw) as Partial<GuidedPersist>;
      return {
        activeLessonId: typeof p.activeLessonId === "string" ? p.activeLessonId : null,
        stepIndex: typeof p.stepIndex === "number" ? p.stepIndex : 0,
        done: p.done && typeof p.done === "object" ? (p.done as Record<string, boolean>) : {},
      };
    }
  } catch {
    /* corrupt progress -> start clean */
  }
  return { activeLessonId: null, stepIndex: 0, done: {} };
}

interface GuidedState {
  activeLesson: GuidedLesson | null;
  stepIndex: number;
  phase: GuidedPhase;
  attempts: number;
  validated: boolean;
  feedback: { en: string; ru: string } | null;
  demoError: string | null;
  baselineIds: string[];
  demoChanged: boolean;
  lastDemoIds: string[];
  done: Record<string, boolean>;
  start: (id: string) => void;
  exit: () => void;
  showDemo: () => void;
  myTurn: () => void;
  showAgain: () => void;
  revealHint: () => void;
  next: () => void;
}

/* Subscription to the EXISTING Studio store. Fires after every Studio
   commit; the validator runs only in the student phase. Writing here
   touches useGuided only — never useStudio (the validator is pure). */
let unsubStudio: (() => void) | null = null;

function onStudioChange(): void {
  const g = useGuided.getState();
  if (!g.activeLesson || g.phase !== "student") return;
  const step = g.activeLesson.steps[g.stepIndex];
  if (!step) return;
  const res = validate(useStudio.getState(), step, g.baselineIds);
  if (res.ok) {
    if (!g.validated) useGuided.setState({ validated: true, feedback: null });
    return;
  }
  const sameFail = !g.validated && g.feedback?.en === res.detail?.en;
  useGuided.setState({
    validated: false,
    feedback: res.detail,
    attempts: sameFail ? g.attempts : g.attempts + 1,
  });
}

function ensureSubscribed(): void {
  if (!unsubStudio) unsubStudio = useStudio.subscribe(onStudioChange);
}

function dropSubscription(): void {
  unsubStudio?.();
  unsubStudio = null;
}

function persist(): void {
  try {
    const s = useGuided.getState();
    const p: GuidedPersist = {
      activeLessonId: s.activeLesson?.id ?? null,
      stepIndex: s.stepIndex,
      done: s.done,
    };
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* storage unavailable */
  }
}

function currentIds(): string[] {
  const st = useStudio.getState();
  return st.projects[st.currentIdx]?.elements.map((e) => e.id) ?? [];
}

export const useGuided = create<GuidedState>()((set, get) => ({
  activeLesson: null,
  stepIndex: 0,
  phase: "brief",
  attempts: 0,
  validated: false,
  feedback: null,
  demoError: null,
  baselineIds: [],
  demoChanged: false,
  lastDemoIds: [],
  done: loadPersist().done,

  start: (id) => {
    const lesson = guidedLessonById(id);
    if (!lesson) return;
    dropSubscription();
    set({
      activeLesson: lesson,
      stepIndex: 0,
      phase: "brief",
      attempts: 0,
      validated: false,
      feedback: null,
      demoError: null,
      baselineIds: [],
      demoChanged: false,
      lastDemoIds: [],
    });
    ensureSubscribed();
    persist();
  },

  exit: () => {
    dropSubscription();
    set({
      activeLesson: null,
      stepIndex: 0,
      phase: "brief",
      attempts: 0,
      validated: false,
      feedback: null,
      demoError: null,
      baselineIds: [],
      demoChanged: false,
      lastDemoIds: [],
    });
    persist();
  },

  showDemo: () => {
    const g = get();
    const step = g.activeLesson?.steps[g.stepIndex];
    if (!step) return;
    // Demos must land legally: step 1 starts from the project root.
    if (step.demoStartContext === "root") useStudio.getState().navigateTo(null);
    const res = executeActions(step.demo);
    if (!res.changed) {
      set({
        demoError:
          "Demo could not run here (target missing or placement illegal). " +
          "Complete the previous step first, then try again.",
      });
      return;
    }
    set({
      phase: "demo",
      demoChanged: true,
      lastDemoIds: res.changedIds,
      demoError: null,
      feedback: null,
    });
  },

  myTurn: () => {
    const g = get();
    if (g.demoChanged && g.lastDemoIds.length > 0) {
      // Remove exactly the demo batch: undo until its ids are gone.
      // executeActions commits ONE history entry, so normally one undo.
      const ids = new Set(g.lastDemoIds);
      let guard = 0;
      while (guard++ < MAX_UNDO_LOOP) {
        const st = useStudio.getState();
        const proj = st.projects[st.currentIdx];
        const stillThere = proj?.elements.some((e) => ids.has(e.id)) ?? false;
        if (!stillThere || st._hist.length === 0) break;
        st.undo();
      }
    }
    set({
      phase: "student",
      validated: false,
      feedback: null,
      attempts: 0,
      demoChanged: false,
      lastDemoIds: [],
      baselineIds: currentIds(),
      demoError: null,
    });
  },

  showAgain: () => {
    // Re-run the demo on top; "My turn" will undo it again.
    get().showDemo();
  },

  revealHint: () => {
    const g = get();
    const step = g.activeLesson?.steps[g.stepIndex];
    if (step) set({ feedback: step.hint });
  },

  next: () => {
    const g = get();
    if (!g.activeLesson || !g.validated) return;
    const last = g.stepIndex >= g.activeLesson.steps.length - 1;
    if (last) {
      set({
        phase: "done",
        validated: false,
        feedback: null,
        done: { ...g.done, [g.activeLesson.id]: true },
      });
    } else {
      set({
        stepIndex: g.stepIndex + 1,
        phase: "brief",
        attempts: 0,
        validated: false,
        feedback: null,
        demoError: null,
        baselineIds: [],
        demoChanged: false,
        lastDemoIds: [],
      });
    }
    persist();
  },
}));

/* Restore an interrupted track (position only) and persist position. */
useGuided.subscribe(persist);
(function restore() {
  const p = loadPersist();
  if (!p.activeLessonId || p.done[p.activeLessonId]) return;
  const lesson = guidedLessonById(p.activeLessonId);
  if (!lesson) return;
  const stepIndex = Math.min(Math.max(0, p.stepIndex), lesson.steps.length - 1);
  useGuided.setState({ activeLesson: lesson, stepIndex, phase: "brief" });
  ensureSubscribed();
})();

/* Study → Guided entry. Resolves an EXISTING lessonKey(courseId, lessonId)
   to its Guided track and starts it. Returns false when the lesson has no
   track — callers must NOT navigate then (no fake/unrelated starts).
   Navigation itself stays with the caller (existing setView mechanism). */
export function practiceLesson(courseId: string, lessonId: string): boolean {
  const track = guidedTrackForLesson(`${courseId}/${lessonId}`);
  if (!track) return false;
  useGuided.getState().start(track.id);
  return true;
}
