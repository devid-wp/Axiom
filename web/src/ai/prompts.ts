/* AXIOM — prompt + context builders. The UI asks the tutor service with a
   scope; these functions assemble the smallest useful educational context. */

import type { AiExercise, ChatMessage, QuizState, TutorContext } from "./types";
import type { Lang } from "@/store/ui";
import type { Quiz } from "@/data/content";
import { courses } from "@/data/content";
import { useStudy, lessonKey } from "@/store/study";
import { useStudio } from "@/store/studio";
import { useUi } from "@/store/ui";
import { elementName } from "@/studio/domain";
import { useTutor } from "./service";

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
  "The student is currently reading a lesson. Help them understand it.\n\n" +
  "LESSON GENERATION: When the student asks you to generate, create, or write a lesson (e.g. 'generate a lesson about cantilevers', 'write me a lesson on parametric design'), " +
  "finish your reply with exactly one block:\n" +
  "<axiom-lesson>{\"courseTag\":\"structures\",\"title\":{\"en\":\"...\",\"ru\":\"...\"},\"duration\":\"10 min\",\"level\":\"beginner\"," +
  "\"body\":{\"en\":[\"...\",\"...\"],\"ru\":[\"...\",\"...\"]}," +
  "\"quiz\":{\"q\":{\"en\":\"...\",\"ru\":\"...\"},\"opts\":{\"en\":[\"...\",\"...\"],\"ru\":[\"...\",\"...\"]},\"correct\":0}}</axiom-lesson>\n" +
  "Rules for lesson generation:\n" +
  "- courseTag must match an existing course id: 'fundamentals', 'structures', 'materials', 'styles', or 'ai-generated'.\n" +
  "- body must have 2-4 paragraphs per language, each 1-3 sentences.\n" +
  "- quiz must have exactly 2 options, with correct index (0 or 1).\n" +
  "- All text must be bilingual (en + ru).\n" +
  "- Keep the lesson focused on ONE concept, with a clear learning objective.\n\n" +
  "QUIZ CHECKING: When the student gives an answer to a quiz question (e.g. '1', 'option A', or a free-text answer):\n" +
  "- If CONTEXT.quizState.active is true, evaluate their answer against CONTEXT.quiz.correct.\n" +
  "- If correct: confirm it, then explain WHY it is correct with a concrete example from the lesson body. End with a follow-up like 'Want to go deeper or try the next topic?'\n" +
  "- If incorrect: explain what is wrong, give the correct answer with reasoning tied to the lesson body. Be encouraging: 'Almost — here is why...'. Offer to re-explain the concept simply.\n" +
  "- Always reference CONTEXT.body to ground your explanation in the lesson content.\n\n" +
  "DEPTH LEVELS: The student may ask for explanations at different depths.\n" +
  "- If CONTEXT.depthHint is 'simple' or the student says 'simply', 'in simple words', 'проще', 'простыми словами': use everyday analogies, 2-3 sentences, one key takeaway.\n" +
  "- If CONTEXT.depthHint is 'deep' or the student says 'in detail', 'more about', 'deeply', 'подробно', 'больше': give detailed mechanics, historical context, multiple examples, connection to Studio, 10-15 sentences.\n" +
  "- Default (standard): clear explanation with one architectural example, 5-8 sentences.\n\n" +
  "Keep replies under ~120 words for standard replies, up to ~200 words for deep explanations.\n" +
  ACTIONS_INSTRUCTION;

const STUDIO_SYSTEM =
  "You are AXIOM — an advanced Architectural Design AI Assistant living inside the AXIOM Studio.\n" +
  "Your goal is to act as a collaborative design partner, not just a tutor. Help the user ideate, refine, and realize their architectural vision.\n" +
  "Be proactive: if the user is unsure, ask clarifying questions about their intent, material preferences, or spatial goals.\n" +
  "Guide them through the architectural design process: Concept -> Structure -> Materiality -> Refinement.\n" +
  "Use the real elements in CONTEXT.elements / CONTEXT.selected. Do not invent objects that do not exist.\n" +
  "When the student asks you to build something, translate it into <axiom-actions> and then briefly " +
  "explain what you did and why it fits their design intent.\n" +
  "When they ask to 'check my work', give simple educational feedback (this is " +
  "not engineering validation): whether requested objects exist, their relationships, and one next step.\n" +
  "Keep replies under ~120 words.\n" +
  ACTIONS_INSTRUCTION;

export function buildSystemPrompt(ctx: TutorContext): string {
  const head = ctx.scope === "study" ? STUDY_SYSTEM : STUDIO_SYSTEM;
  return `${head}\n\nCONTEXT = ${JSON.stringify(ctx)}`;
}

function detectQuizState(
  msgs: ChatMessage[],
  quiz: Quiz,
  lang: Lang
): QuizState | undefined {
  const quizMentioned = msgs.some((m) => {
    const c = m.content.toLowerCase();
    return /quiz|квиз|провер|тест|check me|test me|option|вариант|ответ/.test(c);
  });
  if (!quizMentioned) return undefined;

  const userMsgs = msgs.filter((m) => m.role === "user");
  const assistantQuizMsg = msgs.findIndex((m) => {
    const c = m.content.toLowerCase();
    return m.role === "assistant" && /\b(1|2|option|вариант)\b/.test(c) && c.includes(quiz.q[lang].toLowerCase().slice(0, 20));
  });

  const lastQuizTurn = assistantQuizMsg >= 0 ? assistantQuizMsg : -1;
  const answerAfterQuiz = userMsgs.some((m, i) => {
    const allIdx = msgs.indexOf(m);
    return allIdx > lastQuizTurn && /^\s*[12]\s*$/.test(m.content.trim());
  });

  return {
    active: quizMentioned && !answerAfterQuiz,
    picked: answerAfterQuiz ? parseInt(userMsgs[userMsgs.length - 1]?.content.trim() ?? "-1") - 1 : -1,
    attempts: userMsgs.filter((m) => /^\s*[12]\s*$/.test(m.content.trim())).length,
  };
}

const DEPTH_SIMPLE_RE = /проще|простыми словами|simple|simply|plain words|plainly|in simple|объясни просто|очень просто|коротко|briefly|in one sentence|одним предложени/;
const DEPTH_DEEP_RE = /подробно|detail|deep|more about|tell me more|explain.* in detail|раскажи подроб|больше об|go deeper|углуб|разверн|полное объясн|full explanation|extended|extended version|развей/;

function detectDepthHint(msgs: ChatMessage[], lang: Lang): "simple" | "standard" | "deep" | undefined {
  const lastUser = [...msgs].reverse().find((m) => m.role === "user");
  if (!lastUser) return undefined;
  const q = lastUser.content.toLowerCase();
  if (DEPTH_SIMPLE_RE.test(q)) return "simple";
  if (DEPTH_DEEP_RE.test(q)) return "deep";
  return undefined;
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

  const tutorState = useTutor.getState();
  const studySession = tutorState.sessions.study;
  const lastMsgs = studySession.messages.slice(-4);
  const quizState = detectQuizState(lastMsgs, l.quiz, lang);
  const depthHint = detectDepthHint(lastMsgs, lang);

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
    quizState,
    depthHint,
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