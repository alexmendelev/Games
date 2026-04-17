const { test, expect } = require("@playwright/test");

const GAME_CASES = [
  { name: "math", path: "/math/" },
  { name: "multiply", path: "/multiply/" },
  { name: "words", path: "/words/" },
  { name: "shapes", path: "/shapes/" },
  { name: "clocks", path: "/clocks/" },
  { name: "equations", path: "/equations/" }
];

const VIEWPORT_CASES = [
  { name: "phone portrait narrow", width: 375, height: 667 },
  { name: "phone portrait standard", width: 390, height: 844 },
  { name: "phone landscape", width: 667, height: 375 },
  { name: "tablet portrait", width: 768, height: 1024 },
  { name: "tablet landscape", width: 1024, height: 768 },
  { name: "desktop", width: 1365, height: 768 }
];

async function startFirstLevel(page) {
  await page.waitForFunction(() => {
    const metaButton = document.querySelector('[data-action="start-level"]');
    const legacyButton = document.querySelector("[data-diff]");
    return Boolean(metaButton || legacyButton);
  });

  const metaStartButton = page.locator('[data-action="start-level"]');
  if (await metaStartButton.count()) {
    await metaStartButton.click();
    return;
  }

  await page.locator("[data-diff]").first().click();
}

for (const gameCase of GAME_CASES) {
  for (const viewport of VIEWPORT_CASES) {
    test(`${gameCase.name} answers panel is fully visible on ${viewport.name} (${viewport.width}x${viewport.height})`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto(gameCase.path);
      await startFirstLevel(page);

      await page.waitForFunction(() => {
        const overlay = document.querySelector("#overlay");
        return overlay && getComputedStyle(overlay).display === "none";
      }, null, { timeout: 15000 });

      // Wait for answer buttons to be rendered
      await page.waitForFunction(() => {
        const buttons = document.querySelectorAll("#answers .ans");
        return buttons.length > 0;
      }, null, { timeout: 10000 });

      await page.waitForTimeout(300);

      // Answers panel must be within the viewport and have non-zero size
      const panelBox = await page.locator(".answersPanel").boundingBox();
      expect(panelBox, "answersPanel must be visible").not.toBeNull();
      expect(panelBox.width).toBeGreaterThan(0);
      expect(panelBox.height).toBeGreaterThan(0);
      expect(panelBox.x).toBeGreaterThanOrEqual(-1);
      expect(panelBox.y).toBeGreaterThanOrEqual(-1);
      expect(panelBox.x + panelBox.width).toBeLessThanOrEqual(viewport.width + 1);
      expect(panelBox.y + panelBox.height).toBeLessThanOrEqual(viewport.height + 1);

      // Every answer button must be within the viewport and have non-zero size
      const buttons = page.locator("#answers .ans");
      const buttonCount = await buttons.count();
      expect(buttonCount).toBeGreaterThan(0);

      let visibleButtonCount = 0;
      for (let index = 0; index < buttonCount; index += 1) {
        const button = buttons.nth(index);
        if (!await button.isVisible()) {
          continue;
        }
        visibleButtonCount += 1;
        const btnBox = await button.boundingBox();
        expect(btnBox, `answer button ${index} must be visible`).not.toBeNull();
        expect(btnBox.width).toBeGreaterThan(0);
        expect(btnBox.height).toBeGreaterThan(0);
        expect(btnBox.x).toBeGreaterThanOrEqual(-1);
        expect(btnBox.y).toBeGreaterThanOrEqual(-1);
        expect(btnBox.x + btnBox.width).toBeLessThanOrEqual(viewport.width + 1);
        expect(btnBox.y + btnBox.height).toBeLessThanOrEqual(viewport.height + 1);
      }
      expect(visibleButtonCount).toBeGreaterThan(0);
    });
  }
}
