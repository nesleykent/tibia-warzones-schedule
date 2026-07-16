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

test("world card grids preserve source order without runtime masonry", () => {
  assert.match(
    styles,
    /\.worlds-list\s*\{[^}]*display:\s*grid;[^}]*grid-template-columns:\s*repeat\(3,/s
  );
  assert.match(styles, /@media \(max-width: 1019px\)[\s\S]*repeat\(2,/);
  assert.match(styles, /@media \(max-width: 679px\)[\s\S]*minmax\(0, 1fr\)/);

  for (const controller of [homeController, openHousesController]) {
    assert.doesNotMatch(controller, /applyMasonry|masonry-col|getColumnCount/);
  }
});

test("responsive layout changes do not trigger full home-page renders", () => {
  assert.doesNotMatch(homeController, /addEventListener\(["']resize["']/);
});

test("open-house rendering reads its report source directly", () => {
  assert.doesNotMatch(openHousesController, /getFilteredReports/);
  assert.match(openHousesController, /const reports = allReports;/);
});
