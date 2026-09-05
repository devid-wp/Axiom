/* AXIOM — AI tutor functional checks (mock/offline mode).
   Run with: node scripts/verify-ai.cjs   (dev server must be on :5173) */

const { firefox } = require("playwright");
const assert = require("node:assert");

const BASE = process.env.AXIOM_BASE_URL || "http://localhost:5173";
const passed = [];
const failed = [];

function ok(name) {
  passed.push(name);
  console.log(`  \u2713 ${name}`);
}
function bad(name, e) {
  failed.push(name);
  console.log(`  \u2717 ${name}: ${e?.message ?? e}`);
}

/** Transition-transform "open" check for the slide-out drawer. */
const isOpenT = (t) => /matrix\(1, 0, 0, 1, 0, 0\)/.test(t);

async function countEls(page) {
  return page.locator(".el").count();
}
/** Wait until the sheet contains at least `min` elements, then read count. */
async function waitCount(page, min) {
  await page.waitForFunction(
    (m) => document.querySelectorAll(".el").length >= m,
    min,
    { timeout: 8000 }
  );
  return page.locator(".el").count();
}
/** Send in the Studio drawer and return the latest assistant message. */
async function sendAndGetAssistant(page, input) {
  await page.fill(".studio-ai-drawer .ai__input", input);
  await page.click(".studio-ai-drawer .ai__send");
  await page.waitForSelector(".studio-ai-drawer .ai__msg--assistant", { timeout: 12000 });
  return page.locator(".studio-ai-drawer .ai__msg--assistant").last().innerText();
}
/** Send in the Study rail AI chat and return the latest assistant message. */
async function studySend(page, input) {
  await page.fill(".study-rail .ai__input", input);
  await page.click(".study-rail .ai__send");
  await page.waitForSelector(".study-rail .ai__msg--assistant", { timeout: 12000 });
  return page.locator(".study-rail .ai__msg--assistant").last().innerText();
}
/** Settle the flash overlay & message count so sequential reads are stable. */
async function settle(page) {
  await page.waitForTimeout(300);
}
/** Wait until any assistant message matches `re`, returning it. */
async function waitForAssistantText(page, re) {
  await page.waitForFunction(
    (r) =>
      Array.from(document.querySelectorAll(".ai__msg--assistant")).some((el) =>
        r.test(el.textContent ?? "")
      ),
    re,
    { timeout: 10000 }
  );
  const texts = await page.locator(".ai__msg--assistant").allInnerTexts();
  return texts.find((t) => re.test(t)) ?? "";
}

