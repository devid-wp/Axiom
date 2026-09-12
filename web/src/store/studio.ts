/* AXIOM — studio controller. Faithful TS port of the Rust request-handlers in
   src/main.rs + history/gesture semantics. All ground truth lives here. */

import { create } from "zustand";
import type { Element as StudioElement, ElementKind, Material, Project, Tool } from "@/studio/types";
import {
  ELEMENT_DEFAULTS,
  MAX_HISTORY,
  MAX_SIZE,
  MIN_SIZE,
  SHEET_H,
  SHEET_W,
  SNAP,
  allowedChildrenOf,
  breadcrumbs,
  canContain,
  childrenOf,
  clamp,
  coordStr,
  elementsEqual,
  isContainer,
  newId,
  normalizeRotation,
  nowHm,
  snap8,
  snapToElements,
  subtreeIds,
  type SnapGuide,
} from "@/studio/domain";
import { exportJson, loadProjects, saveProjects } from "@/studio/persistence";

interface DragMove {
  id: string;
  offX: number;
  offY: number;
  armed: boolean;
  dirty: boolean;
}

interface DragSize {
  id: string;
  startX: number;
  startY: number;
  dirty: boolean;
}

type History = StudioElement[][];

interface StudioState {
  projects: Project[];
  currentIdx: number;
  selectedId: string;
  /** Editing context: element id whose children are shown, null = project root. */
  contextId: string | null;
  tool: Tool;
  cursorLabel: string;
  zoomLabel: string;
  savedLabel: string;
  undoEnabled: boolean;
  redoEnabled: boolean;
  zoom: number;
  panX: number;
  panY: number;
  _hist: History;
  _fut: History;
  _dragMove: DragMove | null;
  _dragSize: DragSize | null;
  _panning: { startX: number; startY: number; startPanX: number; startPanY: number } | null;
  _clipboard: StudioElement[];
  _snapGuides: SnapGuide[];

  select: (id: string) => void;
  deselect: () => void;
  setTool: (tool: Tool) => void;
  canvasClick: (x: number, y: number) => void;
  /** Create an element of the given kind inside the current context. */
  createElement: (kind: ElementKind, opts?: { x?: number; y?: number; w?: number; h?: number; material?: Material }) => string | null;
  /** Open a container element: it becomes the current editing context. */
  enter: (id: string) => void;
  /** Navigate the editing context to an element id (or the project root). */
  navigateTo: (id: string | null) => void;
  /** Navigate one level up (no-op at the project root). */
  navigateParent: () => void;
  hover: (x: number, y: number) => void;
  openProject: (idx: number) => void;
  pressMove: (id: string, x: number, y: number) => void;
  dragMove: (id: string, x: number, y: number) => void;
  pressSize: (id: string, x: number, y: number) => void;
  dragSize: (id: string, x: number, y: number) => void;
  release: () => void;
  nudge: (id: string, dx: number, dy: number) => void;
  sizeStep: (id: string, dw: number, dh: number) => void;
  resize: (id: string, dw: number, dh: number) => void;
  rotate: (id: string, deg: number) => void;
  applyMaterial: (id: string, m: Material) => void;
  remove: (id: string) => void;
  duplicate: (id: string) => void;
  copy: (id: string) => void;
  paste: () => void;
  moveForward: (id: string) => void;
  moveBackward: (id: string) => void;
  moveToFront: (id: string) => void;
  moveToBack: (id: string) => void;
  commitElements: (elements: StudioElement[], label?: string) => void;
  undo: () => void;
  redo: () => void;
  save: () => void;
  exportCopy: () => void;
  newProject: () => void;
  setZoom: (zoom: number) => void;
  zoomBy: (delta: number, cx?: number, cy?: number) => void;
  resetView: () => void;
  startPan: (mx: number, my: number) => void;
  dragPan: (mx: number, my: number) => void;
  endPan: () => void;
}

const NAV_TOOLS: ReadonlySet<Tool> = new Set<Tool>(["select", "move"]);
const BUILD_TOOLS: ReadonlySet<Tool> = new Set<Tool>([
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
] as Tool[]);

/** Resolve the kind of the current editing context (null = project root). */
function contextKind(get: () => StudioState): ElementKind | null {
  const st = get();
  const ctx = st.contextId;
  if (ctx == null) return null;
  return st.projects[st.currentIdx]?.elements.find((e) => e.id === ctx)?.kind ?? null;
}

