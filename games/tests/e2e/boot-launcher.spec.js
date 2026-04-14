const { test, expect } = require("@playwright/test");

const onePixelPngBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9sX6lz0AAAAASUVORK5CYII=";

async function mockMobileFullscreen(page, options = {}) {
  await page.addInitScript((initOptions) => {
    window.__fullscreenRequested = 0;
    Object.defineProperty(Navigator.prototype, "maxTouchPoints", {
      configurable: true,
      get() {
        return 5;
      }
    });
    const originalMatchMedia = window.matchMedia.bind(window);
    window.matchMedia = (query) => {
      if (query === "(pointer: coarse)") {
        return {
          matches: true,
          media: query,
          onchange: null,
          addListener() {},
          removeListener() {},
          addEventListener() {},
          removeEventListener() {},
          dispatchEvent() {
            return false;
          }
        };
      }
      return originalMatchMedia(query);
    };
    Object.defineProperty(Document.prototype, "fullscreenElement", {
      configurable: true,
      get() {
        return null;
      }
    });
    Object.defineProperty(HTMLElement.prototype, "requestFullscreen", {
      configurable: true,
      value() {
        window.__fullscreenRequested += 1;
        if (initOptions && initOptions.stallPromise) {
          return new Promise(() => {});
        }
        return Promise.resolve();
      }
    });
  }, options);
}

test("launcher offers fullscreen or normal mode on mobile", async ({ page }) => {
  await mockMobileFullscreen(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  await expect(page.locator("#bootFullscreenAction")).toBeVisible({ timeout: 20000 });
  await expect(page.locator("#bootContinueAction")).toBeVisible();
  await expect(page.locator("#bootProgress")).toBeHidden();
});

test("launcher can continue normally on mobile without fullscreen", async ({ page }) => {
  await mockMobileFullscreen(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  await page.locator("#bootContinueAction").click();

  await expect(page.locator("#bootOverlay")).toBeHidden();
  await expect.poll(async () => page.evaluate(() => window.__fullscreenRequested)).toBe(0);
});

test("launcher can open fullscreen on mobile", async ({ page }) => {
  await mockMobileFullscreen(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  await page.locator("#bootFullscreenAction").click();

  await expect(page.locator("#bootOverlay")).toBeHidden();
  await expect.poll(async () => page.evaluate(() => window.__fullscreenRequested)).toBe(1);
});

test("launcher continues even if fullscreen never resolves on mobile", async ({ page }) => {
  await mockMobileFullscreen(page, { stallPromise: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  await page.locator("#bootFullscreenAction").click();

  await expect(page.locator("#bootOverlay")).toBeHidden();
  await expect(page.locator(".menuPage")).toBeVisible();
  await expect.poll(async () => page.evaluate(() => window.__fullscreenRequested)).toBe(1);
});

test("launcher still opens embedded games when fullscreen stalls on mobile", async ({ page }) => {
  await mockMobileFullscreen(page, { stallPromise: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  await page.locator("#bootFullscreenAction").click();
  await expect(page.locator("#bootOverlay")).toBeHidden();

  await page.locator('#menuGrid a.menuCard[href="math/index.html"]').click();

  await expect(page.locator("#gameStage")).toBeVisible();
  await expect.poll(async () => page.locator("#gameFrame").getAttribute("src")).toContain("math/index.html");
});

test("launcher warms only the starter words emoji assets after boot", async ({ page }) => {
  const requestedEmojiPaths = [];

  await page.route("**/words/data/emojis-new/icon-pack-manifest.tsv", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "text/tab-separated-values",
      body: [
        "filename\tgroup\ten\the",
        "animal-cat.png\tanimals\tcat\tcat-he",
        "transport-airplane.png\ttransport\tairplane\tairplane-he",
        "food_plant_kitchen-apple_red.png\tfood\tapple\tapple-he"
      ].join("\n")
    });
  });

  await page.route("**/words/data/emojis-new/*.png", async (route) => {
    requestedEmojiPaths.push(new URL(route.request().url()).pathname);
    await route.fulfill({
      status: 200,
      contentType: "image/png",
      body: onePixelPngBase64,
      isBase64: true
    });
  });

  await page.goto("/");

  await expect(page.locator("#bootProgress")).toBeHidden({ timeout: 20000 });
  await expect.poll(() => requestedEmojiPaths.slice().sort()).toEqual([
    "/words/data/emojis-new/animal-cat.png",
    "/words/data/emojis-new/transport-airplane.png"
  ]);
});
