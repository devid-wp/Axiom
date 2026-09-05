/* AXIOM — studio controller. Faithful TS port of the Rust request-handlers in
   src/main.rs + history/gesture semantics. All ground truth lives here. */

import { create } from "zustand";
import type { Element as StudioElement, Material, Project, Tool } from "@/studio/types";
import {
  ELEMENT_DEFAULTS,
  MAX_HISTORY,
  MAX_SIZE,
  MIN_SIZE,
  SHEET_H,
  SHEET_W,
  SNAP,
  clamp,
  coordStr,
  elementsEqual,
  newId,
  nowHm,
  snap8,
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
  tool: Tool;
  cursorLabel: string;
  zoomLabel: string;
  savedLabel: string;
  undoEnabled: boolean;
  redoEnabled: boolean;
  _hist: History;
  _fut: History;
  _dragMove: DragMove | null;
  _dragSize: DragSize | null;

  select: (id: string) => void;
  deselect: () => void;
  setTool: (tool: Tool) => void;
  canvasClick: (x: number, y: number) => void;
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
  applyMaterial: (id: string, m: Material) => void;
  remove: (id: string) => void;
  duplicate: (id: string) => void;
  /** Commit a whole new element list as ONE history entry (used by AI batches). */
  commitElements: (elements: StudioElement[], label?: string) => void;
  undo: () => void;
  redo: () => void;
  save: () => void;
  exportCopy: () => void;
  newProject: () => void;
}

const NAV_TOOLS: ReadonlySet<Tool> = new Set<Tool>(["select", "move", "layers", "assets"] as Tool[]);
const BUILD_TOOLS: ReadonlySet<Tool> = new Set<Tool>(["wall", "room", "column", "beam"] as Tool[]);

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
  fn: (el: StudioElement, proj: Project) => void,
  opts?: { hist?: boolean; save?: boolean; label?: string }
): void {
  const idx = get().currentIdx;
  const proj = get().projects[idx];
  if (!proj) return;
  if (opts?.hist) pushHistory(get, set);

  const copy: Project = { ...proj, elements: proj.elements.map((e) => ({ ...e })) };
  fn(copy.elements.find((e) => e.id === get().selectedId) ?? copy.elements[0], copy);

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

export const useStudio = create<StudioState>()((set, get) => ({
  projects: loadProjects(),
  currentIdx: 0,
  selectedId: "",
  tool: "select",
  cursorLabel: "X — · Y —",
  zoomLabel: "100%",
  savedLabel: "Saved",
  undoEnabled: false,
  redoEnabled: false,
  _hist: [],
  _fut: [],
  _dragMove: null,
  _dragSize: null,

  select: (id) => set({ selectedId: id }),

  deselect: () => set({ selectedId: "" }),

  setTool: (tool) => set({ tool }),

  canvasClick: (x, y) => {
    const { tool, selectedId } = get();
    if (NAV_TOOLS.has(tool)) {
      if (selectedId) set({ selectedId: "" });
      return;
    }
    if (!BUILD_TOOLS.has(tool)) return;
    const kind = tool as StudioElement["kind"];
    const { w, h } = ELEMENT_DEFAULTS[kind];
    const el: StudioElement = {
      id: newId(),
      kind,
      x: clamp(x, SNAP, SHEET_W - w - SNAP),
      y: clamp(y, SNAP, SHEET_H - h - SNAP),
      w,
      h,
      material: "concrete",
    };
    pushHistory(get, set);
    const idx = get().currentIdx;
    set({
      projects: get().projects.map((p, i) => (i === idx ? { ...p, elements: [...p.elements, el] } : p)),
      selectedId: el.id,
      undoEnabled: get()._hist.length > 0,
      redoEnabled: false,
    });
    saveProjects(get().projects);
    set({ savedLabel: `Saved ${nowHm()}` });
  },

  hover: (x, y) => set({ cursorLabel: coordStr(x, y) }),

  openProject: (idx) => {
    if (idx < 0 || idx >= get().projects.length || idx === get().currentIdx) return;
    set({
      currentIdx: idx,
      selectedId: "",
      _hist: [],
      _fut: [],
      undoEnabled: false,
      redoEnabled: false,
      cursorLabel: "X — · Y —",
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
    const nx = snap8(clamp(x - d.offX, 0, SHEET_W - el.w));
    const ny = snap8(clamp(y - d.offY, 0, SHEET_H - el.h));
    const idx = get().currentIdx;
    set({
      projects: get().projects.map((p, i) =>
        i === idx
          ? {
              ...p,
              elements: p.elements.map((e) => (e.id === id ? { ...e, x: nx, y: ny } : e)),
            }
          : p
      ),
      _dragMove: { ...d, dirty: true },
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
    set({ _dragMove: null, _dragSize: null });
    if (dirty) {
      saveProjects(get().projects);
      set({ savedLabel: `Saved ${nowHm()}` });
    }
  },

  nudge: (id, dx, dy) =>
    mutateElement(get, set, (el) => {
      el.x = snap8(clamp(el.x + dx, 0, SHEET_W - el.w));
      el.y = snap8(clamp(el.y + dy, 0, SHEET_H - el.h));
    }, { hist: true, save: true }),

  sizeStep: (id, dw, dh) =>
    mutateElement(get, set, (el) => {
      el.w = snap8(clamp(el.w + dw, MIN_SIZE, MAX_SIZE));
      el.h = snap8(clamp(el.h + dh, MIN_SIZE, MAX_SIZE));
    }, { hist: true, save: true }),

  resize: (id, dw, dh) =>
    mutateElement(get, set, (el) => {
      const target = get().projects[get().currentIdx]?.elements.find((e) => e.id === id);
      if (!target) return;
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

  applyMaterial: (id, m) =>
    mutateElement(get, set, (el) => {
      el.material = m;
    }, { hist: true, save: true }),

  remove: (id) => {
    const idx = get().currentIdx;
    const proj = get().projects[idx];
    if (!proj || !proj.elements.some((e) => e.id === id)) return;
    pushHistory(get, set);
    const sel = get().selectedId;
    set({
      projects: get().projects.map((p, i) =>
        i === idx ? { ...p, elements: p.elements.filter((e) => e.id !== id) } : p
      ),
      selectedId: sel === id ? "" : sel,
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
    const dup: StudioElement = { ...src, id: newId(), x: src.x + 16, y: src.y + 16 };
    set({
      projects: get().projects.map((p, i) =>
        i === idx ? { ...p, elements: [...p.elements, dup] } : p
      ),
      selectedId: dup.id,
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
    set({
      projects: get().projects.map((p, i) => (i === idx ? { ...p, elements: prev } : p)),
      selectedId: nextSel,
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
    set({
      projects: get().projects.map((p, i) => (i === idx ? { ...p, elements: next } : p)),
      selectedId: nextSel,
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
      _hist: [],
      _fut: [],
      undoEnabled: false,
      redoEnabled: false,
      cursorLabel: "X — · Y —",
    });
    saveProjects(get().projects);
    set({ savedLabel: `Saved ${nowHm()}` });
  },
}));