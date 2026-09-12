/* AXIOM — Guided validator unit tests. Plain node + esbuild bundle
   (kept in scripts/ so tsc web/src builds ignore it).
   Run: esbuild scripts/guided-validate.test.ts --bundle ... && node out.cjs */
import { strict as assert } from "node:assert";
import { validate } from "../web/src/guided/validate";
import { foundationLesson } from "../web/src/guided/lessons";
import type { GuidedStep } from "../web/src/guided/types";
import type { Element, ElementKind, Material } from "../web/src/studio/types";
import type { StudioSnapshot } from "../web/src/guided/types";

let n = 0;
function el(
  id: string,
  kind: ElementKind,
  parentId: string | null,
  material: Material = "concrete",
  w = 100,
  h = 100,
): Element {
  return { id, kind, x: 0, y: 0, w, h, material, parentId, rotation: 0 };
}
function snap(elements: Element[], contextId: string | null = null, selectedId = ""): StudioSnapshot {
  return {
    projects: [{ id: "p1", name: "T", created_at: "t", elements }],
    currentIdx: 0,
    selectedId,
    contextId,
  };
}
function check(name: string, cond: boolean): void {
  n++;
  assert.ok(cond, name);
  console.log(`ok ${n} - ${name}`);
}

const [s1, s2, s3] = foundationLesson.steps;

// 1. empty project, step1 -> missing-element
let r = validate(snap([]), s1, []);
check("s1 empty -> !ok missing-element", !r.ok && r.failedCheck === "missing-element");

// 2. fresh building at root -> ok
r = validate(snap([el("b1", "building", null)]), s1, []);
check("s1 fresh building at root -> ok", r.ok && r.matchedIds.join() === "b1");

// 3. pre-existing building excluded by baseline -> missing-element
r = validate(snap([el("b1", "building", null)]), s1, ["b1"]);
check("s1 baseline building ignored", !r.ok && r.failedCheck === "missing-element");

// 4. building nested inside room -> parent fail
r = validate(
  snap([el("r0", "room", null), el("b1", "building", "r0")], null),
  s1,
  [],
);
check("s1 nested building -> parent fail", !r.ok && r.failedCheck === "parent");

// 5. wrong context for step1 (inside building) -> context fail
r = validate(snap([el("b0", "building", null), el("c1", "column", null)], "b0"), s1, ["b0", "c1"]);
check("s1 wrong context -> context fail", !r.ok && r.failedCheck === "context");

// 6. step2 happy path: ctx building + fresh floor under building -> ok
r = validate(
  snap([el("b1", "building", null), el("f1", "floor", "b1")], "b1"),
  s2,
  ["b1"],
);
check("s2 floor in building, ctx building -> ok", r.ok);

// 7. step2 floor at root -> parent fail
r = validate(snap([el("b1", "building", null), el("f1", "floor", null)], "b1"), s2, ["b1"]);
check("s2 floor at root -> parent fail", !r.ok && r.failedCheck === "parent");

// 8. step2 at root context -> context fail (even with floor present elsewhere)
r = validate(
  snap([el("b1", "building", null), el("f1", "floor", "b1")], null),
  s2,
  ["b1"],
);
check("s2 root context -> context fail", !r.ok && r.failedCheck === "context");

// 9. step2 with a wrong-kind creation (column at root) -> context fail, no advance
r = validate(snap([el("b1", "building", null), el("c1", "column", null)], null), s2, ["b1"]);
check("s2 column instead of floor -> !ok", !r.ok);

// 10. step3 happy path
r = validate(
  snap([el("b1", "building", null), el("f1", "floor", "b1"), el("r1", "room", "f1")], "f1"),
  s3,
  ["b1", "f1"],
);
check("s3 room in floor, ctx floor -> ok", r.ok);

// 11. step3 room directly in building -> parent fail
r = validate(
  snap([el("b1", "building", null), el("f1", "floor", "b1"), el("r1", "room", "b1")], "f1"),
  s3,
  ["b1", "f1"],
);
check("s3 room in building -> parent fail", !r.ok && r.failedCheck === "parent");

