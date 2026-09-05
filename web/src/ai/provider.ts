/* AXIOM — AI provider boundary.
   UI -> service -> TutorProvider. Providers are replaceable; nothing here is
   bound to a specific vendor. The Http provider talks only to our own
   vite-provided /api/ai/* endpoint, which holds any secrets server-side. */

import type { Lang } from "@/store/ui";
import type { TutorContext, TutorProvider, TutorRequest, TutorResult } from "./types";
import { TutorUnavailableError } from "./types";
import { pickChallenge, challengeExercise } from "./challenges";

export type TutorMode = "live" | "mock" | "unknown";

/* ---------------------------------------------------------------- live --- */

export class HttpTutorProvider implements TutorProvider {
  name = "axiom-api";
  private base = "/api/ai/status";

  async chat(req: TutorRequest): Promise<TutorResult> {
    let res: Response;
    try {
      res = await fetch("/api/ai/tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: req.messages, lang: req.lang }),
      });
    } catch {
      throw new TutorUnavailableError("network");
    }
    if (res.status === 503) throw new TutorUnavailableError("unconfigured");
    if (!res.ok) throw new Error(`tutor http ${res.status}`);
    const data = (await res.json()) as { reply?: string };
    if (!data.reply) throw new Error("empty tutor reply");
    return { reply: data.reply };
  }

  async reachable(): Promise<boolean> {
    try {
      const res = await fetch(this.base);
      if (!res.ok) return false;
      const data = (await res.json()) as { configured?: boolean };
      return data.configured === true;
    } catch {
      return false;
    }
  }
}

/* ----------------------------------------------------------------- mock --- */

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

export class MockTutorProvider implements TutorProvider {
  name = "mock";

  async chat(req: TutorRequest): Promise<TutorResult> {
    await delay(420);
    const question = [...req.messages].reverse().find((m) => m.role === "user")?.content ?? "";
    const ctx = parseContext(req.messages);
    const lang = (ctx?.lang as Lang) ?? req.lang;

    if (question.includes("simulate-error")) throw new Error("mock injection error");
    if (question.includes("simulate-unavailable")) throw new TutorUnavailableError("simulated");

    return tutorAnswer(ctx, question, lang);
  }
}

