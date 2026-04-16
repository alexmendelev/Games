const path = require("path");
const assert = require("assert");

// Provide a minimal utils mock (layout.js only needs utils.clamp)
if (typeof globalThis.GAMES_V2_UTILS === "undefined") {
  globalThis.GAMES_V2_UTILS = {
    clamp: (v, min, max) => Math.min(Math.max(v, min), max)
  };
}

const layout = require(path.join(__dirname, "..", "shared", "scripts", "layout.js"));

const { normalizeConfig, normalizeAnswerConfig, computeLayout, createLayoutEngine } = layout;

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed += 1;
  } catch (err) {
    failed += 1;
    console.error("FAIL: " + name);
    console.error("  " + (err && err.message ? err.message : err));
  }
}

function eq(actual, expected, label) {
  assert.strictEqual(actual, expected, (label || "") + ": expected " + JSON.stringify(expected) + " got " + JSON.stringify(actual));
}

function approxEq(actual, expected, tolerance, label) {
  assert.ok(Math.abs(actual - expected) <= tolerance, (label || "") + ": expected ~" + expected + " got " + actual);
}

function ok(actual, label) {
  assert.ok(actual, (label || "") + ": expected truthy got " + JSON.stringify(actual));
}

// Convenience: compute layout with a fixed viewport
function computeAt(width, height, extraConfig) {
  return computeLayout(extraConfig || {}, { viewport: { width, height } });
}

// --- normalizeConfig ---

test("normalizeConfig returns DEFAULTS when given empty config", () => {
  const cfg = normalizeConfig({});
  ok(cfg.breakpoints, "has breakpoints");
  ok(cfg.frame, "has frame");
  ok(cfg.answers, "has answers");
  ok(typeof cfg.breakpoints.landscapeAspectThreshold === "number", "landscapeAspectThreshold is number");
});

test("normalizeConfig deep-merges partial overrides", () => {
  const cfg = normalizeConfig({ breakpoints: { tabletPortraitMinWidth: 800 } });
  eq(cfg.breakpoints.tabletPortraitMinWidth, 800, "overridden tabletPortraitMinWidth");
  ok(cfg.breakpoints.landscapeAspectThreshold > 0, "other breakpoints intact");
});

test("normalizeConfig does not mutate the input object", () => {
  const input = { frame: { paddingRatio: 0.05 } };
  normalizeConfig(input);
  eq(input.frame.paddingRatio, 0.05, "input not mutated");
  eq(Object.keys(input.frame).length, 1, "no extra keys added to input");
});

// --- normalizeAnswerConfig ---

test("normalizeAnswerConfig enforces count >= 1", () => {
  const ans = normalizeAnswerConfig({ count: 0 });
  ok(ans.count >= 1, "count at least 1");
});

test("normalizeAnswerConfig clamps activeCount to [1, count] when exceeds count", () => {
  const ans = normalizeAnswerConfig({ count: 4, activeCount: 6 });
  eq(ans.activeCount, 4, "activeCount capped at count");
});

test("normalizeAnswerConfig ensures maxButtonSize >= minButtonSize", () => {
  const ans = normalizeAnswerConfig({ minButtonSize: 100, maxButtonSize: 50 });
  ok(ans.maxButtonSize >= ans.minButtonSize, "maxButtonSize >= minButtonSize");
});

test("normalizeAnswerConfig ensures gapMax >= gapMin", () => {
  const ans = normalizeAnswerConfig({ gapMin: 8, gapMax: 4 });
  ok(ans.gapMax >= ans.gapMin, "gapMax >= gapMin");
});

test("normalizeAnswerConfig ensures paddingMax >= paddingMin", () => {
  const ans = normalizeAnswerConfig({ paddingMin: 10, paddingMax: 5 });
  ok(ans.paddingMax >= ans.paddingMin, "paddingMax >= paddingMin");
});

test("normalizeAnswerConfig preserves type", () => {
  const ans = normalizeAnswerConfig({ type: "DenseOptionGrid", count: 6, activeCount: 4 });
  eq(ans.type, "DenseOptionGrid", "type preserved");
});

