/* AXIOM — Study polish + Start-base verification.
   Requires dev server on :5173. Run: node scripts/verify-study-polish.cjs */
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

(async () => {
  browser = await firefox.launch();
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 860 } });
  page = await ctx.newPage();
  page.on("pageerror", (e) => { throw new Error(`pageerror: ${String(e).slice(0, 160)}`); });

  await step("app starts on Start (base screen)", async () => {
    await page.goto(URL, { waitUntil: "domcontentloaded" });
    await page.evaluate(() => { localStorage.clear(); document.cookie = "axiom_seen=true; path=/; max-age=31536000"; });
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForSelector(".shell");
    await page.waitForTimeout(500);
    assert.strictEqual(await page.locator(".page.start").count(), 1);
    assert.strictEqual(await page.locator(".page.study").count(), 0);
    assert.strictEqual(await page.locator(".page.studio").count(), 0);
  });

  await step("first-time onboarding still works (cookie)", async () => {
    await page.evaluate(() => { document.cookie = "axiom_seen=; path=/; max-age=0"; });
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForSelector(".shell");
    await page.waitForTimeout(500);
    assert.strictEqual(await page.locator(".welcome").count(), 1);
    await page.locator(".welcome__start").click();
    await page.waitForTimeout(400);
    assert.strictEqual(await page.locator(".page.study").count(), 1);
    const jar = await page.evaluate(() => document.cookie);
    assert.ok(jar.includes("axiom_seen=true"), "cookie set by CTA");
  });

  await step("navigate Study / Studio from Start", async () => {
    await page.goto(URL, { waitUntil: "domcontentloaded" });
    await page.waitForSelector(".shell");
    await page.waitForTimeout(400);
    await page.click('[title="Study"]');
    await page.waitForTimeout(300);
    assert.strictEqual(await page.locator(".page.study").count(), 1);
    await page.click('[title="Studio"]');
    await page.waitForTimeout(300);
    assert.strictEqual(await page.locator(".page.studio").count(), 1);
    await page.click('[title="Start"]');
    await page.waitForTimeout(300);
    assert.strictEqual(await page.locator(".page.start").count(), 1);
  });

  await step("curriculum hierarchy: lessons only, two-line rows", async () => {
    await page.click('[title="Study"]');
    await page.waitForTimeout(400);
    // 4 courses, lessons only under the active (first) course
    assert.strictEqual(await page.locator(".study-toc__course").count(), 4);
    assert.strictEqual(await page.locator(".lesson-row").count(), 4);
    // no quiz entries anywhere in the TOC
    const toc = await page.locator(".study-toc").textContent();
    assert.ok(!/quiz/i.test(toc), "no quiz items in curriculum");
    // two-line structure: status glyph + number + title + duration line
    assert.strictEqual(await page.locator(".lesson-row__status").count(), 4);
    assert.strictEqual(await page.locator(".lesson-row__num").count(), 4);
    const first = await page.locator(".lesson-row").first().textContent();
    assert.ok(first.includes("01") && first.includes("What is Architecture?"), `row: ${first}`);
    const dur = await page.locator(".lesson-row__dur").first().textContent();
    assert.ok(dur.includes("8 min"), `duration: ${dur}`);
    const headTransform = await page.locator(".tree-head__title").first().evaluate((t) => getComputedStyle(t).textTransform);
    assert.ok(headTransform === "uppercase", `course head uppercase: ${headTransform}`);
    await page.screenshot({ path: "/tmp/axiom-study-toc.png" });
  });

  await step("lesson completion + progress still work", async () => {
    // first lesson f1 has correct: 0 -> click first option
    await page.locator(".quiz-opt").first().click();
    await page.waitForTimeout(300);
    const fb = await page.locator(".reader__fb").textContent();
    assert.ok(fb.includes("correct") || fb.includes("верно"), `feedback: ${fb}`);
    const pct = await page.locator(".study-toc__pct").textContent();
    assert.ok(parseInt(pct) > 0, `progress pct: ${pct}`);
    const done = await page.locator(".lesson-row__status--done").count();
    assert.ok(done >= 1, "completed lesson marked ✓");
    const compl = await page.evaluate(() => JSON.parse(localStorage.getItem("axiom_completed")));
    assert.ok(Object.keys(compl).length >= 1, "completion persisted");
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
