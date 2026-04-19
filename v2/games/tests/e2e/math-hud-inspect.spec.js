const { test } = require('@playwright/test');

test('inspect math hud difficulty', async ({ page }) => {
  await page.goto('/math/');
  const start = page.locator('[data-action="start-level"], [data-diff="easy"]').first();
  await start.click();
  await page.waitForTimeout(1500);
  const data = await page.evaluate(() => {
    const label = document.getElementById('difficultyLabel');
    const value = document.getElementById('difficultyValue');
    const block = value ? value.closest('.difficultyInline') : null;
    return {
      labelText: label ? label.textContent : null,
      valueText: value ? value.textContent : null,
      labelHtml: label ? label.outerHTML : null,
      valueHtml: value ? value.outerHTML : null,
      blockHtml: block ? block.outerHTML : null,
      valueStyle: value ? getComputedStyle(value).cssText : null,
      blockStyle: block ? getComputedStyle(block).cssText : null,
      bodyText: document.body.innerText
    };
  });
  console.log(JSON.stringify(data, null, 2));
});