/** Siblings visible on the canvas = children of the current context. */
export function visibleElements(st: Pick<StudioState, "projects" | "currentIdx" | "contextId">): StudioElement[] {
  const proj = st.projects[st.currentIdx];
  if (!proj) return [];
  return childrenOf(proj.elements, st.contextId ?? null);
}

function pushHistory(get: () => StudioState, set: (p: Partial<StudioState>) => void): void {
  const cur = get().projects[get().currentIdx]?.elements ?? [];
  const h = get()._hist;
  if (h.length > 0 && elementsEqual(h[h.length - 1], cur)) return;
  const nh = [...h, cur];
  if (nh.length > MAX_HISTORY) nh.splice(0, nh.length - MAX_HISTORY);
  set({ _hist: nh, _fut: [] });
}

function mutateElement(
  get: () => StudioState,
  set: (p: Partial<StudioState>) => void,
  id: string,
  fn: (el: StudioElement, proj: Project) => void,
  opts?: { hist?: boolean; save?: boolean; label?: string }
): void {
  const idx = get().currentIdx;
  const proj = get().projects[idx];
  if (!proj) return;
  const target = id || get().selectedId;
  if (!proj.elements.some((e) => e.id === target)) return;
  if (opts?.hist) pushHistory(get, set);

  const copy: Project = { ...proj, elements: proj.elements.map((e) => ({ ...e })) };
  const el = copy.elements.find((e) => e.id === target);
  if (!el) return;
  fn(el, copy);

  set({
    projects: get().projects.map((p, i) => (i === idx ? copy : p)),
    undoEnabled: get()._hist.length > 0,
    redoEnabled: get()._fut.length > 0,
  });

  if (opts?.save) {
    saveProjects(get().projects);
    set({ savedLabel: opts.label ?? `Saved ${nowHm()}` });
  }
}

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 4;
const ZOOM_STEP = 0.15;

