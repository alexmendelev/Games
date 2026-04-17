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
    test(`${gameCase.name} task tablet is fully visible on ${viewport.name} (${viewport.width}x${viewport.height})`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto(gameCase.path);
      await startFirstLevel(page);

      await page.waitForFunction(() => {
        const overlay = document.querySelector("#overlay");
        return overlay && getComputedStyle(overlay).display === "none";
      }, null, { timeout: 15000 });

      await page.waitForTimeout(300);

      // Game frame must be fully within the viewport
      const gameBox = await page.locator("#game").boundingBox();
      expect(gameBox).not.toBeNull();
      expect(gameBox.x).toBeGreaterThanOrEqual(-1);
      expect(gameBox.y).toBeGreaterThanOrEqual(-1);
      expect(gameBox.x + gameBox.width).toBeLessThanOrEqual(viewport.width + 1);
      expect(gameBox.y + gameBox.height).toBeLessThanOrEqual(viewport.height + 1);

      // Wait for the tile to be fully within the viewport; falling games animate it in from above
      await page.waitForFunction(([vw, vh]) => {
        const tile = document.querySelector("#tile");
        if (!tile) return false;
        const tileBox = tile.getBoundingClientRect();
        return (
          tileBox.width > 0 &&
          tileBox.height > 0 &&
          tileBox.left >= -1 &&
          tileBox.top >= -1 &&
          tileBox.right <= vw + 1 &&
          tileBox.bottom <= vh + 1
        );
      }, [viewport.width, viewport.height], { timeout: 5000 });

      const tileBox = await page.locator("#tile").boundingBox();
      expect(tileBox).not.toBeNull();

      // Tile must be within the game frame horizontally
      expect(tileBox.x).toBeGreaterThanOrEqual(gameBox.x - 1);
      expect(tileBox.x + tileBox.width).toBeLessThanOrEqual(gameBox.x + gameBox.width + 1);
    });
  }
}