// 12. dimensions respected when specified
const dimStep: GuidedStep = {
  id: "t",
  expect: { kind: "create", elementType: "room", w: 180, h: 130, tol: 8 },
  instruction: { en: "x", ru: "x" },
  hint: { en: "x", ru: "x" },
  demo: [],
  allowTools: ["room"],
};
r = validate(snap([el("r1", "room", null, "concrete", 184, 128)]), dimStep, []);
check("dims within tol -> ok", r.ok);
r = validate(snap([el("r1", "room", null, "concrete", 300, 300)]), dimStep, []);
check("dims outside tol -> dimensions fail", !r.ok && r.failedCheck === "dimensions");

// 13. material respected when specified
const matStep: GuidedStep = {
  id: "t",
  expect: { kind: "create", elementType: "wall", material: "timber" },
  instruction: { en: "x", ru: "x" },
  hint: { en: "x", ru: "x" },
  demo: [],
  allowTools: ["wall"],
};
r = validate(snap([el("w1", "wall", null, "brick")]), matStep, []);
check("wrong material -> material fail", !r.ok && r.failedCheck === "material");
r = validate(snap([el("w1", "wall", null, "timber")]), matStep, []);
check("right material -> ok", r.ok);

// 14. count respected
const countStep: GuidedStep = {
  id: "t",
  expect: { kind: "create", elementType: "column", parent: "root", count: 2 },
  instruction: { en: "x", ru: "x" },
  hint: { en: "x", ru: "x" },
  demo: [],
  allowTools: ["column"],
};
r = validate(snap([el("c1", "column", null)]), countStep, []);
check("count 1/2 -> count fail", !r.ok && r.failedCheck === "count");
r = validate(snap([el("c1", "column", null), el("c2", "column", null)]), countStep, []);
check("count 2/2 -> ok", r.ok && r.matchedIds.length === 2);

// 15. enter kind
const enterStep: GuidedStep = {
  id: "t",
  expect: { kind: "enter", elementType: "floor" },
  instruction: { en: "x", ru: "x" },
  hint: { en: "x", ru: "x" },
  demo: [],
  allowTools: [],
};
r = validate(snap([el("f1", "floor", "b1")], "f1"), enterStep, []);
check("enter ctx floor -> ok", r.ok);
r = validate(snap([el("f1", "floor", "b1")], null), enterStep, []);
check("enter at root -> !ok", !r.ok);

// 16. select kind
const selStep: GuidedStep = {
  id: "t",
  expect: { kind: "select", elementType: "room" },
  instruction: { en: "x", ru: "x" },
  hint: { en: "x", ru: "x" },
  demo: [],
  allowTools: [],
};
r = validate(snap([el("r1", "room", null)], null, "r1"), selStep, []);
check("select room -> ok", r.ok);
r = validate(snap([el("r1", "room", null)], null, ""), selStep, []);
check("select nothing -> selection fail", !r.ok && r.failedCheck === "selection");

// 17. set_material kind
const paintStep: GuidedStep = {
  id: "t",
  expect: { kind: "set_material", elementType: "wall", material: "glass" },
  instruction: { en: "x", ru: "x" },
  hint: { en: "x", ru: "x" },
  demo: [],
  allowTools: [],
};
r = validate(snap([el("w1", "wall", null, "brick")], null, "w1"), paintStep, []);
check("paint wrong mat -> material fail", !r.ok && r.failedCheck === "material");
r = validate(snap([el("w1", "wall", null, "glass")], null, "w1"), paintStep, []);
check("paint right mat -> ok", r.ok);

// 18. purity: input snapshot untouched
const frozen = snap([el("b1", "building", null)]);
const before = JSON.stringify(frozen);
validate(frozen, s1, []);
check("validator is pure", JSON.stringify(frozen) === before);

console.log(`\nall ${n} validator tests passed`);
