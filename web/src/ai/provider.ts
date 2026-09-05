/* AXIOM — AI provider boundary.
   UI -> service -> TutorProvider. Providers are replaceable; nothing here is
   bound to a specific vendor. The Http provider talks only to our own
   vite-provided /api/ai/* endpoint, which holds any secrets server-side.
   Structured actions are parsed/validated client-side by ai/actions.ts. */

import type { Lang } from "@/store/ui";
import type { AiAction, AiExercisePayload, TutorContext, TutorProvider, TutorRequest, TutorResult } from "./types";
import { TutorUnavailableError } from "./types";
import { pickChallenge, challengePayload } from "./challenges";

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
    if (question.includes("simulate-invalid-action")) {
      return {
        reply:
          `I prepared an action, but it was not valid, so nothing changed. ` +
          `<axiom-actions>[{"kind":"create_element","elementType":"mystery"}]</axiom-actions> ` +
          `If you like, tell me what you wanted to build and I will try again.`,
      };
    }
    if (question.includes("simulate-malformed")) {
      return {
        reply:
          `Here is a broken action block: <axiom-actions>[not valid json</axiom-actions>. ` +
          `The app rejected it safely, so nothing changed on the sheet.`,
      };
    }

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
  actions?: AiAction[];
  exercise?: AiExercisePayload;
}

function k(lang: Lang, en: string, ru: string): string {
  return lang === "ru" ? ru : en;
}

function withExercise(reply: string, ctx: TutorContext, lang: Lang): TutorReply {
  const def = pickChallenge(ctx);
  return {
    reply,
    exercise: challengePayload(def, lang),
  };
}

/* --- mock studio engine ------------------------------------------------ */

function studioCounts(ctx: TutorContext): Record<string, number> {
  if (ctx.scope !== "studio") return {};
  return ctx.counts ?? {};
}

/** Deterministic, beginner-level review of the current sheet. */
function reviewWork(ctx: TutorContext, lang: Lang): string {
  const counts = studioCounts(ctx);
  const n = Object.values(counts).reduce((a, b) => a + b, 0);
  const c = counts.column ?? 0;
  const b = counts.beam ?? 0;
  const w = counts.wall ?? 0;
  const r = counts.room ?? 0;
  const body: string[] = [];

  if (n === 0) return k(lang,
    "Your sheet is empty. There is nothing to check yet — try the two-column + beam exercise: it is the smallest structure with a clear load path.",
    "Лист пуст. Проверять пока нечего — попробуйте упражнение «две колонны и балка»: это самая маленькая конструкция с понятным путём нагрузок.");

  if (c >= 2 && b >= 1) body.push(k(lang,
    "✓ Two columns exist and a beam spans between them — the basic load path is in place.",
    "✓ Есть две колонны, и между ними лежит балка — базовый путь нагрузок собран."));
  else if (c >= 2)
    body.push(k(lang,
      "✓ Two columns exist. Add one beam resting on both to complete the frame.",
      "✓ Есть две колонны. Добавьте балку, лежащую на обеих, чтобы завершить раму."));
  else if (b >= 1 && c === 0)
    body.push(k(lang,
      "A beam is floating without supports — beams normally rest on columns or walls.",
      "Балка висит без опор — обычно она лежит на колоннах или стенах."));

  if (r >= 1 && w >= 4)
    body.push(k(lang,
      "✓ The room is enclosed by walls — you have a readable `pavilion` shape.",
      "✓ Комната обнесена стенами — получилась читаемая форма «павильона»."));
  else if (r >= 1 && w > 0)
    body.push(k(lang,
      "Your room has only " + w + " wall" + (w === 1 ? "" : "s") + " around it. For a closed pavilion you need four.",
      "Комнату окружает " + w + " стен" + (w === 1 ? "а" : "ы") + ". Для замкнутого павильона нужно четыре."));

  if (c === 0 && b === 0 && w === 0 && r > 0)
    body.push(k(lang,
      "You have a room but no structure around it. Think about what carries its roof.",
      "У вас есть комната без конструкции. Подумайте, что несёт её перекрытие."));

  const lines = body.length
    ? body.join("\n")
    : k(lang,
        "The sheet has " + n + " element" + (n === 1 ? "" : "s") + ". Keep an eye on relationships: what supports what, and whether every part has a job.",
        "На листе " + n + " элемен" + (n % 10 === 1 ? "т" : "тов") + ". Следите за связями: что что поддерживает и есть ли у каждой части своя роль.");

  const concept = k(lang,
    "\nThis is educational feedback, not engineering validation. Next, try explaining the structure yourself — why does the beam need two supports?",
    "\nЭто учебная оценка, а не инженерная проверка. Дальше попробуйте сами объяснить конструкцию — почему балке нужны две опоры?");
  return lines + concept;
}

