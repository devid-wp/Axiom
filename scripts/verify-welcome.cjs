/* AXIOM — Welcome first-entry E2E (cookie flag: axiom_seen=true).
   Requires dev server on :5173. Run: node scripts/verify-welcome.cjs */
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
let context;

async function clearSeenCookie() {
  await page.evaluate(() => {
    document.cookie = "axiom_seen=; path=/; max-age=0; SameSite=Lax";
  });
}
async function seenCookie() {
  const jar = await page.evaluate(() => document.cookie);
  return jar.split(";").some((c) => c.trim() === "axiom_seen=true");
}
async function openStart() {
  await page.goto(URL, { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".shell");
  await page.waitForTimeout(400);
}

(async () => {
  browser = await firefox.launch();
  context = await browser.newContext({ viewport: { width: 1366, height: 900 } });
  page = await context.newPage();

  await step("1-3. no cookie -> Start shows Welcome", async () => {
    await openStart();
    await clearSeenCookie();
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForSelector(".shell");
    await page.waitForTimeout(400);
    assert.strictEqual(await page.locator(".welcome").count(), 1);
    assert.ok((await page.locator(".welcome__word").textContent()).includes("AXIOM"));
  });

  await step("4-5. Start learning -> study + axiom_seen=true", async () => {
    await page.locator(".welcome__start").click();
    await page.waitForTimeout(400);
    assert.strictEqual(await page.locator(".page.study").count(), 1);
    assert.ok(await seenCookie(), "cookie set after Start learning");
  });

  await step("6-7. reload -> normal dashboard, no Welcome", async () => {
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForSelector(".shell");
    await page.waitForTimeout(400);
    assert.strictEqual(await page.locator(".welcome").count(), 0);
    assert.strictEqual(await page.locator(".page.start").count(), 1);
  });

  await step("8-10. clear cookie -> Welcome appears again", async () => {
    await clearSeenCookie();
    assert.ok(!(await seenCookie()), "cookie cleared");
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForSelector(".shell");
    await page.waitForTimeout(400);
    assert.strictEqual(await page.locator(".welcome").count(), 1);
  });

  await step("11. cookie reset leaves project/progress data intact", async () => {
    await page.evaluate(() => {
      localStorage.setItem("axiom_projects", JSON.stringify([{
        id: "p1", name: "My House", created_at: new Date().toISOString(),
        elements: [{ id: "e1", kind: "room", x: 80, y: 90, w: 220, h: 160, material: "concrete", parentId: null, rotation: 0 }],
      }]));
      localStorage.setItem("axiom_completed", JSON.stringify({ "fundamentals/f1": true }));
    });
    await clearSeenCookie();
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForSelector(".shell");
    await page.waitForTimeout(400);
    assert.strictEqual(await page.locator(".welcome").count(), 1, "cookie is the only flag");
    const projs = await page.evaluate(() => localStorage.getItem("axiom_projects"));
    const compl = await page.evaluate(() => localStorage.getItem("axiom_completed"));
    assert.ok(projs.includes("My House"), "projects untouched");
    assert.ok(compl.includes("fundamentals/f1"), "progress untouched");
  });

  await step("12. Explore Studio also sets axiom_seen=true", async () => {
    await page.locator(".welcome__explore").click();
    await page.waitForTimeout(400);
    assert.strictEqual(await page.locator(".page.studio").count(), 1);
    assert.ok(await seenCookie(), "cookie set after Explore Studio");
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
