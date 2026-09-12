/* AXIOM — Guided step validator. PURE: (StudioSnapshot + GuidedStep) ->
   ValidationResult. No state writes, no AI calls, no DOM. Unit-testable. */

import type { Element as StudioElement, ElementKind } from "@/studio/types";
import type { FailedCheck, GuidedStep, StudioSnapshot, ValidationResult } from "./types";

const KIND_RU: Record<ElementKind, string> = {
  building: "здание",
  floor: "этаж",
  room: "комната",
  corridor: "коридор",
  wall: "стена",
  door: "дверь",
  window: "окно",
  roof: "крыша",
  column: "колонна",
  beam: "балка",
};

function kindLabel(kind: ElementKind, lang: "en" | "ru"): string {
  return lang === "ru" ? KIND_RU[kind] : kind;
}

function fail(
  failedCheck: FailedCheck,
  en: string,
  ru: string,
): ValidationResult {
  return { ok: false, failedCheck, detail: { en, ru }, matchedIds: [] };
}

function pass(matchedIds: string[]): ValidationResult {
  return { ok: true, failedCheck: null, detail: null, matchedIds };
}

function projectOf(state: StudioSnapshot) {
  return state.projects[state.currentIdx] ?? null;
}

function contextKind(state: StudioSnapshot): { atRoot: boolean; kind: ElementKind | null } {
  const proj = projectOf(state);
  if (!proj || state.contextId == null) return { atRoot: true, kind: null };
  const el = proj.elements.find((e) => e.id === state.contextId);
  if (!el) return { atRoot: true, kind: null };
  return { atRoot: false, kind: el.kind };
}

function newElements(state: StudioSnapshot, baselineIds: string[]): StudioElement[] {
  const proj = projectOf(state);
  if (!proj) return [];
  const base = new Set(baselineIds);
  return proj.elements.filter((e) => !base.has(e.id));
}

function parentOf(state: StudioSnapshot, el: StudioElement): StudioElement | null {
  const proj = projectOf(state);
  if (!proj || el.parentId == null) return null;
  return proj.elements.find((e) => e.id === el.parentId) ?? null;
}

function parentMatches(state: StudioSnapshot, el: StudioElement, parent: "root" | ElementKind): boolean {
  if (parent === "root") return (el.parentId ?? null) === null;
  return parentOf(state, el)?.kind === parent;
}

function dimsOk(el: StudioElement, step: GuidedStep): boolean {
  const { w, h, tol = 0 } = step.expect;
  if (w === undefined && h === undefined) return true;
  if (w !== undefined && Math.abs(el.w - w) > tol) return false;
  if (h !== undefined && Math.abs(el.h - h) > tol) return false;
  return true;
}

function checkContext(
  state: StudioSnapshot,
  want: "root" | ElementKind,
): ValidationResult | null {
  const ctx = contextKind(state);
  const ok = want === "root" ? ctx.atRoot : ctx.kind === want;
  if (ok) return null;
  const where =
    want === "root"
      ? { en: "at the project root", ru: "в корне проекта" }
      : { en: `inside a ${want}`, ru: `внутри: ${KIND_RU[want]}` };
  const here = ctx.atRoot
    ? { en: "at the project root", ru: "в корне проекта" }
    : { en: `inside a ${ctx.kind}`, ru: `внутри: ${ctx.kind ? KIND_RU[ctx.kind] : "?"}` };
  return fail(
    "context",
    `Wrong context: be ${where.en}, you are ${here.en}.`,
    `Не тот контекст: нужно ${where.ru}, а вы ${here.ru}.`,
  );
}

/** Validate one guided step against a read-only Studio snapshot.
    baselineIds = element ids that existed when the student phase began —
    only newer elements count as the student's work. Checks run in order:
    context → type → parent → dimensions → material → count. */
