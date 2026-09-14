/* Commit #6 course-generation contract tests. */
import { strict as assert } from "node:assert";
import { parseCoursePayload } from "../web/src/ai/actions";
import {
  loadGeneratedCourses,
  normalizeGeneratedCourse,
  persistCourseAsCourse,
  useGeneratedCourses,
} from "../web/src/store/generated";
import { courses } from "../web/src/data/content";

const storage = new Map<string, string>();
Object.defineProperty(globalThis, "localStorage", { value: {
  getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, value: string) => storage.set(key, value),
  removeItem: (key: string) => storage.delete(key),
}, configurable: true });

const lesson = (id: string) => ({
  id,
  title: { en: `Lesson ${id}`, ru: `Урок ${id}` },
  duration: "10 min",
  level: "beginner",
  body: { en: ["Theory."], ru: ["Теория."] },
  quiz: {
    q: { en: "Question?", ru: "Вопрос?" },
    opts: { en: ["A", "B"], ru: ["А", "Б"] },
    correct: 0,
  },
});

const valid = {
  id: "generated-load-paths",
  source: "generated",
  title: { en: "Load Paths", ru: "Пути нагрузки" },
  description: { en: "A coherent course.", ru: "Связный курс." },
  meta: { en: "custom", ru: "пользовательские" },
  level: "beginner",
  accent: "#7C5CFC",
  lessons: [lesson("one"), lesson("two")],
};

const json = (value: unknown) => JSON.stringify(value);
const check = (name: string, value: boolean) => { assert.ok(value, name); console.log(`ok - ${name}`); };

check("valid multi-lesson course", !!normalizeGeneratedCourse(valid, true));
check("invalid root rejected", !normalizeGeneratedCourse(null, true));
check("empty title rejected", !normalizeGeneratedCourse({ ...valid, title: { en: "" } }, true));
check("empty description rejected", !normalizeGeneratedCourse({ ...valid, description: { en: "", ru: "" } }, true));
check("empty lessons rejected", !normalizeGeneratedCourse({ ...valid, lessons: [] }, true));
check("duplicate lesson IDs rejected", !normalizeGeneratedCourse({ ...valid, lessons: [lesson("one"), lesson("one")] }, true));
check("invalid lesson rejected", !normalizeGeneratedCourse({ ...valid, lessons: [lesson("one"), { id: "two" }] }, true));
check("invalid quiz rejected", !normalizeGeneratedCourse({ ...valid, lessons: [lesson("one"), { ...lesson("two"), quiz: { ...lesson("two").quiz, correct: 9 } }] }, true));
check("invalid level rejected", !normalizeGeneratedCourse({ ...valid, level: "expert" }, true));

check("malformed JSON rejected", !parseCoursePayload("{broken").course);
check("markdown fenced response rejected", !parseCoursePayload("```json\n" + json(valid) + "\n```").course);
check("multiple payloads rejected", !parseCoursePayload(`${json(valid)}${json(valid)}`).course);
check("deterministic course ID", normalizeGeneratedCourse({ ...valid, id: undefined }, true)?.id === "generated-load-paths");

storage.clear();
useGeneratedCourses.setState({ courses: [] });
const parsed = parseCoursePayload(json(valid)).course;
assert.ok(parsed);
persistCourseAsCourse(parsed);
persistCourseAsCourse(parsed);
check("duplicate regeneration is a no-op", useGeneratedCourses.getState().courses.length === 1);
check("course persists and hydrates", loadGeneratedCourses().some((course) => course.id === "generated-load-paths"));
check("built-in courses remain untouched", courses.every((course) => course.source === "builtin"));
useGeneratedCourses.setState({ courses: [] });
console.log("all course-generation tests passed");
