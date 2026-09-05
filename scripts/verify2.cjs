const { firefox } = require("playwright");
const assert = require("assert");

const URL = "http://localhost:5173/";
const results = [];
function ok(name) { results.push(`PASS ${name}`); }
function bad(name, msg) { results.push(`FAIL ${name} :: ${msg}`); }
async function step(name, fn) {
  try { await fn(); ok(name); } catch (e) { bad(name, e.message); }
}

(async () => {
  const browser = await firefox.launch();
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });

  await page.goto(URL, { waitUntil: "networkidle" });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForSelector(".shell");

  await step("resize handle changes element w/h", async () => {
    await page.locator(".tree-row").first().click();
    await page.waitForTimeout(100);
    const h0 = await page.locator(".el__body").first().getAttribute("width");
    const hb = await page.locator(".el__handle").boundingBox();
    await page.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2);
    await page.mouse.down();
    await page.mouse.move(hb.x + 90, hb.y + 60, { steps: 5 });
    await page.mouse.up();
    await page.waitForTimeout(150);
    const h1 = await page.locator(".el__body").first().getAttribute("width");
    assert.notStrictEqual(h0, h1);
  });

  await step("size step buttons change element width", async () => {
    await page.locator(".seg-tab").filter({ hasText: "Props" }).click();
    await page.waitForTimeout(100);
    const w0 = await page.locator(".el__body").first().getAttribute("width");
    // W row num-edit is the 3rd num-edit (X,Y,W,H) — click its + button
    await page.locator(".num-edit").nth(2).locator(".num-edit__btn").nth(1).click();
    await page.waitForTimeout(150);
    const w1 = await page.locator(".el__body").first().getAttribute("width");
    assert.notStrictEqual(w0, w1);
  });

  await step("Ctrl+D duplicates selected element", async () => {
    const n = await page.locator(".el__body").count();
    await page.evaluate(() => document.dispatchEvent(new KeyboardEvent("keydown", { key: "d", ctrlKey: true, bubbles: true })));
    await page.waitForTimeout(150);
    assert.strictEqual(await page.locator(".el__body").count(), n + 1);
  });

  await step("Esc deselects", async () => {
    await page.evaluate(() => document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })));
    await page.waitForTimeout(100);
    assert.strictEqual(await page.locator(".el__handle").count(), 0);
  });

  await step("RU toggle switches study content", async () => {
    await page.click('[title="Study"]');
    await page.waitForTimeout(250);
    const enTitle = await page.locator(".reader__title").textContent();
    await page.click('[title="Language"]');
    await page.waitForTimeout(200);
    const ruTitle = await page.locator(".reader__title").textContent();
    assert.notStrictEqual(enTitle, ruTitle);
    const lang = await page.locator(".status__lang").textContent();
    assert.strictEqual(lang, "РУ");
  });

  await step("export downloads axiom-export.json", async () => {
    await page.click('[title="Studio"]');
    await page.waitForTimeout(250);
    const [dl] = await Promise.all([
      page.waitForEvent("download", { timeout: 5000 }).catch(() => null),
      page.locator(".titlebar__actions .btn").filter({ hasText: "Export" }).click(),
    ]);
    assert.ok(dl, "no download event");
    assert.strictEqual(dl.suggestedFilename(), "axiom-export.json");
  });

  await step("new project opens empty sheet", async () => {
    await page.click(".title__new");
    await page.waitForTimeout(200);
    assert.strictEqual(await page.locator(".el__body").count(), 0);
    assert.strictEqual(await page.locator(".sheet__hint").count(), 1);
    assert.strictEqual(await page.locator(".tree-row").count(), 0);
  });

  const fatal = errors.filter((e) => !/DevTools/.test(e));
  await browser.close();
  const failed = results.filter((r) => r.startsWith("FAIL"));
  for (const r of results) console.log(r);
  if (fatal.length) {
    console.log("RUNTIME ERRORS:\n" + fatal.join("\n"));
    process.exit(1);
  }
  if (failed.length) { console.log("SEE FAILURES ABOVE"); process.exit(1); }
})();