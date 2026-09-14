/* AXIOM — AI-generated course content store.
   Two layers, kept explicit during the Course-model migration:
   - LEGACY: GeneratedLesson[] under "axiom_generated_lessons", merged into
     the Study page via mergeCourses(). Preserved as-is; Study still reads it.
   - FOUNDATION (Commit #3): complete generated courses persisted as
     Course[] under "axiom_generated_courses". The AI generation path
     persists here (Commit #4); UI consumption follows. */

import { create } from "zustand";
import type { Course, Lesson } from "@/data/content";
import type { ParsedCourse, ParsedLesson } from "@/ai/actions";

const KEY = "axiom_generated_lessons";

export function normalizeGeneratedLesson(raw: unknown): GeneratedLesson | null {
  if (!raw || typeof raw !== "object") return null;
  const v = raw as Record<string, unknown>;
  const title = v.title as Record<string, unknown> | undefined;
  const body = v.body as Record<string, unknown> | undefined;
  const quiz = v.quiz as Record<string, unknown> | undefined;
  const q = quiz?.q as Record<string, unknown> | undefined;
  const opts = quiz?.opts as Record<string, unknown> | undefined;
  const text = (x: unknown): string | null => typeof x === "string" && x.trim() ? x.trim() : null;
  const list = (x: unknown): string[] | null =>
    Array.isArray(x) && x.length > 0 && x.every((item) => text(item) !== null)
      ? x.map((item) => text(item)!)
      : null;
  const id = text(v.id);
  const courseTag = text(v.courseTag);
  const titleEn = text(title?.en);
  const bodyEn = list(body?.en);
  const optsEn = list(opts?.en);
  const questionEn = text(q?.en);
  const correct = quiz?.correct;
  if (
    !id || !courseTag || !titleEn || !bodyEn || !questionEn || !optsEn || optsEn.length < 2 ||
    !Number.isInteger(correct) || (correct as number) < 0 || (correct as number) >= optsEn.length
  ) return null;
  const titleRu = text(title?.ru) ?? titleEn;
  const bodyRu = list(body?.ru) ?? bodyEn;
  const optsRu = list(opts?.ru) ?? optsEn;
  if (optsRu.length !== optsEn.length) return null;
  return {
    id,
    courseTag,
    title: { en: titleEn, ru: titleRu },
    duration: text(v.duration) ?? "10 min",
    level: text(v.level) ?? "beginner",
    body: { en: bodyEn, ru: bodyRu },
    quiz: { q: { en: questionEn, ru: text(q?.ru) ?? questionEn }, opts: { en: optsEn, ru: optsRu }, correct: correct as number },
    createdAt: text(v.createdAt) ?? new Date(0).toISOString(),
  };
}

function lessonFingerprint(lesson: GeneratedLesson): string {
  return `${lesson.courseTag.toLowerCase()}\u0000${lesson.title.en.toLowerCase()}`;
}

function loadGenerated(): GeneratedLesson[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const seen = new Set<string>();
        return parsed.flatMap((item) => {
          const lesson = normalizeGeneratedLesson(item);
          if (!lesson) return [];
          const fingerprint = lessonFingerprint(lesson);
          if (seen.has(fingerprint)) return [];
          seen.add(fingerprint);
          return [lesson];
        });
      }
    }
  } catch {
    /* ignore corrupt data */
  }
  return [];
}

export interface GeneratedLesson {
  id: string;
  courseTag: string;
  title: { en: string; ru: string };
  duration: string;
  level: string;
  body: { en: string[]; ru: string[] };
  quiz: {
    q: { en: string; ru: string };
    opts: { en: string[]; ru: string[] };
    correct: number;
  };
  createdAt: string;
}

interface GeneratedState {
  lessons: GeneratedLesson[];
  addLesson: (lesson: GeneratedLesson) => void;
  removeLesson: (id: string) => void;
  clearAll: () => void;
}

