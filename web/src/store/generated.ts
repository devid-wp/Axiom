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
const GENERATED_DURATION = "10 min";

/* ---- Generated-course contract (Commit #10) ----
   Audit of the canonical Course type (web/src/data/content.ts):
     Course  = { id, source, title{en,ru}, meta{en,ru}, level, accent, lessons[] }
     Lesson  = { id, title{en,ru}, duration, level, body{en,ru[]}, quiz{q{en,ru}, opts{en,ru[]}, correct} }
     GeneratedCourse = Course & { source: "generated", description{en,ru} }
   That is the ONLY schema. There are no objectives, prerequisites, or
   courseTag fields on Course/Lesson (courseTag lives on the legacy
   GeneratedLesson only), so validation neither requires nor emits them —
   unknown extra fields are ignored, never a rejection reason and never
   persisted. Anything the model emits outside this shape is rejected
   deterministically (no LLM validator) before persistence.

   Two gates, both deterministic:
   - normalizeGeneratedCourse(raw): lenient hydration gate. Missing
     description/meta/level/accent/duration fall back to conventions;
     missing RU text falls back to EN; invalid lessons are filtered
     (zero valid lessons rejects the course); unknown fields ignored.
   - normalizeGeneratedCourse(raw, true): strict AI-output gate used by
     persistCourseAsCourse. Bilingual fields must be explicit (no
     fallbacks), EN/RU arrays must have matching lengths, lesson count
     must be 2-12, every lesson must be valid (one bad lesson rejects
     the whole course), and all length/format caps below are enforced.
   Length/format caps (both gates reject on violation, except where a
   documented fallback applies in the lenient gate):
   - ids: 1-80 chars, ^[A-Za-z0-9][A-Za-z0-9_-]*$; strict course ids must
     additionally start with "generated-". Missing course id derives
     stably from the title slug ("generated-<slug>"), NEVER Date.now().
     Lesson ids are required (never derived); duplicates reject.
   - title en/ru: 1-120 chars. description en/ru: 1-600. meta en/ru: 1-80.
   - level: exactly beginner|intermediate|advanced.
   - accent: #RRGGBB. duration (lesson): strict "N min"; lenient any
     1-24 chars, otherwise the "10 min" default.
   - body: 1-8 paragraphs per language, each 1-1000 chars.
   - quiz question: 1-300 chars; options: 2-6 per language, each 1-200
     chars, EN/RU counts must match; correct: integer in range.
   Lesson order is significant (Study renders array order) and is always
   preserved verbatim — validation never sorts or reorders. */

/** Maximum counts. */
const MAX_COURSE_LESSONS = 20;
const STRICT_MIN_LESSONS = 2;
const STRICT_MAX_LESSONS = 12;
const MAX_BODY_PARAS = 8;
const MAX_QUIZ_OPTS = 6;

const ID_RE = /^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$/;
const ACCENT_RE = /^#[0-9a-fA-F]{6}$/;
const DURATION_RE = /^\d{1,3}\s*min$/;

/** A complete AI-generated course. Assignable to Course. */
export interface GeneratedCourse extends Course {
  source: "generated";
  description: { en: string; ru: string };
}

function gText(x: unknown): string | null {
  return typeof x === "string" && x.trim() ? x.trim() : null;
}

/** Trimmed non-empty string within max chars, else null. */
function gSized(x: unknown, max: number): string | null {
  const t = gText(x);
  return t && t.length <= max ? t : null;
}

function gList(x: unknown): string[] | null {
  return Array.isArray(x) && x.length > 0 && x.every((item) => gText(item) !== null)
    ? x.map((item) => gText(item)!)
    : null;
}

/** Non-empty string list with each item capped at max chars, else null. */
function gSizedList(x: unknown, maxItems: number, maxChars: number): string[] | null {
  const list = gList(x);
  if (!list || list.length > maxItems) return null;
  if (!list.every((item) => item.length <= maxChars)) return null;
  return list;
}

