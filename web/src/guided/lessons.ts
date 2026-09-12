/* AXIOM — Guided foundation track: Building → Floor → Room.
   Real element types, real ALLOWED_CHILDREN rules. Text is bilingual;
   demos are plain AiAction batches for the existing executeActions(). */

import type { GuidedLesson } from "./types";

export const FOUNDATION_LESSON_ID = "guided/foundation";

export const foundationLesson: GuidedLesson = {
  id: FOUNDATION_LESSON_ID,
  title: { en: "Foundation: Building → Floor → Room", ru: "Фундамент: здание → этаж → комната" },
  steps: [
    {
      id: "building",
      expect: { kind: "create", elementType: "building", context: "root", parent: "root" },
      instruction: {
        en: "Create a Building at the project root. Pick the Building tool and click the sheet.",
        ru: "Создайте здание в корне проекта. Выберите инструмент «Здание» и кликните по листу.",
      },
      hint: {
        en: "Stay at the project root (crumbs show only the project name), choose Building in the Structure group, click empty sheet.",
        ru: "Оставайтесь в корне проекта (в хлебных крошках только имя проекта), выберите «Здание» в группе Structure и кликните по пустому листу.",
      },
      demo: [{ kind: "create_element", elementType: "building" }],
      allowTools: ["building"],
      demoStartContext: "root",
    },
    {
      id: "floor",
      expect: { kind: "create", elementType: "floor", context: "building", parent: "building" },
      instruction: {
        en: "Open the Building (select it, press Enter), then create a Floor inside it.",
        ru: "Откройте здание (выберите его, нажмите Enter), затем создайте внутри этаж.",
      },
      hint: {
        en: "The validator needs two things: your context is a Building, and a new Floor lives inside a Building. Enter via tree row + Enter or the Inspector Open button.",
        ru: "Проверке нужны две вещи: контекст — здание, и новый этаж внутри здания. Вход — через строку дерева + Enter или кнопку Open в инспекторе.",
      },
      demo: [
        { kind: "enter_element", target: { kind: "building" } },
        { kind: "create_element", elementType: "floor" },
      ],
      allowTools: ["floor"],
    },
    {
      id: "room",
      expect: { kind: "create", elementType: "room", context: "floor", parent: "floor" },
      instruction: {
        en: "Open the Floor, then create a Room inside it.",
        ru: "Откройте этаж, затем создайте внутри комнату.",
      },
      hint: {
        en: "Context must be a Floor, and a new Room must live inside a Floor. Same move as before, one level deeper.",
        ru: "Контекст — этаж, и новая комната должна жить внутри этажа. Тот же приём, на уровень глубже.",
      },
      demo: [
        { kind: "enter_element", target: { kind: "floor" } },
        { kind: "create_element", elementType: "room" },
      ],
      allowTools: ["room"],
    },
  ],
};

export const guidedLessons: GuidedLesson[] = [foundationLesson];

export function guidedLessonById(id: string): GuidedLesson | null {
  return guidedLessons.find((l) => l.id === id) ?? null;
}