export const useStudio = create<StudioState>()((set, get) => ({
  projects: loadProjects(),
  currentIdx: 0,
  selectedId: "",
  contextId: null,
  tool: "select",
  cursorLabel: "X — · Y —",
  zoomLabel: "100%",
  savedLabel: "Saved",
  undoEnabled: false,
  redoEnabled: false,
  zoom: 1,
  panX: 0,
  panY: 0,
  _hist: [],
  _fut: [],
  _dragMove: null,
  _dragSize: null,
  _panning: null,
  _clipboard: [],
  _snapGuides: [],

  select: (id) => set({ selectedId: id }),

  deselect: () => set({ selectedId: "" }),

  setTool: (tool) => set({ tool }),

  canvasClick: (x, y) => {
    const { tool } = get();
    if (NAV_TOOLS.has(tool)) {
      if (get().selectedId) set({ selectedId: "" });
      return;
    }
    if (!BUILD_TOOLS.has(tool)) return;
    get().createElement(tool as ElementKind, { x, y });
  },

  createElement: (kind, opts) => {
    const idx = get().currentIdx;
    const proj = get().projects[idx];
    if (!proj) return null;
    const ctxKind = contextKind(get);
    if (!canContain(ctxKind, kind)) return null;
    const parent = get().contextId;
    const { w: dw, h: dh } = ELEMENT_DEFAULTS[kind];
    const w = snap8(clamp(opts?.w ?? dw, MIN_SIZE, MAX_SIZE));
    const h = snap8(clamp(opts?.h ?? dh, MIN_SIZE, MAX_SIZE));
    const x = opts?.x !== undefined ? clamp(opts.x, SNAP, SHEET_W - w - SNAP) : clamp(80, SNAP, SHEET_W - w - SNAP);
    const y = opts?.y !== undefined ? clamp(opts.y, SNAP, SHEET_H - h - SNAP) : clamp(90, SNAP, SHEET_H - h - SNAP);
    const el: StudioElement = {
      id: newId(),
      kind,
      x,
      y,
      w,
      h,
      material: opts?.material ?? "concrete",
      parentId: parent,
      rotation: 0,
    };
    pushHistory(get, set);
    set({
      projects: get().projects.map((p, i) => (i === idx ? { ...p, elements: [...p.elements, el] } : p)),
      selectedId: el.id,
      undoEnabled: get()._hist.length > 0,
      redoEnabled: false,
    });
    saveProjects(get().projects);
    set({ savedLabel: `Saved ${nowHm()}` });
    return el.id;
  },

  enter: (id) => {
    const proj = get().projects[get().currentIdx];
    const el = proj?.elements.find((e) => e.id === id);
    if (!el || !isContainer(el.kind)) return;
    set({ contextId: id, selectedId: "" });
  },

  navigateTo: (id) => {
    if (id === null) {
      set({ contextId: null, selectedId: "" });
      return;
    }
    const proj = get().projects[get().currentIdx];
    const el = proj?.elements.find((e) => e.id === id);
    if (!el) return;
    // Breadcrumb targets are containers; a leaf target just selects it in
    // its parent's context.
    if (isContainer(el.kind)) set({ contextId: id, selectedId: "" });
    else set({ contextId: el.parentId ?? null, selectedId: id });
  },

  navigateParent: () => {
    const st = get();
    const ctx = st.contextId;
    if (ctx == null) return;
    const proj = st.projects[st.currentIdx];
    const el = proj?.elements.find((e) => e.id === ctx);
    set({ contextId: el?.parentId ?? null, selectedId: "" });
  },

  hover: (x, y) => set({ cursorLabel: coordStr(x, y) }),

  openProject: (idx) => {
    if (idx < 0 || idx >= get().projects.length || idx === get().currentIdx) return;
    set({
      currentIdx: idx,
      selectedId: "",
      contextId: null,
      _hist: [],
      _fut: [],
      undoEnabled: false,
      redoEnabled: false,
      cursorLabel: "X — · Y —",
      zoom: 1,
      panX: 0,
      panY: 0,
      zoomLabel: "100%",
    });
  },

  pressMove: (id, x, y) => {
    if (get()._dragMove || get()._dragSize) return;
    const armed = get().tool === "select" || get().tool === "move";
    const el = get().projects[get().currentIdx]?.elements.find((e) => e.id === id);
    if (!el) {
      set({ selectedId: id, _dragMove: null });
      return;
    }
    set({
      selectedId: id,
      _dragMove: { id, offX: x - el.x, offY: y - el.y, armed, dirty: false },
    });
  },

  dragMove: (id, x, y) => {
    const d = get()._dragMove;
    if (!d || d.id !== id || !d.armed) return;
    const proj = get().projects[get().currentIdx];
    const el = proj?.elements.find((e) => e.id === id);
    if (!el) return;
    const others = proj?.elements ?? [];
    const { x: nx, y: ny, guides } = snapToElements(
      x - d.offX, y - d.offY, el.w, el.h, others, id
    );
    const cx = clamp(nx, 0, SHEET_W - el.w);
    const cy = clamp(ny, 0, SHEET_H - el.h);
    const idx = get().currentIdx;
    set({
      projects: get().projects.map((p, i) =>
        i === idx
          ? {
              ...p,
              elements: p.elements.map((e) => (e.id === id ? { ...e, x: cx, y: cy } : e)),
            }
          : p
      ),
      _dragMove: { ...d, dirty: true },
      _snapGuides: guides,
    });
  },

  pressSize: (id, x, y) => {
    if (get()._dragMove || get()._dragSize) return;
    const el = get().projects[get().currentIdx]?.elements.find((e) => e.id === id);
    if (!el) return;
    set({
      selectedId: id,
      _dragSize: { id, startX: x, startY: y, dirty: false },
    });
  },

  dragSize: (id, x, y) => {
    const d = get()._dragSize;
    if (!d || d.id !== id) return;
    const proj = get().projects[get().currentIdx];
    const el = proj?.elements.find((e) => e.id === id);
    if (!el) return;
    const nw = snap8(clamp(el.w + (x - d.startX), MIN_SIZE, MAX_SIZE));
    const nh = snap8(clamp(el.h + (y - d.startY), MIN_SIZE, MAX_SIZE));
    const idx = get().currentIdx;
    const moved = nw !== el.w || nh !== el.h;
    set({
      projects: get().projects.map((p, i) =>
        i === idx ? { ...p, elements: p.elements.map((e) => (e.id === id ? { ...e, w: nw, h: nh } : e)) } : p
      ),
      _dragSize: moved ? { ...d, dirty: true } : d,
    });
    if (moved) saveProjects(get().projects);
  },

  release: () => {
    const dm = get()._dragMove;
    const ds = get()._dragSize;
    const dirty = (dm?.dirty ?? false) || (ds?.dirty ?? false);
    set({ _dragMove: null, _dragSize: null, _snapGuides: [] });
    if (dirty) {
      saveProjects(get().projects);
      set({ savedLabel: `Saved ${nowHm()}` });
    }
  },

  nudge: (id, dx, dy) =>
    mutateElement(get, set, id, (el) => {
      el.x = snap8(clamp(el.x + dx, 0, SHEET_W - el.w));
      el.y = snap8(clamp(el.y + dy, 0, SHEET_H - el.h));
    }, { hist: true, save: true }),

  sizeStep: (id, dw, dh) =>
    mutateElement(get, set, id, (el) => {
      el.w = snap8(clamp(el.w + dw, MIN_SIZE, MAX_SIZE));
      el.h = snap8(clamp(el.h + dh, MIN_SIZE, MAX_SIZE));
    }, { hist: true, save: true }),

  resize: (id, dw, dh) =>
    mutateElement(get, set, id, (el) => {
      if (Math.abs(dw) < 60 && Math.abs(dh) < 60 && (dw !== 0 || dh !== 0)) {
        el.w = clamp(el.w + dw, MIN_SIZE, MAX_SIZE);
        el.h = clamp(el.h + dh, MIN_SIZE, MAX_SIZE);
      } else {
        if (dw > 20) el.w = clamp(dw, MIN_SIZE, MAX_SIZE);
        if (dh > 20) el.h = clamp(dh, MIN_SIZE, MAX_SIZE);
      }
      el.w = snap8(el.w);
      el.h = snap8(el.h);
    }, { save: true }),

  rotate: (id, deg) =>
    mutateElement(get, set, id, (el) => {
      el.rotation = normalizeRotation((el.rotation ?? 0) + deg);
    }, { hist: true, save: true }),

  applyMaterial: (id, m) =>
    mutateElement(get, set, id, (el) => {
      el.material = m;
    }, { hist: true, save: true }),

  remove: (id) => {
    const idx = get().currentIdx;
    const proj = get().projects[idx];
    if (!proj || !proj.elements.some((e) => e.id === id)) return;
    pushHistory(get, set);
    // Cascading delete: the whole subtree goes, and the context can never
    // point at a removed element.
    const dead = new Set(subtreeIds(proj.elements, id));
    const ctx = get().contextId;
    const sel = get().selectedId;
    set({
      projects: get().projects.map((p, i) =>
        i === idx ? { ...p, elements: p.elements.filter((e) => !dead.has(e.id)) } : p
      ),
      selectedId: sel && dead.has(sel) ? "" : sel,
      contextId: ctx && dead.has(ctx) ? (proj.elements.find((e) => e.id === id)?.parentId ?? null) : ctx,
      undoEnabled: get()._hist.length > 0,
      redoEnabled: false,
    });
    saveProjects(get().projects);
    set({ savedLabel: `Saved ${nowHm()}` });
  },

  duplicate: (id) => {
    const idx = get().currentIdx;
    const proj = get().projects[idx];
    const src = proj?.elements.find((e) => e.id === id);
    if (!proj || !src) return;
    pushHistory(get, set);
    // Deep copy: the whole subtree is cloned with fresh ids so the copy
    // keeps its internal parent/child structure.
    const ids = subtreeIds(proj.elements, id);
    const remap = new Map(ids.map((old) => [old, newId()]));
    const clones = ids.map((old) => {
      const o = proj.elements.find((e) => e.id === old)!;
      return {
        ...o,
        id: remap.get(old)!,
        parentId: o.id === id ? o.parentId : (remap.get(o.parentId ?? "") ?? o.parentId),
        x: snap8(clamp(o.x + 16, 0, SHEET_W - o.w)),
        y: snap8(clamp(o.y + 16, 0, SHEET_H - o.h)),
      };
    });
    set({
      projects: get().projects.map((p, i) =>
        i === idx ? { ...p, elements: [...p.elements, ...clones] } : p
      ),
      selectedId: remap.get(id)!,
      undoEnabled: get()._hist.length > 0,
      redoEnabled: false,
    });
    saveProjects(get().projects);
    set({ savedLabel: `Saved ${nowHm()}` });
  },

  copy: (id) => {
    const proj = get().projects[get().currentIdx];
    const el = proj?.elements.find((e) => e.id === id);
    if (!el) return;
    set({ _clipboard: [{ ...el }] });
  },

  paste: () => {
    const clip = get()._clipboard;
    if (clip.length === 0) return;
    const idx = get().currentIdx;
    const proj = get().projects[idx];
    if (!proj) return;
    pushHistory(get, set);
    const live = new Set(proj.elements.map((e) => e.id));
    const ctx = get().contextId;
    const ctxKind = ctx == null ? null : (proj.elements.find((e) => e.id === ctx)?.kind ?? null);
    const pasted = clip.map((el) => {
      // Keep the original parent when it still exists and allows this kind;
      // otherwise drop into the current context when allowed, else the root.
      const keepParent = el.parentId != null && live.has(el.parentId);
      const parent = keepParent
        ? el.parentId
        : ctxKind !== undefined && canContain(ctxKind, el.kind)
          ? ctx
          : null;
      return {
        ...el,
        id: newId(),
        parentId: parent,
        x: snap8(clamp(el.x + 16, 0, SHEET_W - el.w)),
        y: snap8(clamp(el.y + 16, 0, SHEET_H - el.h)),
      };
    });
    set({
      projects: get().projects.map((p, i) =>
        i === idx ? { ...p, elements: [...p.elements, ...pasted] } : p
      ),
      selectedId: pasted[0].id,
      undoEnabled: get()._hist.length > 0,
      redoEnabled: false,
    });
    saveProjects(get().projects);
    set({ savedLabel: `Saved ${nowHm()}` });
  },

  moveForward: (id) => {
    const idx = get().currentIdx;
    const els = get().projects[idx]?.elements;
    if (!els) return;
    const i = els.findIndex((e) => e.id === id);
    if (i < 0 || i >= els.length - 1) return;
    pushHistory(get, set);
    const next = [...els];
    [next[i], next[i + 1]] = [next[i + 1], next[i]];
    set({
      projects: get().projects.map((p, j) => (j === idx ? { ...p, elements: next } : p)),
      undoEnabled: get()._hist.length > 0,
      redoEnabled: false,
    });
    saveProjects(get().projects);
    set({ savedLabel: `Saved ${nowHm()}` });
  },

  moveBackward: (id) => {
    const idx = get().currentIdx;
    const els = get().projects[idx]?.elements;
    if (!els) return;
    const i = els.findIndex((e) => e.id === id);
    if (i <= 0) return;
    pushHistory(get, set);
    const next = [...els];
    [next[i], next[i - 1]] = [next[i - 1], next[i]];
    set({
      projects: get().projects.map((p, j) => (j === idx ? { ...p, elements: next } : p)),
      undoEnabled: get()._hist.length > 0,
      redoEnabled: false,
    });
    saveProjects(get().projects);
    set({ savedLabel: `Saved ${nowHm()}` });
  },

  moveToFront: (id) => {
    const idx = get().currentIdx;
    const els = get().projects[idx]?.elements;
    if (!els) return;
    const i = els.findIndex((e) => e.id === id);
    if (i < 0 || i === els.length - 1) return;
    pushHistory(get, set);
    const el = els[i];
    const next = [...els.slice(0, i), ...els.slice(i + 1), el];
    set({
      projects: get().projects.map((p, j) => (j === idx ? { ...p, elements: next } : p)),
      undoEnabled: get()._hist.length > 0,
      redoEnabled: false,
    });
    saveProjects(get().projects);
    set({ savedLabel: `Saved ${nowHm()}` });
  },

  moveToBack: (id) => {
    const idx = get().currentIdx;
    const els = get().projects[idx]?.elements;
    if (!els) return;
    const i = els.findIndex((e) => e.id === id);
    if (i <= 0) return;
    pushHistory(get, set);
    const el = els[i];
    const next = [el, ...els.slice(0, i), ...els.slice(i + 1)];
    set({
      projects: get().projects.map((p, j) => (j === idx ? { ...p, elements: next } : p)),
      undoEnabled: get()._hist.length > 0,
      redoEnabled: false,
    });
    saveProjects(get().projects);
    set({ savedLabel: `Saved ${nowHm()}` });
  },

  commitElements: (elements, label) => {
    const idx = get().currentIdx;
    const proj = get().projects[idx];
    if (!proj) return;
    const cur = proj.elements;
    if (elementsEqual(cur, elements)) return;
    pushHistory(get, set);
    const sel = get().selectedId;
    const nextSel = elements.some((e) => e.id === sel) ? sel : "";
    set({
      projects: get().projects.map((p, i) => (i === idx ? { ...p, elements } : p)),
      selectedId: nextSel,
      undoEnabled: get()._hist.length > 0,
      redoEnabled: false,
    });
    saveProjects(get().projects);
    set({ savedLabel: label ?? `Saved ${nowHm()}` });
  },

  undo: () => {
    const h = get()._hist;
    if (h.length === 0) return;
    const prev = h[h.length - 1];
    const cur = get().projects[get().currentIdx]?.elements ?? [];
    const idx = get().currentIdx;
    const sel = get().selectedId;
    const nextSel = prev.some((e) => e.id === sel) ? sel : "";
    const ctx = get().contextId;
    set({
      projects: get().projects.map((p, i) => (i === idx ? { ...p, elements: prev } : p)),
      selectedId: nextSel,
      contextId: ctx != null && prev.some((e) => e.id === ctx) ? ctx : null,
      _hist: h.slice(0, -1),
      _fut: [...get()._fut, cur],
      undoEnabled: h.length - 1 > 0,
      redoEnabled: true,
    });
    saveProjects(get().projects);
    set({ savedLabel: `Saved ${nowHm()}` });
  },

  redo: () => {
    const f = get()._fut;
    if (f.length === 0) return;
    const next = f[f.length - 1];
    const cur = get().projects[get().currentIdx]?.elements ?? [];
    const idx = get().currentIdx;
    const sel = get().selectedId;
    const nextSel = next.some((e) => e.id === sel) ? sel : "";
    const ctx = get().contextId;
    set({
      projects: get().projects.map((p, i) => (i === idx ? { ...p, elements: next } : p)),
      selectedId: nextSel,
      contextId: ctx != null && next.some((e) => e.id === ctx) ? ctx : null,
      _fut: f.slice(0, -1),
      _hist: [...get()._hist, cur],
      undoEnabled: true,
      redoEnabled: f.length - 1 > 0,
    });
    saveProjects(get().projects);
    set({ savedLabel: `Saved ${nowHm()}` });
  },

  save: () => {
    saveProjects(get().projects);
    set({ savedLabel: `Saved ${nowHm()}` });
  },

  exportCopy: () => {
    saveProjects(get().projects);
    const json = exportJson(get().projects);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "axiom-export.json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    set({ savedLabel: `Exported ${nowHm()}` });
  },

  newProject: () => {
    const n = get().projects.length + 1;
    const proj: Project = {
      id: newId(),
      name: `Project ${n}`,
      created_at: new Date().toISOString(),
      elements: [],
    };
    const projects = [...get().projects, proj];
    set({
      projects,
      currentIdx: projects.length - 1,
      selectedId: "",
      contextId: null,
      _hist: [],
      _fut: [],
      undoEnabled: false,
      redoEnabled: false,
      cursorLabel: "X — · Y —",
      zoom: 1,
      panX: 0,
      panY: 0,
      zoomLabel: "100%",
    });
    saveProjects(get().projects);
    set({ savedLabel: `Saved ${nowHm()}` });
  },

  setZoom: (zoom) => {
    const clamped = Math.round(Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom)) * 100);
    set({ zoom: clamped / 100, zoomLabel: `${clamped}%` });
  },

  zoomBy: (delta, cx, cy) => {
    const { zoom, panX, panY } = get();
    const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom + delta));
    if (newZoom === zoom) return;
    const ratio = newZoom / zoom;
    const newPanX = cx !== undefined ? cx - ratio * (cx - panX) : panX;
    const newPanY = cy !== undefined ? cy - ratio * (cy - panY) : panY;
    const pct = Math.round(newZoom * 100);
    set({ zoom: newZoom, panX: newPanX, panY: newPanY, zoomLabel: `${pct}%` });
  },

  resetView: () => set({ zoom: 1, panX: 0, panY: 0, zoomLabel: "100%" }),

  startPan: (mx, my) => {
    const { panX, panY } = get();
    set({ _panning: { startX: mx, startY: my, startPanX: panX, startPanY: panY } });
  },

  dragPan: (mx, my) => {
    const p = get()._panning;
    if (!p) return;
    set({ panX: p.startPanX + (mx - p.startX), panY: p.startPanY + (my - p.startY) });
  },

  endPan: () => set({ _panning: null }),
}));