test("normalizeAnswerConfig preferredCols is clamped to maxCols", () => {
  const ans = normalizeAnswerConfig({ count: 4, minCols: 2, maxCols: 3, preferredCols: 5 });
  eq(ans.preferredCols, 3, "preferredCols capped at maxCols");
});

test("normalizeAnswerConfig preferredCols is clamped to minCols", () => {
  const ans = normalizeAnswerConfig({ count: 4, minCols: 2, maxCols: 4, preferredCols: 1 });
  eq(ans.preferredCols, 2, "preferredCols floored at minCols");
});

// --- classifyLayoutMode via computeLayout ---

test("narrow portrait viewport yields phone-portrait mode", () => {
  const result = computeAt(375, 812);
  eq(result.mode, "phone-portrait", "phone-portrait on 375x812");
});

test("wide portrait viewport yields tablet-portrait mode", () => {
  const result = computeAt(768, 1024);
  eq(result.mode, "tablet-portrait", "tablet-portrait on 768x1024");
});

test("landscape viewport at desktop width yields desktop-landscape mode", () => {
  const result = computeAt(1280, 800);
  eq(result.mode, "desktop-landscape", "desktop-landscape on 1280x800");
});

test("narrower landscape viewport yields tablet-landscape mode", () => {
  const result = computeAt(900, 600);
  eq(result.mode, "tablet-landscape", "tablet-landscape on 900x600");
});

// --- classifyAspectBand via computeLayout ---

test("portrait-wide aspect band for near-square portrait", () => {
  const result = computeAt(390, 430);
  eq(result.aspectBand, "portrait-wide", "portrait-wide for near-square portrait");
});

test("portrait-narrow aspect band for tall portrait", () => {
  const result = computeAt(390, 844);
  eq(result.aspectBand, "portrait-narrow", "portrait-narrow for tall device");
});

test("landscape-wide for typical widescreen", () => {
  const result = computeAt(1280, 720);
  eq(result.aspectBand, "landscape-wide", "landscape-wide for 16:9");
});

test("landscape-shallow for near-square landscape", () => {
  const result = computeAt(800, 700);
  eq(result.aspectBand, "landscape-shallow", "landscape-shallow for ~1.14 aspect");
});

// --- computeLayout dimensions (structure) ---

test("computeLayout result contains viewport, panel, game, frame", () => {
  const result = computeAt(375, 812);
  ok(result.viewport, "has viewport");
  ok(result.panel, "has panel");
  ok(result.game, "has game");
  ok(result.frame, "has frame");
});

test("computeLayout panel and game have positive dimensions in portrait", () => {
  const result = computeAt(375, 812);
  ok(result.panel.width > 0, "panel.width positive");
  ok(result.panel.height > 0, "panel.height positive");
  ok(result.game.width > 0, "game.width positive");
  ok(result.game.height > 0, "game.height positive");
});

test("computeLayout panel and game have positive dimensions in landscape", () => {
  const result = computeAt(1024, 600);
  ok(result.panel.width > 0, "panel.width positive");
  ok(result.panel.height > 0, "panel.height positive");
  ok(result.game.width > 0, "game.width positive");
  ok(result.game.height > 0, "game.height positive");
});

test("computeLayout panel.width+game.width+gap fills innerWidth in landscape", () => {
  const result = computeAt(1024, 600);
  const inner = result.viewport.width - result.frame.padding * 2;
  approxEq(result.panel.width + result.game.width + result.frame.gap, inner, 2, "panel+game+gap = innerWidth");
});

test("computeLayout panel.height+game.height+gap fills innerHeight in portrait", () => {
  const result = computeAt(375, 812);
  const inner = result.viewport.height - result.frame.padding * 2;
  approxEq(result.panel.height + result.game.height + result.frame.gap, inner, 2, "panel+game+gap = innerHeight");
});

