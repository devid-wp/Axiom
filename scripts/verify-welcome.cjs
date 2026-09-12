/* AXIOM — Welcome entry invariant: EVERY application entry -> Welcome.
   No cookie, no flags. Requires dev server on :5173.
   Run: node scripts/verify-welcome.cjs */
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

async function openEntry() {
  await page.goto(URL, { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".shell");
  await page.waitForTimeout(500);
}
async function noSeenCookie() {
  const jar = await page.evaluate(() => document.cookie);
  return !jar.split(";").some((c) => c.trim() === "axiom_seen=true");
}

(async () => {
  browser = await firefox.launch();
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 } });
  page = await ctx.newPage();
  page.on("pageerror", (e) => { throw new Error(`pageerror: ${String(e).slice(0, 160)}`); });

  await step("1. open AXIOM -> Welcome", async () => {
    await openEntry();
    assert.strictEqual(await page.locator(".welcome").count(), 1);
    assert.ok((await page.locator(".welcome__word").textContent()).includes("AXIOM"));
  });

  await step("2-3. Start learning -> Study, navigate normally", async () => {
    await page.locator(".welcome__start").click();
    await page.waitForTimeout(400);
    assert.strictEqual(await page.locator(".page.study").count(), 1);
    await page.click('[title="Studio"]');
    await page.waitForTimeout(300);
    assert.strictEqual(await page.locator(".page.studio").count(), 1);
    await page.click('[title="Start"]');
    await page.waitForTimeout(300);
    assert.strictEqual(await page.locator(".page.start").count(), 1);
    assert.strictEqual(await page.locator(".welcome").count(), 0, "dashboard after entry, no Welcome repeat");
  });

  await step("4. reload -> Welcome again", async () => {
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForSelector(".shell");
    await page.waitForTimeout(500);
    assert.strictEqual(await page.locator(".welcome").count(), 1);
  });

  await step("5-6. Explore Studio -> Studio, reload -> Welcome", async () => {
    await page.locator(".welcome__explore").click();
    await page.waitForTimeout(400);
    assert.strictEqual(await page.locator(".page.studio").count(), 1);
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForSelector(".shell");
    await page.waitForTimeout(500);
    assert.strictEqual(await page.locator(".welcome").count(), 1);
  });

  await step("7-9. seeded user data intact, no cookie/localStorage flags needed", async () => {
    await page.evaluate(() => {
      localStorage.setItem("axiom_projects", JSON.stringify([{
        id: "p1", name: "My House", created_at: new Date().toISOString(),
        elements: [{ id: "e1", kind: "room", x: 80, y: 90, w: 220, h: 160, material: "concrete", parentId: null, rotation: 0 }],
      }]));
      localStorage.setItem("axiom_completed", JSON.stringify({ "fundamentals/f1": true }));
      localStorage.setItem("axiom_guided", JSON.stringify({
        activeLessonId: null, stepIndex: 0, done: { "guided/foundation": true },
      }));
    });
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForSelector(".shell");
    await page.waitForTimeout(500);
    assert.strictEqual(await page.locator(".welcome").count(), 1, "entry always Welcome");
    const projs = await page.evaluate(() => localStorage.getItem("axiom_projects"));
    const compl = await page.evaluate(() => localStorage.getItem("axiom_completed"));
    const guided = await page.evaluate(() => localStorage.getItem("axiom_guided"));
    assert.ok(projs.includes("My House"), "projects intact");
    assert.ok(compl.includes("fundamentals/f1"), "progress intact");
    assert.ok(guided.includes("guided/foundation"), "guided intact");
  });

  await step("10. no axiom_seen cookie, no onboarding keys required", async () => {
    assert.ok(await noSeenCookie(), "no cookie set by entry flow");
    const onboard = await page.evaluate(() => localStorage.getItem("axiom_onboarding"));
    assert.strictEqual(onboard, null, "no onboarding localStorage key");
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
