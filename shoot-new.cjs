const { firefox } = require("playwright");
const URL = "http://localhost:5174/";
const SHOTS = "/tmp/opencode/axiom-shots";
const fs = require("fs");
fs.mkdirSync(SHOTS, { recursive: true });

async function shot(browser, name, view, opts={}) {
  const { width=1440, height=900, click } = opts;
  const page = await browser.newPage({ viewport: { width, height } });
  const errors=[];
  page.on("pageerror", e=>errors.push(`pageerror: ${e.message}`));
  page.on("console", m=>{ if(m.type()==="error") errors.push(`console: ${m.text()}`); });
  await page.goto(URL, { waitUntil:"networkidle" });
  await page.waitForSelector(".shell");
  if (view && view!=="start") {
    const rail={studio:'[title="Studio"]',study:'[title="Study"]',explore:'[title="Explore"]'}[view];
    await page.click(rail); await page.waitForTimeout(300);
  }
  if (click) { await page.click(click.selector); await page.waitForTimeout(click.wait||300); }
  await page.screenshot({ path:`${SHOTS}/${name}.png` });
  await page.close();
  return {name, errors};
}

(async()=>{
  const b = await firefox.launch();
  const results=[];
  results.push(await shot(b,"start","start"));
  results.push(await shot(b,"study","study"));
  results.push(await shot(b,"explore","explore"));
  results.push(await shot(b,"studio","studio"));
  results.push(await shot(b,"studio-ai","studio",{click:{selector:".viewport-ai"}}));
  results.push(await shot(b,"study-ai","study",{click:{selector:".study-rail__tabs .seg-tab:nth-child(2)"}}));
  await b.close();
  for (const r of results){ console.log(r.name, r.errors.length? r.errors : "OK"); }
})();
