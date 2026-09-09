/* AXIOM — studio domain helpers. Port of helper/formatting logic in
   src/main.rs and dimension defaults in src/studio/mod.rs. */

import type { Element as StudioElement, ElementKind, Material, Project } from "./types";

export const SHEET_W = 900;
export const SHEET_H = 600;
export const SNAP = 8;
export const SHEET_MARGIN = 8;
export const MIN_SIZE = 12;
export const MAX_SIZE = 600;
export const PX_PER_M = 40;
export const GRID_STEP = 44;
export const MAX_HISTORY = 100;

export const ELEMENT_DEFAULTS: Record<ElementKind, { w: number; h: number }> = {
  wall: { w: 240, h: 14 },
  room: { w: 180, h: 130 },
  column: { w: 34, h: 34 },
  beam: { w: 170, h: 14 },
};

export const TOOL_ORDER: ElementKind[] = ["wall", "room", "column", "beam"];

export const KIND_LABELS: Record<ElementKind, string> = {
  wall: "Wall",
  room: "Room",
  column: "Column",
  beam: "Beam",
};

export const KIND_DISPLAY: Record<ElementKind, string> = {
  wall: "WALL",
  room: "ROOM",
  column: "COLUMN",
  beam: "BEAM",
};

export const MATERIAL_LABELS: Record<Material, string> = {
  concrete: "Concrete",
  brick: "Brick",
  glass: "Glass",
  timber: "Timber",
  steel: "Steel",
};

export const MATERIAL_COLORS: Record<Material, string> = {
  concrete: "#8E8B86",
  brick: "#9C5A3C",
  glass: "#8E8AA8",
  timber: "#A67C4A",
  steel: "#77777F",
};

export const THICKNESS: Record<ElementKind, string> = {
  wall: "0.25m",
  room: "0.20m",
  column: "0.40m",
  beam: "0.30m",
};

/* round() in Rust rounds half away from zero; match it for meters output */
function roundHalfAway(n: number): number {
  return (n < 0 ? -1 : 1) * Math.round(Math.abs(n));
}

function fmtDecimal(c: number): string {
  const neg = c < 0;
  const a = Math.abs(c);
  return `${neg ? "-" : ""}${Math.floor(a / 100)}.${String(a % 100).padStart(2, "0")}`;
}

export function meters(px: number): string {
  const c = roundHalfAway((px / PX_PER_M) * 100);
  return `${fmtDecimal(c)}m`;
}

export function coordStr(x: number, y: number): string {
  const cx = roundHalfAway((x / PX_PER_M) * 100);
  const cy = roundHalfAway((y / PX_PER_M) * 100);
  return `X ${fmtDecimal(cx)} · Y ${fmtDecimal(cy)}`;
}

export function nowHm(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

export function elementName(proj: Project, id: string): string {
  const el = proj.elements.find((e) => e.id === id);
  if (!el) return "";
  const n = proj.elements.filter((e) => e.kind === el.kind).findIndex((e) => e.id === id) + 1;
  return `${KIND_LABELS[el.kind]} ${pad2(n)}`;
}

export function thicknessFor(kind: ElementKind): string {
  return THICKNESS[kind];
}

export function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

export function snap8(v: number): number {
  return Math.round(v / SNAP) * SNAP;
}

export interface SnapGuide {
  type: "v" | "h";
  pos: number;
}

const SNAP_THRESHOLD = 12;

export function snapToElements(
  x: number,
  y: number,
  w: number,
  h: number,
  others: StudioElement[],
  draggedId?: string
): { x: number; y: number; guides: SnapGuide[] } {
  const guides: SnapGuide[] = [];
  let bestDx = SNAP_THRESHOLD + 1;
  let bestDy = SNAP_THRESHOLD + 1;
  let snappedX = x;
  let snappedY = y;

  const myEdges = {
    left: x,
    right: x + w,
    cx: x + w / 2,
    top: y,
    bottom: y + h,
    cy: y + h / 2,
  };

  for (const o of others) {
    if (draggedId && o.id === draggedId) continue;

    const oEdges = [
      o.x,
      o.x + o.w,
      (o.x + o.w) / 2,
      o.x + o.w / 2,
    ];
    const oEdgesY = [
      o.y,
      o.y + o.h,
      (o.y + o.h) / 2,
      o.y + o.h / 2,
    ];

    for (const ox of [o.x, o.x + o.w, (o.x + o.w) / 2]) {
      const dxLeft = Math.abs(myEdges.left - ox);
      const dxRight = Math.abs(myEdges.right - ox);
      const dxCx = Math.abs(myEdges.cx - ox);

      if (dxLeft < bestDx) { bestDx = dxLeft; snappedX = ox; }
      if (dxRight < bestDx) { bestDx = dxRight; snappedX = ox - w; }
      if (dxCx < bestDx) { bestDx = dxCx; snappedX = ox - w / 2; }
    }

    for (const oy of [o.y, o.y + o.h, (o.y + o.h) / 2]) {
      const dyTop = Math.abs(myEdges.top - oy);
      const dyBottom = Math.abs(myEdges.bottom - oy);
      const dyCy = Math.abs(myEdges.cy - oy);

      if (dyTop < bestDy) { bestDy = dyTop; snappedY = oy; }
      if (dyBottom < bestDy) { bestDy = dyBottom; snappedY = oy - h; }
      if (dyCy < bestDy) { bestDy = dyCy; snappedY = oy - h / 2; }
    }
  }

  if (bestDx <= SNAP_THRESHOLD) {
    guides.push({ type: "v", pos: snappedX + w / 2 });
  }
  if (bestDy <= SNAP_THRESHOLD) {
    guides.push({ type: "h", pos: snappedY + h / 2 });
  }

  return {
    x: bestDx <= SNAP_THRESHOLD ? snappedX : snap8(x),
    y: bestDy <= SNAP_THRESHOLD ? snappedY : snap8(y),
    guides,
  };
}

export function elementsEqual(a: StudioElement[], b: StudioElement[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const x = a[i];
    const y = b[i];
    if (
      x.id !== y.id ||
      x.kind !== y.kind ||
      x.material !== y.material ||
      x.x !== y.x ||
      x.y !== y.y ||
      x.w !== y.w ||
      x.h !== y.h
    ) {
      return false;
    }
  }
  return true;
}