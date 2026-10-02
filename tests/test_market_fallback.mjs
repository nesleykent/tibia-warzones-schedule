import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";

const NOW = Date.parse("2026-10-02T12:00:00Z");
const HOUR_S = 3600;
const nowS = NOW / 1000;

async function loadShared() {
  const storageWrites = [];
  const storage = {
    getItem() { return null; },
    setItem(key, value) { storageWrites.push([key, value]); },
    removeItem() {},
  };
  const sandbox = {
    window: {},
    document: {
      getElementById() { return null; },
      querySelector() { return null; },
      querySelectorAll() { return []; },
      addEventListener() {},
    },
    localStorage: storage,
    sessionStorage: storage,
    Image: class {},
    Intl,
    Date,
    URL,
    console,
    setTimeout,
    clearTimeout,
  };
  const source = await readFile(path.join(process.cwd(), "assets/shared.js"), "utf8");
  vm.runInNewContext(source, sandbox, { filename: "assets/shared.js" });
  return { shared: sandbox.window.TibiaTime, storageWrites };
}

const CSV = [
  '"world","type","sell","buy","capturedAtUtc","viewType"',
  '"Antica","Open PvP","39000","38000","2026-10-01T03:00:00.000Z","offers"',
  '"Antica","Open PvP","41000","40000","2026-10-02T03:00:00.000Z","offers"',
  '"Antica","Open PvP","","","2026-10-02T04:00:00.000Z","statistics"',
  '"Secura","Open PvP","45000","44000","2026-09-01T03:00:00.000Z","offers"',
].join("\n");

const tibiaMarket = (price, ageHours) => ({
  rolling_window_price: price,
  latest_observation_time: ageHours == null ? null : nowS - ageHours * HOUR_S,
  source: "tibiamarket",
});

test("parses the latest Tibinance offers quote per world and ignores statistics rows", async () => {
  const { shared } = await loadShared();
  const quotes = shared.parseTibinanceTibiaCoinQuotes(CSV);
  assert.equal(quotes.get("antica").price, 41000);
  assert.equal(quotes.get("antica").buyPrice, 40000);
  assert.equal(quotes.get("antica").observedAt, Date.parse("2026-10-02T03:00:00.000Z") / 1000);
  assert.equal(shared.parseTibinanceTibiaCoinQuotes("").size, 0);
});

test("current TibiaMarket Tibia Coin data wins over Tibinance", async () => {
  const { shared } = await loadShared();
  const quotes = shared.parseTibinanceTibiaCoinQuotes(CSV);
  const quote = shared.selectTibiaCoinQuote("Antica", tibiaMarket(43000, 2), quotes, NOW);
  assert.equal(quote.source, "tibiamarket");
  assert.equal(quote.price, 43000);
});

test("missing or stale TibiaMarket Tibia Coin data falls back to Tibinance with provenance", async () => {
  const { shared } = await loadShared();
  const quotes = shared.parseTibinanceTibiaCoinQuotes(CSV);
  for (const model of [undefined, tibiaMarket(null, null), tibiaMarket(43000, 24 * 10)]) {
    const quote = shared.selectTibiaCoinQuote("Antica", model, quotes, NOW);
    assert.equal(quote.source, shared.MARKET_SOURCE_TIBINANCE);
    assert.equal(quote.source, "tibinance");
    assert.equal(quote.price, 41000);
    assert.equal(quote.observedAt, Date.parse("2026-10-02T03:00:00.000Z") / 1000);
  }
});

test("failed Tibinance fetch keeps TibiaMarket values with tibiamarket provenance", async () => {
  const { shared } = await loadShared();
  const quotes = await shared.loadTibinanceTibiaCoinQuotes(async () => {
    throw new Error("network down");
  });
  assert.equal(quotes.size, 0);
  const quote = shared.selectTibiaCoinQuote("Antica", tibiaMarket(43000, 24 * 10), quotes, NOW);
  assert.equal(quote.source, "tibiamarket");
  assert.equal(quote.price, 43000);
});

test("stale Tibinance data is not used as a fallback", async () => {
  const { shared } = await loadShared();
  const quotes = shared.parseTibinanceTibiaCoinQuotes(CSV);
  assert.equal(shared.selectTibiaCoinQuote("Secura", undefined, quotes, NOW), null);
  const quote = shared.selectTibiaCoinQuote("Secura", tibiaMarket(43000, 24 * 10), quotes, NOW);
  assert.equal(quote.source, "tibiamarket");
});

test("Tibinance quotes stay transient: fetched once, never written to storage", async () => {
  const { shared, storageWrites } = await loadShared();
  let calls = 0;
  const fetchImpl = async (url) => {
    calls += 1;
    assert.equal(url, shared.TIBINANCE_TIBIA_COIN_URL);
    return { ok: true, text: async () => CSV };
  };
  const first = await shared.loadTibinanceTibiaCoinQuotes(fetchImpl);
  const second = await shared.loadTibinanceTibiaCoinQuotes(fetchImpl);
  assert.equal(first, second);
  assert.equal(calls, 1);
  assert.deepEqual(storageWrites, []);
});

test("Tibinance is wired only to the Tibia Coin price, never to Warzone items", async () => {
  const assets = ["app.js", "admin.js", "bigfoot.js", "open-houses.js", "ranking.js", "world.js"];
  for (const file of assets) {
    const source = await readFile(path.join(process.cwd(), "assets", file), "utf8");
    assert.doesNotMatch(source, /TIBINANCE_TIBIA_COIN_URL|parseTibinanceTibiaCoinQuotes/, file);
    assert.doesNotMatch(source, /localStorage[^\n]*tibinance|writeJsonStorage[^\n]*tibinance/i, file);
    for (const call of source.matchAll(/selectTibiaCoinQuote\(([\s\S]*?)\);/g)) {
      assert.match(call[1], /tibia_coin/, `${file} passes a non-Tibia-Coin model`);
    }
  }
  const ranking = await readFile(path.join(process.cwd(), "assets/ranking.js"), "utf8");
  for (const item of ["gill_necklace", "prismatic_necklace", "prismatic_ring"]) {
    assert.doesNotMatch(ranking, new RegExp(`selectTibiaCoinQuote\\([^)]*${item}`), item);
  }
  const { shared } = await loadShared();
  assert.equal(typeof shared.selectMarketItemQuote, "undefined");
});
