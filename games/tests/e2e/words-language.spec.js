const { test, expect } = require("@playwright/test");

const onePixelPngBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9sX6lz0AAAAASUVORK5CYII=";

async function mockWordsManifest(page) {
  await page.route("**/words/data/emojis-new/icon-pack-manifest.tsv", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "text/tab-separated-values",
      body: [
        "filename\tcategory\tenglish\thebrew",
        "animal-cat.png\tanimal\tcat\tחתול",
        "animal-dog.png\tanimal\tdog\tכלב",
        "animal-lion.png\tanimal\tlion\tאריה",
        "animal-bear.png\tanimal\tbear\tדוב",
        "reptile_amphibian_sea_insect-frog.png\tanimal\tfrog\tצפרדע",
        "reptile_amphibian_sea_insect-fish.png\tanimal\tfish\tדג",
        "transport-bus.png\ttransport\tbus\tאוטובוס",
        "transport-ship.png\ttransport\tship\tספינה"
      ].join("\n")
    });
  });

  await page.route("**/words/data/emojis-new/*.png", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "image/png",
      body: onePixelPngBase64,
      isBase64: true
    });
  });
}

async function startWordsLevel(page) {
  await page.locator('[data-action="start-level"]').click();
  await page.waitForFunction(() => {
    const overlay = document.querySelector("#overlay");
    return overlay && getComputedStyle(overlay).display === "none";
  }, null, { timeout: 15000 });
}

test("words tablet uses English when the game language is English", async ({ page }) => {
  await mockWordsManifest(page);
  await page.goto("/words/");

  await page.locator('[data-action="open-settings"]').click();
  await page.locator('[data-action="pick-language"][data-language="en"]').click();
  await page.locator('[data-action="close-settings"]').click();

  await startWordsLevel(page);

  await expect.poll(async () => {
    return String(await page.locator("#tile").textContent() || "").trim();
  }).toMatch(/^(cat|dog|lion|bear|frog|fish|bus|ship)$/);

  await expect.poll(async () => {
    return page.locator("#tile").evaluate((el) => getComputedStyle(el).direction);
  }).toBe("ltr");
});

test("words tablet uses Hebrew when the game language is Hebrew", async ({ page }) => {
  await mockWordsManifest(page);
  await page.goto("/words/");

  await startWordsLevel(page);

  await expect.poll(async () => {
    return String(await page.locator("#tile").textContent() || "").trim();
  }).toMatch(/^(חתול|כלב|אריה|דוב|צפרדע|דג|אוטובוס|ספינה)$/);

  await expect.poll(async () => {
    return page.locator("#tile").evaluate((el) => getComputedStyle(el).direction);
  }).toBe("rtl");
});
