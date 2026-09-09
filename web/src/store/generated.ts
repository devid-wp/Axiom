/* AXIOM — AI-generated course content store. Generated lessons are persisted
   in localStorage and merged with the hardcoded courses in the Study page. */

import { create } from "zustand";
import type { Course, Lesson } from "@/data/content";

const KEY = "axiom_generated_lessons";

function loadGenerated(): GeneratedLesson[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed as GeneratedLesson[];
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
    const next = [...get().lessons, lesson];
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
