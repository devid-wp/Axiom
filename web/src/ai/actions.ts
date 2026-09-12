/* AXIOM — controlled action layer ("AI tool calling").
   The model may only REQUEST these actions; this module validates them and
   applies them through the existing Studio store + single history entry.
   No direct DOM/zustand mutation ever originates here outside commitElements. */

import { useStudio } from "@/store/studio";
import type { Element as StudioElement, ElementKind } from "@/studio/types";
import {
  ELEMENT_DEFAULTS,
  GRID_STEP,
  MAX_SIZE,
  MIN_SIZE,
  SHEET_H,
  SHEET_W,
  canContain,
  clamp,
  isContainer,
  newId,
  normalizeRotation,
  snap8,
} from "@/studio/domain";
import type { AiAction, AiTarget } from "./types";

export interface ExecResult {
  ok: boolean;
  changed: boolean;
  changedIds: string[];
  created: StudioElement[];
  cleared: boolean;
  skipped: number;
  selectId: string | null;
  failReason?: string;
}

const KINDS: ReadonlySet<string> = new Set([
  "building",
  "floor",
  "room",
  "corridor",
  "wall",
  "door",
  "window",
  "roof",
  "column",
  "beam",
]);
const MATERIALS: ReadonlySet<string> = new Set(["concrete", "brick", "glass", "timber", "steel"]);

function isNum(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

function cn<T extends object>(raw: unknown, kind: string): raw is T {
  return !!raw && typeof raw === "object" && (raw as { kind?: unknown }).kind === kind;
}

function cleanTarget(raw: unknown): AiTarget | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const t = raw as Record<string, unknown>;
  const out: AiTarget = {};
  if (typeof t.id === "string") out.id = t.id;
  if (typeof t.kind === "string" && KINDS.has(t.kind)) out.kind = t.kind as ElementKind;
  if (t.last === true) out.last = true;
  if (t.selected === true) out.selected = true;
  if (t.up === true) out.up = true;
  return Object.keys(out).length ? out : undefined;
}

/** Validate one raw model action against the allowed schema. Returns null on
    any unsupported/malformed shape so batches fail safely. */
