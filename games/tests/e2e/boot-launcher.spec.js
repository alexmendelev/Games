const { test, expect } = require("@playwright/test");

async function mockMobileFullscreen(page) {
  await page.addInitScript(() => {
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
        return Promise.resolve();
      }
    });
  });
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
