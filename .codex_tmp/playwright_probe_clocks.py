from pathlib import Path
import json

from playwright.sync_api import sync_playwright


BROWSER_PATH = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
URL = "http://127.0.0.1:8765/games/clocks/index.html"
OUT_DIR = Path(r"c:\Users\alexm\games\.codex_tmp")
VIEWPORTS = [
    {"name": "h878", "width": 582, "height": 878},
    {"name": "h882", "width": 582, "height": 882},
    {"name": "h886", "width": 582, "height": 886},
    {"name": "h890", "width": 582, "height": 890},
]


def main():
    results = []
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=BROWSER_PATH, headless=True)
        for vp in VIEWPORTS:
            context = browser.new_context(
                viewport={"width": vp["width"], "height": vp["height"]},
                is_mobile=True,
                has_touch=True,
            )
            page = context.new_page()
            page.goto(URL, wait_until="networkidle")
            page.locator('[data-diff="easy"]').click()
            page.wait_for_timeout(800)
            page.wait_for_selector(".clockOption")
            data = page.evaluate(
                """() => {
                  const answers = document.querySelector('#answers');
                  const btn = document.querySelector('button.clockAns');
                  const option = document.querySelector('.clockOption');
                  const dial = document.querySelector('.clockDialImg');
                  const btnRect = btn.getBoundingClientRect();
                  const optionRect = option.getBoundingClientRect();
                  const answersStyle = getComputedStyle(answers);
                  const btnStyle = getComputedStyle(btn);
                  const optionStyle = getComputedStyle(option);
                  return {
                    answers_grid_cols: answersStyle.gridTemplateColumns,
                    answers_grid_rows: answersStyle.gridTemplateRows,
                    btn_height: btnRect.height,
                    btn_width: btnRect.width,
                    option_height: optionRect.height,
                    option_width: optionRect.width,
                    btn_padding: btnStyle.padding,
                    option_height_css: optionStyle.height,
                    option_max_width_css: optionStyle.maxWidth,
                    option_display: optionStyle.display,
                    dial_natural: [dial.naturalWidth, dial.naturalHeight]
                  };
                }"""
            )
            screenshot = OUT_DIR / f"{vp['name']}.png"
            page.screenshot(path=str(screenshot), full_page=True)
            results.append({"viewport": vp, "data": data, "screenshot": str(screenshot)})
            context.close()
        browser.close()
    print(json.dumps(results, indent=2))


if __name__ == "__main__":
    main()