export function sanitizeAction(raw: unknown): AiAction | null {
  if (!raw || typeof raw !== "object") return null;
  const a = raw as Record<string, unknown>;

  if (cn<AiAction>(raw, "create_element")) {
    if (typeof a.elementType !== "string" || !KINDS.has(a.elementType)) return null;
    const out: AiAction = { kind: "create_element", elementType: a.elementType as ElementKind };
    if (typeof a.material === "string" && MATERIALS.has(a.material)) out.material = a.material as StudioElement["material"];
    if (isNum(a.x) && isNum(a.y)) (out as Extract<AiAction, { kind: "create_element" }>).x = a.x;
    if (isNum(a.x) && isNum(a.y)) (out as Extract<AiAction, { kind: "create_element" }>).y = a.y;
    if (isNum(a.w) && isNum(a.h) && a.w > 0 && a.h > 0) {
      out.w = a.w;
      out.h = a.h;
    }
    if (typeof a.parent === "string" && a.parent.length > 0 && a.parent.length <= 64) {
      (out as Extract<AiAction, { kind: "create_element" }>).parent = a.parent;
    }
    return out;
  }

  if (cn<AiAction>(raw, "move_element")) {
    const out: Extract<AiAction, { kind: "move_element" }> = { kind: "move_element" };
    const t = cleanTarget(a.target);
    if (t) out.target = t;
    if (isNum(a.dx)) out.dx = a.dx;
    if (isNum(a.dy)) out.dy = a.dy;
    return out;
  }

  if (cn<AiAction>(raw, "resize_element")) {
    const out: Extract<AiAction, { kind: "resize_element" }> = { kind: "resize_element" };
    const t = cleanTarget(a.target);
    if (t) out.target = t;
    if (isNum(a.w) && a.w > 0) out.w = a.w;
    if (isNum(a.h) && a.h > 0) out.h = a.h;
    return out;
  }

  if (cn<AiAction>(raw, "rotate_element")) {
    const out: Extract<AiAction, { kind: "rotate_element" }> = { kind: "rotate_element" };
    const t = cleanTarget(a.target);
    if (t) out.target = t;
    if (isNum(a.degrees) && Math.abs(a.degrees) <= 360) out.degrees = a.degrees;
    return out;
  }

  if (cn<AiAction>(raw, "set_material")) {
    if (typeof a.material !== "string" || !MATERIALS.has(a.material)) return null;
    const out: Extract<AiAction, { kind: "set_material" }> = { kind: "set_material", material: a.material as StudioElement["material"] };
    const t = cleanTarget(a.target);
    if (t) out.target = t;
    return out;
  }

  if (cn<AiAction>(raw, "duplicate_element")) {
    const out: Extract<AiAction, { kind: "duplicate_element" }> = { kind: "duplicate_element" };
    const t = cleanTarget(a.target);
    if (t) out.target = t;
    if (isNum(a.dx)) out.dx = a.dx;
    if (isNum(a.dy)) out.dy = a.dy;
    return out;
  }

  if (cn<AiAction>(raw, "delete_element")) {
    const out: Extract<AiAction, { kind: "delete_element" }> = { kind: "delete_element" };
    const t = cleanTarget(a.target);
    if (t) out.target = t;
    return out;
  }

  if (cn<AiAction>(raw, "select_element")) {
    const out: Extract<AiAction, { kind: "select_element" }> = { kind: "select_element" };
    const t = cleanTarget(a.target);
    if (t) out.target = t;
    return out;
  }

  if (cn<AiAction>(raw, "enter_element")) {
    const out: Extract<AiAction, { kind: "enter_element" }> = { kind: "enter_element" };
    const t = cleanTarget(a.target);
    if (t) out.target = t;
    return out;
  }

  if (cn<AiAction>(raw, "clear_selection")) return { kind: "clear_selection" };
  if (cn<AiAction>(raw, "clear_project")) return { kind: "clear_project" };

  return null;
}

/** Keep only well-formed actions; drop the rest so the batch fails safely. */
export function sanitizeActions(raw: unknown): AiAction[] {
  if (!Array.isArray(raw)) return [];
  return raw.slice(0, 20).map(sanitizeAction).filter((a): a is AiAction => a !== null);
}

function resolveTarget(elts: StudioElement[], t: AiTarget | undefined, selectedId: string): StudioElement | null {
  const findLast = (f: (e: StudioElement) => boolean) => {
    for (let i = elts.length - 1; i >= 0; i--) if (f(elts[i])) return elts[i];
    return null;
  };
  if (t?.id) return elts.find((e) => e.id === t.id) ?? null;
  if (t?.up) {
    const ctx = useStudio.getState().contextId;
    if (ctx == null) return null;
    const cur = elts.find((e) => e.id === ctx);
    if (!cur || cur.parentId == null) return null;
    return elts.find((e) => e.id === cur.parentId) ?? null;
  }
  if (t?.kind) return findLast((e) => e.kind === t.kind);
  if (t?.last) return elts[elts.length - 1] ?? null;
  if (t?.selected) return elts.find((e) => e.id === selectedId) ?? null;
  return elts.find((e) => e.id === selectedId) ?? elts[elts.length - 1] ?? null;
}

function overlaps(a: StudioElement, x: number, y: number, w: number, h: number, pad: number): boolean {
  return !(x + w + pad <= a.x || x - pad >= a.x + a.w || y + h + pad <= a.y || y - pad >= a.y + a.h);
}

