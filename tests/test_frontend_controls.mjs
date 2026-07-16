import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

function loadSharedExports() {
  const source = readFileSync(
    new URL("../assets/shared.js", import.meta.url),
    "utf8"
  );
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
  };
}

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
    /@media \(max-width: 720px\)[\s\S]*?\.topbar-links\s*\{[^}]*font-size:\s*13px;[^}]*overflow-x:\s*auto;[^}]*scroll-snap-type:\s*inline proximity;/
  );
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
