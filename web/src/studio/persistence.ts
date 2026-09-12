/* AXIOM — studio persistence. Browser equivalent of src/studio/mod.rs storage.
   The JSON schema mirrors the native serde output (capitalized enum variants)
   so a native store could be re-imported verbatim. */

import type { Element, ElementKind, Material, Project } from "./types";
import { newId } from "./domain";

const KEY = "axiom_projects";

const KIND_CAPS: Record<ElementKind, string> = {
  building: "Building",
  floor: "Floor",
  room: "Room",
  corridor: "Corridor",
  wall: "Wall",
  door: "Door",
  window: "Window",
  roof: "Roof",
  column: "Column",
  beam: "Beam",
};
const MAT_CAPS: Record<Material, string> = { concrete: "Concrete", brick: "Brick", glass: "Glass", timber: "Timber", steel: "Steel" };

function normKind(v: unknown): ElementKind {
  const s = String(v ?? "").toLowerCase().trim();
  if (s === "building") return "building";
  if (s === "floor") return "floor";
  if (s === "room") return "room";
  if (s === "corridor") return "corridor";
  if (s === "wall") return "wall";
  if (s === "door") return "door";
  if (s === "window") return "window";
  if (s === "roof") return "roof";
  if (s === "column") return "column";
  if (s === "beam") return "beam";
  return "wall";
}

function normMat(v: unknown): Material {
  const s = String(v ?? "").toLowerCase().trim();
  if (s === "brick") return "brick";
  if (s === "glass") return "glass";
  if (s === "timber") return "timber";
  if (s === "steel") return "steel";
  return "concrete";
}

function normElement(raw: Record<string, unknown>, ids?: Set<string>): Element {
  const num = (v: unknown, d: number): number => {
    const n = Number(v);
    return Number.isFinite(n) ? n : d;
  };
  const rot = Number(raw?.rotation);
  const pid = typeof raw?.parentId === "string" && raw.parentId.length > 0 ? raw.parentId : null;
  return {
    id: String(raw?.id ?? newId()),
    kind: normKind(raw?.kind),
    material: normMat(raw?.material),
    x: num(raw?.x, 0),
    y: num(raw?.y, 0),
    w: num(raw?.w, 10),
    h: num(raw?.h, 10),
    // Dangling parents (e.g. hand-edited store) fall back to the root so
    // no element becomes unreachable; ids validated by the caller pass.
    parentId: pid && (!ids || ids.has(pid)) ? pid : null,
    rotation: Number.isFinite(rot) ? ((rot % 360) + 360) % 360 : 0,
  };
}

function normProject(raw: Record<string, unknown>): Project {
  const ids = new Set<string>();
  if (Array.isArray(raw?.elements)) {
    for (const e of raw.elements) {
      const id = (e as Record<string, unknown>)?.id;
      if (typeof id === "string") ids.add(id);
    }
  }
  const elements = Array.isArray(raw?.elements)
    ? raw.elements.map((e) => normElement((e ?? {}) as Record<string, unknown>, ids))
    : [];
  return {
    id: String(raw?.id ?? newId()),
    name: String(raw?.name ?? "Project"),
    created_at: String(raw?.created_at ?? new Date().toISOString()),
    elements,
  };
}

export function projectsToJson(projects: Project[]): ReturnType<typeof toSerde>[] {
  return projects.map(toSerde);
}

function toSerde(p: Project) {
  return {
    id: p.id,
    name: p.name,
    created_at: p.created_at,
    elements: p.elements.map((e) => ({
      id: e.id,
      kind: KIND_CAPS[e.kind],
      x: Math.round(e.x * 100) / 100,
      y: Math.round(e.y * 100) / 100,
      w: Math.round(e.w * 100) / 100,
      h: Math.round(e.h * 100) / 100,
      material: MAT_CAPS[e.material],
      parentId: e.parentId ?? null,
      rotation: Math.round((e.rotation ?? 0) * 100) / 100,
    })),
  };
}

export function loadProjects(): Project[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((p) => normProject((p ?? {}) as Record<string, unknown>));
      }
    }
  } catch {
    /* corrupt store -> reseed demo */
  }
  return [seedDemo()];
}

export function saveProjects(projects: Project[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(projectsToJson(projects), null, 2));
  } catch {
    /* storage unavailable or full */
  }
}

export function exportJson(projects: Project[]): string {
  return `${JSON.stringify(projectsToJson(projects), null, 2)}\n`;
}

export function seedDemo(): Project {
  return {
    id: newId(),
    name: "Pavilion 01",
    created_at: new Date().toISOString(),
    elements: [
      { id: newId(), kind: "room", x: 80, y: 90, w: 220, h: 160, material: "concrete", parentId: null, rotation: 0 },
      { id: newId(), kind: "column", x: 120, y: 120, w: 28, h: 28, material: "concrete", parentId: null, rotation: 0 },
      { id: newId(), kind: "beam", x: 80, y: 70, w: 220, h: 12, material: "steel", parentId: null, rotation: 0 },
      { id: newId(), kind: "wall", x: 340, y: 140, w: 160, h: 12, material: "brick", parentId: null, rotation: 0 },
    ],
  };
}