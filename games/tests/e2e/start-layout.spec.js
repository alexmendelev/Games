const { test, expect } = require('@playwright/test');

const GAME_START_CASES = [
  { name: 'math', path: '/math/' },
  { name: 'multiply', path: '/multiply/' },
  { name: 'words', path: '/words/' },
  { name: 'shapes', path: '/shapes/' },
  { name: 'clocks', path: '/clocks/' }
];

async function startFirstLevel(page) {
  await page.waitForFunction(() => {
    const metaButton = document.querySelector('[data-action="start-level"]');
    const legacyButton = document.querySelector('[data-diff]');
    return Boolean(metaButton || legacyButton);
  });

  const metaStartButton = page.locator('[data-action="start-level"]');
  if (await metaStartButton.count()) {
    await metaStartButton.click();
    return;
  }

  const legacyDiffButton = page.locator('[data-diff]').first();
  await legacyDiffButton.click();
}

for (const gameCase of GAME_START_CASES) {
  test(`${gameCase.name} keeps the first tablet inside the game frame`, async ({ page }) => {
    await page.goto(gameCase.path);

    await startFirstLevel(page);

    await page.waitForFunction(() => {
      const overlay = document.querySelector('#overlay');
      return overlay && getComputedStyle(overlay).display === 'none';
    }, null, { timeout: 15000 });

    await page.waitForTimeout(300);

    const gameBox = await page.locator('#game').boundingBox();
    const tileBox = await page.locator('#tile').boundingBox();

    expect(gameBox).not.toBeNull();
    expect(tileBox).not.toBeNull();

    expect(tileBox.x).toBeGreaterThanOrEqual(gameBox.x - 1);
    expect(tileBox.x + tileBox.width).toBeLessThanOrEqual(gameBox.x + gameBox.width + 1);
  });
}