export function validate(
  state: StudioSnapshot,
  step: GuidedStep,
  baselineIds: string[],
): ValidationResult {
  const proj = projectOf(state);
  if (!proj) return fail("missing-element", "No project is open.", "Нет открытого проекта.");
  const exp = step.expect;

  if (exp.context !== undefined) {
    const bad = checkContext(state, exp.context);
    if (bad) return bad;
  }

  switch (exp.kind) {
    case "enter": {
      if (!exp.elementType) return fail("context", "Step is misconfigured.", "Шаг настроен неверно.");
      const ctx = contextKind(state);
      if (ctx.kind === exp.elementType) return pass([]);
      return fail(
        "context",
        `Open a ${exp.elementType} first.`,
        `Сначала откройте: ${KIND_RU[exp.elementType]}.`,
      );
    }

    case "select": {
      const sel = proj.elements.find((e) => e.id === state.selectedId) ?? null;
      if (!sel || (exp.elementType && sel.kind !== exp.elementType)) {
        const want = exp.elementType ? kindLabel(exp.elementType, "en") : "an element";
        const wantRu = exp.elementType ? KIND_RU[exp.elementType] : "элемент";
        return fail(
          "selection",
          `Select ${want} on the sheet or in the tree.`,
          `Выберите ${wantRu} на листе или в дереве.`,
        );
      }
      return pass([sel.id]);
    }

    case "set_material": {
      const sel = proj.elements.find((e) => e.id === state.selectedId) ?? null;
      if (!sel) {
        return fail("selection", "Select an element first.", "Сначала выберите элемент.");
      }
      if (exp.elementType && sel.kind !== exp.elementType) {
        return fail(
          "selection",
          `That is a ${sel.kind}; select a ${exp.elementType}.`,
          `Это «${KIND_RU[sel.kind]}», а нужен «${KIND_RU[exp.elementType]}».`,
        );
      }
      if (exp.material && sel.material !== exp.material) {
        return fail(
          "material",
          `Material is ${sel.material}; set it to ${exp.material}.`,
          `Материал — ${sel.material}; поставьте ${exp.material}.`,
        );
      }
      return pass([sel.id]);
    }

    case "create":
    default: {
      if (!exp.elementType) return fail("missing-element", "Step is misconfigured.", "Шаг настроен неверно.");
      const kind = exp.elementType;
      const typed = newElements(state, baselineIds).filter((e) => e.kind === kind);
      if (typed.length === 0) {
        return fail(
          "missing-element",
          `No new ${kind} yet. Create one with the ${kind} tool.`,
          `Нового «${KIND_RU[kind]}» пока нет. Создайте инструментом ${kind}.`,
        );
      }
      const placed =
        exp.parent === undefined ? typed : typed.filter((e) => parentMatches(state, e, exp.parent!));
      if (placed.length === 0) {
        const want =
          exp.parent === "root"
            ? { en: "at the project root", ru: "в корне проекта" }
            : { en: `inside a ${exp.parent}`, ru: `внутри: ${exp.parent ? KIND_RU[exp.parent as ElementKind] : "?"}` };
        return fail(
          "parent",
          `The ${kind} is in the wrong place: it must be ${want.en}.`,
          `«${KIND_RU[kind]}» не там: должен быть ${want.ru}.`,
        );
      }
      const sized = placed.filter((e) => dimsOk(e, step));
      if (sized.length === 0) {
        return fail(
          "dimensions",
          `Wrong size: expected about ${exp.w}×${exp.h}px (±${exp.tol ?? 0}). Resize or recreate it.`,
          `Не тот размер: нужно около ${exp.w}×${exp.h}px (±${exp.tol ?? 0}). Измените размер или пересоздайте.`,
        );
      }
      const painted =
        exp.material === undefined ? sized : sized.filter((e) => e.material === exp.material);
      if (painted.length === 0) {
        return fail(
          "material",
          `Wrong material: set it to ${exp.material} in the Inspector.`,
          `Не тот материал: поставьте ${exp.material} в инспекторе.`,
        );
      }
      const need = exp.count ?? 1;
      if (painted.length < need) {
        return fail(
          "count",
          `Need ${need} (have ${painted.length}). Keep going.`,
          `Нужно ${need} (есть ${painted.length}). Продолжайте.`,
        );
      }
      return pass(painted.slice(0, need).map((e) => e.id));
    }
  }
}
