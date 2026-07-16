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