/** Extract the CONTEXT block the service embeds in the system message. */
export function parseContext(messages: TutorRequest["messages"]): TutorContext | null {
  const sys = messages.find((m) => m.role === "system");
  if (!sys) return null;
  const i = sys.content.indexOf("CONTEXT = ");
  if (i < 0) return null;
  const start = i + "CONTEXT = ".length;
  const end = sys.content.lastIndexOf("}");
  if (end <= start) return null;
  try {
    return JSON.parse(sys.content.slice(start, end + 1)) as TutorContext;
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------- tutor ---- */

const has = (q: string, re: RegExp) => re.test(q);

interface TutorReply {
  reply: string;
  actions?: NonNullable<TutorResult["actions"]>;
}

function withPractice(text: string, ctx: TutorContext, lang: Lang): TutorReply {
  const def = pickChallenge(ctx);
  return {
    reply: text,
    actions: [{ type: "practice", lang, title: def.title[lang], instructions: def.instructions[lang] }],
  };
}

function tutorAnswer(ctx: TutorContext | null, question: string, lang: Lang): TutorReply {
  const q = question.toLowerCase();
  const k = (en: string, ru: string) => (lang === "ru" ? ru : en);

  const lessonTitle = ctx && ctx.scope === "study" ? ctx.lessonTitle : k("your design", "чертёж");
  const body = ctx && ctx.scope === "study" ? ctx.body : [];
  const firstLine = k("Every element you place is a decision about how a building stands and is used.",
    "Каждый поставленный элемент — это решение о том, как здание стоит и используется.");

  if (has(q, /quiz|провер|тест|check me|test me/)) {
    const quiz = ctx && ctx.scope === "study" ? ctx.quiz : undefined;
    if (quiz) {
      const correct = quiz.opts[quiz.correct] ?? "";
      const reply =
        k(
          `Quick check — ${quiz.q}\n\n` +
            `1. ${quiz.opts[0] ?? ""}\n2. ${quiz.opts[1] ?? ""}\n\n` +
            `Answer: ${correct}.\n\n` +
            `Why? In "$lessonTitle" the key idea is that ${firstLine}`,
          `Быстрая проверка — ${quiz.q}\n\n` +
            `1. ${quiz.opts[0] ?? ""}\n2. ${quiz.opts[1] ?? ""}\n\n` +
            `Ответ: ${correct}.\n\n` +
            `Почему? В «${lessonTitle}» ключевая мысль в том, что ${firstLine}`
        );
      return withPractice(reply, ctx ?? emptyCtx(lang), lang);
    }
  }

  if (has(q, /not understand|не поня|проще|simpler|simplest|more simply|простыми словами|простыми словами|again|ещё раз/)) {
    const lines = (body.length ? body : [firstLine]).slice(0, 2);
    const reply =
      k(
        `In plain words: ${lines.join(" ")}\n\n` +
          `Think of it as a rule of thumb you can test right in Studio — place a few elements and see what holds up. ` +
          `Would you like a small building exercise to try it?`,
        `Простыми словами: ${lines.join(" ")}\n\n` +
          `Воспринимайте это как правило, которое можно проверить прямо в Studio — поставьте несколько элементов и посмотрите, что держится. ` +
          `Хотите небольшое упражнение, чтобы попробовать?`
      );
    return withPractice(reply, ctx ?? emptyCtx(lang), lang);
  }

  if (has(q, /example|пример|instance|например/)) {
    const reply =
      k(
        `Example — from "$lessonTitle": ${body[0] ?? firstLine}\n\n` +
          `In Studio you can build this instantly: a beam between two columns carries the floor above, ` +
          `so the wall below can be almost entirely glass. Try it, then look at what changed.`,
        `Пример — из «${lessonTitle}»: ${body[0] ?? firstLine}\n\n` +
          `В Studio это можно собрать мгновенно: балка между двумя колоннами несёт перекрытие, ` +
          `поэтому стена под ней может быть почти целиком стеклянной. Попробуйте и посмотрите, что изменилось.`
      );
    return withPractice(reply, ctx ?? emptyCtx(lang), lang);
  }

  if (has(q, /practice|практик|next|дальше|построить|build|challenge|задани|упражн/) ) {
    return withPractice(
      k(
          `The best way to own "$lessonTitle" is to build it. Here is a focused exercise — ` +
            `when you open Studio, the challenge will stay in context for you.`,
          `Лучший способ освоить «${lessonTitle}» — построить его. Вот упражнение — ` +
            `когда вы откроете Studio, задание останется в контексте.`
        ),
      ctx ?? emptyCtx(lang),
      lang
    );
  }

  if (has(q, /beam|балк/)) {
    const reply = k(
      `A beam is a horizontal member that bends: its top squeezes, its bottom stretches, and together they span the gap between supports — that is why its depth matters more than its width.\n\n` +
        `In your design, beams turn walls into openings: two columns + one beam means the wall below can give way to glass. Try it in Studio.`,
      `Балка — горизонтальный элемент, который изгибается: сверху сжимается, снизу растягивается — поэтому глубина балки важнее её ширины.\n\n` +
        `В вашем чертеже балки превращают стены в проёмы: две колонны и одна балка — и стена снизу может уступить место стеклу. Попробуйте в Studio.`
    );
    return withPractice(reply, ctx ?? emptyCtx(lang), lang);
  }

  if (has(q, /column|колонн/)) {
    const reply = k(
      `Columns gather vertical loads and carry them down to the foundation — it is usually easier to place a column every few metres than to let a wall carry an entire floor.\n\n` +
        `The habit worth building: columns on a regular grid, beams spanning between them. Place a 3×3 grid in Studio and see how regular it feels.`,
      `Колонны собирают вертикальные нагрузки и передают их в фундамент — обычно проще поставить колонны через несколько метров, чем нагружать стену целым перекрытием.\n\n` +
        `Стоит выработать привычку: колонны регулярной сеткой, балки между ними. Поставьте сетку 3×3 в Studio и почувствуйте ритм.`
    );
    return withPractice(reply, ctx ?? emptyCtx(lang), lang);
  }

  if (has(q, /wall|стен/)) {
    const reply = k(
      `A wall does two very different jobs: it carries load, and it makes rooms. A load-bearing wall wants to be continuous and directly supported; a partition just needs a sensible place in the plan.\n\n` +
        `Before you click, ask: "Is this wall holding something up, or shaping a space?" Both are valid — they just need different thickness. Try a corner frame: two walls and a column at the corner.`,
      `Стена выполняет две разные задачи: несёт нагрузку и образует комнаты. Несущая стена хочет быть непрерывной и опёртой; перегородке нужно лишь осмысленное место в плане.\n\n` +
        `Перед кликом спросите себя: «Эта стена что-то держит или формирует пространство?» Оба ответа верны — просто разная толщина. Попробуйте угловую раму: две стены и колонна в углу.`
    );
    return withPractice(reply, ctx ?? emptyCtx(lang), lang);
  }

  if (has(q, /concrete|бетон/)) {
    const reply = k(
      `Concrete is a liquid stone: it is cheap to pour, strong in compression, weak in tension — so its global shape matters more than its texture.\n\n` +
        `In Studio, compare a thick concrete room with a thin timber one: the concrete block wants to be planted on the ground, heavy and still.`,
      `Бетон — жидкий камень: его легко залить, он крепок на сжатие и слаб на растяжение — поэтому форма важнее фактуры.\n\n` +
        `В Studio сравните массивную бетонную комнату и тонкую деревянную: бетон хочет стоять на земле, тяжёлым и неподвижным.`
    );
    return withPractice(reply, ctx ?? emptyCtx(lang), lang);
  }

  if (has(q, /room|комнат|layout|план|планир/)) {
    const reply = k(
      `A room is not a rectangle with a door — it is a decision about light, movement and scale. Before refining the shape, ask: how do you enter, where does the sun come from, what is the first thing you want to see?\n\n` +
        `Try placing two rooms side by side and connecting them with a single opening — then feel how the path changes.`,
      `Комната — это не прямоугольник с дверью, а решение о свете, движении и масштабе. Прежде чем уточнять форму, спросите: как вы входите, откуда свет, что хочется увидеть первым?\n\n` +
        `Поставьте две комнаты рядом и соедините их одним проёмом — почувствуйте, как меняется путь.`
    );
    return withPractice(reply, ctx ?? emptyCtx(lang), lang);
  }

  if (has(q, /good.*layout|хорош|what should i build|что построить|beginner|простое задание/)) {
    const n = ctx && ctx.scope === "studio" ? ctx.elementCount : 0;
    const spec =
      ctx && ctx.scope === "studio" && ctx.selected
        ? `Your selected ${ctx.selected.kind} (${ctx.selected.w}×${ctx.selected.h}, ${ctx.selected.material}) — `
        : "";
    const reply =
      k(
        `${spec}You have ${n} element${n === 1 ? "" : "s"} on the sheet now. ` +
          `The most instructive next move is usually a tiny, complete structure — a room with a column, or two columns with a beam — so every part has an obvious job. ` +
          `Here is one to try:`,
        `${spec}На листе сейчас ${n} элемен${n % 10 === 1 && n % 100 !== 11 ? "т" : "тов"}. ` +
          `Самый поучительный следующий шаг — маленькая законченная конструкция: комната с колонной или две колонны с балкой, чтобы у каждой части была понятная роль. ` +
          `Попробуйте:`
      );
    return withPractice(reply, ctx ?? emptyCtx(lang), lang);
  }

  /* default */
  const line = body[1] ?? body[0] ?? firstLine;
  const reply =
    k(
      `Good question. In "$lessonTitle": ${line}\n\n` +
        `Think about it as a cause-and-effect chain — change one part and see what the building does. ` +
        `Which part should we look at closer: the structure, the light, or the material?`,
      `Хороший вопрос. В «${lessonTitle}»: ${line}\n\n` +
        `Подумайте об этом как о цепочке причин и следствий — измените одну часть и посмотрите, что сделает здание. ` +
        `Что разберём подробнее: конструкцию, свет или материал?`
    );
  return { reply };
}

function emptyCtx(lang: Lang): TutorContext {
  return {
    scope: "study",
    lang,
    courseId: "",
    courseName: "",
    lessonNum: 1,
    lessonId: "",
    lessonTitle: "architecture",
    level: "beginner",
    duration: "",
    body: [],
    lessonCompleted: false,
    done: 0,
    total: 0,
  };
}