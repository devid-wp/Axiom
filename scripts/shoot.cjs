const { firefox } = require("playwright");

const URL = "http://localhost:5173/";
const SHOTS = "/home/kr1m12/Desktop/Axiom/shots";

async function view(browser, name, view, opts = {}) {
  const { width, height, click, ru } = opts;
  const page = await browser.newPage({ viewport: { width, height } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(`console: ${m.text()}`);
  });
  await page.goto(URL, { waitUntil: "networkidle" });
  await page.waitForSelector(".shell");
  if (ru) {
    await page.click('button[title="Language"]');
    await page.waitForTimeout(200);
  }
  if (view && view !== "start") {
    const rail = { studio: '[title="Studio"]', study: '[title="Study"]', explore: '[title="Explore"]' }[view];
    await page.click(rail);
    await page.waitForTimeout(250);
  }
  if (click) {
    await page.click(click.selector);
    await page.waitForTimeout(click.wait || 300);
  }
  const q = await page.$$eval(".page", (els) => els.map((e) => e.id || e.className.baseVal || e.className || ""));
  await page.screenshot({ path: `${SHOTS}/${name}.png` });
  await page.close();
  return { name, errors, pages: q };
}

async function viewAi(browser, name, width, height, opts = {}) {
  const { studio, chat, select, ru } = opts;
  const page = await browser.newPage({ viewport: { width, height } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(`console: ${m.text()}`);
  });
  await page.goto(URL, { waitUntil: "networkidle" });
  await page.waitForSelector(".shell");
  if (ru) {
    await page.click('button[title="Language"]');
    await page.waitForTimeout(200);
  }
  await page.click(studio ? '[title="Studio"]' : '[title="Study"]');
  await page.waitForTimeout(250);
  if (studio) {
    await page.click(".viewport-ai");
    await page.waitForTimeout(300);
    if (select) {
      await page.click(".dock__tree .tree-row:first-child");
      await page.waitForTimeout(200);
    }
  } else {
    await page.click(".study-rail__tabs .seg-tab:nth-child(2)");
    await page.waitForTimeout(250);
  }
  if (chat) {
    await page.click(".ai__chip:first-child");
    await page.waitForSelector(".ai__msg--assistant", { timeout: 10000 });
    await page.waitForTimeout(300);
  }
  await page.screenshot({ path: `${SHOTS}/${name}.png` });
  await page.close();
  return { name, errors };
}

/* Studio AI drawer after structured actions: objects built + effect/toast. */
async function viewAiAction(browser, name, width, height, prompt, minEls = 3, ru = false) {
  const page = await browser.newPage({ viewport: { width, height } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(`console: ${m.text()}`);
  });
  await page.goto(URL, { waitUntil: "networkidle" });
  await page.waitForSelector(".shell");
  if (ru) {
    await page.click('button[title="Language"]');
    await page.waitForTimeout(200);
  }
  await page.click('[title="Studio"]');
  await page.waitForTimeout(250);
  await page.click(".viewport-ai");
  await page.waitForSelector(".studio-ai-drawer .ai");
  await page.fill(".studio-ai-drawer .ai__input", prompt);
  await page.click(".studio-ai-drawer .ai__send");
  await page.waitForSelector(".studio-ai-drawer .ai__msg--assistant", { timeout: 10000 });
  if (minEls > 0) {
    await page.waitForFunction((m) => document.querySelectorAll(".el").length >= m, minEls, { timeout: 10000 });
  }
  await page.waitForTimeout(350);
  await page.screenshot({ path: `${SHOTS}/${name}.png` });
  await page.close();
  return { name, errors };
}

(async () => {
  const browser = await firefox.launch();
  const seed = await browser.newPage({ viewport: { width: 1366, height: 768 } });
  await seed.goto(URL, { waitUntil: "networkidle" });
  await seed.evaluate(() => localStorage.clear());
  await seed.close();

  const results = [];
  for (const [width, height] of [[1366, 768], [1920, 1080]]) {
    for (const [ru, tag] of [[false, ""], [true, "ru-"]]) {
      const res = `${tag}${width}x${height}`;
      const o = { width, height, ru };
      results.push(await view(browser, `01-start-${res}`, null, o));
      results.push(await view(browser, `02-studio-${res}`, "studio", o));
      results.push(await view(browser, `03-studio-built-${res}`, "studio", {
        ...o,
        click: { selector: ".tool-row", wait: 200 },
      }));
      results.push(await view(browser, `04-study-${res}`, "study", o));
      results.push(await view(browser, `05-explore-${res}`, "explore", o));
      results.push(await viewAi(browser, `06-study-ai-${res}`, width, height, { ru }));
      results.push(await viewAi(browser, `07-study-ai-reply-${res}`, width, height, { ru, chat: true }));
      results.push(await viewAi(browser, `08-studio-ai-${res}`, width, height, { ru, studio: true }));
      results.push(await viewAi(browser, `09-studio-ai-reply-${res}`, width, height, { ru, studio: true, chat: true }));
      results.push(await viewAi(browser, `12-studio-ai-selected-${res}`, width, height, { ru, studio: true, select: true }));
      results.push(await viewAiAction(browser, `10-studio-ai-build-${res}`, width, height, "Create two columns and a beam between them.", 3, ru));
      results.push(await viewAiAction(browser, `11-studio-ai-exercise-${res}`, width, height, "Give me a small exercise.", 0, ru));
    }
  }
  await browser.close();

  let fail = 0;
  for (const r of results) {
    if (r.errors.length === 0) {
      console.log(`PASS ${r.name}`);
    } else {
      fail++;
      console.log(`FAIL ${r.name} :: ${r.errors.join(" | ")}`);
    }
  }
  console.log(fail === 0 ? "ALL PASS" : `${fail} FAILED`);
})();