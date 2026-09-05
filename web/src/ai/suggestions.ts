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
    { label: "What should I build?", question: "What should I build in Studio?" },
    { label: "Beginner challenge", question: "Give me a beginner architecture challenge." },
    { label: "Is this a good layout?", question: "Is this a good layout so far?" },
    { label: "Explain what I made", question: "Explain what I just created." },
  ],
  ru: [
    { label: "Что мне построить?", question: "Что мне построить в Studio?" },
    { label: "Простое задание", question: "Дай мне простое задание по архитектуре." },
    { label: "Хорошая ли планировка?", question: "Хорошая ли это планировка?" },
    { label: "Что я создал?", question: "Объясни, что я только что создал." },
  ],
};

export function studySuggestions(lang: Lang): Suggestion[] {
  return [
    { label: S.explain[lang], question: S.explain[lang] },
    { label: S.example[lang], question: S.example[lang] },
    { label: S.quiz[lang], question: S.quiz[lang] },
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