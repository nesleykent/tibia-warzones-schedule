import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";

async function loadSharedExports({ fetchImpl } = {}) {
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
    fetch:
      fetchImpl ||
      (async () => {
        throw new Error("fetch should not run in frontend date tests");
      }),
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

test("convertTimeBetweenTimezones uses the reference date for DST-aware conversion", async () => {
  const shared = await loadSharedExports();
  const summerReference = new Date(Date.UTC(2026, 5, 5, 12, 0, 0));
  const winterReference = new Date(Date.UTC(2026, 0, 5, 12, 0, 0));

  assert.equal(
    shared.convertTimeBetweenTimezones(
      "04:00",
      "Europe/Berlin",
      "America/Sao_Paulo#Curitiba",
      "en",
      { referenceDate: summerReference }
    ),
    "23:00"
  );
  assert.equal(
    shared.convertTimeBetweenTimezones(
      "04:00",
      "Europe/Berlin",
      "America/Sao_Paulo#Curitiba",
      "en",
      { referenceDate: winterReference }
    ),
    "00:00"
  );
});

test("buildRecurringTimeConversion reports local time and calendar-day shift", async () => {
  const shared = await loadSharedExports();
  const summerReference = new Date(Date.UTC(2026, 5, 5, 12, 0, 0));

  const conversion = shared.buildRecurringTimeConversion(
    "04:00",
    "Europe/Berlin",
    "America/Sao_Paulo#Curitiba",
    summerReference
  );

  assert.equal(conversion.sourceTime, "04:00");
  assert.equal(conversion.targetTime, "23:00");
  assert.equal(conversion.dayOffset, -1);
});

test("getTimezoneDisplayLabel reflects the reference date instead of a static abbreviation", async () => {
  const shared = await loadSharedExports();
  const summerReference = new Date(Date.UTC(2026, 5, 5, 12, 0, 0));
  const winterReference = new Date(Date.UTC(2026, 0, 5, 12, 0, 0));

  assert.equal(
    shared.getTimezoneDisplayLabel("Europe/Berlin", summerReference),
    "Berlin (GMT+2)"
  );
  assert.equal(
    shared.getTimezoneDisplayLabel("Europe/Berlin", winterReference),
    "Berlin (GMT+1)"
  );
});

test("timezone context helpers keep narrative copy concise", async () => {
  const shared = await loadSharedExports();
  const summerReference = new Date(Date.UTC(2026, 5, 5, 12, 0, 0));

  assert.equal(
    shared.getTimezoneLocationLabel("Europe/Berlin"),
    "Berlin"
  );
  assert.equal(
    shared.getTimezoneContextLabel("America/Sao_Paulo#Curitiba", summerReference),
    "Curitiba (GMT-3)"
  );
});

test("overlayWorldSchedules prefers manual schedule data over generated schedule fields", async () => {
  const shared = await loadSharedExports();
  const worlds = [
    {
      name: "Antica",
      timezone: "Europe/Berlin",
      warzone_executions: [
        { execution_id: 1, schedule_time: "04:00", warzone_sequence: "1-2-3" },
      ],
      location: "Europe",
    },
    {
      name: "Secura",
      timezone: "Europe/Berlin",
      warzone_executions: [],
    },
  ];
  const manualSchedules = {
    Antica: {
      timezone: "America/Sao_Paulo",
      warzone_executions: [
        { execution_id: 9, schedule_time: "19:00", warzone_sequence: "2-1-3" },
      ],
    },
  };

  const merged = shared.overlayWorldSchedules(worlds, manualSchedules);

  assert.deepEqual(JSON.parse(JSON.stringify(merged)), [
    {
      name: "Antica",
      timezone: "America/Sao_Paulo",
      warzone_executions: [
        { execution_id: 9, schedule_time: "19:00", warzone_sequence: "2-1-3" },
      ],
      location: "Europe",
    },
    {
      name: "Secura",
      timezone: "Europe/Berlin",
      warzone_executions: [],
    },
  ]);
});

test("loadWorldsData overlays manual schedules at runtime", async () => {
  const calls = [];
  const shared = await loadSharedExports({
    fetchImpl: async (path) => {
      calls.push(path);
      if (path === "./data/worlds.json") {
        return {
          ok: true,
          json: async () => [
            {
              name: "Antica",
              timezone: "Europe/Berlin",
              warzone_executions: [
                {
                  execution_id: 1,
                  schedule_time: "04:00",
                  warzone_sequence: "1-2-3",
                },
              ],
            },
          ],
        };
      }
      if (path === "./data/manual-schedules.json") {
        return {
          ok: true,
          json: async () => ({
            Antica: {
              timezone: "America/Sao_Paulo",
              warzone_executions: [
                {
                  execution_id: 2,
                  schedule_time: "19:00",
                  warzone_sequence: "2-1-3",
                },
              ],
            },
          }),
        };
      }
      throw new Error(`Unexpected path: ${path}`);
    },
  });

  const worlds = await shared.loadWorldsData();

  assert.deepEqual(calls, ["./data/worlds.json", "./data/manual-schedules.json"]);
  assert.deepEqual(JSON.parse(JSON.stringify(worlds)), [
    {
      name: "Antica",
      timezone: "America/Sao_Paulo",
      warzone_executions: [
        { execution_id: 2, schedule_time: "19:00", warzone_sequence: "2-1-3" },
      ],
    },
  ]);
});
