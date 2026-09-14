/* AXIOM — AI course migration regression tests (Commit #4).
   Proves the ACTIVE AI generation path persists standalone generated Courses
   instead of legacy GeneratedLesson records. Plain node + esbuild bundle
   (kept in scripts/ so tsc web/src builds ignore it).
   Run:
     npx esbuild scripts/ai-course-migration.test.ts --bundle --platform=node --outfile=/tmp/axiom-ai-course-migration.cjs
     node /tmp/axiom-ai-course-migration.cjs */
import { strict as assert } from "node:assert";
import { parseLessonBlock } from "../web/src/ai/actions";
import {
  loadGeneratedCourses,
  mergeCourses,
  persistLessonAsCourse,
  useGeneratedCourses,
} from "../web/src/store/generated";
import { courses } from "../web/src/data/content";

/* In-memory localStorage so persistence/hydration is testable in node. */
const mem = new Map<string, string>();
Object.defineProperty(globalThis, "localStorage", {
  value: {
    getItem: (k: string): string | null => (mem.has(k) ? mem.get(k)! : null),
    setItem: (k: string, v: string): void => {
      mem.set(k, String(v));
    },
    removeItem: (k: string): void => {
      mem.delete(k);
    },
  },
  configurable: true,
  writable: true,
});

function reset(): void {
  mem.clear();
  useGeneratedCourses.setState({ courses: [] });
}

function check(name: string, condition: boolean): void {
  assert.ok(condition, name);
  console.log(`ok - ${name}`);
}

function block(value: unknown): string {
  return `<axiom-lesson>${JSON.stringify(value)}</axiom-lesson>`;
}

/* AI-shaped payload, mirroring the documented <axiom-lesson> format. */
const aiPayload = {
  courseTag: "structures",
  title: { en: "Load paths", ru: "Пути нагрузки" },
  duration: "8 min",
  level: "beginner",
  body: { en: ["A load path transfers force."], ru: ["Путь нагрузки передаёт силу."] },
  quiz: {
    q: { en: "What transfers force?", ru: "Что передаёт силу?" },
    opts: { en: ["A load path", "A color"], ru: ["Путь нагрузки", "Цвет"] },
    correct: 0,
  },
};

const legacySeed = JSON.stringify([
  {
    id: "gen-legacy-1",
    courseTag: "ai-generated",
    title: { en: "Old lesson", ru: "Старый урок" },
    duration: "8 min",
    level: "beginner",
    body: { en: ["Old body."], ru: ["Старый текст."] },
    quiz: {
      q: { en: "Old?", ru: "Старый?" },
      opts: { en: ["A", "B"], ru: ["А", "Б"] },
      correct: 0,
    },
    createdAt: "2024-01-01T00:00:00.000Z",
  },
]);

reset();
const builtinsBefore = JSON.stringify(courses);
mem.set("axiom_generated_lessons", legacySeed);

/* AI output parses, then persists as a generated Course (service guard: only persist when parsed). */
const parsed = parseLessonBlock(block(aiPayload)).lesson;
if (!parsed) throw new Error("valid AI payload must parse");
persistLessonAsCourse(parsed);

const stored = useGeneratedCourses.getState().courses;
check("AI output becomes a generated Course", stored.length === 1);
const course = stored[0];
check("generated course source is generated", course.source === "generated");
check(
  "required Course metadata exists",
  !!course.id &&
    !!course.title.en && !!course.title.ru &&
    !!course.description.en && !!course.description.ru &&
    !!course.meta.en && !!course.meta.ru &&
    !!course.level && !!course.accent &&
    course.lessons.length === 1
);
check(
  "lessons are preserved",
  JSON.stringify(course.lessons[0].title) === JSON.stringify(aiPayload.title) &&
    JSON.stringify(course.lessons[0].body) === JSON.stringify(aiPayload.body) &&
    JSON.stringify(course.lessons[0].quiz) === JSON.stringify(aiPayload.quiz)
);
check(
  "stable content-derived id (no Date.now())",
  course.id === "generated-structures-load-paths"
);

/* Persistence + hydration. */
check(
  "generated course persists",
  (mem.get("axiom_generated_courses") ?? "").includes("generated-structures-load-paths")
);
const rehydrated = loadGeneratedCourses();
check(
  "generated course survives hydration",
  rehydrated.length === 1 && rehydrated[0].id === course.id && rehydrated[0].source === "generated"
);

/* Repeated identical generation: deterministic, no uncontrolled duplicates. */
persistLessonAsCourse(parsed);
persistLessonAsCourse(parsed);
check(
  "repeated generation does not duplicate",
  useGeneratedCourses.getState().courses.length === 1
);
useGeneratedCourses.setState({ courses: [] });
persistLessonAsCourse(parsed);
check(
  "re-generation after reload yields the same stable id",
  useGeneratedCourses.getState().courses[0].id === course.id
);

/* Malformed/invalid AI data is still rejected (nothing new persisted). */
const beforeInvalid = useGeneratedCourses.getState().courses.length;
check("malformed AI block yields no lesson", parseLessonBlock("<axiom-lesson>{broken</axiom-lesson>").lesson === undefined);
const badTitle = parseLessonBlock(block({ ...aiPayload, title: {} })).lesson;
if (badTitle) persistLessonAsCourse(badTitle);
const badQuiz = parseLessonBlock(block({ ...aiPayload, quiz: { ...aiPayload.quiz, correct: 99 } })).lesson;
if (badQuiz) persistLessonAsCourse(badQuiz);
useGeneratedCourses.getState().addCourse({ nope: true });
check(
  "invalid AI data creates no courses",
  useGeneratedCourses.getState().courses.length === beforeInvalid
);

/* Built-ins untouched; legacy data preserved; legacy merge path intact. */
check(
  "built-in courses remain untouched",
  JSON.stringify(courses) === builtinsBefore && courses.every((c) => c.source === "builtin")
);
check(
  "legacy axiom_generated_lessons not destructively deleted",
  mem.get("axiom_generated_lessons") === legacySeed
);
check(
  "legacy mergeCourses path still intact",
  mergeCourses(courses).length === courses.length
);
