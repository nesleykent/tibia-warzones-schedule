import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

function loadSharedExports() {
  const source = readFileSync(
    new URL("../assets/shared.js", import.meta.url),
    "utf8"
  );
  class TestElement {}
  const sandbox = {
    window: {},
    document: {
      documentElement: { lang: "en" },
      addEventListener() {},
      getElementById() {
        return null;
      },
      querySelector() {
        return null;
      },
      querySelectorAll() {
        return [];
      },
    },
    localStorage: {
      getItem() {
        return null;
      },
      removeItem() {},
      setItem() {},
    },
    Image: class {},
    Element: TestElement,
    URL,
    fetch: async () => {
      throw new Error("fetch should not run in frontend control tests");
    },
    console,
    setTimeout,
    clearTimeout,
  };

  vm.runInNewContext(source, sandbox, { filename: "assets/shared.js" });
  return {
    ...sandbox.window.TibiaTime,
    documentElement: sandbox.document.documentElement,
    Element: TestElement,
  };
}

const worldController = readFileSync(
  new URL("../assets/world.js", import.meta.url),
  "utf8"
);
const rankingController = readFileSync(
  new URL("../assets/ranking.js", import.meta.url),
  "utf8"
);
const homeController = readFileSync(
  new URL("../assets/app.js", import.meta.url),
  "utf8"
);
const openHousesController = readFileSync(
  new URL("../assets/open-houses.js", import.meta.url),
  "utf8"
);

test("language state synchronizes document metadata", () => {
  const { documentElement, setDocumentLanguage, updateLanguageButtons } =
    loadSharedExports();

  assert.equal(setDocumentLanguage("pt-BR"), "pt-BR");
  assert.equal(documentElement.lang, "pt-BR");

  updateLanguageButtons("pl");
  assert.equal(documentElement.lang, "pl");
});

test("language menu navigation wraps and supports boundary keys", () => {
  const { getMenuNavigationIndex } = loadSharedExports();

  assert.equal(getMenuNavigationIndex(0, "ArrowDown", 4), 1);
  assert.equal(getMenuNavigationIndex(3, "ArrowDown", 4), 0);
  assert.equal(getMenuNavigationIndex(0, "ArrowUp", 4), 3);
  assert.equal(getMenuNavigationIndex(2, "Home", 4), 0);
  assert.equal(getMenuNavigationIndex(1, "End", 4), 3);
  assert.equal(getMenuNavigationIndex(1, "Tab", 4), -1);
  assert.equal(getMenuNavigationIndex(0, "ArrowDown", 0), -1);
});

test("dialog focus looping wraps only at the boundaries", () => {
  const { getDialogFocusTargetIndex } = loadSharedExports();

  assert.equal(getDialogFocusTargetIndex(0, true, 5), 4);
  assert.equal(getDialogFocusTargetIndex(4, false, 5), 0);
  assert.equal(getDialogFocusTargetIndex(2, false, 5), -1);
  assert.equal(getDialogFocusTargetIndex(2, true, 5), -1);
  assert.equal(getDialogFocusTargetIndex(-1, false, 5), 0);
  assert.equal(getDialogFocusTargetIndex(0, false, 0), -1);
});

test("active navigation centering stays within the scroll range", () => {
  const { getCenteredNavigationScrollLeft } = loadSharedExports();

  assert.equal(
    getCenteredNavigationScrollLeft({
      containerWidth: 200,
      currentScroll: 0,
      itemLeft: 300,
      itemWidth: 100,
      scrollWidth: 500,
    }),
    250
  );
  assert.equal(
    getCenteredNavigationScrollLeft({
      containerWidth: 200,
      currentScroll: 0,
      itemLeft: 480,
      itemWidth: 80,
      scrollWidth: 500,
    }),
    300
  );
  assert.equal(
    getCenteredNavigationScrollLeft({
      containerWidth: 300,
      currentScroll: 25,
      itemLeft: 50,
      itemWidth: 100,
      scrollWidth: 250,
    }),
    0
  );
});

test("renderFilterPill exposes and escapes active filter state", () => {
  const { renderFilterPill } = loadSharedExports();
  const markup = renderFilterPill({
    active: true,
    group: 'region"',
    label: "Europe <West>",
    value: "EU&West",
  });

  assert.match(markup, /class="filter-pill is-active"/);
  assert.match(markup, /aria-pressed="true"/);
  assert.match(markup, /data-filter-group="region&quot;"/);
  assert.match(markup, /data-filter-value="EU&amp;West"/);
  assert.match(markup, />Europe &lt;West&gt;<\/button>$/);
});