test("computeLayout panel.width respects panel.landscapeMin in landscape", () => {
  const result = computeAt(1024, 600);
  const cfg = normalizeConfig({});
  ok(result.panel.width >= cfg.panel.landscapeMin, "panel.width >= landscapeMin");
});

test("computeLayout answers grid has positive button dimensions", () => {
  const result = computeAt(375, 812);
  if (result.answers && result.answers.grid) {
    ok(result.answers.grid.buttonWidth > 0, "answers.grid.buttonWidth positive");
    ok(result.answers.grid.buttonHeight > 0, "answers.grid.buttonHeight positive");
    ok(result.answers.grid.cols >= 1, "answers.grid.cols >= 1");
    ok(result.answers.grid.rows >= 1, "answers.grid.rows >= 1");
  }
});

test("computeLayout includes screen with shortSide and aspectRatio", () => {
  const result = computeAt(375, 812);
  ok(result.screen, "has screen");
  ok(result.screen.shortSide > 0, "screen.shortSide positive");
  ok(result.screen.aspectRatio > 0, "screen.aspectRatio positive");
});

test("computeLayout orientation is landscape for wide viewport", () => {
  const result = computeAt(1024, 600);
  eq(result.orientation, "landscape", "landscape orientation");
});

test("computeLayout orientation is portrait for tall viewport", () => {
  const result = computeAt(375, 812);
  eq(result.orientation, "portrait", "portrait orientation");
});

// --- createLayoutEngine ---

test("createLayoutEngine.compute returns layout for given viewport", () => {
  const engine = createLayoutEngine({});
  const result = engine.compute({ viewport: { width: 375, height: 812 } });
  ok(result, "result exists");
  eq(result.mode, "phone-portrait", "correct mode");
});

test("createLayoutEngine.getLayout returns last computed layout", () => {
  const engine = createLayoutEngine({});
  const a = engine.compute({ viewport: { width: 375, height: 812 } });
  const b = engine.getLayout();
  eq(a.mode, b.mode, "getLayout returns same result as compute");
});

test("createLayoutEngine.getLayout returns null before first compute", () => {
  const engine = createLayoutEngine({});
  eq(engine.getLayout(), null, "null before compute");
});

test("createLayoutEngine.updateConfig merges new config", () => {
  const engine = createLayoutEngine({});
  engine.updateConfig({ breakpoints: { tabletPortraitMinWidth: 900 } });
  const cfg = engine.getConfig();
  eq(cfg.breakpoints.tabletPortraitMinWidth, 900, "updated config applied");
});

test("createLayoutEngine.updateConfig does not change unrelated config", () => {
  const engine = createLayoutEngine({});
  const before = engine.getConfig().breakpoints.landscapeAspectThreshold;
  engine.updateConfig({ breakpoints: { tabletPortraitMinWidth: 900 } });
  const after = engine.getConfig().breakpoints.landscapeAspectThreshold;
  eq(before, after, "unrelated config unchanged");
});

test("createLayoutEngine computes after updateConfig", () => {
  const engine = createLayoutEngine({});
  engine.updateConfig({ panel: { portraitRatio: 0.5 } });
  const r = engine.compute({ viewport: { width: 375, height: 812 } });
  ok(r.panel.height > 0, "panelHeight positive after config update");
});

// --- edge cases ---

test("computeLayout handles square viewport", () => {
  const result = computeAt(600, 600);
  ok(result.panel, "has panel");
  ok(result.game, "has game");
});

test("computeLayout handles very small viewport", () => {
  const result = computeAt(200, 300);
  ok(result.game.width >= 0, "game.width non-negative");
  ok(result.game.height >= 0, "game.height non-negative");
});

test("computeLayout with no config argument uses defaults", () => {
  const result = computeLayout(null, { viewport: { width: 375, height: 812 } });
  ok(result.mode, "mode is set");
});

// --- Summary ---

const total = passed + failed;
if (failed > 0) {
  console.error(failed + "/" + total + " tests FAILED.");
  process.exit(1);
} else {
  console.log("Logic tests passed: layout (" + passed + "/" + total + " tests).");
}