export const useGenerated = create<GeneratedState>()((set, get) => ({
  lessons: loadGenerated(),

  addLesson: (lesson) => {
    const normalized = normalizeGeneratedLesson(lesson);
    if (!normalized) return;
    const fingerprint = lessonFingerprint(normalized);
    if (get().lessons.some((item) => lessonFingerprint(item) === fingerprint)) return;
    const next = [...get().lessons, normalized];
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
    set({ lessons: next });
  },

  removeLesson: (id) => {
    const next = get().lessons.filter((l) => l.id !== id);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
    set({ lessons: next });
  },

  clearAll: () => {
    try {
      localStorage.removeItem(KEY);
    } catch {
      /* ignore */
    }
    set({ lessons: [] });
  },
}));

/* ---- Generated courses: persistable Course[] foundation (Commit #3) ----
   A generated course is a complete Course with source "generated", so it is
   assignable to Course and can eventually live in the canonical collection.
   Only addition over Course is `description` (bilingual short summary).

   Explicit conventions (no silent guessing):
   - id: required; when missing/empty a stable id is derived from the title
     slug ("generated-<slug>"), NEVER from Date.now().
   - source: records declaring a source other than "generated" are rejected;
     a missing source defaults to "generated".
   - title.en: required, otherwise the record is rejected. title.ru falls
     back to title.en.
   - description/meta/level/accent: defaulted, never a rejection reason.
     description defaults to the title; meta defaults to the same
     "custom" labels the legacy orphan course used; level to "beginner";
     accent to "#7C5CFC".
   - lessons: at least one valid lesson is required. Lessons follow the same
     validation principles as normalizeGeneratedLesson (title/body/quiz in
     both languages with ru fallbacks, >= 2 options, correct index in range,
     duration/level defaults). Invalid lessons are filtered; lesson ids are
     required (never derived). Zero valid lessons rejects the course.
   - identity/dedup is by stable id: re-adding a byte-identical course is a
     no-op; a different course colliding on id coexists under a suffixed id.
   - no schema/version field: existing persistence stores plain arrays.

   LEGACY DATA: the "axiom_generated_lessons" key is preserved untouched and
   mergeCourses() keeps serving Study. Grouping legacy lessons into generated
   courses now would either delete data Study still renders or create dual
   ownership, so that migration is deferred to the consumer-migration commit. */

const COURSES_KEY = "axiom_generated_courses";

const GENERATED_META = { en: "custom", ru: "пользовательские" };
const GENERATED_ACCENT = "#7C5CFC";

/** A complete AI-generated course. Assignable to Course. */
export interface GeneratedCourse extends Course {
  source: "generated";
  description: { en: string; ru: string };
}

function gText(x: unknown): string | null {
  return typeof x === "string" && x.trim() ? x.trim() : null;
}

function gList(x: unknown): string[] | null {
  return Array.isArray(x) && x.length > 0 && x.every((item) => gText(item) !== null)
    ? x.map((item) => gText(item)!)
    : null;
}

/** Validate one lesson payload inside a generated course (lesson ids required). */
function normalizeCourseLesson(raw: unknown, strict = false): Lesson | null {
  if (!raw || typeof raw !== "object") return null;
  const v = raw as Record<string, unknown>;
  const title = v.title as Record<string, unknown> | undefined;
  const body = v.body as Record<string, unknown> | undefined;
  const quiz = v.quiz as Record<string, unknown> | undefined;
  const q = quiz?.q as Record<string, unknown> | undefined;
  const opts = quiz?.opts as Record<string, unknown> | undefined;
  const id = gText(v.id);
  const titleEn = gText(title?.en);
  const bodyEn = gList(body?.en);
  const optsEn = gList(opts?.en);
  const questionEn = gText(q?.en);
  const correct = quiz?.correct;
  if (
    !id || !titleEn || !bodyEn || !questionEn || !optsEn || optsEn.length < 2 ||
    !Number.isInteger(correct) || (correct as number) < 0 || (correct as number) >= optsEn.length
  ) return null;
  const titleRu = gText(title?.ru) ?? titleEn;
  if (strict && (!LEVELS.has(gText(v.level) ?? "beginner"))) return null;
  const bodyRu = gList(body?.ru) ?? bodyEn;
  const optsRu = gList(opts?.ru) ?? optsEn;
  if (optsRu.length !== optsEn.length) return null;
  if (strict && (bodyEn.length > 8 || optsEn.length > 6)) return null;
  return {
    id,
    title: { en: titleEn, ru: titleRu },
    duration: gText(v.duration) ?? "10 min",
    level: gText(v.level) ?? "beginner",
    body: { en: bodyEn, ru: bodyRu },
    quiz: { q: { en: questionEn, ru: gText(q?.ru) ?? questionEn }, opts: { en: optsEn, ru: optsRu }, correct: correct as number },
  };
}

