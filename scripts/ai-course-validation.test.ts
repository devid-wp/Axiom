/* AI-course payload regression tests. Run with:
   npx esbuild scripts/ai-course-validation.test.ts --bundle --platform=node --outfile=/tmp/axiom-ai-course-validation.cjs
   node /tmp/axiom-ai-course-validation.cjs */
import { strict as assert } from "node:assert";
import { parseLessonBlock } from "../web/src/ai/actions";
import { mergeCourses, normalizeGeneratedLesson, useGenerated } from "../web/src/store/generated";
import { courses } from "../web/src/data/content";

const valid = {
  courseTag: "structures",
  title: { en: "Load paths", ru: "Пути нагрузки" },
  duration: "8 min",
  level: "beginner",
  body: { en: ["A load path transfers force."], ru: ["Путь нагрузки передаёт силу."] },
  quiz: { q: { en: "What transfers force?", ru: "Что передаёт силу?" }, opts: { en: ["A load path", "A color"], ru: ["Путь нагрузки", "Цвет"] }, correct: 0 },
};

function block(value: unknown): string {
  return `<axiom-lesson>${JSON.stringify(value)}</axiom-lesson>`;
}

function check(name: string, condition: boolean): void {
  assert.ok(condition, name);
  console.log(`ok - ${name}`);
}

check("malformed JSON is ignored", !parseLessonBlock("<axiom-lesson>{broken</axiom-lesson>").lesson);
check("missing title is ignored", !parseLessonBlock(block({ ...valid, title: {} })).lesson);
check("empty question is ignored", !parseLessonBlock(block({ ...valid, quiz: { ...valid.quiz, q: { en: "" } } })).lesson);
check("too few options is ignored", !parseLessonBlock(block({ ...valid, quiz: { ...valid.quiz, opts: { en: ["one"], ru: ["один"] } } })).lesson);
check("out-of-range correct index is ignored", !parseLessonBlock(block({ ...valid, quiz: { ...valid.quiz, correct: 2 } })).lesson);
check("mismatched language option counts are ignored", !parseLessonBlock(block({ ...valid, quiz: { ...valid.quiz, opts: { en: ["one", "two"], ru: ["один"] } } })).lesson);
check("valid lesson is parsed", !!parseLessonBlock(block(valid)).lesson);

const generated = normalizeGeneratedLesson({ ...valid, id: "gen-1", createdAt: "now" });
check("valid persisted lesson is normalized", generated !== null && generated.quiz.correct === 0);
check("missing persisted id is rejected", normalizeGeneratedLesson({ ...valid, id: "" }) === null);
check("missing persisted question is rejected", normalizeGeneratedLesson({ ...valid, id: "gen-2", quiz: { ...valid.quiz, q: { en: "" } } }) === null);
check("invalid persisted correct index is rejected", normalizeGeneratedLesson({ ...valid, id: "gen-3", quiz: { ...valid.quiz, correct: 99 } }) === null);
check("mismatched persisted options are rejected", normalizeGeneratedLesson({ ...valid, id: "gen-4", quiz: { ...valid.quiz, opts: { en: ["one", "two"], ru: ["один"] } } }) === null);

const first = normalizeGeneratedLesson({ ...valid, id: "gen-5", createdAt: "now" })!;
const duplicate = { ...first, id: "gen-6" };
useGenerated.setState({ lessons: [] });
useGenerated.getState().addLesson(first);
useGenerated.getState().addLesson(duplicate);
const merged = mergeCourses(courses);
const matching = merged.flatMap((course) => course.lessons).filter((lesson) => lesson.title.en === first.title.en);
check("duplicate generated lessons are not merged twice", matching.length === 1);