/** Deterministic free-spot scan so the model never needs pixel coordinates. */
export function autoPlace(elts: StudioElement[], kind: ElementKind): { x: number; y: number } {
  const d = ELEMENT_DEFAULTS[kind];
  const step = GRID_STEP;
  for (let gy = 0; gy * step + d.h <= SHEET_H; gy++) {
    for (let gx = 0; gx * step + d.w <= SHEET_W; gx++) {
      const x = gx * step;
      const y = gy * step;
      if (elts.every((e) => !overlaps(e, x, y, d.w, d.h, 8))) return { x: snap8(x), y: snap8(y) };
    }
  }
  const last = elts[elts.length - 1];
  const x = snap8(clamp((last?.x ?? 0) + d.w + 24, 0, SHEET_W - d.w));
  const y = snap8(clamp(last?.y ?? 0, 0, SHEET_H - d.h));
  return { x, y };
}

/**
 * Execute a validated batch as ONE undoable Studio operation.
 * The working list is mutated locally, then committed through the store.
 * Creations land in the user's current editing context unless the action
 * names another parent; containment rules are enforced and violations are
 * skipped (counted) instead of applied.
 */
export function executeActions(actions: AiAction[]): ExecResult {
  const st = useStudio.getState();
  const idx = st.currentIdx;
  const proj = st.projects[idx];
  if (!proj) return { ok: false, changed: false, changedIds: [], created: [], cleared: false, skipped: actions.length, selectId: null, failReason: "no project" };

  const els: StudioElement[] = proj.elements.map((e) => ({ ...e }));
  const created: StudioElement[] = [];
  const changedIds: string[] = [];
  let cleared = false;
  let skipped = 0;
  let selectId: string | null = null;
  let contextId: string | null = st.contextId;

  const contextKind = (): StudioElement["kind"] | null => {
    if (contextId == null) return null;
    return els.find((e) => e.id === contextId)?.kind ?? null;
  };

  for (const a of actions) {
    switch (a.kind) {
      case "create_element": {
        // Resolve the parent: explicit id wins, otherwise the live context.
        let parent: string | null = contextId;
        if (a.parent && a.parent !== "current") {
          parent = els.some((e) => e.id === a.parent) ? (a.parent as string) : null;
          if (parent === null && a.parent !== "root") { skipped++; break; }
          if (a.parent === "root") parent = null;
        }
        const pk = parent == null ? null : (els.find((e) => e.id === parent)?.kind ?? null);
        if (parent != null && pk === null) { skipped++; break; }
        if (!canContain(pk, a.elementType)) { skipped++; break; }
        const d = ELEMENT_DEFAULTS[a.elementType];
        const pos = isNum(a.x) && isNum(a.y) ? { x: snap8(clamp(a.x, 0, SHEET_W - d.w)), y: snap8(clamp(a.y, 0, SHEET_H - d.h)) } : autoPlace(els, a.elementType);
        const el: StudioElement = {
          id: newId(),
          kind: a.elementType,
          x: pos.x,
          y: pos.y,
          w: snap8(clamp(isNum(a.w) ? a.w : d.w, MIN_SIZE, MAX_SIZE)),
          h: snap8(clamp(isNum(a.h) ? a.h : d.h, MIN_SIZE, MAX_SIZE)),
          material: a.material ?? "concrete",
          parentId: parent,
          rotation: 0,
        };
        els.push(el);
        created.push(el);
        changedIds.push(el.id);
        selectId = el.id;
        break;
      }
      case "move_element": {
        const t = resolveTarget(els, a.target, st.selectedId);
        if (!t) { skipped++; break; }
        const dx = isNum(a.dx) ? snap8(a.dx) : 0;
        const dy = isNum(a.dy) ? snap8(a.dy) : 0;
        t.x = snap8(clamp(t.x + dx, 0, SHEET_W - t.w));
        t.y = snap8(clamp(t.y + dy, 0, SHEET_H - t.h));
        changedIds.push(t.id);
        selectId = t.id;
        break;
      }
      case "resize_element": {
        const t = resolveTarget(els, a.target, st.selectedId);
        if (!t) { skipped++; break; }
        if (isNum(a.w)) t.w = snap8(clamp(a.w, MIN_SIZE, MAX_SIZE));
        if (isNum(a.h)) t.h = snap8(clamp(a.h, MIN_SIZE, MAX_SIZE));
        changedIds.push(t.id);
        selectId = t.id;
        break;
      }
      case "rotate_element": {
        const t = resolveTarget(els, a.target, st.selectedId);
        if (!t) { skipped++; break; }
        const deg = isNum(a.degrees) ? a.degrees : 90;
        t.rotation = normalizeRotation((t.rotation ?? 0) + deg);
        changedIds.push(t.id);
        selectId = t.id;
        break;
      }
      case "set_material": {
        const t = resolveTarget(els, a.target, st.selectedId);
        if (!t) { skipped++; break; }
        t.material = a.material;
        changedIds.push(t.id);
        selectId = t.id;
        break;
      }
      case "duplicate_element": {
        const t = resolveTarget(els, a.target, st.selectedId);
        if (!t) { skipped++; break; }
        const dx = isNum(a.dx) ? snap8(a.dx) : 0;
        const dy = isNum(a.dy) ? snap8(a.dy) : 0;
        const dup: StudioElement = { ...t, id: newId(), x: snap8(clamp(t.x + 16 + dx, 0, SHEET_W - t.w)), y: snap8(clamp(t.y + 16 + dy, 0, SHEET_H - t.h)) };
        els.push(dup);
        created.push(dup);
        changedIds.push(t.id, dup.id);
        selectId = dup.id;
        break;
      }
      case "delete_element": {
        const t = resolveTarget(els, a.target, st.selectedId);
        if (!t) { skipped++; break; }
        changedIds.push(t.id);
        if (selectId === t.id) selectId = null;
        els.splice(els.indexOf(t), 1);
        break;
      }
      case "select_element": {
        const t = resolveTarget(els, a.target, st.selectedId);
        if (!t) { skipped++; break; }
        selectId = t.id;
        break;
      }
      case "enter_element": {
        if (a.target?.up) {
          // Navigate one level up; at the top level this lands on the root.
          const cur = contextId == null ? null : els.find((e) => e.id === contextId);
          contextId = cur?.parentId ?? null;
          selectId = "";
          break;
        }
        const t = resolveTarget(els, a.target, st.selectedId);
        if (!t) { skipped++; break; }
        // Only containers have an editing context; entering a leaf would
        // strand the user on an empty canvas, so treat it as selection.
        if (isContainer(t.kind)) {
          contextId = t.id;
          selectId = "";
        } else {
          selectId = t.id;
        }
        break;
      }
      case "clear_selection":
        selectId = "";
        break;
      case "clear_project":
        els.length = 0;
        cleared = true;
        selectId = "";
        contextId = null;
        break;
    }
  }

  const same = (x: StudioElement, y: StudioElement) =>
    x.id === y.id && x.kind === y.kind && x.x === y.x && x.y === y.y &&
    x.w === y.w && x.h === y.h && x.material === y.material &&
    (x.parentId ?? null) === (y.parentId ?? null) && (x.rotation ?? 0) === (y.rotation ?? 0);
  const changed = els.length !== proj.elements.length || els.some((e, i) => !same(e, proj.elements[i]));
  if (changed) useStudio.getState().commitElements(els, "AI action");

  if (selectId !== null && selectId !== "" && els.some((e) => e.id === selectId)) {
    useStudio.setState({ selectedId: selectId });
  } else if (selectId === "") {
    useStudio.setState({ selectedId: "" });
  }

  if (contextId !== st.contextId) {
    const ok = contextId === null || els.some((e) => e.id === contextId);
    if (ok) useStudio.setState({ contextId });
  }

  return { ok: true, changed, changedIds, created, cleared, skipped, selectId };
}

