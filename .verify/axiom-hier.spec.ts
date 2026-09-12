/* AXIOM hierarchical-studio verification (Playwright + Firefox).
   Covers: create/enter/child/breadcrumb/delete/duplicate/move/resize/rotate,
   reload persistence, AI structured actions (mock fallback), invalid-action
   rejection, destructive-action confirmation. */
import { test, expect } from "playwright/test";

const URL = "http://127.0.0.1:5173/";

async function toStudio(page) {
  await page.goto(URL);
  await page.getByTitle("Studio").click();
  await expect(page.locator(".page.studio")).toBeVisible();
}

async function canvasClick(page, dx = 0.8, dy = 0.8) {
  const box = await page.locator("svg.sheet").boundingBox();
  if (!box) throw new Error("no sheet");
  await page.mouse.click(box.x + box.width * dx, box.y + box.height * dy);
}

async function toolBtn(page, label) {
  return page.locator(".tool-row", { hasText: label });
}

async function openSelectedInTree(page, name) {
  const row = page.locator(".hier-row", { has: page.locator(".tree-row__name", { hasText: name }) });
  await row.locator(".hier-row__open").click();
}

async function cleanStudio(page) {
  await page.goto(URL);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.getByTitle("Studio").click();
  await expect(page.locator(".page.studio")).toBeVisible();
}

async function createWall(page) {
  await page.getByRole("button", { name: /Wall/ }).click();
  await canvasClick(page, 0.35, 0.35);
  const body = page.locator(".el__body").last();
  await expect(body).toBeVisible();
  await body.click();
  return body;
}

async function logicalPoint(page, locator, dx, dy) {
  const svg = await page.locator("svg.sheet").boundingBox();
  const box = await locator.boundingBox();
  if (!svg || !box) throw new Error("missing Studio geometry");
  return {
    x: box.x + box.width / 2 + dx * (svg.width / 900),
    y: box.y + box.height / 2 + dy * (svg.height / 600),
  };
}

test("hierarchical flow: building/floor/room/door + breadcrumbs + persistence", async ({ page }) => {
  await toStudio(page);
  // clean slate so auto-numbered names (Building 01, …) are unambiguous
  await page.getByRole("button", { name: "New project" }).click();
  await expect(page.locator(".hier-row")).toHaveCount(0);
  await expect(page.locator(".crumbs__item--on").first()).toContainText("Project");

  // create Building at root
  await (await toolBtn(page, "Building")).click();
  await canvasClick(page);
  await expect(page.locator(".tree-row__name", { hasText: "Building 01" })).toBeVisible();

  // enter building, create floor
  await openSelectedInTree(page, "Building 01");
  await expect(page.locator(".crumbs")).toContainText("Building 01");
  await (await toolBtn(page, "Floor")).click();
  await canvasClick(page);
  await expect(page.locator(".tree-row__name", { hasText: "Floor 01" })).toBeVisible();

  // enter floor, create room 5x4 via AI later; first manual room via tool
  await openSelectedInTree(page, "Floor 01");
  await expect(page.locator(".crumbs")).toContainText("Floor 01");
  await (await toolBtn(page, "Room")).click();
  await canvasClick(page, 0.5, 0.5);
  await expect(page.locator(".tree-row__name", { hasText: "Room 01" })).toBeVisible();

  // enter room, create wall + door
  await openSelectedInTree(page, "Room 01");
  await expect(page.locator(".crumbs")).toContainText("Room 01");
  await (await toolBtn(page, "Wall")).click();
  await canvasClick(page, 0.3, 0.3);
  await (await toolBtn(page, "Door")).click();
  await canvasClick(page, 0.55, 0.35);
  await expect(page.locator(".tree-row__name", { hasText: "Door 01" })).toBeVisible();

  // breadcrumbs navigate back to Floor 1
  await page.locator(".crumbs__item", { hasText: "Floor 01" }).click();
  await expect(page.locator(".crumbs__item--on").last()).toContainText("Floor 01");

  // canvas shows only floor's children (room), not wall/door
  const labelTexts = await page.locator("svg.sheet text").allTextContents();
  expect(labelTexts.join(" ")).toContain("ROOM");
  expect(labelTexts.join(" ")).not.toContain("DOOR");

  // duplicate room (deep copy), then delete the copy
  await page.locator(".hier-row", { has: page.locator(".tree-row__name", { hasText: "Room 01" }) }).locator(".tree-row").click();
  await page.keyboard.press("Control+d");
  await expect(page.locator(".tree-row__name", { hasText: "Room 02" })).toBeVisible();
  await page.keyboard.press("Delete");
  await expect(page.locator(".tree-row__name", { hasText: "Room 02" })).toHaveCount(0);

  // rotate room via inspector (+15°) and check persistence across reload
  await page.locator(".hier-row", { has: page.locator(".tree-row__name", { hasText: "Room 01" }) }).locator(".tree-row").click();
  await page.getByRole("button", { name: "⟳ +" }).click();
  await expect(page.locator(".inspector")).toContainText("15°");

  await page.reload();
  await page.getByTitle("Studio").click();
  await expect(page.locator(".tree-row__name", { hasText: "Building 01" })).toBeVisible();
  await expect(page.locator(".tree-row__name", { hasText: "Floor 01" })).toBeVisible();
  await expect(page.locator(".tree-row__name", { hasText: "Room 01" })).toBeVisible();
  await expect(page.locator(".tree-row__name", { hasText: "Door 01" })).toBeVisible();
});

