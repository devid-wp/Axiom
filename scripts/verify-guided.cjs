/* AXIOM — Guided Learning E2E: Building -> Floor -> Room + wrong action.
   Requires dev server on :5173. Run: node scripts/verify-guided.cjs */
const { firefox } = require("playwright");
const assert = require("assert");

const URL = "http://localhost:5173/";
const results = [];
function ok(name) { results.push(`PASS ${name}`); }
function bad(name, msg) { results.push(`FAIL ${name} :: ${msg}`); }
async function step(name, fn) {
  try { await fn(); ok(name); } catch (e) { bad(name, e.message); }
}

let page;
let browser;

const toolBtn = (label) => page.locator(".tool-row").filter({ hasText: label });
const bodies = () => page.locator(".el__body").count();
const barText = () => page.locator(".guided-bar").textContent();
async function sheetClick(fx, fy) {
  const box = await page.locator(".sheet").boundingBox();
  await page.mouse.click(box.x + box.width * fx, box.y + box.height * fy);
  await page.waitForTimeout(250);
}
const guidedBtn = (label) => page.locator(".guided-bar__btn").filter({ hasText: label });

(async () => {
  browser = await firefox.launch();
  page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
  await page.goto(URL, { waitUntil: "domcontentloaded" });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForSelector(".shell");

  await step("open studio with seed project", async () => {
    await page.click('[title="Studio"]');
    await page.waitForTimeout(400);
    assert.strictEqual(await bodies(), 4);
  });

  await step("guided mode opens with STEP 1/3", async () => {
    await page.locator(".mode-pill__btn").filter({ hasText: "Guided" }).click();
    await page.waitForTimeout(300);
    const t = await barText();
    assert.ok(t.includes("STEP 1/3"), `bar shows: ${t.slice(0, 60)}`);
  });

  await step("STEP1 demo actually creates a Building", async () => {
    await guidedBtn("Show demo").click();
    await page.waitForTimeout(400);
    assert.strictEqual(await bodies(), 5);
  });

  await step("STEP1 My turn undoes the demo", async () => {
    await guidedBtn("My turn").click();
    await page.waitForTimeout(300);
    assert.strictEqual(await bodies(), 4);
  });

  await step("STEP1 wrong action (column) does not advance + targeted hint", async () => {
    await toolBtn("Column").click();
    await sheetClick(0.5, 0.8);
    assert.strictEqual(await bodies(), 5);
    const t = await barText();
    assert.ok(t.includes("STEP 1/3"), "still on step 1");
    const fb = await page.locator(".guided-bar__feedback").textContent();
    assert.ok(fb.length > 10, "targeted feedback shown");
    assert.ok(
      await guidedBtn("Continue").isDisabled(),
      "Continue stays disabled",
    );
    // cleanup: delete the stray column
    await page.locator(".tree-row").filter({ hasText: "Column" }).last().click();
    await page.waitForTimeout(150);
    await page.keyboard.press("Delete");
    await page.waitForTimeout(250);
    assert.strictEqual(await bodies(), 4);
  });

  await step("STEP1 correct action (Building) validates -> STEP 2", async () => {
    await toolBtn("Building").click();
    await sheetClick(0.75, 0.7);
    assert.strictEqual(await bodies(), 5);
    await guidedBtn("Continue").click({ timeout: 5000 });
    await page.waitForTimeout(300);
    assert.ok((await barText()).includes("STEP 2/3"));
  });

  await step("STEP2 demo enters Building + creates Floor", async () => {
    await guidedBtn("Show demo").click();
    await page.waitForTimeout(400);
    const crumbs = await page.locator(".crumbs").textContent();
    assert.ok(crumbs.includes("Building"), `context moved into Building: ${crumbs}`);
    assert.strictEqual(await bodies(), 1); // only the demo floor visible in context
    await guidedBtn("My turn").click();
    await page.waitForTimeout(300);
  });

  await step("STEP2 student creates Floor inside Building -> STEP 3", async () => {
    const crumbs = await page.locator(".crumbs").textContent();
    if (!crumbs.includes("Building")) {
      await page.locator(".tree-row").filter({ hasText: "Building" }).first().click();
      await page.waitForTimeout(150);
      await page.keyboard.press("Enter");
      await page.waitForTimeout(250);
    }
    await toolBtn("Floor").click();
    await sheetClick(0.5, 0.5);
    await guidedBtn("Continue").click({ timeout: 5000 });
    await page.waitForTimeout(300);
    assert.ok((await barText()).includes("STEP 3/3"));
  });

  await step("STEP3 demo enters Floor + creates Room", async () => {
    await guidedBtn("Show demo").click();
    await page.waitForTimeout(400);
    const crumbs = await page.locator(".crumbs").textContent();
    assert.ok(crumbs.includes("Floor"), `context moved into Floor: ${crumbs}`);
    await guidedBtn("My turn").click();
    await page.waitForTimeout(300);
  });

  await step("STEP3 student creates Room -> track completes", async () => {
    const crumbs = await page.locator(".crumbs").textContent();
    if (!crumbs.includes("Floor")) {
      await page.locator(".tree-row").filter({ hasText: "Floor" }).first().click();
      await page.waitForTimeout(150);
      await page.keyboard.press("Enter");
      await page.waitForTimeout(250);
    }
    await toolBtn("Room").click();
    await sheetClick(0.3, 0.3);
    await guidedBtn("Finish").click({ timeout: 5000 });
    await page.waitForTimeout(300);
    const t = await barText();
    assert.ok(t.includes("complete") || t.includes("✓"), `done UI: ${t.slice(0, 80)}`);
    const g = await page.evaluate(() => JSON.parse(localStorage.getItem("axiom_guided")));
    assert.ok(g.done["guided/foundation"] === true, "progress persisted");
  });

  await browser.close();
  console.log(results.join("\n"));
  const fails = results.filter((r) => r.startsWith("FAIL"));
  process.exit(fails.length ? 1 : 0);
})().catch((e) => {
  console.error(`FAIL harness :: ${e.message}`);
  browser?.close();
  process.exit(1);
});
