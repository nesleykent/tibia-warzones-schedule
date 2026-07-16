import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const styles = readFileSync(new URL("../assets/styles.css", import.meta.url), "utf8");
const homeController = readFileSync(
  new URL("../assets/app.js", import.meta.url),
  "utf8"
);
const openHousesController = readFileSync(
  new URL("../assets/open-houses.js", import.meta.url),
  "utf8"
);

test("world card flow avoids row stretching without runtime masonry", () => {
  assert.match(
    styles,
    /\.worlds-list\s*\{[^}]*column-count:\s*3;[^}]*column-gap:\s*16px;/s
  );
  assert.match(styles, /@media \(max-width: 1019px\)[\s\S]*column-count:\s*2;/);
  assert.match(styles, /@media \(max-width: 679px\)[\s\S]*column-count:\s*1;/);
  assert.match(
    styles,
    /\.world-card,[\s\S]*?\.worlds-list > \.empty-state\s*\{[^}]*break-inside:\s*avoid;/
  );

  for (const controller of [homeController, openHousesController]) {
    assert.doesNotMatch(controller, /applyMasonry|masonry-col|getColumnCount/);
  }
});

test("fixed artwork stays within the viewport on narrow screens", () => {
  const backgroundRule = styles.match(/#bg-layer\s*\{([\s\S]*?)\n\}/)?.[1] ?? "";
  assert.doesNotMatch(backgroundRule, /transform\s*:/);
  assert.match(backgroundRule, /position:\s*fixed/);
  assert.match(backgroundRule, /inset:\s*0/);
});

test("responsive layout changes do not trigger full home-page renders", () => {
  assert.doesNotMatch(homeController, /addEventListener\(["']resize["']/);
});

test("open-house rendering reads its report source directly", () => {
  assert.doesNotMatch(openHousesController, /getFilteredReports/);
  assert.match(openHousesController, /const reports = allReports;/);
});
