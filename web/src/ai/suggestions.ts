/* AXIOM — contextual quick questions. Deterministic, no AI call required.
   Suggestions are jump-starts, not a replacement for free-form questions. */

import type { Lang } from "@/store/ui";
import type { TutorContext } from "./types";

export interface Suggestion {
  label: string;
  question: string;
}

const S = {
  explain: { en: "Explain this lesson more simply", ru: "Объясни этот урок проще" },
  example: { en: "Give me an example", ru: "Приведи пример" },
  quiz: { en: "Quiz me on this topic", ru: "Проверь меня по теме" },
  practice: { en: "What should I practice next?", ru: "Что мне практиковать дальше?" },
};

const COLUMN: Record<Lang, Suggestion[]> = {
  en: [
    { label: "Why use a column here?", question: "Why use a column here?" },
    { label: "How do columns carry loads?", question: "How do columns transfer loads?" },
    { label: "Column challenge", question: "Give me a column building challenge." },
  ],
  ru: [
    { label: "Зачем здесь колонна?", question: "Зачем использовать колонну здесь?" },
    { label: "Как колонна несёт нагрузку?", question: "Как колонны передают нагрузки?" },
    { label: "Задание с колонной", question: "Дай мне задание по колоннам." },
  ],
};

const BEAM: Record<Lang, Suggestion[]> = {
  en: [
    { label: "Why would I need this beam?", question: "Why would I need this beam?" },
    { label: "Explain beam loading", question: "Explain how beams carry loads." },
    { label: "Beam challenge", question: "Give me a beam building challenge." },
  ],
  ru: [
    { label: "Зачем нужна эта балка?", question: "Зачем мне нужна эта балка?" },
    { label: "Как работает балка?", question: "Объясни, как балка несёт нагрузку." },
    { label: "Задание с балкой", question: "Дай мне задание по балкам." },
  ],
};

const WALL: Record<Lang, Suggestion[]> = {
  en: [
    { label: "Is this a good wall placement?", question: "Is this where a wall should go?" },
    { label: "Bearing vs non-bearing walls", question: "Explain bearing vs non-bearing walls." },
    { label: "Wall challenge", question: "Give me a wall building challenge." },
  ],
  ru: [
    { label: "Удачно ли стоит стена?", question: "Здесь должна стоять стена?" },
    { label: "Несущие и не несущие стены", question: "Объясни разницу несущих и не несущих стен." },
    { label: "Задание со стеной", question: "Дай мне задание по стенам." },
  ],
};

const ROOM: Record<Lang, Suggestion[]> = {
  en: [
    { label: "How to think about this room?", question: "How should I think about this room layout?" },
    { label: "Planning exercise", question: "Give me a room planning exercise." },
  ],
  ru: [
    { label: "Как обдумать эту комнату?", question: "Как продумать планировку этой комнаты?" },
    { label: "Задание по планировке", question: "Дай мне задание по планировке комнаты." },
  ],
};

const STAGE: Record<Lang, Suggestion[]> = {
  en: [
    { label: "Create two columns + beam", question: "Create two columns and a beam between them." },
    { label: "Create a small pavilion", question: "Create a small pavilion." },
    { label: "Check my work", question: "Check my work." },
    { label: "What should I do next?", question: "What should I do next?" },
    { label: "Is this a good layout?", question: "Is this a good layout so far?" },
  ],
  ru: [
    { label: "Две колонны + балка", question: "Создай две колонны и балку между ними." },
    { label: "Построй павильон", question: "Создай небольшой павильон." },
    { label: "Проверь мою работу", question: "Проверь мою работу." },
    { label: "Что делать дальше?", question: "Что мне делать дальше?" },
    { label: "Хорошая ли планировка?", question: "Хорошая ли это планировка?" },
  ],
};

export function studySuggestions(lang: Lang): Suggestion[] {
  return [
    { label: S.explain[lang], question: S.explain[lang] },
    { label: S.example[lang], question: S.example[lang] },
    ...(lang === "en"
      ? [{ label: "Explain columns simply", question: "Explain columns simply." }]
      : [{ label: "Подробно о колоннах", question: "Объясни колонны простыми словами." }]),
    { label: S.quiz[lang], question: S.quiz[lang] },
    ...(lang === "en"
      ? [{ label: "Give me an exercise", question: "Give me a small exercise." }]
      : [{ label: "Дай мне задание", question: "Дай мне небольшое задание." }]),
    { label: S.practice[lang], question: S.practice[lang] },
  ];
}

export function studioSuggestions(ctx: TutorContext): Suggestion[] {
  const lang = ctx.lang;
  if (ctx.scope !== "studio") return [];
  const kind = ctx.selected?.kind ?? "stage";
  if (kind === "column") return COLUMN[lang];
  if (kind === "beam") return BEAM[lang];
  if (kind === "wall") return WALL[lang];
  if (kind === "room") return ROOM[lang];
  return STAGE[lang];
}