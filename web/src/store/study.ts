import { create } from "zustand";
import { categories, categoryToCourse } from "@/data/content";
import { getCourses } from "./courses";

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
  courseId: string;
  lessonId: string;
  category: number;
  picked: number;
  completed: Record<string, boolean>;
  selectCourse: (courseId: string) => void;
  selectLesson: (lessonId: string) => void;
  answer: (i: number, correct: number, lessonKey: string) => void;
  openByCategory: (i: number) => void;
  openEntry: (category: number, lesson: number) => void;
}

export function lessonKey(courseId: string, lessonId: string): string {
  return `${courseId}/${lessonId}`;
}

export const useStudy = create<StudyState>()((set, get) => ({
  courseId: getCourses()[0]?.id ?? "",
  lessonId: getCourses()[0]?.lessons[0]?.id ?? "",
  category: 0,
  picked: -1,
  completed: loadCompleted(),

  selectCourse: (courseId) => {
    const course = getCourses().find((item) => item.id === courseId);
    if (!course || course.id === get().courseId) return;
    set({ courseId: course.id, lessonId: course.lessons[0]?.id ?? "", picked: -1 });
  },

  selectLesson: (lessonId) => {
    const course = getCourses().find((item) => item.id === get().courseId);
    if (!course || !course.lessons.some((lesson) => lesson.id === lessonId)) return;
    set({ lessonId, picked: -1 });
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
    const courseIndex = map[categories[i].id];
    const course = getCourses()[courseIndex];
    if (!course) return;
    set({ category: i, courseId: course.id, lessonId: course.lessons[0]?.id ?? "", picked: -1 });
  },

  openEntry: (category, lesson) => {
    if (category < 0 || category >= categories.length) return;
    const c = categories[category];
    const course = getCourses()[categoryToCourse[c.id] ?? -1];
    const selectedLesson = course?.lessons[lesson];
    if (!course || !selectedLesson) return;
    set({
      category,
      courseId: course.id,
      lessonId: selectedLesson.id,
      picked: -1,
    });
  },
}));