/** Parse + validate the actions block the model may embed in its reply. */
export function parseActionsBlock(reply: string): { text: string; actions: AiAction[] } {
  const m = reply.match(/<axiom-actions>([\s\S]*?)<\/axiom-actions>/i);
  if (!m) return { text: reply, actions: [] };
  const text = reply.replace(/<axiom-actions>[\s\S]*?<\/axiom-actions>/gi, "").trim();
  try {
    return { text, actions: sanitizeActions(JSON.parse(m[1])) };
  } catch {
    return { text, actions: [] };
  }
}

/** Parse + validate the exercise offer block (TITLE/OBJECTIVE/TASK/HINT). */
export function parseExerciseBlock(reply: string): { text: string; exercise?: NonNullable<import("./types").TutorResult["exercise"]> } {
  const m = reply.match(/<axiom-exercise>([\s\S]*?)<\/axiom-exercise>/i);
  if (!m) return { text: reply };
  const text = reply.replace(/<axiom-exercise>[\s\S]*?<\/axiom-exercise>/gi, "").trim();
  try {
    const raw = JSON.parse(m[1]) as Record<string, unknown>;
    const title = typeof raw.title === "string" ? raw.title.trim() : "";
    const objective = typeof raw.objective === "string" ? raw.objective.trim() : "";
    const task = typeof raw.task === "string" ? raw.task.trim() : "";
    const hint = typeof raw.hint === "string" ? raw.hint.trim() : undefined;
    if (!title || !task) return { text };
    return { text, exercise: { title, objective, task, hint } };
  } catch {
    return { text };
  }
}