/** Tutorial "what next" suggestion based on the actual sheet contents. */
function nextStep(ctx: TutorContext, lang: Lang): TutorReply {
  const counts = studioCounts(ctx);
  const c = counts.column ?? 0;
  const b = counts.beam ?? 0;
  if (c === 0)
    return withExercise(k(lang,
      "Start with the smallest complete structure: place two columns, then a beam across their tops.",
      "Начнём с самой маленькой законченной конструкции: поставьте две колонны, затем балку поверх них."),
      ctx, lang);
  if (b === 0)
    return { reply: k(lang,
      "You have " + c + " column" + (c === 1 ? "" : "s") + " but no beam. Lay a beam across them so the load can travel.",
      "У вас " + c + " колонн" + (c === 1 ? "а" : "ы") + ", но нет балки. Положите балку, чтобы нагрузка могла передаваться.") };
  return withExercise(k(lang,
    "You have columns and a beam — a real frame. Next: ask me to check your work, or try a pavilion with walls and a room.",
    "У вас есть колонны и балка — настоящая рама. Дальше: попросите проверить работу или постройте павильон со стенами и комнатой."),
    ctx, lang);
}

function explainSelection(ctx: TutorContext, question: string, lang: Lang): TutorReply {
  if (ctx.scope !== "studio" || !ctx.selected) {
    return { reply: k(lang,
      "Select an element on the sheet and I will explain what it does and how it fits your layout.",
      "Выберите элемент на листе, и я объясню, что он делает и как вписывается в планировку.") };
  }
  const s = ctx.selected;
  const name = s.name.toLowerCase();
  const kindLine = kindLineFor(s.kind);
  return {
    reply: k(lang,
      `You have a ${name} at (${s.x}, ${s.y}) sized ${s.w}×${s.h} in ${s.material}. ` + kindLine.en + ` ` +
        `In this project it has ${s.w === s.h ? "a balanced" : "an elongated"} shape, which is ${s.w > s.h ? "typical for spanning openings" : "fine for concentrating a point load"}. ` +
        `Try changing its material and watch how the element's weight changes the whole sheet.`,
      `У вас ${ruNameFor(s.kind)} в (${s.x}, ${s.y}) размером ${s.w}×${s.h} из ${ruMaterial(s.material)}. ` + kindLine.ru + ` ` +
        `В этом проекте у неё ${s.w === s.h ? "сбалансированная" : "вытянутая"} форма, что ${s.w > s.h ? "характерно для перекрытия проёмов" : "хорошо для сосредоточенной опоры"}. ` +
        `Попробуйте сменить материал — и посмотрите, как изменится вес всего листа.`),
  };
}

function kindLineFor(kind: string): { en: string; ru: string } {
  switch (kind) {
    case "column":
      return { en: "It is a column, so it takes vertical load and carries it down to the foundation.",
        ru: "Это колонна: она принимает вертикальную нагрузку и передаёт её в фундамент." };
    case "beam":
      return { en: "It is a beam, so it spans between supports and bends under the load above.",
        ru: "Это балка: она перекрывает пролёт между опорами и изгибается под нагрузкой." };
    case "wall":
      return { en: "It is a wall — it either carries load or shapes the space.",
        ru: "Это стена — она либо несёт нагрузку, либо формирует пространство." };
    default:
      return { en: "It is a room, so it defines a space for a way of living or working.",
        ru: "Это комната: она задаёт пространство для жизни или работы." };
  }
}
function ruNameFor(kind: string): string {
  return kind === "column" ? "колонна" : kind === "beam" ? "балка" : kind === "wall" ? "стена" : "комната";
}
function ruMaterial(m: string): string {
  return m === "concrete" ? "бетона" : m === "brick" ? "кирпича" : m === "glass" ? "стекла" : m === "timber" ? "дерева" : "стали";
}

