const { test, expect } = require("@playwright/test");

const GAME_CASES = [
  { name: "math", path: "/math/" },
  { name: "multiply", path: "/multiply/" },
  { name: "words", path: "/words/" },
  { name: "shapes", path: "/shapes/" },
  { name: "clocks", path: "/clocks/" },
  { name: "equations", path: "/equations/" }
];

async function waitForStartDialog(page) {
  await expect(page.locator(".metaCard--dashboard-start")).toBeVisible();
  await expect(page.locator(".metaDashboardPanel--logo")).toBeVisible();
  await expect(page.locator(".metaDashboardPanel--summary")).toBeVisible();
  await expect(page.locator(".metaDashboardSection--leaderboard")).toBeVisible();
  await expect(page.locator(".metaDashboardActions")).toBeVisible();
}

async function getBox(locator) {
  const box = await locator.boundingBox();
  expect(box).not.toBeNull();
  return box;
}

async function expectLeaderboardRowAligned(rowLocator, tolerance = 16) {
  const rankBox = await getBox(rowLocator.locator(".metaStartLeaderboardCell--rank"));
  const avatarBox = await getBox(rowLocator.locator(".metaStartLeaderboardCell--avatar"));
  const nameBox = await getBox(rowLocator.locator(".metaStartLeaderboardCell--name"));
  const coinsBox = await getBox(rowLocator.locator(".metaStartLeaderboardCell--coins"));
  const coinIconBox = await getBox(rowLocator.locator(".metaStartLeaderboardCell--coin-icon"));

  const centers = [
    rankBox.y + (rankBox.height / 2),
    avatarBox.y + (avatarBox.height / 2),
    nameBox.y + (nameBox.height / 2),
    coinsBox.y + (coinsBox.height / 2),
    coinIconBox.y + (coinIconBox.height / 2)
  ];
  const minCenter = Math.min(...centers);
  const maxCenter = Math.max(...centers);

  expect(maxCenter - minCenter).toBeLessThanOrEqual(tolerance);
}

