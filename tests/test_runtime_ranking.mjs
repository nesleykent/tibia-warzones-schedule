import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

// Runtime (browser-only) re-ranking with the transient Tibinance Tibia Coin
// fallback. See buildRuntimeRanking in assets/shared.js.

const NOW = Date.parse("2026-10-02T12:00:00Z");
const nowS = NOW / 1000;
const DAY_S = 86400;

function loadContext({ withRanking = false } = {}) {
  const storageWrites = [];
  const storage = {
    getItem() { return null; },
    setItem(key, value) { storageWrites.push([key, value]); },
    removeItem() {},
  };
  const sandbox = {
    window: {},
    document: {
      documentElement: { lang: "en" },
      addEventListener() {},
      getElementById() { return null; },
      querySelector() { return null; },
      querySelectorAll() { return []; },
    },
    localStorage: storage,
    sessionStorage: storage,
    Image: class {},
    Element: class {},
    Intl,
    Date,
    URL,
    fetch: async () => { throw new Error("offline"); },
    console,
    setTimeout,
    clearTimeout,
  };
  sandbox.globalThis = sandbox;
  const context = vm.createContext(sandbox);
  const files = ["../assets/shared.js", ...(withRanking ? ["../assets/ranking.js"] : [])];
  for (const file of files) {
    vm.runInContext(readFileSync(new URL(file, import.meta.url), "utf8"), context, {
      filename: file,
    });
  }
  return { sandbox, shared: sandbox.window.TibiaTime, storageWrites };
}

// Persisted (TibiaMarket) ranking fixture: Alpha #1 (10), Bravo #2 (8, stale TC),
// Charlie #3 (5). Bravo's stale TC is 50,000; Tibinance has a fresh 20,000.
function world(name, { position, serviceEv, coin, coinAgeDays, mark = "healthy", ranked = true }) {
  const score = coin ? serviceEv / coin : null;
  return {
    name,
    mark,
    pvp_type: "Open PvP",
    warzone_economic_ranking: {
      is_ranked: ranked,
      insufficient_data: !ranked,
      insufficient_data_reasons: ranked ? [] : ["missing_economic_inputs"],
      ranking_position: position,
      economic_score_raw: score,
      final_score: score == null ? null : Math.round(score * 1e6) / 1e6,
      service_expected_value: serviceEv,
      market: {
        tibia_coin: {
          rolling_window_price: coin,
          latest_observation_time: coin ? nowS - coinAgeDays * DAY_S : null,
          source: "tibiamarket",
        },
        gill_necklace: { rolling_window_price: 30000, source: "tibiamarket" },
      },
    },
  };
}

const fixture = () => [
  world("Alpha", { position: 1, serviceEv: 400000, coin: 40000, coinAgeDays: 0.5 }),
  world("Bravo", { position: 2, serviceEv: 400000, coin: 50000, coinAgeDays: 20 }),
  world("Charlie", { position: 3, serviceEv: 200000, coin: 40000, coinAgeDays: 0.5 }),
  world("Delta", { position: null, serviceEv: 300000, coin: null, ranked: false }),
];

const quotes = (entries) =>
  new Map(entries.map(([name, price, ageDays]) => [
    name.toLowerCase(),
    { price, buyPrice: null, observedAt: nowS - ageDays * DAY_S },
  ]));

const byName = (worlds) => Object.fromEntries(worlds.map((w) => [w.name, w]));

test("1. a fresh Tibinance fallback recomputes TC-dependent metrics and reorders the ranking", () => {
  const { shared } = loadContext();
  const runtime = byName(shared.buildRuntimeRanking(fixture(), quotes([["Bravo", 20000, 0.1]]), NOW));
  const bravo = runtime.Bravo.warzone_economic_ranking;
  assert.equal(bravo.effective_tibia_coin.source, "tibinance");
  assert.equal(bravo.effective_tibia_coin.price, 20000);
  assert.equal(bravo.economic_score_raw, 400000 / 20000);
  assert.equal(bravo.final_score, 20);
  assert.equal(bravo.service_expected_value, 400000); // item-only input unchanged
  assert.equal(bravo.ranking_position, 1);
  assert.equal(runtime.Alpha.warzone_economic_ranking.ranking_position, 2);
  assert.equal(runtime.Charlie.warzone_economic_ranking.ranking_position, 3);

  // A world with no TibiaMarket TC price becomes rankable via the fallback.
  const withDelta = byName(
    shared.buildRuntimeRanking(fixture(), quotes([["Delta", 10000, 0.1]]), NOW)
  );
  const delta = withDelta.Delta.warzone_economic_ranking;
  assert.equal(delta.is_ranked, true);
  assert.equal(delta.economic_score_raw, 30);
  assert.deepEqual([...delta.insufficient_data_reasons], []);
  assert.equal(delta.ranking_position, 1);
});

test("fallback never ranks an excluded (na) world", () => {
  const { shared } = loadContext();
  const worlds = fixture();
  worlds[3].mark = "na";
  worlds[3].warzone_economic_ranking.insufficient_data_reasons = ["excluded_na_world", "missing_economic_inputs"];
  const delta = byName(shared.buildRuntimeRanking(worlds, quotes([["Delta", 10000, 0.1]]), NOW))
    .Delta.warzone_economic_ranking;
  assert.equal(delta.is_ranked, false);
  assert.equal(delta.ranking_position, null);
  assert.deepEqual([...delta.insufficient_data_reasons], ["excluded_na_world"]);
});