test("renderFilterPill identifies the inactive all-filters control", () => {
  const { renderFilterPill } = loadSharedExports();
  const markup = renderFilterPill({
    active: false,
    group: "__all__",
    isAll: true,
    label: "All",
    value: "__all__",
  });

  assert.match(markup, /class="filter-pill filter-pill--all"/);
  assert.match(markup, /aria-pressed="false"/);
  assert.doesNotMatch(markup, /is-active/);
});

test("all filter controllers use the shared filter renderer", () => {
  for (const file of ["app.js", "ranking.js", "open-houses.js"]) {
    const source = readFileSync(
      new URL(`../assets/${file}`, import.meta.url),
      "utf8"
    );
    assert.match(source, /renderFilterPill/);
    assert.doesNotMatch(source, /<button[^>]*class="filter-pill/s);
  }
});

test("English-only pages do not advertise unavailable translations", () => {
  for (const file of ["bigfoot.html", "open-houses.html"]) {
    const source = readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
    assert.match(source, /<html lang="en">/);
    assert.doesNotMatch(source, /id="langDropdown"|class="lang-flag"/);
  }
});

test("translated pages use radio-menu language semantics", () => {
  for (const file of ["index.html", "ranking.html", "world.html"]) {
    const source = readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
    assert.match(source, /aria-controls="langMenu"/);
    assert.equal((source.match(/role="menuitemradio"/g) || []).length, 4);
    assert.doesNotMatch(source, /role="menuitem"/);
  }
});

test("core interaction styles share the minimum target-size token", () => {
  const source = readFileSync(
    new URL("../assets/styles.css", import.meta.url),
    "utf8"
  );

  assert.match(source, /--interactive-target-min:\s*44px;/);
  for (const selector of [
    "\\.topbar-links a",
    "\\.planner-print-trigger",
    "#searchInput",
    "#timezoneSelect",
    "\\.filter-pill",
  ]) {
    assert.match(
      source,
      new RegExp(
        `${selector}\\s*\\{[^}]*var\\(--interactive-target-min\\)`,
        "s"
      )
    );
  }
  assert.match(
    source,
    /\.topbar-links a\s*\{[^}]*min-width:\s*var\(--interactive-target-min\);[^}]*min-height:\s*var\(--interactive-target-min\);/s
  );
  assert.match(
    source,
    /\.filter-pill\s*\{[^}]*min-width:\s*var\(--interactive-target-min\);[^}]*min-height:\s*var\(--interactive-target-min\);/s
  );
});

test("mobile navigation keeps full route labels in a scrollable strip", () => {
  const styles = readFileSync(
    new URL("../assets/styles.css", import.meta.url),
    "utf8"
  );

  assert.match(
    styles,
    /@media \(max-width: 720px\)[\s\S]*?\.topbar-links\s*\{[^}]*font-size:\s*12px;[^}]*overflow-x:\s*auto;[^}]*scroll-snap-type:\s*inline proximity;/
  );
  assert.match(styles, /@media \(max-width: 560px\)[\s\S]*?\.topbar-links\s*\{[^}]*font-size:\s*11px;/);
  assert.doesNotMatch(styles, /\.link-(?:short|full)/);

  for (const file of [
    "index.html",
    "ranking.html",
    "world.html",
    "open-houses.html",
    "bigfoot.html",
    "admin.html",
  ]) {
    const source = readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
    assert.match(source, />\s*Bigfoot's Burden Quest\s*<\/a>/);
    assert.doesNotMatch(source, /link-(?:short|full)/);
  }
});

test("narrow responsive containers contain intrinsic content width", () => {
  const source = readFileSync(
    new URL("../assets/styles.css", import.meta.url),
    "utf8"
  );

  assert.match(
    source,
    /\.admin-warning,[\s\S]*?\.admin-preview\s*\{\s*min-width:\s*0;/
  );
  assert.match(
    source,
    /\.admin-card\s*\{[^}]*grid-template-columns:\s*minmax\(0, 1fr\);/s
  );
  assert.match(
    source,
    /\.admin-card-copy code,[\s\S]*?\.admin-helper code\s*\{[^}]*overflow-wrap:\s*anywhere;/
  );
  assert.match(source, /\.admin-panel\s*\{[^}]*min-width:\s*0;/s);
  assert.match(source, /\.admin-table-wrap\s*\{[^}]*min-width:\s*0;/s);
  assert.match(
    source,
    /@media \(max-width: 600px\)[\s\S]*?\.footer-copy,[\s\S]*?\.footer-disclaimer\s*\{[^}]*max-width:\s*100%;[^}]*white-space:\s*normal;/
  );
});