/** True when the value is a non-empty string exceeding max chars. */
function overlong(x: unknown, max: number): boolean {
  const t = gText(x);
  return t !== null && t.length > max;
}

/** Validated stable id (trimmed, 1-80 chars, slug-safe), else null. */
function gId(x: unknown): string | null {
  const t = gText(x);
  return t && t.length <= 80 && ID_RE.test(t) ? t : null;
}

/** Validate one lesson payload inside a generated course (lesson ids required).
    Lenient gate filters bad lessons (returns null); strict gate additionally
    requires explicit RU text, matching EN/RU array lengths, a valid level,
    a "N min" duration, and all length caps. Order is never touched here —
    callers preserve input order verbatim. */
function normalizeCourseLesson(raw: unknown, strict = false): Lesson | null {
  if (!raw || typeof raw !== "object") return null;
  const v = raw as Record<string, unknown>;
  const title = v.title as Record<string, unknown> | undefined;
  const body = v.body as Record<string, unknown> | undefined;
  const quiz = v.quiz as Record<string, unknown> | undefined;
  const q = quiz?.q as Record<string, unknown> | undefined;
  const opts = quiz?.opts as Record<string, unknown> | undefined;
  const id = gId(v.id);
  const titleEn = gSized(title?.en, 120);
  const bodyEn = gSizedList(body?.en, MAX_BODY_PARAS, 1000);
  const optsEn = gSizedList(opts?.en, MAX_QUIZ_OPTS, 200);
  const questionEn = gSized(q?.en, 300);
  const correct = quiz?.correct;
  if (
    !id || !titleEn || !bodyEn || !questionEn || !optsEn || optsEn.length < 2 ||
    !Number.isInteger(correct) || (correct as number) < 0 || (correct as number) >= optsEn.length
  ) return null;
  const rawTitleRu = gSized(title?.ru, 120);
  const rawBodyRu = gSizedList(body?.ru, MAX_BODY_PARAS, 1000);
  const rawOptsRu = gSizedList(opts?.ru, MAX_QUIZ_OPTS, 200);
  const rawQuestionRu = gSized(q?.ru, 300);
  if (strict && (!rawTitleRu || !rawBodyRu || !rawOptsRu || !rawQuestionRu)) return null;
  const titleRu = rawTitleRu ?? titleEn;
  const bodyRu = rawBodyRu ?? bodyEn;
  const optsRu = rawOptsRu ?? optsEn;
  const questionRu = rawQuestionRu ?? questionEn;
  if (strict && bodyRu.length !== bodyEn.length) return null;
  if (optsRu.length !== optsEn.length) return null;
  const rawDuration = gText(v.duration);
  const rawLevel = gText(v.level);
  if (strict) {
    if (!rawDuration || rawDuration.length > 24 || !DURATION_RE.test(rawDuration)) return null;
    if (!rawLevel || !LEVELS.has(rawLevel)) return null;
  }
  return {
    id,
    title: { en: titleEn, ru: titleRu },
    duration: rawDuration && rawDuration.length <= 24 ? rawDuration : GENERATED_DURATION,
    level: rawLevel && LEVELS.has(rawLevel) ? rawLevel : "beginner",
    body: { en: bodyEn, ru: bodyRu },
    quiz: { q: { en: questionEn, ru: questionRu }, opts: { en: optsEn, ru: optsRu }, correct: correct as number },
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

/** Validate/normalize one persisted generated-course record. Returns null when
    rejected. Lenient gate defaults description/meta/level/accent and RU
    fallbacks; strict AI gate requires explicit bilingual description, meta,
    title.ru, accent, a valid level, 2-12 lessons with every lesson valid,
    and matching EN/RU array lengths. Lesson order is preserved verbatim. */
const LEVELS = new Set(["beginner", "intermediate", "advanced"]);

export function normalizeGeneratedCourse(raw: unknown, strict = false): GeneratedCourse | null {
  if (!raw || typeof raw !== "object") return null;
  const v = raw as Record<string, unknown>;
  // courseTag is a legacy GeneratedLesson field, not part of Course: ignored.
  if (v.source !== undefined && v.source !== "generated") return null;
  const title = v.title as Record<string, unknown> | undefined;
  const titleEn = gSized(title?.en, 120);
  if (!titleEn) return null;
  const rawTitleRu = gSized(title?.ru, 120);
  if (strict && !rawTitleRu) return null;
  const rawLessons = v.lessons;
  if (!Array.isArray(rawLessons) || rawLessons.length === 0) return null;
  if (rawLessons.length > MAX_COURSE_LESSONS) return null;
  if (strict && (rawLessons.length < STRICT_MIN_LESSONS || rawLessons.length > STRICT_MAX_LESSONS)) return null;
  // Order significant for Study: keep input order, never sort.
  const lessons = rawLessons.flatMap((item) => {
    const lesson = normalizeCourseLesson(item, strict);
    return lesson ? [lesson] : [];
  });
  if (lessons.length === 0) return null;
  if (strict && lessons.length !== rawLessons.length) return null;
  if (new Set(lessons.map((lesson) => lesson.id)).size !== lessons.length) return null;
  const titleRu = rawTitleRu ?? titleEn;
  const meta = v.meta as Record<string, unknown> | undefined;
  // Present-but-overlong meta strings are malformed metadata (both gates);
  // missing/empty sides fall back below (lenient) or reject (strict).
  if (overlong(meta?.en, 80) || overlong(meta?.ru, 80)) return null;
  const rawMetaEn = gText(meta?.en);
  const rawMetaRu = gText(meta?.ru);
  if (strict && (!rawMetaEn || !rawMetaRu)) return null;
  const metaEn = rawMetaEn ?? GENERATED_META.en;
  const description = v.description as Record<string, unknown> | undefined;
  if (overlong(description?.en, 600) || overlong(description?.ru, 600)) return null;
  const rawDescriptionEn = gText(description?.en);
  const rawDescriptionRu = gText(description?.ru);
  if (strict && (!rawDescriptionEn || !rawDescriptionRu)) return null;
  const descriptionEn = rawDescriptionEn ?? titleEn;
  const descriptionRu = rawDescriptionRu ?? descriptionEn;
  const rawLevel = gText(v.level);
  const level = rawLevel && LEVELS.has(rawLevel) ? rawLevel : "beginner";
  if (strict && (!rawLevel || !LEVELS.has(rawLevel))) return null;
  const rawAccent = gText(v.accent);
  const accent = rawAccent && ACCENT_RE.test(rawAccent) ? rawAccent : GENERATED_ACCENT;
  if (strict && (!rawAccent || !ACCENT_RE.test(rawAccent))) return null;
  const rawId = v.id === undefined ? null : gId(v.id);
  if (v.id !== undefined && !rawId) return null;
  if (strict && rawId && !rawId.startsWith("generated-")) return null;
  return {
    id: rawId ?? `generated-${slugifyTitle(titleEn)}`,
    source: "generated",
    title: { en: titleEn, ru: titleRu },
    description: { en: descriptionEn, ru: descriptionRu },
    meta: { en: metaEn, ru: rawMetaRu ?? metaEn },
    level,
    accent,
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

/** Persist one complete, strictly validated multi-lesson generated course.
    Returns true when the AI output passed the strict structural gate and was
    stored; false when it was structurally invalid and rejected before any
    write (nothing is persisted on rejection). Deterministic: no LLM judge. */
export function persistCourseAsCourse(course: ParsedCourse): boolean {
  const normalized = normalizeGeneratedCourse(course, true);
  if (!normalized) return false;
  useGeneratedCourses.getState().addCourse(normalized);
  return true;
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
