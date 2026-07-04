// Playwright acceptance pass for <lab-explore> — the canvas behaviors
// happy-dom can't reach: painted chart, legend, tooltip with normalization
// math, zoom label, badge → series rebuild.
//
// Run:  (cd ui && python3 -m http.server 8931 --bind 127.0.0.1 &) \
//       PW_DIR=<dir with playwright installed> node test/e2e/explore.e2e.mjs
// The fixture page is test/harness/explore.html.
import { createRequire } from "module";
const require = createRequire((process.env.PW_DIR || "/home/alex-claude/homepage") + "/package.json");
const { chromium } = require("playwright");

const BASE = process.env.BASE || "http://127.0.0.1:8931";
const results = [];
const check = (name, ok, extra = "") => {
  results.push({ name, ok, extra });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${extra ? "  — " + extra : ""}`);
};

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1100, height: 900 } });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));

await page.goto(`${BASE}/test/harness/explore.html`);
await page.waitForFunction(() => window.__READY === true);
await page.waitForTimeout(300);

const sr = (sel) =>
  page.evaluateHandle((s) => document.getElementById("x").shadowRoot.querySelector(s), sel);

// 1. chart painted
const canvasInfo = await page.evaluate(() => {
  const c = document.getElementById("x").shadowRoot.querySelector(".uplot canvas");
  return c ? { w: c.width, h: c.height } : null;
});
check("chart canvas rendered", !!canvasInfo && canvasInfo.w > 0, JSON.stringify(canvasInfo));

// 2. legend shows the default HPG selection
const legend = await page.evaluate(() =>
  Array.from(document.getElementById("x").shadowRoot.querySelectorAll(".u-legend th"))
    .map((t) => t.textContent.trim()).filter(Boolean));
check("legend = default selection (T, E2)", legend.join(",") === "T,E2", legend.join(","));

// 3. zoom stepper: label changes, persists
const label0 = await page.evaluate(() =>
  document.getElementById("x").shadowRoot.querySelector(".zoom-label").textContent);
await page.evaluate(() =>
  document.getElementById("x").shadowRoot.querySelector('[data-zoom="in"]').click());
const label1 = await page.evaluate(() =>
  document.getElementById("x").shadowRoot.querySelector(".zoom-label").textContent);
const persisted = await page.evaluate(() => localStorage.getItem("hpgChartView"));
check("zoom-in changes the span label", label0 === "3 years" && label1 === "2 years", `${label0} → ${label1}`);
check("view persisted (hpgChartView)", !!persisted && persisted.includes("stepIdx"), persisted);

// 4. tooltip: hover over the chart shows raw value + normalized %
//    T = 12 nmol/L in [8.6, 29] → 16.7 %
await page.evaluate(() =>
  document.getElementById("x").shadowRoot.querySelector('[data-zoom="out"]').click()); // back to 3y
await page.evaluate(() => {
  // widest zoom so all four dates are in view
  const sr = document.getElementById("x").shadowRoot;
  for (let i = 0; i < 5; i++) sr.querySelector('[data-zoom="out"]').click();
});
const over = await (await sr(".u-over")).asElement().boundingBox();
let tipHtml = "";
for (let fx = 0.05; fx <= 0.95; fx += 0.05) {
  await page.mouse.move(over.x + over.width * fx, over.y + over.height * 0.5);
  await page.waitForTimeout(40);
  const t = await page.evaluate(() => {
    const tip = document.getElementById("x").shadowRoot.querySelector(".u-tip");
    return tip && tip.style.display !== "none" ? tip.innerHTML : "";
  });
  if (t.includes("12 nmol/L")) { tipHtml = t; break; }
}
check("tooltip shows raw value for T", tipHtml.includes("12 nmol/L"), tipHtml.slice(0, 120));
check("tooltip shows normalized % (16.7%)", tipHtml.includes("(16.7%)"));

// 5. badge toggle rebuilds the chart with the new series set
await page.evaluate(() =>
  document.getElementById("x").shadowRoot.querySelector('.mbadge[data-key="HDL"]').click());
await page.waitForTimeout(200);
const legend2 = await page.evaluate(() =>
  Array.from(document.getElementById("x").shadowRoot.querySelectorAll(".u-legend th"))
    .map((t) => t.textContent.trim()).filter(Boolean));
check("adding HDL-C badge adds its series", legend2.includes("HDL-C"), legend2.join(","));
const selLS = await page.evaluate(() => localStorage.getItem("exploreSel"));
check("selection persisted (exploreSel)", !!selLS && selLS.includes("HDL"), selLS);

// 6. HDL-C goodAbove note in tooltip (62 ≥ 60 → ✓ optimal)
let tip2 = "";
for (let fx = 0.05; fx <= 0.95; fx += 0.05) {
  await page.mouse.move(over.x + over.width * fx, over.y + over.height * 0.5);
  await page.waitForTimeout(40);
  const t = await page.evaluate(() => {
    const tip = document.getElementById("x").shadowRoot.querySelector(".u-tip");
    return tip && tip.style.display !== "none" ? tip.innerHTML : "";
  });
  if (t.includes("62 mg/dL")) { tip2 = t; break; }
}
check("HDL-C ✓ optimal note at 62 ≥ 60", tip2.includes("optimal · low risk"), tip2.slice(0, 160));

// 7. autoscale + event toggles operate without errors
await page.evaluate(() => {
  const sr = document.getElementById("x").shadowRoot;
  sr.querySelector("[data-autoscale]").click();
  sr.querySelector(".ev-tog").click();
  sr.querySelector(".ev-tog").click();
});
await page.waitForTimeout(400);

await page.screenshot({ path: process.env.SHOT || "/tmp/lab-explore-harness.png", fullPage: true });

check("zero page errors", errors.length === 0, errors.join(" | ").slice(0, 300));

await browser.close();
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} checks passed`);
process.exit(failed ? 1 : 0);
