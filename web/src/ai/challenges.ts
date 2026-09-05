/* AXIOM — small practice challenges. Deterministic and offline-safe so the
   tutor can always recommend an exercise. Kept intentionally light. */

import type { AiExercise, AiExercisePayload, TutorContext } from "./types";
import type { Lang } from "@/store/ui";

interface ChallengeDef {
  id: string;
  title: { en: string; ru: string };
  instructions: { en: string; ru: string };
  objective: { en: string; ru: string };
  hint: { en: string; ru: string };
  lessonHints: string[];
}

const CHALLENGES: ChallengeDef[] = [
  {
    id: "pavilion",
    title: { en: "Build a small pavilion", ru: "Постройте небольшой павильон" },
    instructions: {
      en: "Place one room, then add four walls around it and a single structural column inside.",
      ru: "Поставьте одну комнату, затем добавьте четыре стены вокруг неё и одну колонну внутри.",
    },
    objective: { en: "Practice composing a tiny complete structure with a clear load path.", ru: "Потренируйтесь собирать маленькую законченную конструкцию с понятным путём нагрузок." },
    hint: { en: "Think about what supports the roof in the middle of the room.", ru: "Подумайте, что держит перекрытие в середине комнаты." },
    lessonHints: ["f1", "f2", "t2", "m1", "gothic"],
  },
  {
    id: "beam-system",
    title: { en: "Two columns + one beam", ru: "Две колонны и одна балка" },
    instructions: {
      en: "Place two columns about 200px apart, then lay a beam across their tops so it rests on both.",
      ru: "Поставьте две колонны примерно через 200px, затем положите балку так, чтобы она опиралась на обе.",
    },
    objective: { en: "Understand the simplest portal: two supports and what they carry.", ru: "Понять простейший портик: две опоры и то, что они несут." },
    hint: { en: "Think about what supports the beam.", ru: "Подумайте, что поддерживает балку." },
    lessonHints: ["s2", "s1", "m2"],
  },
  {
    id: "two-rooms",
    title: { en: "Two rooms, one opening", ru: "Две комнаты с проёмом" },
    instructions: {
      en: "Draw two rooms next to each other and connect them with a small opening between them.",
      ru: "Нарисуйте две соседние комнаты и соедините их небольшим проёмом.",
    },
    objective: { en: "Explore how plan openings shape the path through a space.", ru: "Исследовать, как проёмы в плане задают путь через пространство." },
    hint: { en: "Where should the opening go so the path feels natural?", ru: "Где проём сделать так, чтобы путь был естественным?" },
    lessonHints: ["f4", "f3", "s4"],
  },
  {
    id: "corner-frame",
    title: { en: "A corner frame", ru: "Угловая рама" },
    instructions: {
      en: "Build an L of two walls and put a column exactly at the corner where they meet.",
      ru: "Соберите две стены буквой Г и поставьте колонну точно в углу их пересечения.",
    },
    objective: { en: "Learn to stabilise an opening with a concentrated support.", ru: "Научиться усиливать угол сосредоточенной опорой." },
    hint: { en: "The corner is where two directions of load meet.", ru: "В углу сходятся два направления нагрузок." },
    lessonHints: ["s4", "s1", "t1"],
  },
  {
    id: "materials-lab",
    title: { en: "Material study", ru: "Материальные этюды" },
    instructions: {
      en: "Make one room in concrete, one in glass, and one wall in timber — then compare how they read.",
      ru: "Сделайте одну комнату из бетона, одну из стекла и одну стену из дерева — сравните ощущение.",
    },
    objective: { en: "Compare how materials change the character of the same form.", ru: "Сравнить, как материал меняет характер одинаковой формы." },
    hint: { en: "Look at weight: massive vs. light.", ru: "Обратите внимание на массу: тяжёлое и лёгкое." },
    lessonHints: ["f3", "m1", "m3"],
  },
  {
    id: "column-grid",
    title: { en: "Three-by-three grid", ru: "Сетка три на три" },
    instructions: {
      en: "Place a 3x3 grid of columns, then span two beams across the top row.",
      ru: "Поставьте колонны сеткой 3×3, затем положите две балки по верхнему ряду.",
    },
    objective: { en: "Feel the rhythm of a regular structural grid.", ru: "Почувствовать ритм регулярной сетки колонн." },
    hint: { en: "A regular grid makes the structure easy to read.", ru: "Регулярная сетка делает конструкцию легко читаемой." },
    lessonHints: ["m2", "s2", "f2"],
  },
];

function lessonHint(def: ChallengeDef, lessonId: string | undefined): boolean {
  if (!lessonId) return false;
  const id = lessonId.toLowerCase();
  return def.lessonHints.some((h) => id === h.toLowerCase());
}

/** Deterministic pick: lesson hint wins, else walk the set by hash. */
export function pickChallenge(ctx: TutorContext): ChallengeDef {
  const lessonId = ctx.scope === "study" ? ctx.lessonId : undefined;
  const hinted = CHALLENGES.find((c) => lessonHint(c, lessonId));
  if (hinted) return hinted;

  let seed = 0;
  const s = lessonId ?? (ctx.scope === "studio" ? ctx.projectName : "lesson");
  for (let i = 0; i < s.length; i++) seed = (seed * 31 + s.charCodeAt(i)) >>> 0;
  return CHALLENGES[seed % CHALLENGES.length];
}

export function challengeExercise(def: ChallengeDef, lang: "en" | "ru"): AiExercise {
  return {
    id: def.id,
    lang,
    title: def.title[lang],
    instructions: def.instructions[lang],
  };
}

export function challengePayload(def: ChallengeDef, lang: Lang): AiExercisePayload {
  return {
    title: def.title[lang],
    objective: def.objective[lang],
    task: def.instructions[lang],
    hint: def.hint[lang],
  };
}