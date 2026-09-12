/* AXIOM — AI-generated course content store. Generated lessons are persisted
   in localStorage and merged with the hardcoded courses in the Study page. */

import { create } from "zustand";
import type { Course, Lesson } from "@/data/content";

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
