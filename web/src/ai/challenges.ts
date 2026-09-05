/* AXIOM — small practice challenges. Deterministic and offline-safe so the
   tutor can always recommend an exercise. Kept intentionally light. */

import type { AiExercise, TutorContext } from "./types";

interface ChallengeDef {
  id: string;
  title: { en: string; ru: string };
  instructions: { en: string; ru: string };
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
    lessonHints: ["f1", "f2", "t2", "m1", "gothic"],
  },
  {
    id: "beam-system",
    title: { en: "Two columns + one beam", ru: "Две колонны и одна балка" },
    instructions: {
      en: "Place two columns about 200px apart, then lay a beam across their tops so it rests on both.",
      ru: "Поставьте две колонны примерно через 200px, затем положите балку так, чтобы она опиралась на обе.",
    },
    lessonHints: ["s2", "s1", "m2"],
  },
  {
    id: "two-rooms",
    title: { en: "Two rooms, one opening", ru: "Две комнаты с проёмом" },
    instructions: {
      en: "Draw two rooms next to each other and connect them with a small opening between them.",
      ru: "Нарисуйте две соседние комнаты и соедините их небольшим проёмом.",
    },
    lessonHints: ["f4", "f3", "s4"],
  },
  {
    id: "corner-frame",
    title: { en: "A corner frame", ru: "Угловая рама" },
    instructions: {
      en: "Build an L of two walls and put a column exactly at the corner where they meet.",
      ru: "Соберите две стены буквой Г и поставьте колонну точно в углу их пересечения.",
    },
    lessonHints: ["s4", "s1", "t1"],
  },
  {
    id: "materials-lab",
    title: { en: "Material study", ru: "Материальные этюды" },
    instructions: {
      en: "Make one room in concrete, one in glass, and one wall in timber — then compare how they read.",
      ru: "Сделайте одну комнату из бетона, одну из стекла и одну стену из дерева — сравните ощущение.",
    },
    lessonHints: ["f3", "m1", "m3"],
  },
  {
    id: "column-grid",
    title: { en: "Three-by-three grid", ru: "Сетка три на три" },
    instructions: {
      en: "Place a 3x3 grid of columns, then span two beams across the top row.",
      ru: "Поставьте колонны сеткой 3×3, затем положите две балки по верхнему ряду.",
    },
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