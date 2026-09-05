const { firefox } = require("playwright");

const URL = "http://localhost:5173/";
const SHOTS = "/home/kr1m12/Desktop/Axiom/shots";

async function view(browser, name, view, opts = {}) {
  const { width, height, click } = opts;
  const page = await browser.newPage({ viewport: { width, height } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(`console: ${m.text()}`);
  });
  await page.goto(URL, { waitUntil: "networkidle" });
  await page.waitForSelector(".shell");
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
  const { studio, chat } = opts;
  const page = await browser.newPage({ viewport: { width, height } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(`console: ${m.text()}`);
  });
  await page.goto(URL, { waitUntil: "networkidle" });
  await page.waitForSelector(".shell");
  await page.click(studio ? '[title="Studio"]' : '[title="Study"]');
  await page.waitForTimeout(250);
  if (studio) {
    await page.click(".inspector-ai-toggle__btn");
    await page.waitForTimeout(250);
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

(async () => {
  const browser = await firefox.launch();
  const seed = await browser.newPage({ viewport: { width: 1366, height: 768 } });
  await seed.goto(URL, { waitUntil: "networkidle" });
  await seed.evaluate(() => localStorage.clear());
  await seed.close();

  const results = [];
  for (const [width, height] of [[1366, 768], [1920, 1080]]) {
    const res = `${width}x${height}`;
    results.push(await view(browser, `01-start-${res}`, null, { width, height }));
    results.push(await view(browser, `02-studio-${res}`, "studio", { width, height }));
    results.push(await view(browser, `03-studio-built-${res}`, "studio", {
      width,
      height,
      click: { selector: ".tool-row", wait: 200 },
    }));
    results.push(await view(browser, `04-study-${res}`, "study", { width, height }));
    results.push(await view(browser, `05-explore-${res}`, "explore", { width, height }));
    results.push(await viewAi(browser, `06-study-ai-${res}`, width, height, {}));
    results.push(await viewAi(browser, `07-study-ai-reply-${res}`, width, height, { chat: true }));
    results.push(await viewAi(browser, `08-studio-ai-${res}`, width, height, { studio: true }));
    results.push(await viewAi(browser, `09-studio-ai-reply-${res}`, width, height, { studio: true, chat: true }));
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