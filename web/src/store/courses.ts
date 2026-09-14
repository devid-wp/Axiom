/* AXIOM — canonical course access API. */

import { create } from "zustand";
import { courses as builtInCourses, type Course } from "@/data/content";
import { mergeCourses, useGenerated, useGeneratedCourses } from "./generated";

interface CoursesState {
  courses: Course[];
}

function canonicalCourses(): Course[] {
  const legacy = mergeCourses(builtInCourses);
  const generated = useGeneratedCourses.getState().courses;
  const existing = new Set(legacy.map((course) => course.id));
  return [...legacy, ...generated.filter((course) => !existing.has(course.id))];
}

export const useCourses = create<CoursesState>()(() => ({ courses: canonicalCourses() }));

function refresh(): void {
  useCourses.setState({ courses: canonicalCourses() });
}

useGenerated.subscribe(refresh);
useGeneratedCourses.subscribe(refresh);

/** The current canonical course collection (built-ins for now). */
export function getCourses(): Course[] {
  return useCourses.getState().courses;
}

/** ID-based lookup into the canonical collection. Returns undefined for unknown IDs. */
export function getCourseById(courseId: string): Course | undefined {
  return getCourses().find((c) => c.id === courseId);
}

export function getLessonById(courseId: string, lessonId: string) {
  return getCourseById(courseId)?.lessons.find((lesson) => lesson.id === lessonId);
}
