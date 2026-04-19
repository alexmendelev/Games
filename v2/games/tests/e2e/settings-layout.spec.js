const { test, expect } = require("@playwright/test");

// Viewports to test:
//   portrait-phone  390x844  → narrow, portrait → 2-row layout expected
//   landscape-narrow 844x390 → wide enough for 3 cols in landscape → 3-in-one-row expected
//   landscape-wide  1200x800 → clearly wide → 3-in-one-row expected
const VIEWPORTS = [
  { name: "portrait-phone",    width: 390,  height: 844, expectedLayout: "lang-full-width+sound-mystery-row" },
  { name: "landscape-narrow",  width: 844,  height: 390, expectedLayout: "3-in-one-row" },
  { name: "landscape-wide",    width: 1200, height: 800, expectedLayout: "3-in-one-row" },
];

async function openSettings(page) {
  await expect(page.locator(".metaCard--dashboard-start")).toBeVisible({ timeout: 10000 });
  await page.locator("[data-action='open-settings']").click();
  await expect(page.locator(".metaCard--settings")).toBeVisible({ timeout: 5000 });
}

async function measureLayout(page, label) {
  const top = page.locator(".metaSettingsTop");
  const board = page.locator(".metaSettingsBoard");
  const mystery = page.locator(".metaSettingPanel--mystery");
  const language = page.locator(".metaSettingPanel--language");
  const sound = page.locator(".metaSettingPanel--sound");
  const card = page.locator(".metaCard--settings");

  const boardWidth = await board.evaluate(el => Math.round(el.getBoundingClientRect().width));
  const gridCols = await top.evaluate(el => getComputedStyle(el).gridTemplateColumns);

  const languageBox = await language.boundingBox();
  const soundBox = await sound.boundingBox();
  const mysteryBox = await mystery.boundingBox();
  const cardBox = await card.boundingBox();

  // Mystery is not clipped if its right edge is within the card's right edge (2px tolerance)
  const mysteryVisible = mysteryBox &&
    mysteryBox.x >= (cardBox.x - 2) &&
    (mysteryBox.x + mysteryBox.width) <= (cardBox.x + cardBox.width + 2);

  // Classify layout by vertical positions of the three panels
  let layoutPattern = "unknown";
  if (languageBox && soundBox && mysteryBox) {
    const langY = Math.round(languageBox.y);
    const soundY = Math.round(soundBox.y);
    const mystY = Math.round(mysteryBox.y);
    const allSameRow = Math.abs(langY - soundY) < 5 && Math.abs(soundY - mystY) < 5;
    const langAbove = (soundY - langY) > 10 && Math.abs(soundY - mystY) < 10;
    const allStacked = (soundY - langY) > 10 && (mystY - soundY) > 10;

    if (allSameRow) layoutPattern = "3-in-one-row";
    else if (langAbove) layoutPattern = "lang-full-width+sound-mystery-row";
    else if (allStacked) layoutPattern = "all-stacked";
    else layoutPattern = `mixed(lang=${langY},sound=${soundY},myst=${mystY})`;
  }

  console.log(`\n--- ${label} ---`);
  console.log(`  boardWidth: ${boardWidth}px`);
  console.log(`  gridTemplateColumns: ${gridCols}`);
  console.log(`  layout pattern: ${layoutPattern}`);
  console.log(`  mystery not clipped: ${mysteryVisible}`);

  return { boardWidth, gridCols, layoutPattern, mysteryVisible };
}

for (const vp of VIEWPORTS) {
  test(`settings layout @ ${vp.name} (${vp.width}x${vp.height})`, async ({ page }) => {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.goto("/math/");
    await openSettings(page);

    const info = await measureLayout(page, `${vp.name} ${vp.width}x${vp.height}`);

    const cardBox = await page.locator(".metaCard--settings").boundingBox();
    if (cardBox) {
      await page.screenshot({
        path: `test-results/settings-layout-${vp.name}.png`,
        clip: cardBox,
      });
    }

    // Mystery panel must never be clipped
    expect(info.mysteryVisible).toBe(true);

    // Check layout matches expected pattern for this viewport
    expect(info.layoutPattern).toBe(vp.expectedLayout);
  });
}