function slugifyTitle(s: string): string {
  const slug = s
    .toLowerCase()
    .replace(/[^a-z0-9\u0430-\u044f\u0451]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
  return slug || "untitled";
}

/** Validate/normalize one persisted generated-course record. Returns null when rejected. */
const LEVELS = new Set(["beginner", "intermediate", "advanced"]);

export function normalizeGeneratedCourse(raw: unknown, strict = false): GeneratedCourse | null {
  if (!raw || typeof raw !== "object") return null;
  const v = raw as Record<string, unknown>;
  if (v.source !== undefined && v.source !== "generated") return null;
  const title = v.title as Record<string, unknown> | undefined;
  const titleEn = gText(title?.en);
  if (!titleEn) return null;
  const rawLessons = v.lessons;
  if (!Array.isArray(rawLessons) || rawLessons.length === 0) return null;
  if (strict && (rawLessons.length < 2 || rawLessons.length > 12)) return null;
  const lessons = rawLessons.flatMap((item) => {
    const lesson = normalizeCourseLesson(item, strict);
    return lesson ? [lesson] : [];
  });
  if (lessons.length === 0) return null;
  if (strict && lessons.length !== rawLessons.length) return null;
  if (new Set(lessons.map((lesson) => lesson.id)).size !== lessons.length) return null;
  const titleRu = gText(title?.ru) ?? titleEn;
  const meta = v.meta as Record<string, unknown> | undefined;
  const metaEn = gText(meta?.en) ?? GENERATED_META.en;
  const description = v.description as Record<string, unknown> | undefined;
  const descriptionEn = gText(description?.en) ?? titleEn;
  const level = gText(v.level) ?? "beginner";
  if (strict && (!gText(description?.en) || !gText(description?.ru) || !meta || !gText(meta.en) || !gText(meta.ru) || !LEVELS.has(level))) return null;
  if (strict && (!gText(title?.ru) || !gText(v.accent))) return null;
  return {
    id: gText(v.id) ?? `generated-${slugifyTitle(titleEn)}`,
    source: "generated",
    title: { en: titleEn, ru: titleRu },
    description: { en: descriptionEn, ru: gText(description?.ru) ?? descriptionEn },
    meta: { en: metaEn, ru: gText(meta?.ru) ?? metaEn },
    level,
    accent: gText(v.accent) ?? GENERATED_ACCENT,
    lessons,
  };
}

function saveGeneratedCourses(courses: GeneratedCourse[]): void {
  try {
    localStorage.setItem(COURSES_KEY, JSON.stringify(courses));
  } catch {
    /* ignore */
  }
}

/** Read + validate the persisted generated courses (safe on corrupt data). */
export function loadGeneratedCourses(): GeneratedCourse[] {
  try {
    const raw = localStorage.getItem(COURSES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const seen = new Set<string>();
        return parsed.flatMap((item) => {
          const course = normalizeGeneratedCourse(item);
          if (!course || seen.has(course.id)) return [];
          seen.add(course.id);
          return [course];
        });
      }
    }
  } catch {
    /* ignore corrupt data */
  }
  return [];
}

interface GeneratedCoursesState {
  courses: GeneratedCourse[];
  addCourse: (course: unknown) => void;
  removeCourse: (id: string) => void;
  clearAll: () => void;
}