test("print-list dialog markup and controller expose a complete focus contract", () => {
  const markup = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  const controller = readFileSync(
    new URL("../assets/app.js", import.meta.url),
    "utf8"
  );
  const styles = readFileSync(
    new URL("../assets/styles.css", import.meta.url),
    "utf8"
  );

  assert.match(markup, /role="dialog"[^>]*aria-modal="true"/s);
  assert.match(markup, /aria-describedby="printListStatus"/);
  for (const id of [
    "printListCopyBtn",
    "printListPrintBtn",
    "printListCloseBtn",
    "printListCloseActionBtn",
  ]) {
    assert.match(markup, new RegExp(`id="${id}"`));
    assert.match(controller, new RegExp(`${id}: "${id}"`));
  }
  assert.match(controller, /trapDialogFocus\(event,/);
  assert.match(controller, /returnFocus\?\.isConnected/);
  assert.match(
    styles,
    /\.print-list-modal-btn\s*\{[^}]*min-height:\s*var\(--interactive-target-min\);/s
  );
});

test("world market dialog owns focus and centralizes lifecycle cleanup", () => {
  const styles = readFileSync(
    new URL("../assets/styles.css", import.meta.url),
    "utf8"
  );

  assert.match(worldController, /aria-describedby="marketItemModalUpdated"/);
  assert.match(worldController, /trapDialogFocus\(event, dialog\)/);
  assert.match(
    worldController,
    /document\.removeEventListener\("keydown", marketModalKeydownHandler\)/
  );
  assert.match(worldController, /returnFocus\?\.isConnected/);
  assert.equal(
    worldController.match(/openMarketItemModal\(worldName, itemName, row\)/g)
      ?.length,
    2
  );
  assert.match(
    worldController,
    /renderMarketModalMessageState\(modalRoot, dict\.noMarketData\)/
  );
  const marketErrorHandler = worldController.slice(
    worldController.indexOf('console.error("Failed to open market item modal"'),
    worldController.indexOf("function bindMarketPricesTableInteractions")
  );
  assert.doesNotMatch(
    marketErrorHandler,
    /chartsSection|equilibriumSection|metricsSection/
  );
  assert.match(
    styles,
    /\.market-item-modal \[data-market-modal-close="true"\]\s*\{[^}]*min-height:\s*var\(--interactive-target-min\);/s
  );
  assert.match(
    styles,
    /\.market-item-modal-ranges \[data-range\]\s*\{[^}]*min-height:\s*var\(--interactive-target-min\);/s
  );
});

test("ranking rows expose one native navigation target", () => {
  const styles = readFileSync(
    new URL("../assets/styles.css", import.meta.url),
    "utf8"
  );

  assert.match(rankingController, /<tr class="ranking-table-row">/);
  assert.doesNotMatch(rankingController, /data-world-url|role="link"/);
  assert.doesNotMatch(
    rankingController,
    /wrap\.addEventListener\("keydown"/
  );
  assert.match(
    rankingController,
    /closest\("\.ranking-table-row"\)[\s\S]*?querySelector\("\.world-name-link"\)[\s\S]*?\.click\(\)/
  );
  assert.match(
    styles,
    /\.ranking-table \.world-name-link\s*\{[^}]*min-height:\s*var\(--interactive-target-min\);/s
  );
  assert.match(styles, /\.ranking-table \.world-name-link:focus-visible/);
  assert.doesNotMatch(styles, /\.ranking-table-row:focus-visible/);
});

test("shared surface navigation delegates only background clicks", () => {
  const { activateSurfacePrimaryLink, Element } = loadSharedExports();
  let clickCount = 0;
  const link = { click: () => (clickCount += 1) };
  const surface = {
    querySelector(selector) {
      return selector === ".world-name-link" ? link : null;
    },
  };
  const backgroundTarget = new Element();
  backgroundTarget.closest = (selector) =>
    selector === ".world-card" ? surface : null;

  assert.equal(
    activateSurfacePrimaryLink(
      { target: backgroundTarget },
      ".world-card",
      ".world-name-link"
    ),
    true
  );
  assert.equal(clickCount, 1);

  const nativeLinkTarget = new Element();
  nativeLinkTarget.closest = (selector) =>
    selector === "a, button" ? nativeLinkTarget : surface;
  assert.equal(
    activateSurfacePrimaryLink(
      { target: nativeLinkTarget },
      ".world-card",
      ".world-name-link"
    ),
    false
  );
  assert.equal(clickCount, 1);
});

test("world card controllers share one native-link delegation contract", () => {
  for (const controller of [homeController, openHousesController]) {
    assert.match(
      controller,
      /activateSurfacePrimaryLink\([^;]+"\.world-card", "\.world-name-link"\)/
    );
    assert.doesNotMatch(controller, /data-world-url/);
  }

  assert.doesNotMatch(
    openHousesController,
    /elements\.worldsList\.addEventListener\("keydown"/
  );
  assert.doesNotMatch(
    openHousesController,
    /class="world-card"[\s\S]{0,180}(?:role="button"|tabindex="0")/
  );
});
