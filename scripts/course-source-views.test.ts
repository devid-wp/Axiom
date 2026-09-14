/* AXIOM — BUILT-IN / GENERATED course view regression tests (Commit #7).
   Plain node + esbuild bundle (kept in scripts/ so tsc web/src builds ignore it).
   Run:
     npx esbuild scripts/course-source-views.test.ts --bundle --platform=node --alias:@=./web/src --outfile=/tmp/axiom-course-source-views.cjs
     node /tmp/axiom-course-source-views.cjs */
import { strict as assert } from "node:assert";
import { courses as builtInCourses } from "../web/src/data/content";
import {
  getCourseById,
  getCourses,
  getCoursesBySource,
  useCourses,
} from "../web/src/store/courses";
import {
  normalizeGeneratedCourse,
  useGenerated,
  useGeneratedCourses,
} from "../web/src/store/generated";
import { lessonKey, useStudy } from "../web/src/store/study";
import { FOUNDATION_LESSON_ID, guidedTrackForLesson } from "../web/src/guided/lessons";

/* In-memory localStorage so store persistence is testable in node. */
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

function resetStores(): void {
  mem.clear();
  useGenerated.setState({ lessons: [] });
  useGeneratedCourses.setState({ courses: [] });
}

function check(name: string, condition: boolean): void {
  assert.ok(condition, name);
  console.log(`ok - ${name}`);
}

const builtinsSnapshot = JSON.stringify(builtInCourses);

const generatedPayload = {
  id: "generated-vaults",
  source: "generated",
  title: { en: "Vaults by AI", ru: "Своды от ИИ" },
  lessons: [{
    id: "generated-vaults-l1",
    title: { en: "Barrel vaults", ru: "Цилиндрические своды" },
    body: { en: ["A barrel vault is an extruded arch."], ru: ["Цилиндрический свод — вытянутая арка."] },
    quiz: {
      q: { en: "What is a barrel vault?", ru: "Что такое цилиндрический свод?" },
      opts: { en: ["An extruded arch", "A flat roof"], ru: ["Вытянутая арка", "Плоская крыша"] },
      correct: 0,
    },
  }],
};

resetStores();

/* Empty GENERATED state: filter is a clean empty list, never broken cards. */
check(
  "empty generated state yields an empty GENERATED filter",
  getCoursesBySource("generated").length === 0 &&
    Array.isArray(getCoursesBySource("generated"))
);

/* Seed one generated course through the real store path. */
const generated = normalizeGeneratedCourse(generatedPayload);
assert.ok(generated);
useGeneratedCourses.getState().addCourse(generated);

/* Canonical list contains both source types (reactively, no refresh). */
const canonical = getCourses();
check(
  "canonical list contains both source types",
  canonical.some((c) => c.source === "builtin") &&
    canonical.some((c) => c.id === "generated-vaults" && c.source === "generated") &&
    useCourses.getState().courses === canonical
);

/* BUILT-IN filter: exactly the built-ins, nothing else. */
const builtinView = getCoursesBySource("builtin");
check(
  "BUILT-IN filter returns all built-in courses",
  builtinView.length === builtInCourses.length &&
    builtInCourses.every((c) => builtinView.includes(c)) &&
    builtinView.every((c) => c.source === "builtin")
);

/* GENERATED filter: exactly the seeded course. */
const generatedView = getCoursesBySource("generated");
check(
  "GENERATED filter returns only generated courses",
  generatedView.length === 1 &&
    generatedView[0].id === "generated-vaults" &&
    generatedView.every((c) => c.source === "generated")
);

/* Selection by stable IDs works for generated content too. */
check(
  "selection by stable courseId/lessonId works",
  (() => {
    useStudy.getState().selectCourse("generated-vaults");
    useStudy.getState().selectLesson("generated-vaults-l1");
    const st = useStudy.getState();
    return (
      st.courseId === "generated-vaults" &&
      st.lessonId === "generated-vaults-l1" &&
      getCourseById("generated-vaults")?.lessons[0]?.id === "generated-vaults-l1" &&
      lessonKey("generated-vaults", "generated-vaults-l1") === "generated-vaults/generated-vaults-l1"
    );
  })()
);

/* Invalid IDs stay safe. */
check(
  "invalid courseId selection is ignored safely",
  (() => {
    const before = useStudy.getState().courseId;
    useStudy.getState().selectCourse("missing-course");
    return useStudy.getState().courseId === before && getCourseById("missing-course") === undefined;
  })()
);

/* Built-ins byte-unchanged by generated seeding + selection. */
check(
  "existing built-in courses unchanged",
  JSON.stringify(builtInCourses) === builtinsSnapshot &&
    builtInCourses.every((c) => c.source === "builtin")
);

/* Guided mappings untouched: only fundamentals/f1 maps; generated keys map nothing. */
check(
  "Guided course/lesson mappings unchanged",
  guidedTrackForLesson("fundamentals/f1")?.id === FOUNDATION_LESSON_ID &&
    guidedTrackForLesson("structures/s1") === null &&
    guidedTrackForLesson("generated-vaults/generated-vaults-l1") === null
);

resetStores();
