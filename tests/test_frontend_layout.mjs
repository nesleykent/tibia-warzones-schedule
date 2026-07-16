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
const sharedController = readFileSync(
  new URL("../assets/shared.js", import.meta.url),
  "utf8"
);

test("world card flow avoids row stretching with shared column packing", () => {
  assert.match(styles, /\.worlds-list\s*\{[^}]*display:\s*flex;[^}]*gap:\s*16px;/s);
  assert.match(styles, /\.world-card-column\s*\{[^}]*display:\s*flex;/s);
  assert.match(styles, /@media \(max-width: 679px\)[\s\S]*display:\s*contents;/);
});

test("fixed artwork stays within the viewport on narrow screens", () => {
  const backgroundRule = styles.match(/#bg-layer\s*\{([\s\S]*?)\n\}/)?.[1] ?? "";
  assert.doesNotMatch(backgroundRule, /transform\s*:/);
  assert.match(backgroundRule, /position:\s*fixed/);
  assert.match(backgroundRule, /inset:\s*0/);
});

test("multicolumn card flow repacks and recalculates responsively", () => {
  assert.match(sharedController, /function layoutMulticolumnCards\(container\)/);
  assert.match(sharedController, /document\.createElement\("div"\)/);
  assert.match(sharedController, /index % columns/);
  assert.match(sharedController, /dataset\.layoutOrder/);
  assert.match(sharedController, /window\.matchMedia\("\(max-width: 679px\)"\)/);
  assert.match(sharedController, /window\.addEventListener\(\s*"resize"/s);
  for (const controller of [homeController, openHousesController]) {
    assert.match(controller, /layoutMulticolumnCards\(.*worldsList/s);
  }
});

test("responsive layout changes do not trigger full home-page renders", () => {
  assert.doesNotMatch(homeController, /addEventListener\(["']resize["']/);
});

test("open-house rendering reads its report source directly", () => {
  assert.doesNotMatch(openHousesController, /getFilteredReports/);
  assert.match(openHousesController, /const reports = allReports;/);
});