for (const gameCase of GAME_CASES) {
  test(`${gameCase.name} stacks the shared start dialog on tall portrait`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(gameCase.path);
    await waitForStartDialog(page);

    const cardBox = await getBox(page.locator(".metaCard--dashboard-start"));
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

    const avatarBox = await getBox(page.locator('[data-action="open-profile"]'));
    const coinsBox = await getBox(page.locator(".metaStatusChip").first());
    const levelBox = await getBox(page.locator(".metaStatusChip").nth(1));
    const settingsBox = await getBox(page.locator('[data-action="open-settings"]'));

    expect(Math.abs(avatarBox.y - coinsBox.y)).toBeLessThan(12);
    expect(Math.abs(coinsBox.y - levelBox.y)).toBeLessThan(12);
    expect(Math.abs(levelBox.y - settingsBox.y)).toBeLessThan(12);

    await expect(page.locator(".metaCard--dashboard-start .metaProfileHint")).toBeHidden();
    await expect(page.locator(".metaCard--dashboard-start .metaStatusLabel")).toBeHidden();
    await expect(page.locator(".metaCard--dashboard-start .metaDashboardSettingsLabel")).toBeHidden();

    const leaderboardMetrics = await page.locator(".metaStartLeaderboardList").evaluate((el) => ({
      clientHeight: el.clientHeight,
      scrollHeight: el.scrollHeight,
      rowCount: el.querySelectorAll(".metaStartLeaderboardRow").length
    }));

    expect(leaderboardMetrics.rowCount).toBe(5);
    expect(leaderboardMetrics.scrollHeight).toBeLessThanOrEqual(leaderboardMetrics.clientHeight + 1);
    await expectLeaderboardRowAligned(page.locator(".metaStartLeaderboardRow").first());
  });

  test(`${gameCase.name} keeps the shared start dialog stacked on wider screens`, async ({ page }) => {
    await page.setViewportSize({ width: 820, height: 900 });
    await page.goto(gameCase.path);
    await waitForStartDialog(page);

    const cardBox = await getBox(page.locator(".metaCard--dashboard-start"));
    const logoBox = await getBox(page.locator(".metaDashboardPanel--logo"));
    const summaryBox = await getBox(page.locator(".metaDashboardPanel--summary"));
    const leaderboardBox = await getBox(page.locator(".metaDashboardSection--leaderboard"));
    const actionsBox = await getBox(page.locator(".metaDashboardActions"));

    expect(cardBox.x).toBeGreaterThanOrEqual(0);
    expect(cardBox.y).toBeGreaterThanOrEqual(0);
    expect(cardBox.x + cardBox.width).toBeLessThanOrEqual(820);
    expect(cardBox.y + cardBox.height).toBeLessThanOrEqual(900);

    expect(summaryBox.y).toBeGreaterThanOrEqual(logoBox.y + logoBox.height - 1);
    expect(leaderboardBox.y).toBeGreaterThanOrEqual(summaryBox.y + summaryBox.height - 1);
    expect(actionsBox.y).toBeGreaterThanOrEqual(leaderboardBox.y + leaderboardBox.height - 1);

    const avatarBox = await getBox(page.locator('[data-action="open-profile"]'));
    const coinsBox = await getBox(page.locator(".metaStatusChip").first());
    const levelBox = await getBox(page.locator(".metaStatusChip").nth(1));
    const settingsBox = await getBox(page.locator('[data-action="open-settings"]'));

    expect(Math.abs(avatarBox.y - coinsBox.y)).toBeLessThan(16);
    expect(Math.abs(coinsBox.y - levelBox.y)).toBeLessThan(16);
    expect(Math.abs(levelBox.y - settingsBox.y)).toBeLessThan(16);

    const leaderboardMetrics = await page.locator(".metaStartLeaderboardList").evaluate((el) => ({
      clientHeight: el.clientHeight,
      scrollHeight: el.scrollHeight,
      rowCount: el.querySelectorAll(".metaStartLeaderboardRow").length
    }));

    expect(leaderboardMetrics.rowCount).toBe(5);
    expect(leaderboardMetrics.scrollHeight).toBeLessThanOrEqual(leaderboardMetrics.clientHeight + 1);
    await expectLeaderboardRowAligned(page.locator(".metaStartLeaderboardRow").first());
  });

  test(`${gameCase.name} falls back to the stacked portrait start dialog on slight portrait`, async ({ page }) => {
    await page.setViewportSize({ width: 630, height: 790 });
    await page.goto(gameCase.path);
    await waitForStartDialog(page);

    const logoBox = await getBox(page.locator(".metaDashboardPanel--logo"));
    const summaryBox = await getBox(page.locator(".metaDashboardPanel--summary"));
    const leaderboardBox = await getBox(page.locator(".metaDashboardSection--leaderboard"));

    expect(summaryBox.y).toBeGreaterThanOrEqual(logoBox.y + logoBox.height - 1);
    expect(leaderboardBox.y).toBeGreaterThanOrEqual(summaryBox.y + summaryBox.height - 1);
  });

  test(`${gameCase.name} keeps the portrait start leaderboard compact on shorter phones`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 700 });
    await page.goto(gameCase.path);
    await waitForStartDialog(page);

    const leaderboardBox = await getBox(page.locator(".metaDashboardSection--leaderboard"));
    const actionsBox = await getBox(page.locator(".metaDashboardActions"));
    const firstRowBox = await getBox(page.locator(".metaStartLeaderboardRow").first());

    const gapToActions = actionsBox.y - (leaderboardBox.y + leaderboardBox.height);

    expect(gapToActions).toBeLessThanOrEqual(20);
    expect(firstRowBox.height).toBeLessThanOrEqual(72);
  });

  test(`${gameCase.name} uses the shared portrait start dialog on wide screens by default`, async ({ page }) => {
    await page.setViewportSize({ width: 1365, height: 768 });
    await page.goto(gameCase.path);
    await waitForStartDialog(page);

    const logoBox = await getBox(page.locator(".metaDashboardPanel--logo"));
    const summaryBox = await getBox(page.locator(".metaDashboardPanel--summary"));
    const leaderboardBox = await getBox(page.locator(".metaDashboardSection--leaderboard"));
    const actionsBox = await getBox(page.locator(".metaDashboardActions"));
    const gapToActions = actionsBox.y - (leaderboardBox.y + leaderboardBox.height);

    expect(summaryBox.y).toBeGreaterThanOrEqual(logoBox.y + logoBox.height - 1);
    expect(leaderboardBox.y).toBeGreaterThanOrEqual(summaryBox.y + summaryBox.height - 1);
    expect(gapToActions).toBeLessThanOrEqual(20);
  });
}