function tutorAnswer(ctx: TutorContext | null, question: string, lang: Lang): TutorReply {
  const q = question.toLowerCase();
  const isStudy = !ctx || ctx.scope === "study";

  /* ---- exercise offers (both scopes) ------------------------------------- */
  if (has(q, /exercise|challenge|задани|упражн|дай мне.*(задани|упражн)/)) {
    if (isStudy) {
      return withExercise(
        k(lang,
          "Here is a practice exercise tied to what you are reading. When you open Studio it stays in context.",
          "Вот упражнение по теме текущего урока. Когда откроете Studio, оно останется в контексте."),
        ctx ?? emptyCtx(lang), lang);
    }
    return withExercise(
      k(lang,
        "Here is a small challenge you can solve right now in Studio.",
        "Вот небольшое задание, которое можно решить прямо в Studio."),
      ctx, lang);
  }

  if (isStudy) {
    return studyAnswer(ctx as Exclude<TutorContext, { scope: "studio" }>, question, lang);
  }

  /* ---- studio action engine ---------------------------------------------- */
  const cctx = ctx as Extract<TutorContext, { scope: "studio" }>;

  if (has(q, /check my work|проверь мою работу|проверь|оцени мою работу/)) {
    return { reply: reviewWork(cctx, lang) };
  }

  if (has(q, /what should i do next|what's next|what is next|что дальше|что мне делать|что делать дальше/)) {
    return nextStep(cctx, lang);
  }

  if (has(q, /what did i.*(create|make|build)|what.*(selected|made)|объясни|что я сделал|что я создал|что я выбрал/)) {
    return explainSelection(cctx, question, lang);
  }

  /* creation — two columns (+ beam) */
  if (has(q, /two columns.*beam|2 columns.*beam|две колонны.*балк|два столба.*балк/) ||
      has(q, /create two columns|place two columns|две колонн|2 колонн/)) {
    const c1: AiAction = { kind: "create_element", elementType: "column", x: 120, y: 180 };
    const c2: AiAction = { kind: "create_element", elementType: "column", x: 340, y: 180 };
    if (has(q, /beam|балк|connect/)) {
      const beam: AiAction = { kind: "create_element", elementType: "beam", x: 120, y: 166, w: 256, h: 14 };
      return {
        reply: k(lang,
          "Done — I placed two concrete columns and a beam across their tops. The beam now carries load from one support to the other.",
          "Готово — я поставил две бетонные колонны и балку поверх них. Теперь балка передаёт нагрузку от одной опоры к другой."),
        actions: [c1, c2, beam],
      };
    }
    return {
      reply: k(lang,
        "Done — two concrete columns placed. Next step: lay a beam across their tops.",
        "Готово — две бетонные колонны расставлены. Следующий шаг: положите балку поверх них."),
      actions: [c1, c2],
    };
  }

  /* pavilion */
  if (has(q, /pavilion|павильон/)) {
    const actions: AiAction[] = [
      { kind: "create_element", elementType: "room", x: 140, y: 140 },
      { kind: "create_element", elementType: "wall", x: 120, y: 126, w: 220, h: 14 },
      { kind: "create_element", elementType: "wall", x: 120, y: 270, w: 220, h: 14 },
      { kind: "create_element", elementType: "wall", x: 126, y: 126, w: 14, h: 158 },
      { kind: "create_element", elementType: "wall", x: 340, y: 126, w: 14, h: 158 },
      { kind: "create_element", elementType: "column", x: 232, y: 200 },
    ];
    return {
      reply: k(lang,
        "Done — a room, four enclosing walls and a column inside to support the roof at its centre.",
        "Готово — комната, четыре стены по периметру и колонна в центре, которая поддержит перекрытие."),
      actions,
    };
  }

  /* columns in the four corners */
  if (has(q, /four columns.*corner|columns in.*corner|колонн.*угл|по углам/)) {
    const actions: AiAction[] = [
      { kind: "create_element", elementType: "column", x: 40, y: 40 },
      { kind: "create_element", elementType: "column", x: 826, y: 40 },
      { kind: "create_element", elementType: "column", x: 40, y: 526 },
      { kind: "create_element", elementType: "column", x: 826, y: 526 },
    ];
    return {
      reply: k(lang,
        "Done — four corner columns, 34×34 concrete each. They define the footprint of the building.",
        "Готово — четыре угловые колонны 34×34 из бетона. Они задают пятно застройки."),
      actions,
    };
  }

  /* dimensioned room, e.g. "a room 4 by 6 meters" */
  const dm = q.match(/(\d+)\s*(?:by|на|х|x|\*)\s*(\d+)\s*(?:meter|meters|м|метра|метров)/);
  if (dm && /room|комнат/.test(q)) {
    const w = Math.round((Number(dm[1]) * 40) / 8) * 8;
    const h = Math.round((Number(dm[2]) * 40) / 8) * 8;
    const actions: AiAction[] = [{ kind: "create_element", elementType: "room", w, h }];
    return {
      reply: k(lang,
        `Done — placed a ${Number(dm[1])}×${Number(dm[2])} m room (${w}×${h} px at 1m = 40px).`,
        `Готово — комната ${Number(dm[1])}×${Number(dm[2])} м (${w}×${h} px, 1м = 40px).`),
      actions,
    };
  }

  /* make the selected element twice as wide */
  if (has(q, /twice as wide|in half|в два раза шире|вдвое шире/)) {
    const target = cctx.selected && cctx.selected.kind === "room" ? { id: cctx.selected.id } : { last: true };
    const w = cctx.selected?.w ?? 180;
    return {
      reply: k(lang,
        `Done — made that element ${w * 2} px wide, twice its previous width.`,
        `Готово — элемент теперь ${w * 2} px в ширину, вдвое шире прежнего.`),
      actions: [{ kind: "resize_element", target, w: w * 2 }],
    };
  }

  if (has(q, /duplicate|дублируй|скопируй|продублируй|copy this/)) {
    const dir = has(q, /right|вправо|направо/) ? 80 : has(q, /left|влево|налево/) ? -80 : 0;
    return {
      reply: k(lang,
        "Duplicated the selected element with an offset to the right.",
        "Скопировал выбранный элемент со смещением вправо."),
      actions: [{ kind: "duplicate_element", target: { last: true }, dx: dir }],
    };
  }

  /* move */
  const mv = q.match(/move|передвинь|сдвинь|перемести/);
  if (mv) {
    const right = has(q, /right|вправо|направо|правее/);
    const up = has(q, /up|вверх|выше/);
    const left = has(q, /left|влево|налево|левее/);
    const down = has(q, /down|вниз|ниже/);
    const amt = q.match(/(\d+)/);
    const dist = amt ? Number(amt[1]) * (/(m\b|м\b|meter|метр)/.test(q) ? 40 : 1) : 40;
    const d = right ? [dist, 0] : left ? [-dist, 0] : up ? [0, -dist] : down ? [0, dist] : [dist, 0];
    return {
      reply: k(lang,
        `Moved the selected element ${Math.abs(d[0]) + Math.abs(d[1]) > 0 ? "by " + Math.abs(d[0] || d[1]) + "px" : "slightly"}.`,
        `Передвинул выбранный элемент ${Math.abs(d[0]) + Math.abs(d[1]) > 0 ? "на " + Math.abs(d[0] || d[1]) + "px" : "чуть-чуть"}.`),
      actions: [{ kind: "move_element", target: { last: true }, dx: d[0], dy: d[1] }],
    };
  }

  /* set material */
  const mat = q.match(/(timber|glass|steel|brick|concrete)|из (дерева|стекла|стали|кирпича|бетона)/);
  if (mat && has(q, /material|make|сделай|материал|цвет/)) {
    const mru = mat[2];
    const material = mru ? { дерева: "timber", стекла: "glass", стали: "steel", кирпича: "brick", бетона: "concrete" }[mru] ?? "concrete" : (mat[1] as string);
    return {
      reply: k(lang,
        `Set the selected element's material to ${material}.`,
        `Задал выбранному элементу материал ${ruMaterial(material)}.`),
      actions: [{ kind: "set_material", target: { last: true }, material } as AiAction],
    };
  }

  /* delete */
  if (has(q, /delete|remove|удали|удалить|убрать/)) {
    return {
      reply: k(lang,
        "I can delete the selected element. Confirm to apply.",
        "Я могу удалить выбранный элемент. Подтвердите для применения."),
      actions: [{ kind: "delete_element", target: { last: true } }],
    };
  }

  /* clear project */
  if (has(q, /clear.*project|clear.*sheet|очисти проект|очисти лист|стер/)) {
    return {
      reply: k(lang,
        "I can clear the whole sheet. This removes every element — confirm to apply.",
        "Я могу очистить весь лист. Это удалит все элементы — подтвердите."),
      actions: [{ kind: "clear_project" }],
    };
  }

  /* generic studio tutor */
  const n = cctx.elementCount;
  return {
    reply: k(lang,
      `You have ${n} element${n === 1 ? "" : "s"} on the sheet. Tell me what to build or change — for example: ` +
        `"create two columns and a beam", "check my work", or "what should I do next?".`,
      `На листе ${n} элемен${n % 10 === 1 ? "т" : "тов"}. Скажите, что построить или изменить — например: ` +
        `«создай две колонны и балку», «проверь мою работу» или «что делать дальше?».`),
  };
}

/* ---- study tutor (lesson-driven) --------------------------------------- */

function studyAnswer(ctx: Extract<TutorContext, { scope: "study" }>, question: string, lang: Lang): TutorReply {
  const q = question.toLowerCase();
  const kk = (en: string, ru: string) => k(lang, en, ru);
  const lessonTitle = ctx.lessonTitle;
  const body = ctx.body;
  const firstLine = kk("Every element you place is a decision about how a building stands and is used.",
    "Каждый поставленный элемент — это решение о том, как здание стоит и используется.");

  if (has(q, /quiz|провер|тест|check me|test me/)) {
    const quiz = ctx.quiz;
    if (quiz) {
      const correct = quiz.opts[quiz.correct] ?? "";
      return {
        reply: kk(
          `Quick check — ${quiz.q}\n\n1. ${quiz.opts[0] ?? ""}\n2. ${quiz.opts[1] ?? ""}\n\nAnswer: ${correct}.\n\nWhy? In "${lessonTitle}" the key idea is that ${firstLine}`,
          `Быстрая проверка — ${quiz.q}\n\n1. ${quiz.opts[0] ?? ""}\n2. ${quiz.opts[1] ?? ""}\n\nОтвет: ${correct}.\n\nПочему? В «${lessonTitle}» ключевая мысль в том, что ${firstLine}`
        ),
      };
    }
  }

  if (has(q, /not understand|не поня|проще|simpler|simplest|простыми словами|ещё раз|again/)) {
    const lines = (body.length ? body : [firstLine]).slice(0, 2);
    return withExercise(
      kk(
        `In plain words: ${lines.join(" ")}\n\nThink of it as a rule of thumb you can test right in Studio — place a few elements and see what holds up.`,
        `Простыми словами: ${lines.join(" ")}\n\nВоспринимайте это как правило, которое можно проверить прямо в Studio — поставьте несколько элементов и посмотрите, что держится.`),
      ctx, lang);
  }

  if (has(q, /example|пример|instance/)) {
    return withExercise(
      kk(
        `Example — from "${lessonTitle}": ${body[0] ?? firstLine}\n\nIn Studio you can build this instantly: a beam between two columns carries the floor above, so the wall below can be almost entirely glass.`,
        `Пример — из «${lessonTitle}»: ${body[0] ?? firstLine}\n\nВ Studio это можно собрать мгновенно: балка между двумя колоннами несёт перекрытие, поэтому стена под ней может быть почти целиком стеклянной.`),
      ctx, lang);
  }

  if (has(q, /beam|балк/)) {
    return withExercise(
      kk(
        `A beam is a horizontal member that bends: its top squeezes, its bottom stretches, and together they span the gap between supports — that is why its depth matters more than its width.\n\nIn your design, beams turn walls into openings: two columns + one beam means the wall below can give way to glass.`,
        `Балка — горизонтальный элемент, который изгибается: сверху сжимается, снизу растягивается — поэтому глубина балки важнее её ширины.\n\nВ вашем чертеже балки превращают стены в проёмы: две колонны и одна балка — и стена снизу может уступить место стеклу.`),
      ctx, lang);
  }

  if (has(q, /column|колонн|simpl.*column|объясни.*колонн/)) {
    return withExercise(
      kk(
        `Simply put: a column is a vertical strut that takes load from above and carries it down to the ground. Wherever a beam or a roof needs a point of support, a column is the simplest answer.\n\nThink of a table: the top is the beam/floor, the legs are the columns. Remove one leg and the top tilts.`,
        `Простыми словами: колонна — это вертикальный стержень, который принимает нагрузку сверху и передаёт её в землю. Где балке или перекрытию нужна точка опоры, колонна — самое простое решение.\n\nПредставьте стол: столешница — это балка/перекрытие, ножки — колонны. Уберите одну ножку — и столешница наклонится.`),
      ctx, lang);
  }

  if (has(q, /wall|стен/)) {
    return withExercise(
      kk(
        `A wall does two very different jobs: it carries load, and it makes rooms. A load-bearing wall wants to be continuous and directly supported; a partition just needs a sensible place in the plan.\n\nBefore you click, ask: "Is this wall holding something up, or shaping a space?"`,
        `Стена выполняет две разные задачи: несёт нагрузку и образует комнаты. Несущая стена хочет быть непрерывной и опёртой; перегородке нужно лишь осмысленное место в плане.\n\nПеред кликом спросите себя: «Эта стена что-то держит или формирует пространство?»`),
      ctx, lang);
  }

  if (has(q, /room|комнат|layout|планир/)) {
    return withExercise(
      kk(
        `A room is not a rectangle with a door — it is a decision about light, movement and scale. Before refining the shape, ask: how do you enter, where does the sun come from, what is the first thing you want to see?`,
        `Комната — это не прямоугольник с дверью, а решение о свете, движении и масштабе. Прежде чем уточнять форму, спросите: как вы входите, откуда свет, что хочется увидеть первым?`),
      ctx, lang);
  }

  if (has(q, /concrete|бетон/)) {
    return withExercise(
      kk(
        `Concrete is a liquid stone: it is cheap to pour, strong in compression, weak in tension — so its global shape matters more than its texture.\n\nIn Studio, compare a thick concrete room with a thin timber one.`,
        `Бетон — жидкий камень: его легко залить, он крепок на сжатие и слаб на растяжение — поэтому форма важнее фактуры.\n\nВ Studio сравните массивную бетонную комнату и тонкую деревянную.`),
      ctx, lang);
  }

  if (has(q, /what should i practice|что практиковать|practice next|что дальше|дальше практиковать/)) {
    return withExercise(
      kk(
        `The best way to own "${lessonTitle}" is to build it. Here is a focused exercise — when you open Studio, the challenge will stay in context.`,
        `Лучший способ освоить «${lessonTitle}» — построить его. Вот упражнение — когда вы откроете Studio, задание останется в контексте.`),
      ctx, lang);
  }

  /* default */
  const line = body[1] ?? body[0] ?? firstLine;
  return {
    reply: kk(
      `Good question. In "${lessonTitle}": ${line}\n\nThink about it as a cause-and-effect chain — change one part and see what the building does. Which part should we look at closer: the structure, the light, or the material?`,
      `Хороший вопрос. В «${lessonTitle}»: ${line}\n\nПодумайте об этом как о цепочке причин и следствий — измените одну часть и посмотрите, что сделает здание. Что разберём подробнее: конструкцию, свет или материал?`)
  };
}

function emptyCtx(lang: Lang): Extract<TutorContext, { scope: "study" }> {
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
    exercise: null,
  };
}