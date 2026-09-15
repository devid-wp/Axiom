/* AXIOM — generated Course contract tests (Commit #10).
   Locks the strengthened deterministic validation/normalization gate for
   AI-generated courses: stable IDs, bilingual fields, level/duration,
   lesson ordering, unique lesson IDs, quiz integrity, metadata, and
   reasonable length limits. No LLM validator anywhere.
   Run:
     npx esbuild scripts/ai-course-contract.test.ts --bundle --platform=node --alias:@=./web/src --outfile=/tmp/axiom-ai-course-contract.cjs
     node /tmp/axiom-ai-course-contract.cjs */
import { strict as assert } from "node:assert";
import { parseCoursePayload } from "../web/src/ai/actions";
import {
  loadGeneratedCourses,
  normalizeGeneratedCourse,
  persistCourseAsCourse,
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

const lesson = (id: string, overrides: Record<string, unknown> = {}) => ({
  id,
  title: { en: `Lesson ${id}`, ru: `Урок ${id}` },
  duration: "10 min",
  level: "beginner",
  body: { en: ["First paragraph.", "Second paragraph."], ru: ["Первый абзац.", "Второй абзац."] },
  quiz: {
    q: { en: "Question?", ru: "Вопрос?" },
    opts: { en: ["A", "B", "C"], ru: ["А", "Б", "В"] },
    correct: 1,
  },
  ...overrides,
});

const valid = {
  id: "generated-contract",
  source: "generated",
  title: { en: "Contract Course", ru: "Курс-контракт" },
  description: { en: "A course for contract tests.", ru: "Курс для тестов контракта." },
  meta: { en: "custom", ru: "пользовательские" },
  level: "beginner",
  accent: "#7C5CFC",
  lessons: [lesson("generated-contract-lesson-1"), lesson("generated-contract-lesson-2")],
};

const json = (value: unknown) => JSON.stringify(value);

/* 1. malformed course payloads are rejected before persistence. */
check("null rejected", normalizeGeneratedCourse(null, true) === null);
check("garbage object rejected", normalizeGeneratedCourse({ nope: true }, true) === null);
check("missing lessons rejected", normalizeGeneratedCourse({ ...valid, lessons: undefined }, true) === null);
check("non-object lessons rejected", normalizeGeneratedCourse({ ...valid, lessons: [null, 42] }, true) === null);
check("wrong source rejected", normalizeGeneratedCourse({ ...valid, source: "builtin" }, true) === null);
check("fenced JSON never parses", parseCoursePayload("```json\n" + json(valid) + "\n```").course === undefined);
reset();
check("malformed AI output persists nothing", persistCourseAsCourse({ nope: true } as never) === false);
check("nothing written on rejection", useGeneratedCourses.getState().courses.length === 0);

/* 2. duplicate lesson IDs are rejected (both gates). */
check(
  "duplicate lesson IDs rejected (strict)",
  normalizeGeneratedCourse({ ...valid, lessons: [lesson("dup"), lesson("dup")] }, true) === null
);
check(
  "duplicate lesson IDs rejected (lenient)",
  normalizeGeneratedCourse({ ...valid, lessons: [lesson("dup"), lesson("dup")] }) === null
);

/* 3. invalid option indexes are rejected. */
const badIndex = lesson("generated-contract-lesson-2", { quiz: { ...(lesson("x").quiz as object), correct: 9 } });
check("out-of-range correct rejected (strict)", normalizeGeneratedCourse({ ...valid, lessons: [lesson("generated-contract-lesson-1"), badIndex] }, true) === null);
const nonInteger = lesson("generated-contract-lesson-2", { quiz: { q: { en: "Q?", ru: "В?" }, opts: { en: ["A", "B"], ru: ["А", "Б"] }, correct: 1.5 } });
check("non-integer correct rejected (strict)", normalizeGeneratedCourse({ ...valid, lessons: [lesson("generated-contract-lesson-1"), nonInteger] }, true) === null);
check("single-option quiz rejected (strict)", normalizeGeneratedCourse({ ...valid, lessons: [lesson("generated-contract-lesson-1"), lesson("generated-contract-lesson-2", { quiz: { q: { en: "Q?", ru: "В?" }, opts: { en: ["Only"], ru: ["Только"] }, correct: 0 } })] }, true) === null);
check("mismatched EN/RU option counts rejected", normalizeGeneratedCourse({ ...valid, lessons: [lesson("generated-contract-lesson-1"), lesson("generated-contract-lesson-2", { quiz: { q: { en: "Q?", ru: "В?" }, opts: { en: ["A", "B"], ru: ["А"] }, correct: 0 } })] }, true) === null);

/* 4. empty content is rejected. */
check("empty course title rejected", normalizeGeneratedCourse({ ...valid, title: { en: "  ", ru: "" } }, true) === null);
check("empty description rejected (strict)", normalizeGeneratedCourse({ ...valid, description: { en: "", ru: "" } }, true) === null);
check("empty lesson title rejected (strict)", normalizeGeneratedCourse({ ...valid, lessons: [lesson("generated-contract-lesson-1"), lesson("generated-contract-lesson-2", { title: { en: "", ru: "" } })] }, true) === null);
check("empty body rejected (strict)", normalizeGeneratedCourse({ ...valid, lessons: [lesson("generated-contract-lesson-1"), lesson("generated-contract-lesson-2", { body: { en: [], ru: [] } })] }, true) === null);
check("empty question rejected (strict)", normalizeGeneratedCourse({ ...valid, lessons: [lesson("generated-contract-lesson-1"), lesson("generated-contract-lesson-2", { quiz: { q: { en: "", ru: "" }, opts: { en: ["A", "B"], ru: ["А", "Б"] }, correct: 0 } })] }, true) === null);
// Lenient gate filters empty lessons instead of dropping the course.
check(
  "lenient gate filters empty lessons, keeps valid ones",
  normalizeGeneratedCourse({ ...valid, lessons: [lesson("l1"), { ...lesson("l2"), title: { en: "", ru: "" } }] })?.lessons.length === 1
);

/* 5. invalid metadata is rejected. */
check("invalid level rejected (strict)", normalizeGeneratedCourse({ ...valid, level: "expert" }, true) === null);
check("invalid lesson level rejected (strict)", normalizeGeneratedCourse({ ...valid, lessons: [lesson("generated-contract-lesson-1"), lesson("generated-contract-lesson-2", { level: "guru" })] }, true) === null);
check("invalid accent rejected (strict)", normalizeGeneratedCourse({ ...valid, accent: "purple" }, true) === null);
check("invalid duration rejected (strict)", normalizeGeneratedCourse({ ...valid, lessons: [lesson("generated-contract-lesson-1"), lesson("generated-contract-lesson-2", { duration: "whenever" })] }, true) === null);
check("non-generated course id rejected (strict)", normalizeGeneratedCourse({ ...valid, id: "vaults" }, true) === null);
check("malformed id rejected (both gates)", normalizeGeneratedCourse({ ...valid, id: "not an id!!" }) === null);
check("missing RU title rejected (strict)", normalizeGeneratedCourse({ ...valid, title: { en: "Only EN" } }, true) === null);
check("mismatched body EN/RU lengths rejected (strict)", normalizeGeneratedCourse({ ...valid, lessons: [lesson("generated-contract-lesson-1"), lesson("generated-contract-lesson-2", { body: { en: ["One.", "Two."], ru: ["Один."] } })] }, true) === null);
check("overlong title rejected", normalizeGeneratedCourse({ ...valid, title: { en: "x".repeat(121), ru: "у" } }, true) === null);
check("overlong description rejected", normalizeGeneratedCourse({ ...valid, description: { en: "x".repeat(601), ru: "у" } }, true) === null);
check("overlong option rejected", normalizeGeneratedCourse({ ...valid, lessons: [lesson("generated-contract-lesson-1"), lesson("generated-contract-lesson-2", { quiz: { q: { en: "Q?", ru: "В?" }, opts: { en: ["x".repeat(201), "B"], ru: ["А", "Б"] }, correct: 0 } })] }, true) === null);
check("too few lessons rejected (strict)", normalizeGeneratedCourse({ ...valid, lessons: [lesson("only")] }, true) === null);
check("unknown extra keys are tolerated, not required", normalizeGeneratedCourse({ ...valid, objectives: ["x"], prerequisites: ["y"], courseTag: "z" } as never, true) !== null);

/* 6. valid multi-lesson course passes strict validation with order intact. */
const strict = normalizeGeneratedCourse(valid, true);
check("valid multi-lesson course accepted", strict !== null);
check("lesson order preserved", strict !== null && strict.lessons.map((l) => l.id).join(",") === "generated-contract-lesson-1,generated-contract-lesson-2");
check(
  "normalized course is structurally complete for Study",
  strict !== null &&
    strict.source === "generated" &&
    !!strict.title.en && !!strict.title.ru &&
    !!strict.description.en && !!strict.description.ru &&
    !!strict.meta.en && !!strict.meta.ru &&
    !!strict.level && !!strict.accent &&
    strict.lessons.every((l) => !!l.title.en && !!l.title.ru && l.body.en.length > 0 && l.body.ru.length > 0 && l.quiz.opts.en.length >= 2 && l.quiz.correct < l.quiz.opts.en.length)
);
check("stable id derived from title when missing", normalizeGeneratedCourse({ ...valid, id: undefined }, true)?.id === "generated-contract-course");

/* 7. persistence normalization: defaults, hydration, no built-in drift. */
const minimal = normalizeGeneratedCourse({
  title: { en: "Minimal AI" },
  lessons: [lesson("min-lesson-1", { title: { en: "Minimal lesson" }, body: { en: ["Minimal body."] } })],
});
check(
  "persistence normalization defaults metadata + RU fallbacks",
  minimal !== null &&
    minimal.id === "generated-minimal-ai" &&
    minimal.source === "generated" &&
    minimal.description.en === "Minimal AI" &&
    minimal.meta.en === "custom" &&
    minimal.level === "beginner" &&
    minimal.accent === "#7C5CFC" &&
    minimal.lessons[0].duration === "10 min" &&
    minimal.lessons[0].title.ru === "Minimal lesson" &&
    minimal.lessons[0].body.ru.join("") === minimal.lessons[0].body.en.join("")
);
reset();
const parsed = parseCoursePayload(json(valid)).course;
assert.ok(parsed);
check("valid AI output persists", persistCourseAsCourse(parsed) === true);
check("duplicate regeneration is a no-op", (persistCourseAsCourse(parsed), useGeneratedCourses.getState().courses.length === 1));
check("course survives persistence/hydration", loadGeneratedCourses().some((c) => c.id === "generated-contract" && c.source === "generated"));
check("built-in courses remain untouched", courses.every((c) => c.source === "builtin"));
reset();
console.log("all course-contract tests passed");
