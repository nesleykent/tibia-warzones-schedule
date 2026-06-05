import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";

async function loadSharedExports() {
  const repoRoot = process.cwd();
  const source = await readFile(path.join(repoRoot, "assets/shared.js"), "utf8");
  const sandbox = {
    window: {},
    document: {
      getElementById() {
        return null;
      },
      querySelector() {
        return null;
      },
      querySelectorAll() {
        return [];
      },
      addEventListener() {},
    },
    localStorage: {
      getItem() {
        return null;
      },
      setItem() {},
      removeItem() {},
    },
    Image: class {},
    Intl,
    Date,
    URL,
    fetch: async () => {
      throw new Error("fetch should not run in frontend date tests");
    },
    console,
    setTimeout,
    clearTimeout,
  };

  vm.runInNewContext(source, sandbox, { filename: "assets/shared.js" });
  return sandbox.window.TibiaTime;
}

test("formatObservedKillStatisticsDate shifts stored kill-stat dates back one day", async () => {
  const shared = await loadSharedExports();

  assert.equal(shared.formatObservedKillStatisticsDate("2026-06-05"), "2026-06-04");
  assert.equal(shared.formatObservedKillStatisticsDate("2026-01-01"), "2025-12-31");
});

test("formatObservedKillStatisticsDate preserves invalid or empty input safely", async () => {
  const shared = await loadSharedExports();

  assert.equal(shared.formatObservedKillStatisticsDate(""), "");
  assert.equal(shared.formatObservedKillStatisticsDate("not-a-date"), "not-a-date");
  assert.equal(shared.formatObservedKillStatisticsDate(null), "");
});