export const useGeneratedCourses = create<GeneratedCoursesState>()((set, get) => ({
  courses: loadGeneratedCourses(),

  addCourse: (course) => {
    const normalized = normalizeGeneratedCourse(course);
    if (!normalized) return;
    const existing = get().courses;
    const conflict = existing.find((c) => c.id === normalized.id);
    if (conflict) {
      // True duplicates are a no-op; genuinely different content colliding
      // on one id coexists under a deterministic numeric suffix.
      if (JSON.stringify(conflict) === JSON.stringify(normalized)) return;
      let n = 2;
      let id = `${normalized.id}-${n}`;
      while (existing.some((c) => c.id === id)) {
        n++;
        id = `${normalized.id}-${n}`;
      }
      const next = [...existing, { ...normalized, id }];
      saveGeneratedCourses(next);
      set({ courses: next });
      return;
    }
    const next = [...existing, normalized];
    saveGeneratedCourses(next);
    set({ courses: next });
  },

  removeCourse: (id) => {
    const next = get().courses.filter((c) => c.id !== id);
    saveGeneratedCourses(next);
    set({ courses: next });
  },

  clearAll: () => {
    try {
      localStorage.removeItem(COURSES_KEY);
    } catch {
      /* ignore */
    }
    set({ courses: [] });
  },
}));

/** AI-generation bridge (Commit #4): persist one validated AI lesson as a
    standalone single-lesson generated course. The lesson payload comes from
    parseLessonBlock (no second validation system here); addCourse runs it
    through normalizeGeneratedCourse. The course id is content-derived
    (courseTag + lesson title), never Date.now(), so regenerating identical
    output is a deterministic no-op via addCourse dedup. Built-in courses are
    never touched; nothing is written to the legacy GeneratedLesson store. */
export function persistLessonAsCourse(lesson: ParsedLesson): void {
  const courseId = `generated-${slugifyTitle(lesson.courseTag)}-${slugifyTitle(lesson.title.en)}`;
  useGeneratedCourses.getState().addCourse({
    id: courseId,
    source: "generated",
    title: lesson.title,
    description: lesson.title,
    level: lesson.level,
    lessons: [
      {
        id: `${courseId}-lesson-1`,
        title: lesson.title,
        duration: lesson.duration,
        level: lesson.level,
        body: lesson.body,
        quiz: lesson.quiz,
      },
    ],
  });
}

/** Persist one complete, strictly validated multi-lesson generated course. */
export function persistCourseAsCourse(course: ParsedCourse): void {
  const normalized = normalizeGeneratedCourse(course, true);
  if (!normalized) return;
  useGeneratedCourses.getState().addCourse(normalized);
}

/** Merge generated lessons into the hardcoded courses array.
    Generated lessons are appended to the matching course (by courseTag).
    If no matching course exists, they go into a virtual "AI-Generated" course. */
export function mergeCourses(hardcoded: Course[]): Course[] {
  const generated = useGenerated.getState().lessons;
  if (generated.length === 0) return hardcoded;

  const merged = hardcoded.map((c) => ({ ...c, lessons: [...c.lessons] }));
  const orphans: GeneratedLesson[] = [];

  for (const gl of generated) {
    const target = merged.find(
      (c) =>
        c.id === gl.courseTag ||
        c.title.en.toLowerCase().includes(gl.courseTag.toLowerCase()) ||
        c.title.ru.toLowerCase().includes(gl.courseTag.toLowerCase())
    );
    if (target) {
      target.lessons.push({
        id: gl.id,
        title: gl.title,
        duration: gl.duration,
        level: gl.level,
        body: gl.body,
        quiz: gl.quiz,
      });
    } else {
      orphans.push(gl);
    }
  }

  if (orphans.length > 0) {
    const aiCourse: Course = {
      id: "ai-generated",
      source: "generated",
      title: { en: "AI-Generated Lessons", ru: "Уроки, созданные ИИ" },
      meta: { en: "custom", ru: "пользовательские" },
      level: "beginner",
      accent: "#7C5CFC",
      lessons: orphans.map((gl) => ({
        id: gl.id,
        title: gl.title,
        duration: gl.duration,
        level: gl.level,
        body: gl.body,
        quiz: gl.quiz,
      })),
    };
    merged.push(aiCourse);
  }

  return merged;
}