test("AI: structured actions execute through the action layer; invalid rejected; destructive confirmed", async ({ page }) => {
  await toStudio(page);
  await page.getByRole("button", { name: "New project" }).click();
  await expect(page.locator(".hier-row")).toHaveCount(0);
  // start from a clean slate: select-all is not available; use AI clear with confirm
  await page.locator(".viewport-ai").click();
  await expect(page.locator(".studio-ai-panel")).toBeVisible();
  const input = page.locator(".ai__input");
  const send = async (q) => {
    // never overlap requests: wait until the previous one fully settled
    await expect(page.locator(".ai__thinking")).toHaveCount(0, { timeout: 20000 });
    await input.fill(q);
    await page.locator(".ai__send").click();
  };
  const settled = () => expect(page.locator(".ai__thinking")).toHaveCount(0, { timeout: 20000 });

  await send("Create a building.");
  await expect(page.locator(".tree-row__name", { hasText: "Building 01" })).toBeVisible({ timeout: 15000 });

  await send("Open the building.");
  await expect(page.locator(".crumbs")).toContainText("Building 01", { timeout: 15000 });

  await send("Create a floor.");
  await expect(page.locator(".tree-row__name", { hasText: "Floor 01" })).toBeVisible({ timeout: 15000 });

  await send("Open the floor.");
  await expect(page.locator(".crumbs")).toContainText("Floor 01", { timeout: 15000 });

  await send("Create a room 5 by 4 meters.");
  await expect(page.locator(".tree-row__name", { hasText: "Room 01" })).toBeVisible({ timeout: 15000 });
  await settled();

  // invalid action must be rejected safely (simulation hook in mock provider)
  const before = await page.locator(".hier-row").count();
  await send("simulate-invalid-action please");
  await expect(page.locator(".ai__msgs")).toContainText("not valid", { timeout: 15000 });
  expect(await page.locator(".hier-row").count()).toBe(before);

  // destructive action requires confirmation
  await send("Delete the room.");
  await expect(page.locator(".ai__confirm")).toBeVisible({ timeout: 15000 });
  // still there before confirm
  await expect(page.locator(".tree-row__name", { hasText: "Room 01" })).toBeVisible();
  await page.locator(".ai__confirm-apply").click();
  await expect(page.locator(".tree-row__name", { hasText: "Room 01" })).toHaveCount(0);
});

test("regression: dragged geometry is one undoable move", async ({ page }) => {
  await cleanStudio(page);
  const body = await createWall(page);
  const before = await body.evaluate((el) => ({ x: el.getAttribute("x"), y: el.getAttribute("y") }));
  await page.getByRole("button", { name: "Select V" }).click();
  const start = await logicalPoint(page, body, 0, 0);
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(start.x + 64, start.y + 32);
  await page.mouse.up();
  const after = await body.evaluate((el) => ({ x: el.getAttribute("x"), y: el.getAttribute("y") }));
  expect(after).not.toEqual(before);
  await expect(page.getByTitle("Undo (Ctrl+Z)")).toBeEnabled();
  await page.getByTitle("Undo (Ctrl+Z)").click();
  await expect(body).toHaveAttribute("x", before.x!);
  await expect(body).toHaveAttribute("y", before.y!);
  await expect(page.getByTitle("Redo (Ctrl+Shift+Z)")).toBeEnabled();
  await page.getByTitle("Redo (Ctrl+Shift+Z)").click();
  await expect(body).toHaveAttribute("x", after.x!);
  await expect(body).toHaveAttribute("y", after.y!);
});

test("regression: resize drag uses pointer-down dimensions without overshoot", async ({ page }) => {
  await cleanStudio(page);
  const body = await createWall(page);
  const initial = await body.evaluate((el) => ({ w: Number(el.getAttribute("width")), h: Number(el.getAttribute("height")) }));
  const handle = page.locator(".el__handle");
  const svg = await page.locator("svg.sheet").boundingBox();
  const hb = await handle.boundingBox();
  if (!svg || !hb) throw new Error("missing resize handle");
  const scaleX = svg.width / 900;
  const scaleY = svg.height / 600;
  const start = { x: hb.x + hb.width / 2, y: hb.y + hb.height / 2 };
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(start.x + 32 * scaleX, start.y + 16 * scaleY);
  await page.mouse.move(start.x + 64 * scaleX, start.y + 32 * scaleY);
  await page.mouse.up();
  const snap8 = (n) => Math.round(n / 8) * 8;
  const expected = { w: snap8(initial.w + 64), h: snap8(initial.h + 32) };
  await expect(body).toHaveAttribute("width", String(expected.w));
  await expect(body).toHaveAttribute("height", String(expected.h));
  await page.getByTitle("Undo (Ctrl+Z)").click();
  await expect(body).toHaveAttribute("width", String(initial.w));
  await expect(body).toHaveAttribute("height", String(initial.h));
  await page.getByTitle("Redo (Ctrl+Shift+Z)").click();
  await expect(body).toHaveAttribute("width", String(expected.w));
  await expect(body).toHaveAttribute("height", String(expected.h));
});

test("regression: active project index persists and invalid index falls back safely", async ({ page }) => {
  await cleanStudio(page);
  await page.getByRole("button", { name: "New project" }).click();
  await expect(page.locator(".title__project")).toHaveText("Project 2");
  await page.reload();
  await page.getByTitle("Studio").click();
  await expect(page.locator(".title__project")).toHaveText("Project 2");
  await page.evaluate(() => localStorage.setItem("axiom_current_project", "999"));
  await page.reload();
  await page.getByTitle("Studio").click();
  await expect(page.locator(".title__project")).toHaveText("Pavilion 01");
});
