/* AXIOM — Study lesson -> Practice in Studio -> Guided track E2E.
   Requires dev server on :5173. Run: node scripts/verify-study-guided.cjs */
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

const practiceBtn = () => page.locator(".reader__actions .btn--primary");
const guidedBtn = (label) => page.locator(".guided-bar__btn").filter({ hasText: label });
async function sheetClick(fx, fy) {
  const box = await page.locator(".sheet").boundingBox();
  await page.mouse.click(box.x + box.width * fx, box.y + box.height * fy);
  await page.waitForTimeout(250);
}

(async () => {
  browser = await firefox.launch();
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 860 } });
  page = await ctx.newPage();
  page.on("pageerror", (e) => { throw new Error(`pageerror: ${String(e).slice(0, 160)}`); });

  await step("1-2. open Study on mapped lesson (fundamentals/f1)", async () => {
    await page.goto(URL, { waitUntil: "domcontentloaded" });
    await page.evaluate(() => {
      localStorage.clear();
      document.cookie = "axiom_seen=true; path=/; max-age=31536000";
    });
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForSelector(".shell");
    await page.click('[title="Study"]');
    await page.waitForTimeout(400);
    assert.strictEqual(await page.locator(".page.study").count(), 1);
    const crumb = await page.locator(".reader__crumb").textContent();
    assert.ok(crumb.includes("fundamentals"), `lesson: ${crumb}`);
  });

  await step("3. Practice in Studio exists and is enabled", async () => {
    assert.strictEqual(await practiceBtn().count(), 1);
    assert.ok(!(await practiceBtn().isDisabled()), "mapped lesson: enabled");
  });

  await step("4-7. click -> Studio + Guided foundation track + bar", async () => {
    await practiceBtn().click();
    await page.waitForTimeout(400);
    assert.strictEqual(await page.locator(".page.studio").count(), 1, "studio opens");
    assert.strictEqual(await page.locator(".guided-bar").count(), 1, "guided active");
    const bar = await page.locator(".guided-bar").textContent();
    assert.ok(bar.includes("Foundation"), `expected track: ${bar.slice(0, 80)}`);
    assert.ok(bar.includes("STEP 1/3"), "guided bar at step 1");
  });

  await step("8-10. complete first real step via normal validation", async () => {
    await guidedBtn("Show demo").click();
    await page.waitForTimeout(400);
    await guidedBtn("My turn").click();
    await page.waitForTimeout(300);
    await page.locator(".tool-row").filter({ hasText: "Building" }).click();
    await sheetClick(0.75, 0.7);
    await guidedBtn("Continue").click({ timeout: 5000 });
    await page.waitForTimeout(300);
    const bar = await page.locator(".guided-bar").textContent();
    assert.ok(bar.includes("STEP 2/3"), `advanced by validation: ${bar.slice(0, 60)}`);
  });

  await step("11-12. back to Study, Study still works", async () => {
    await page.click('[title="Study"]');
    await page.waitForTimeout(400);
    assert.strictEqual(await page.locator(".page.study").count(), 1);
    assert.ok((await page.locator(".reader__title").count()) >= 1, "reader renders");
  });

  await step("13. unmapped lesson does NOT start a wrong track", async () => {
    await page.locator(".tree-head").nth(1).click();
    await page.waitForTimeout(250);
    await page.locator(".lesson-row").first().click();
    await page.waitForTimeout(250);
    const title = await page.locator(".reader__title").textContent();
    assert.ok(!title.includes("What is Architecture"), `now on: ${title}`);
    assert.ok(await practiceBtn().isDisabled(), "practice honestly disabled");
    const before = await page.evaluate(() => localStorage.getItem("axiom_guided"));
    await practiceBtn().click({ force: true });
    await page.waitForTimeout(300);
    assert.strictEqual(await page.locator(".page.study").count(), 1, "no navigation");
    const after = await page.evaluate(() => localStorage.getItem("axiom_guided"));
    assert.strictEqual(after, before, "no new guided start from unmapped lesson");
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
