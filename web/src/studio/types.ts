/* AXIOM — studio domain types. Direct port of src/studio/mod.rs.
   In-memory kinds/materials use lowercase keys (matches the Slint AppState
   strings); persisted JSON keeps the native serde capitalization (Wall, Room,
   ... / Concrete, Brick, ...). */

export type ElementKind = "wall" | "room" | "column" | "beam";
export type Material = "concrete" | "brick" | "glass" | "timber" | "steel";
export type Tool = "select" | "move" | "wall" | "room" | "column" | "beam";

export interface Element {
  id: string;
  kind: ElementKind;
  x: number;
  y: number;
  w: number;
  h: number;
  material: Material;
}

export interface Project {
  id: string;
  name: string;
  created_at: string;
  elements: Element[];
}