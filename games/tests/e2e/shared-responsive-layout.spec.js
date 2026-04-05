const { test, expect } = require("@playwright/test");

const GAME_CASES = [
  { name: "math", path: "/math/" },
  { name: "multiply", path: "/multiply/" },
  { name: "words", path: "/words/" },
  { name: "shapes", path: "/shapes/" },
  { name: "clocks", path: "/clocks/" },
  { name: "equations", path: "/equations/" }
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

async function openResultsPreview(page, path) {
  await page.goto(`${path}?testMode=1`);
  await page.locator('[data-action="preview-results"]').click();
  await expect(page.locator(".metaCard--dashboard-results")).toBeVisible();
}

async function getBox(locator) {
  const box = await locator.boundingBox();
  expect(box).not.toBeNull();
  return box;
}

for (const gameCase of GAME_CASES) {
  test(`${gameCase.name} uses the shared portrait gameplay layout on phone`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(gameCase.path);
    await startFirstLevel(page);

    await page.waitForFunction(() => {
      const overlay = document.querySelector("#overlay");
      return overlay && getComputedStyle(overlay).display === "none";
    }, null, { timeout: 15000 });

    const gameBox = await page.locator("#game").boundingBox();
    const sideBox = await page.locator(".side").boundingBox();
    const answersBox = await page.locator(".answersPanel").boundingBox();
    const controlsBox = await page.locator(".controlsPanel").boundingBox();
    const firstAnswerBox = await page.locator("#answers .ans").first().boundingBox();

    expect(gameBox).not.toBeNull();
    expect(sideBox).not.toBeNull();
    expect(answersBox).not.toBeNull();
    expect(controlsBox).not.toBeNull();
    expect(firstAnswerBox).not.toBeNull();

    expect(sideBox.y).toBeGreaterThanOrEqual(gameBox.y + gameBox.height - 1);
    expect(answersBox.y).toBeGreaterThanOrEqual(sideBox.y - 1);
    expect(controlsBox.y).toBeGreaterThanOrEqual(answersBox.y + answersBox.height - 1);
    expect(firstAnswerBox.height).toBeGreaterThan(56);
    expect(firstAnswerBox.width).toBeGreaterThan(56);
  });

  test(`${gameCase.name} keeps the shared results overlay inside the phone viewport`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openResultsPreview(page, gameCase.path);

    const cardBox = await page.locator(".metaCard--results").boundingBox();
    const leaderboardBox = await page.locator(".metaLeaderboardList").boundingBox();
    const actionButtonBox = await page.locator(".metaResultsActions button").first().boundingBox();

    expect(cardBox).not.toBeNull();
    expect(leaderboardBox).not.toBeNull();
    expect(actionButtonBox).not.toBeNull();

    expect(cardBox.x).toBeGreaterThanOrEqual(0);
    expect(cardBox.y).toBeGreaterThanOrEqual(0);
    expect(cardBox.x + cardBox.width).toBeLessThanOrEqual(390);
    expect(cardBox.y + cardBox.height).toBeLessThanOrEqual(844);
    expect(leaderboardBox.height).toBeGreaterThan(120);
    expect(actionButtonBox.height).toBeGreaterThan(44);
  });

  test(`${gameCase.name} stacks the shared results dialog on tall portrait`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openResultsPreview(page, gameCase.path);

    const cardBox = await getBox(page.locator(".metaCard--dashboard-results"));
    const logoBox = await getBox(page.locator(".metaDashboardPanel--logo"));
    const summaryBox = await getBox(page.locator(".metaDashboardPanel--summary"));
    const leaderboardBox = await getBox(page.locator(".metaDashboardSection--leaderboard"));
    const actionsBox = await getBox(page.locator(".metaDashboardActions"));

    expect(cardBox.x).toBeGreaterThanOrEqual(0);
    expect(cardBox.y).toBeGreaterThanOrEqual(0);
    expect(cardBox.x + cardBox.width).toBeLessThanOrEqual(390);
    expect(cardBox.y + cardBox.height).toBeLessThanOrEqual(844);

    expect(summaryBox.y).toBeGreaterThanOrEqual(logoBox.y + logoBox.height - 1);
    expect(leaderboardBox.y).toBeGreaterThanOrEqual(summaryBox.y + summaryBox.height - 1);
    expect(actionsBox.y).toBeGreaterThanOrEqual(leaderboardBox.y + leaderboardBox.height - 1);
  });

  test(`${gameCase.name} uses the shared split results dialog on low portrait`, async ({ page }) => {
    await page.setViewportSize({ width: 820, height: 900 });
    await openResultsPreview(page, gameCase.path);

    const cardBox = await getBox(page.locator(".metaCard--dashboard-results"));
    const logoBox = await getBox(page.locator(".metaDashboardPanel--logo"));
    const summaryBox = await getBox(page.locator(".metaDashboardPanel--summary"));
    const leaderboardBox = await getBox(page.locator(".metaDashboardSection--leaderboard"));
    const actionsBox = await getBox(page.locator(".metaDashboardActions"));

    expect(cardBox.x).toBeGreaterThanOrEqual(0);
    expect(cardBox.y).toBeGreaterThanOrEqual(0);
    expect(cardBox.x + cardBox.width).toBeLessThanOrEqual(820);
    expect(cardBox.y + cardBox.height).toBeLessThanOrEqual(900);

    expect(summaryBox.x).toBeGreaterThanOrEqual(logoBox.x + logoBox.width - 1);
    expect(leaderboardBox.x).toBeGreaterThanOrEqual(summaryBox.x + summaryBox.width - 1);
    expect(actionsBox.y).toBeGreaterThanOrEqual(logoBox.y + logoBox.height - 1);
    expect(actionsBox.y).toBeGreaterThanOrEqual(summaryBox.y + summaryBox.height - 1);
    expect(actionsBox.y).toBeGreaterThanOrEqual(leaderboardBox.y + leaderboardBox.height - 1);
  });
}