test("2. worlds on TibiaMarket keep their persisted calculations", () => {
  const { shared } = loadContext();
  const persisted = byName(fixture());
  const runtime = byName(shared.buildRuntimeRanking(fixture(), quotes([["Bravo", 20000, 0.1]]), NOW));
  for (const name of ["Alpha", "Charlie"]) {
    const { effective_tibia_coin, ranking_position, ...rest } = runtime[name].warzone_economic_ranking;
    const { ranking_position: _p, ...expected } = persisted[name].warzone_economic_ranking;
    assert.equal(effective_tibia_coin.source, "tibiamarket");
    assert.deepEqual(rest, expected);
  }
});

test("2b. without Tibinance quotes the runtime ranking reproduces the persisted dataset", () => {
  const { shared } = loadContext();
  const worlds = JSON.parse(readFileSync(new URL("../data/worlds.json", import.meta.url), "utf8"));
  const runtime = shared.buildRuntimeRanking(worlds, new Map(), NOW);
  runtime.forEach((entry, index) => {
    const before = worlds[index].warzone_economic_ranking;
    const after = entry.warzone_economic_ranking;
    assert.equal(after.ranking_position, before.ranking_position, entry.name);
    assert.equal(after.economic_score_raw, before.economic_score_raw, entry.name);
    assert.equal(after.is_ranked, before.is_ranked, entry.name);
    if (after.effective_tibia_coin) assert.equal(after.effective_tibia_coin.source, "tibiamarket");
  });
});

test("3. runtime ranking never mutates persisted objects or writes storage", async () => {
  const { shared, storageWrites } = loadContext();
  const worlds = fixture();
  const snapshot = JSON.stringify(worlds);
  shared.buildRuntimeRanking(worlds, quotes([["Bravo", 20000, 0.1]]), NOW);
  assert.equal(JSON.stringify(worlds), snapshot);
  await shared.loadTibinanceTibiaCoinQuotes(async () => ({ ok: true, text: async () => "" }));
  assert.deepEqual(storageWrites, []);
  for (const file of ["ranking.js", "world.js"]) {
    const source = readFileSync(new URL(`../assets/${file}`, import.meta.url), "utf8");
    assert.doesNotMatch(source, /write\w*Storage\([^)]*(worlds|ranking|effective_tibia_coin|Tibinance)/i, file);
  }
});

test("4. ranking sorting uses the recomputed runtime values", () => {
  const { sandbox, shared } = loadContext({ withRanking: true });
  const runtime = shared.buildRuntimeRanking(fixture(), quotes([["Bravo", 20000, 0.1]]), NOW)
    .filter((entry) => entry.warzone_economic_ranking.is_ranked);
  const names = (sort) =>
    [...runtime].sort(sandbox.buildComparator(sort)).map((entry) => entry.name);
  assert.deepEqual(names({ key: "rank", direction: "asc" }), ["Bravo", "Alpha", "Charlie"]);
  assert.deepEqual(names({ key: "expectedReturn", direction: "desc" }), ["Bravo", "Alpha", "Charlie"]);
  assert.deepEqual(names({ key: "tibiaCoin", direction: "asc" }), ["Bravo", "Alpha", "Charlie"]);
});

test("5. ranking and world pages resolve the same effective TC price and provenance", () => {
  const { shared } = loadContext();
  const ranking = readFileSync(new URL("../assets/ranking.js", import.meta.url), "utf8");
  const worldPage = readFileSync(new URL("../assets/world.js", import.meta.url), "utf8");
  for (const source of [ranking, worldPage]) {
    assert.match(source, /loadRuntimeRankedWorlds\(\)/);
    assert.match(source, /effective_tibia_coin/);
    assert.doesNotMatch(source, /loadWorldsData\(\)/);
  }
  const q = quotes([["Bravo", 20000, 0.1]]);
  const runtime = byName(shared.buildRuntimeRanking(fixture(), q, NOW));
  for (const entry of fixture()) {
    assert.deepEqual(
      runtime[entry.name].warzone_economic_ranking.effective_tibia_coin,
      shared.resolveEffectiveTibiaCoin(entry, q, NOW)
    );
  }
});

test("6. Tibinance failure, malformed or stale data restores TibiaMarket-only ranking", async () => {
  const cases = [
    async () => { throw new Error("network down"); },
    async () => ({ ok: false, text: async () => "" }),
    async () => ({ ok: true, text: async () => "<html>not csv</html>" }),
    () => new Promise(() => {}), // hangs: timeout path
  ];
  for (const fetchImpl of cases) {
    const { shared } = loadContext();
    const q = await shared.loadTibinanceTibiaCoinQuotes(fetchImpl, 50);
    assert.equal(q.size, 0);
    const runtime = byName(shared.buildRuntimeRanking(fixture(), q, NOW));
    assert.equal(runtime.Bravo.warzone_economic_ranking.effective_tibia_coin.source, "tibiamarket");
    assert.equal(runtime.Bravo.warzone_economic_ranking.economic_score_raw, 8);
    assert.deepEqual(
      ["Alpha", "Bravo", "Charlie"].map((n) => runtime[n].warzone_economic_ranking.ranking_position),
      [1, 2, 3]
    );
  }
  const { shared } = loadContext();
  const stale = byName(shared.buildRuntimeRanking(fixture(), quotes([["Bravo", 20000, 9]]), NOW));
  assert.equal(stale.Bravo.warzone_economic_ranking.effective_tibia_coin.source, "tibiamarket");
  assert.equal(stale.Bravo.warzone_economic_ranking.ranking_position, 2);
});
