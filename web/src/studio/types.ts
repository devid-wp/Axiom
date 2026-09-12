/* AXIOM — studio domain types. Flat element list is the single source of
   truth; hierarchy is expressed through parentId (null = project root).
   Legacy kinds (column, beam) are kept so old persisted sheets migrate. */

export type ElementKind =
  | "building"
  | "floor"
  | "room"
  | "corridor"
  | "wall"
  | "door"
  | "window"
  | "roof"
  | "column"
  | "beam";
export type Material = "concrete" | "brick" | "glass" | "timber" | "steel";
export type Tool =
  | "select"
  | "move"
  | "building"
  | "floor"
  | "room"
  | "corridor"
  | "wall"
  | "door"
  | "window"
  | "roof"
  | "column"
  | "beam";

export interface Element {
  id: string;
  kind: ElementKind;
  x: number;
  y: number;
  w: number;
  h: number;
  material: Material;
  /** null = lives at the project root; otherwise the id of the parent. */
  parentId: string | null;
  /** degrees, normalized to [0, 360). */
  rotation: number;
}

export interface Project {
  id: string;
  name: string;
  created_at: string;
  elements: Element[];
}
