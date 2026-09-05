/* AXIOM — prompt + context builders. The UI asks the tutor service with a
   scope; these functions assemble the smallest useful educational context. */

import type { AiExercise, TutorContext } from "./types";
import { courses } from "@/data/content";
import { useStudy, lessonKey } from "@/store/study";
import { useStudio } from "@/store/studio";
import { useUi } from "@/store/ui";
import { elementName } from "@/studio/domain";

const ACTIONS_INSTRUCTION =
  "If the student asks you to BUILD, CHANGE or CREATE something in Studio, " +
  "finish your reply with exactly one block:\n" +
  "<axiom-actions>[{\"kind\":\"create_element\",\"elementType\":\"column\",\"x\":120,\"y\":180}, ...]</axiom-actions>\n" +
  "Allowed kinds ONLY: create_element, move_element, resize_element, set_material, " +
  "duplicate_element, select_element, clear_selection, delete_element, clear_project.\n" +
  "Rules:\n" +
  "- elementType in [wall, room, column, beam]; material in [concrete, brick, glass, timber, steel].\n" +
  "- Coordinates in px, sheet is 900x600, snap to multiples of 8. You may omit coordinates to auto-place.\n" +
  "- target may be omitted (=selected, else most recent), or use {\"kind\":...}/{\"last\":true}/{\"selected\":true}.\n" +
  "- Never attempt ids you cannot know. Delete/clear_project require the student's confirmation in the app.\n" +
  "- Max 12 actions per block. Never output anything outside the allowed schema.\n" +
  "If you offer an exercise, finish the reply with:" +
  "<axiom-exercise>{\"title\":\"...\",\"objective\":\"...\",\"task\":\"...\",\"hint\":\"...\"}</axiom-exercise>";

const STUDY_SYSTEM =
  "You are the AXIOM Tutor — an architecture teaching assistant living inside the AXIOM design app.\n" +
  "You teach, not just answer: keep replies short and clear, adapt to the student's level, " +
  "use concrete architectural examples, connect theory to what the student can build in Studio, " +
  "ask one follow-up question when useful, and let the student reason before dumping an answer.\n" +
  "Answer in the student's language (given in CONTEXT).\n" +
  "The student is currently reading a lesson. Help them understand it.\n" +
  "Keep replies under ~120 words.\n" +
  ACTIONS_INSTRUCTION;

const STUDIO_SYSTEM =
  "You are the AXIOM Tutor — an architecture teaching assistant living inside the AXIOM Studio.\n" +
  "You teach and give feedback on the student's design: comment on their actual layout, explain structure, " +
  "and propose small beginner exercises they can build right now in the open sheet.\n" +
  "Answer in the student's language (given in CONTEXT).\n" +
  "Use the real elements in CONTEXT.elements / CONTEXT.selected. Do not invent objects that do not exist.\n" +
  "When the student asks you to build something, translate it into <axiom-actions> and then briefly " +
  "explain what you did. When they ask to 'check my work', give simple educational feedback (this is " +
  "not engineering validation): whether requested objects exist, their relationships, and one next step.\n" +
  "Keep replies under ~120 words.\n" +
  ACTIONS_INSTRUCTION;

export function buildSystemPrompt(ctx: TutorContext): string {
  const head = ctx.scope === "study" ? STUDY_SYSTEM : STUDIO_SYSTEM;
  return `${head}\n\nCONTEXT = ${JSON.stringify(ctx)}`;
}

export function buildStudyContext(): TutorContext {
  const { course, lesson, completed } = useStudy.getState();
  const lang = useUi.getState().lang;
  const c = courses[course];
  const l = c.lessons[lesson];
  const done = courses.reduce(
    (acc, cc) => acc + cc.lessons.filter((x) => completed[lessonKey(cc.id, x.id)]).length,
    0
  );
  const total = courses.reduce((acc, cc) => acc + cc.lessons.length, 0);
  return {
    scope: "study",
    lang,
    courseId: c.id,
    courseName: c.title[lang],
    lessonNum: lesson + 1,
    lessonId: l.id,
    lessonTitle: l.title[lang],
    level: l.level,
    duration: l.duration,
    body: l.body[lang],
    quiz: {
      q: l.quiz.q[lang],
      opts: l.quiz.opts[lang],
      correct: l.quiz.correct,
    },
    lessonCompleted: !!completed[lessonKey(c.id, l.id)],
    done,
    total,
    exercise: null,
  };
}

const MAX_CTX_ELEMENTS = 60;

export function buildStudioContext(exercise: AiExercise | null): TutorContext {
  const lang = useUi.getState().lang;
  const { projects, currentIdx, selectedId } = useStudio.getState();
  const proj = projects[currentIdx];
  const elements = proj?.elements ?? [];
  const counts: Record<string, number> = {};
  for (const e of elements) counts[e.kind] = (counts[e.kind] ?? 0) + 1;

  const sel = elements.find((e) => e.id === selectedId) ?? null;
  const selected = sel
    ? {
        id: sel.id,
        kind: sel.kind,
        name: proj ? elementName(proj, sel.id) : sel.kind,
        x: Math.round(sel.x),
        y: Math.round(sel.y),
        w: Math.round(sel.w),
        h: Math.round(sel.h),
        material: sel.material,
      }
    : null;

  return {
    scope: "studio",
    lang,
    projectName: proj?.name ?? "",
    elementCount: elements.length,
    counts,
    selected,
    exercise: exercise ?? null,
    elements: elements.slice(-MAX_CTX_ELEMENTS).map((e) => ({
      type: e.kind,
      x: Math.round(e.x),
      y: Math.round(e.y),
      width: Math.round(e.w),
      height: Math.round(e.h),
      material: e.material,
    })),
  };
}