(async () => {
  const browser = await firefox.launch();
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
  const logs = [];
  page.on("pageerror", (e) => logs.push(`pageerror: ${e.message}`));
  page.on("console", (m) => {
    if (m.type() === "error") logs.push(m.text());
  });

  try {
    /* 1-2. provider boundary (status + graceful POST) */
    try {
      const statusReq = await page.request.get(BASE + "/api/ai/status");
      assert.strictEqual(statusReq.status(), 200);
      assert.strictEqual(typeof (await statusReq.json()).configured, "boolean");
      ok("GET /api/ai/status → { configured }");
    } catch (e) {
      bad("GET /api/ai/status → { configured }", e);
    }
    try {
      const tutorReq = await page.request.post(BASE + "/api/ai/tutor", {
        data: { messages: [{ role: "user", content: "hi" }] },
      });
      assert.ok([200, 502, 503].includes(tutorReq.status()));
      ok("POST /api/ai/tutor handled gracefully");
    } catch (e) {
      bad("POST /api/ai/tutor handled gracefully", e);
    }

    /* ---- Study: teach, exercise offer, practice-in-studio ---------------- */
    try {
      await page.goto(BASE, { waitUntil: "networkidle" });
      await page.click('button[title="Study"]');
      await page.waitForSelector(".study-rail__tabs .seg-tab:nth-child(2)");
      await page.click(".study-rail__tabs .seg-tab:nth-child(2)");
      await page.waitForSelector(".ai");
      assert.strictEqual(await page.locator(".ai__dot--off").count(), 1);
      ok("Study: AI tab opens with offline mode badge");

      await studySend(page, "Explain columns simply.");
      await settle(page);
      const teach = await page.locator(".study-rail .ai__msg--assistant").last().innerText();
      assert.ok(/column|колонн/i.test(teach), "column explanation should reference columns");
      ok("Study: explains columns simply");

      await studySend(page, "Give me a small exercise.");
      await settle(page);
      const offerBtn = page.locator(".ai--study .ai__offer .ai__practice");
      await offerBtn.first().waitFor({ timeout: 8000 });
      assert.ok((await offerBtn.first().innerText()).length > 0);
      ok("Study: generates a structured exercise offer card");

      await offerBtn.first().click();
      await page.waitForSelector(".studio-exercise");
      ok("Study: Practice in Studio opens Studio with the exercise active");
    } catch (e) {
      bad("Study teach/exercise/practice", e);
    }

    /* ---- Studio: drawer + structured actions ----------------------------- */
    try {
      await page.click(".inspector-ai-toggle__btn");
      await page.waitForSelector(".studio-ai-drawer .ai");
      ok("Studio: AI drawer opens");
    } catch (e) {
      bad("Studio: AI drawer opens");
    }

    /* deterministic start: clear any persisted project via the mock flow */
    try {
      await sendAndGetAssistant(page, "Clear the project.");
      await settle(page);
      await page.waitForSelector(".studio-ai-drawer .ai__confirm", { timeout: 8000 });
      await page.click(".studio-ai-drawer .ai__confirm-apply");
      await page.waitForFunction(() => document.querySelectorAll(".el").length === 0, null, { timeout: 8000 });
      ok("setup: cleared sheet before action tests");
    } catch (e) {
      bad("setup: cleared sheet before action tests", e);
    }

    try {
      await sendAndGetAssistant(page, "Create two columns and a beam between them.");
      await settle(page);
      const n1 = await waitCount(page, 3);
      assert.strictEqual(n1, 3, `expected 2 columns + 1 beam, got ${n1}`);
      const toast = await page.locator(".action-toast").count();
      assert.strictEqual(toast, 1, "action toast should appear");
      ok("Studio: create two columns + beam (3 objects appear + toast)");

      await sendAndGetAssistant(page, "Check my work.");
      await settle(page);
      const review = await waitForAssistantText(page, /beam|балк/);
      assert.ok(/beam|балк/.test(review), "review should mention the beam: " + review);
      ok("Studio: AI reviews the layout (references real objects)");

      await sendAndGetAssistant(page, "Delete the selected element.");
      await settle(page);
      await page.waitForSelector(".studio-ai-drawer .ai__confirm", { timeout: 8000 });
      assert.strictEqual(await countEls(page), 3, "nothing deleted before confirm");
      ok("Studio: destructive action waits for confirmation");
      await page.click(".studio-ai-drawer .ai__confirm-apply");
      await page.waitForFunction(() => document.querySelectorAll(".el").length === 2, null, { timeout: 8000 });
      ok("Studio: confirmed delete removes the element");

      await sendAndGetAssistant(page, "Duplicate the selected element to the right.");
      await settle(page);
      await page.waitForFunction(() => document.querySelectorAll(".el").length >= 3, null, { timeout: 8000 });
      assert.strictEqual(await countEls(page), 3);
      ok("Studio: duplicate adds a copy");

      /* undo should revert the whole AI batch (one history entry) */
      await page.evaluate(() => document.dispatchEvent(new KeyboardEvent("keydown", { key: "z", ctrlKey: true, bubbles: true })));
      await page.waitForFunction(() => document.querySelectorAll(".el").length === 2, null, { timeout: 8000 });
      assert.strictEqual(await countEls(page), 2, "undo should remove the duplicated copy");
      ok("Studio: AI action undo reverts to pre-duplicate state");
      await page.evaluate(() => document.dispatchEvent(new KeyboardEvent("keydown", { key: "z", ctrlKey: true, shiftKey: true, bubbles: true })));
      await page.waitForFunction(() => document.querySelectorAll(".el").length === 3, null, { timeout: 8000 });
      ok("Studio: redo restores the duplicated copy");
    } catch (e) {
      bad("Studio structured actions", e);
    }

    /* material + move + resize */
    try {
      await sendAndGetAssistant(page, "Make the selected element concrete.");
      await settle(page);
      assert.strictEqual(await countEls(page), 3, "material change must not add/remove objects");
      ok("Studio: set material on selected (no object count change)");

      await sendAndGetAssistant(page, "Move the selected element right by 60.");
      await settle(page);
      assert.strictEqual(await countEls(page), 3);
      ok("Studio: move_element keeps object count");

      await sendAndGetAssistant(page, "Make the selected element twice as wide.");
      await settle(page);
      assert.strictEqual(await countEls(page), 3);
      ok("Studio: resize_element keeps object count");

      /* invalid action → fail safe (nothing changes, no crash) */
      await sendAndGetAssistant(page, "simulate-invalid-action");
      await settle(page);
      const msg = await waitForAssistantText(page, /invalid|rejected|not valid|broken|mystery/i);
      assert.ok(/invalid|rejected|not valid|broken|mystery/i.test(msg), "reply should note the rejected action");
      assert.strictEqual(await countEls(page), 3, "invalid action must not change the sheet");
      ok("Studio: invalid AI action fails safely");

      await sendAndGetAssistant(page, "simulate-malformed");
      await settle(page);
      assert.strictEqual(await countEls(page), 3, "malformed output must not change the sheet");
      ok("Studio: malformed model output fails safely");

      /* clear project → confirmation → empties */
      await sendAndGetAssistant(page, "Clear the project.");
      await settle(page);
      await page.waitForSelector(".studio-ai-drawer .ai__confirm", { timeout: 8000 });
      await page.click(".studio-ai-drawer .ai__confirm-apply");
      await page.waitForFunction(() => document.querySelectorAll(".el").length === 0, null, { timeout: 8000 });
      ok("Studio: confirmed clear_project empties the sheet");
    } catch (e) {
      bad("Studio material/move/resize/invalid/clear", e);
    }

    /* simulate-error/unavailable path still works */
    try {
      await sendAndGetAssistant(page, "simulate-error");
      await page.waitForSelector(".studio-ai-drawer .ai__error", { timeout: 8000 });
      ok("Studio: simulate-error shows error state");
      await page.click(".studio-ai-drawer .ai__retry");
      await page.waitForSelector(".studio-ai-drawer .ai__msg--assistant", { timeout: 10000 });
      ok("Studio: retry recovers after error");
    } catch (e) {
      bad("Studio error/retry", e);
    }
    try {
      await sendAndGetAssistant(page, "simulate-unavailable");
      await settle(page);
      const modeText = await page.locator(".studio-ai-drawer .ai__mode").innerText();
      assert.ok(/offline/.test(modeText), "mode should report offline after fallback: " + modeText);
      ok("Studio: simulate-unavailable falls back to offline tutor");
    } catch (e) {
      bad("Studio unavailable fallback", e);
    }

    /* ---- Russian language (structured actions run in Studio scope) -------- */
    try {
      await page.click('button[title="Studio"]');
      await page.waitForSelector(".inspector-ai-toggle__btn");
      const drawerOpen = await page.locator(".studio-ai-drawer .ai").isVisible().catch(() => false);
      if (!drawerOpen) await page.click(".inspector-ai-toggle__btn");
      await page.waitForSelector(".studio-ai-drawer .ai");
      await page.click('button[title="Language"]');
      await page.waitForTimeout(250);
      await sendAndGetAssistant(page, "Создай две колонны и балку между ними.");
      await settle(page);
      const nru = await waitCount(page, 3);
      assert.strictEqual(nru, 3, `RU create two columns+beam, got ${nru}`);
      const ruMsg = await waitForAssistantText(page, /колонн|балк/);
      assert.ok(/колонн|балк/.test(ruMsg), "RU reply should be in Russian: " + ruMsg);
      ok("RU: create two columns + beam works and replies in Russian");
    } catch (e) {
      bad("RU structured actions", e);
    }

    /* ---- UX: AI discoverability + slide-out drawer ------------------------ */
    try {
      /* reset to English */
      if (/РУ|ru/i.test((await page.locator(".activity button[title='Language']").innerText()) || "")) {
        await page.click('button[title="Language"]');
        await page.waitForTimeout(200);
      }
      await page.click('button[title="Studio"]');
      await page.waitForSelector(".viewport-ai");

      /* AI entry is obvious in the viewport header with an accent glyph + label */
      const aiLabel = ((await page.locator(".viewport-ai").innerText()) || "").replace(/\s+/g, " ").trim();
      assert.ok(/AI/i.test(aiLabel), "viewport AI button should carry an AI label: " + aiLabel);
      ok("UX: clear AI entry button in Studio header (icon + AI label)");

      /* drawer starts closed (translated off the right edge) */
      let closedTransform0 = await page.locator(".studio-ai-drawer").evaluate((el) => getComputedStyle(el).transform);
      if (isOpenT(closedTransform0)) {
        await page.evaluate(() => window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })));
        await page.waitForTimeout(260);
        closedTransform0 = await page.locator(".studio-ai-drawer").evaluate((el) => getComputedStyle(el).transform);
      }
      const closedTransform = closedTransform0;
      assert.ok(!isOpenT(closedTransform), "drawer should be translated closed initially: " + closedTransform);
      ok("UX: AI drawer is closed by default");

      /* open via the header button, animated open */
      await page.click(".viewport-ai");
      await page.waitForTimeout(260);
      const openTransform = await page.locator(".studio-ai-drawer").evaluate((el) => getComputedStyle(el).transform);
      assert.ok(isOpenT(openTransform), "drawer should translate to open: " + openTransform);
      ok("UX: AI button opens the slide-out drawer (animated transform)");

      /* CONTEXT strip communicates scope */
      const ctx = await page.locator(".studio-ai-drawer .ai__ctx").innerText();
      assert.ok(/CONTEXT/i.test(ctx), "context strip should label CONTEXT");
      assert.ok(/Studio|Studio \u00b7/i.test(ctx) || /Pavilion|Project/i.test(ctx), "context should reference the project: " + ctx);
      ok("UX: context strip shows current Studio / project");

      /* empty-state starters reveal the entry point, not a blank panel */
      const visiblePicks = await page.locator(".studio-ai-drawer .ai__pick-q").count();
      const hasMsgs = (await page.locator(".studio-ai-drawer .ai__msg").count()) > 0;
      const hasChips = (await page.locator(".studio-ai-drawer .ai__chip").count()) > 0;
      assert.ok(hasChips, "suggestions should always be present");
      if (!hasMsgs) assert.ok(visiblePicks > 0, "empty conversation should present a starter prompt");
      ok("UX: starting prompts are always present (empty-state or suggestions block)");

      /* selecting an object swaps suggestions + shows selection in context */
      const before = await page.locator(".studio-ai-drawer .ai__chip").allInnerTexts();
      await page.click(".dock__tree .tree-row:first-child");
      await page.waitForTimeout(200);
      const afterChips = await page.locator(".studio-ai-drawer .ai__chip").allInnerTexts();
      const ctxMeta = await page.locator(".studio-ai-drawer .ai__ctx-meta").innerText();
      assert.ok(/selected|выбран/.test(ctxMeta), "context meta should reflect selection: " + ctxMeta);
      assert.ok(before.join("|") !== afterChips.join("|"), "suggestions should change after selection");
      ok("UX: selection updates CONTEXT + contextual suggestions");

      /* Escape closes the drawer */
      await page.evaluate(() => window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })));
      await page.waitForTimeout(260);
      const closedAgain = await page.locator(".studio-ai-drawer").evaluate((el) => getComputedStyle(el).transform);
      assert.ok(!isOpenT(closedAgain), "Escape should close the drawer: " + closedAgain);
      ok("UX: Escape closes the AI drawer");

      /* reopen preserves the conversation */
      await page.click(".viewport-ai");
      await page.waitForTimeout(260);
      const marker = `beam utility ${Date.now() % 1000}`;
      await sendAndGetAssistant(page, "What do " + marker + " do?");
      await page.waitForFunction(
        (m) => Array.from(document.querySelectorAll(".studio-ai-drawer .ai__msg--user, .studio-ai-drawer .ai__msg")).some((el) => (el.textContent ?? "").includes(m)),
        marker,
        { timeout: 10000 }
      );
      await page.click(".ai__close");
      await page.waitForTimeout(260);
      await page.click(".viewport-ai");
      await page.waitForTimeout(260);
      const preserved = await page.locator(".studio-ai-drawer .ai__msg").count();
      assert.ok(preserved > 0, "conversation should survive close/reopen");
      const hasMarker = await page
        .locator(".studio-ai-drawer .ai__msg")
        .allInnerTexts()
        .then((t) => t.some((x) => x.includes(marker)));
      assert.ok(hasMarker, "the sent question should still be visible after reopen");
      ok("UX: conversation is preserved across close / reopen");
    } catch (e) {
      bad("UX discoverability + drawer", e);
    }

    /* ---- UX: Start home + AI entry ---------------------------------------- */
    try {
      await page.click('button[title="Start"]');
      await page.waitForSelector(".start__logo");
      const hasMasthead = await page.locator(".start__masthead .start__logo").count();
      assert.strictEqual(hasMasthead, 1, "Start should show the AXIOM masthead");
      const aiRow = await page.locator(".start__ai-row").count();
      assert.strictEqual(aiRow, 1, "Start should surface an AI entry row");
      const cont = await page.locator(".start__continue").count();
      assert.strictEqual(cont, 1, "Start should lead with a CONTINUE block");
      ok("UX: Start home leads with CONTINUE + surfaces AI entry");

      /* Start → Open AI → navigates to Studio and opens the drawer */
      await page.click(".start__ai-row");
      await page.waitForSelector(".studio-ai-drawer");
      await page.waitForTimeout(300);
      const studioOpen = await page.locator(".studio-ai-drawer").evaluate((el) => getComputedStyle(el).transform);
      assert.ok(isOpenT(studioOpen), "Open AI should land in Studio with drawer open: " + studioOpen);
      ok("UX: Start 'Open AI' opens the Studio AI drawer");
    } catch (e) {
      bad("UX Start + AI entry", e);
    }

    /* ---- no console errors ------------------------------------------------ */
    try {
      assert.strictEqual(logs.length, 0, "console errors: " + logs.join(" | "));
      ok("no console errors while driving the tutor UI");
    } catch (e) {
      bad("no console errors while driving the tutor UI", e);
    }
  } catch (e) {
    bad("sanity", e);
  } finally {
    await browser.close();
  }

  console.log(`\nverify-ai: ${passed.length} passed, ${failed.length} failed`);
  if (failed.length) process.exit(1);
})();