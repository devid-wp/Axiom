const { firefox } = require("playwright");
const assert = require("assert");

const URL = "http://localhost:5173/";
const results = [];
function ok(name) { results.push(`PASS ${name}`); }
function bad(name, msg) { results.push(`FAIL ${name} :: ${msg}`); }
async function step(name, fn) {
  try { await fn(); ok(name); } catch (e) { bad(name, e.message); }
}
const toolBtn = (label) => page.locator(".tool-row").filter({ hasText: label });

let page;

(async () => {
  const browser = await firefox.launch();
  page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  page.on("console", (m) => { if (m.type() === "error") errors.push(`console: ${m.text()}`); });

  await page.goto(URL, { waitUntil: "networkidle" });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForSelector(".shell");

  await step("seed project renders 4 elements on canvas", async () => {
    assert.strictEqual(await page.locator(".el__body").count(), 4);
    assert.strictEqual(await page.locator(".tree-row").count(), 4);
  });
  await step("statusbar shows project name", async () => {
    const t = await page.locator(".title__project").textContent();
    assert.ok(t.includes("Pavilion"));
  });

  await step("build tool places element on click (4->5)", async () => {
    await toolBtn("Wall").click();
    const sheet = await page.locator(".sheet").boundingBox();
    await page.mouse.click(sheet.x + sheet.width * 0.5, sheet.y + sheet.height * 0.5);
    await page.waitForTimeout(150);
    assert.strictEqual(await page.locator(".el__body").count(), 5);
    assert.strictEqual(await page.locator(".tree-row").count(), 5);
  });

  await step("placed element becomes selected + inspector shows it", async () => {
    const meta = await page.locator(".inspector__meta").textContent();
    assert.ok(meta);
    assert.strictEqual(await page.locator(".el__handle").count(), 1);
  });

  await step("undo removes placed element (5->4)", async () => {
    await page.evaluate(() => document.dispatchEvent(new KeyboardEvent("keydown", { key: "z", ctrlKey: true, bubbles: true })));
    await page.waitForTimeout(150);
    assert.strictEqual(await page.locator(".el__body").count(), 4);
  });
  await step("redo restores element (4->5)", async () => {
    await page.evaluate(() => document.dispatchEvent(new KeyboardEvent("keydown", { key: "z", shiftKey: true, ctrlKey: true, bubbles: true })));
    await page.waitForTimeout(150);
    assert.strictEqual(await page.locator(".el__body").count(), 5);
  });

  await step("drag move changes element position + persists", async () => {
    await toolBtn("Move").click();
    const body = await page.locator(".el__body").first().boundingBox();
    const before = await page.locator(".el__body").first().getAttribute("x");
    await page.mouse.move(body.x + 10, body.y + 10);
    await page.mouse.down();
    await page.mouse.move(body.x + 80, body.y + 40, { steps: 6 });
    await page.mouse.up();
    await page.waitForTimeout(150);
    const after = await page.locator(".el__body").first().getAttribute("x");
    assert.notStrictEqual(after, before);
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem("axiom_projects"))[0].elements.length);
    assert.strictEqual(stored, 5);
  });

  await step("inspector material change updates element", async () => {
    await page.locator(".tree-row").first().click();
    await page.waitForTimeout(100);
    const meta0 = await page.locator(".inspector__meta").textContent();
    assert.ok(meta0.includes("Concrete"));
    await page.locator(".seg-tab").filter({ hasText: "Material" }).click();
    await page.waitForTimeout(100);
    await page.locator(".swatch").nth(1).click();
    await page.waitForTimeout(100);
    await page.locator(".seg-tab").filter({ hasText: "Props" }).click();
    await page.waitForTimeout(100);
    const meta = await page.locator(".inspector__meta").textContent();
    assert.ok(meta.includes("Brick"));
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem("axiom_projects"))[0].elements[0].material);
    assert.strictEqual(stored, "Brick");
  });

  await step("nudge via inspector buttons changes position", async () => {
    await page.locator(".seg-tab").filter({ hasText: "Props" }).click();
    await page.waitForTimeout(100);
    const before = await page.locator(".el__body").first().getAttribute("x");
    await page.locator(".num-edit__btn").nth(1).click();
    await page.waitForTimeout(150);
    const after = await page.locator(".el__body").first().getAttribute("x");
    assert.notStrictEqual(before, after);
  });

  await step("keyboard V switches to select tool", async () => {
    await toolBtn("Move").click();
    await page.evaluate(() => document.dispatchEvent(new KeyboardEvent("keydown", { key: "v", bubbles: true })));
    await page.waitForTimeout(80);
    const status = await page.locator(".status__view").textContent();
    assert.ok(status.toLowerCase().includes("select"));
  });

  await step("delete key removes selected element", async () => {
    const nBefore = await page.locator(".el__body").count();
    await page.locator(".tree-row").first().click();
    await page.waitForTimeout(80);
    await page.evaluate(() => document.dispatchEvent(new KeyboardEvent("keydown", { key: "Delete", bubbles: true })));
    await page.waitForTimeout(150);
    assert.strictEqual(await page.locator(".el__body").count(), nBefore - 1);
  });

  await step("study: quiz answer marks lesson complete", async () => {
    await page.click('[title="Study"]');
    await page.waitForTimeout(250);
    await page.locator(".lesson-row").first().click();
    await page.waitForTimeout(150);
    await page.locator(".quiz-opt").first().click();
    await page.waitForTimeout(150);
    const fb = await page.locator(".reader__fb").textContent();
    assert.ok(fb.includes("correct") || fb.includes("верно"));
    const compl = await page.evaluate(() => JSON.parse(localStorage.getItem("axiom_completed")));
    assert.ok(Object.keys(compl).length >= 1);
  });

  await step("study: progress % updates", async () => {
    const pct = await page.locator(".study-rail__pct").textContent();
    assert.ok(parseInt(pct) > 0);
  });

  await step("explore: row opens study lesson", async () => {
    await page.click('[title="Explore"]');
    await page.waitForTimeout(250);
    await page.locator(".index-row").first().click();
    await page.waitForTimeout(250);
    assert.strictEqual(await page.locator(".explore__title").count(), 0);
    const crumb = await page.locator(".reader__crumb").textContent();
    assert.ok(crumb.length > 0);
  });

  await step("start: recent shows saved projects", async () => {
    await page.click('[title="Start"]');
    await page.waitForTimeout(250);
    const cmd = await page.locator(".cmd-row").count();
    assert.ok(cmd >= 2);
  });

  const fatal = errors.filter((e) => !/DevTools/.test(e));
  await browser.close();

  const failed = results.filter((r) => r.startsWith("FAIL"));
  for (const r of results) console.log(r);
  if (fatal.length) {
    console.log("RUNTIME ERRORS:\n" + fatal.join("\n"));
    process.exit(1);
  }
  console.log("NO RUNTIME ERRORS");
  if (failed.length) process.exit(1);
})();