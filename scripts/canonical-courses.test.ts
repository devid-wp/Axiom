/* AXIOM — canonical course store regression tests (Commit #2).
   Plain node + esbuild bundle (kept in scripts/ so tsc web/src builds ignore it).
   Run:
     npx esbuild scripts/canonical-courses.test.ts --bundle --platform=node --alias:@=./web/src --outfile=/tmp/axiom-canonical-courses.cjs
     node /tmp/axiom-canonical-courses.cjs */
import { strict as assert } from "node:assert";
import { courses as builtInCourses } from "../web/src/data/content";
import { getCourseById, getCourses, useCourses } from "../web/src/store/courses";
import { normalizeGeneratedCourse, useGeneratedCourses } from "../web/src/store/generated";
import { useStudy } from "../web/src/store/study";

function check(name: string, condition: boolean): void {
  assert.ok(condition, name);
  console.log(`ok - ${name}`);
}

const canonical = getCourses();

check(
  "canonical collection contains all built-in courses",
  canonical.length === builtInCourses.length &&
    builtInCourses.every((c) => canonical.includes(c))
);
check(
  "every canonical course has source builtin",
  canonical.length > 0 && canonical.every((c) => c.source === "builtin")
);
check(
  "lookup by valid course ID returns the correct Course",
  getCourseById("structures")?.title.en === "Structures that Stand" &&
    getCourseById("fundamentals")?.id === "fundamentals"
);
check("lookup by invalid ID returns undefined", getCourseById("does-not-exist") === undefined);
check(
  "no duplicate course IDs in the canonical collection",
  new Set(canonical.map((c) => c.id)).size === canonical.length
);
check(
  "store exposes the same canonical collection (no second copy)",
  useCourses.getState().courses === canonical
);

const generated = normalizeGeneratedCourse({
  id: "generated-bridge",
  source: "generated",
  title: { en: "Generated Bridge", ru: "Сгенерированный мост" },
  lessons: [{
    id: "generated-bridge-lesson",
    title: { en: "Bridge basics", ru: "Основы мостов" },
    body: { en: ["A bridge spans a gap."], ru: ["Мост перекрывает пролёт."] },
    quiz: {
      q: { en: "What does a bridge span?", ru: "Что перекрывает мост?" },
      opts: { en: ["A gap", "Nothing"], ru: ["Пролёт", "Ничего"] },
      correct: 0,
    },
  }],
});
assert.ok(generated);
useGeneratedCourses.setState({ courses: [] });
useGeneratedCourses.getState().addCourse(generated);
check(
  "canonical API can expose generated and built-in courses together",
  getCourses().some((course) => course.source === "builtin") &&
    getCourses().some((course) => course.id === "generated-bridge" && course.source === "generated")
);
check(
  "invalid ID selection is ignored safely",
  (() => {
    const before = useStudy.getState();
    before.selectCourse("missing-course");
    return useStudy.getState().courseId === before.courseId;
  })()
);
check(
  "stable ID course and lesson selection works",
  (() => {
    useStudy.getState().selectCourse("structures");
    const lesson = getCourseById("structures")?.lessons[0];
    if (!lesson) return false;
    useStudy.getState().selectLesson(lesson.id);
    return useStudy.getState().courseId === "structures" && useStudy.getState().lessonId === lesson.id;
  })()
);
useGeneratedCourses.setState({ courses: [] });
