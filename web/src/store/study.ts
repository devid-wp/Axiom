import { create } from "zustand";
import { categories, categoryToCourse, courses } from "@/data/content";

/* Completed lessons are persisted under the same key the legacy web app used,
   preserving that data contract. */
const KEY = "axiom_completed";

function loadCompleted(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as Record<string, boolean>;
      }
    }
  } catch {
    /* ignore corrupt progress */
  }
  return {};
}

interface StudyState {
  course: number;
  lesson: number;
  category: number;
  picked: number;
  completed: Record<string, boolean>;
  selectCourse: (i: number) => void;
  selectLesson: (i: number) => void;
  answer: (i: number, correct: number, lessonKey: string) => void;
  openByCategory: (i: number) => void;
  openEntry: (category: number, lesson: number) => void;
}

export function lessonKey(courseId: string, lessonId: string): string {
  return `${courseId}/${lessonId}`;
}

export const useStudy = create<StudyState>()((set, get) => ({
  course: 0,
  lesson: 0,
  category: 0,
  picked: -1,
  completed: loadCompleted(),

  selectCourse: (i) => {
    if (i < 0 || i >= courses.length || i === get().course) return;
    set({ course: i, lesson: 0, picked: -1 });
  },

  selectLesson: (i) => {
    const course = courses[get().course];
    if (!course || i < 0 || i >= course.lessons.length) return;
    set({ lesson: i, picked: -1 });
  },

  answer: (i, correct, key) => {
    const patch: Partial<StudyState> = { picked: i };
    if (i === correct) {
      const completed = { ...get().completed, [key]: true };
      try {
        localStorage.setItem(KEY, JSON.stringify(completed));
      } catch {
        /* ignore */
      }
      patch.completed = completed;
    }
    set(patch);
  },

  openByCategory: (i) => {
    if (i < 0 || i >= 4 || i === get().category) return;
    const map = categoryToCourse;
    const course = map[categories[i].id] ?? 0;
    set({ category: i, course, lesson: 0, picked: -1 });
  },

  openEntry: (category, lesson) => {
    if (category < 0 || category >= categories.length) return;
    const c = categories[category];
    if (lesson < 0 || lesson >= courses[categoryToCourse[c.id] ?? 0].lessons.length) return;
    set({
      category,
      course: categoryToCourse[c.id] ?? 0,
      lesson,
      picked: -1,
    });
  },
}));