export interface ParsedLesson {
  courseTag: string;
  title: { en: string; ru: string };
  duration: string;
  level: string;
  body: { en: string[]; ru: string[] };
  quiz: {
    q: { en: string; ru: string };
    opts: { en: string[]; ru: string[] };
    correct: number;
  };
}

/** Parse + validate a <axiom-lesson> block the model may embed for course generation. */
export function parseLessonBlock(reply: string): { text: string; lesson?: ParsedLesson } {
  const m = reply.match(/<axiom-lesson>([\s\S]*?)<\/axiom-lesson>/i);
  if (!m) return { text: reply };
  const text = reply.replace(/<axiom-lesson>[\s\S]*?<\/axiom-lesson>/gi, "").trim();
  try {
    const raw = JSON.parse(m[1]) as Record<string, unknown>;
    const title = raw.title as Record<string, string> | undefined;
    const body = raw.body as Record<string, string[]> | undefined;
    const quiz = raw.quiz as Record<string, unknown> | undefined;
    if (!title?.en || !body?.en || !quiz) return { text };

    const quizQ = quiz.q as Record<string, string> | undefined;
    const quizOpts = quiz.opts as Record<string, string[]> | undefined;
    if (!quizQ?.en || !Array.isArray(quizOpts?.en) || quizOpts.en.length < 2) return { text };

    return {
      text,
      lesson: {
        courseTag: typeof raw.courseTag === "string" ? raw.courseTag : "ai-generated",
        title: { en: String(title.en), ru: String(title.ru ?? title.en) },
        duration: typeof raw.duration === "string" ? raw.duration : "10 min",
        level: typeof raw.level === "string" ? raw.level : "beginner",
        body: {
          en: Array.isArray(body.en) ? body.en.map(String) : [],
          ru: Array.isArray(body.ru) ? body.ru.map(String) : body.en.map(String),
        },
        quiz: {
          q: { en: String(quizQ.en), ru: String(quizQ.ru ?? quizQ.en) },
          opts: {
            en: quizOpts.en.map(String),
            ru: Array.isArray(quizOpts.ru) ? quizOpts.ru.map(String) : quizOpts.en.map(String),
          },
          correct: typeof quiz.correct === "number" ? quiz.correct : 0,
        },
      },
    };
  } catch {
    return { text };
  }
}