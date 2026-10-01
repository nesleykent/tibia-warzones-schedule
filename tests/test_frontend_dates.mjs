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

function scheduleEntries(count) {
  return Array.from({ length: count }, (_, index) => ({
    execution_id: index + 1,
    schedule_time: `${String(index).padStart(2, "0")}:00`,
    warzone_sequence: "1-2-3",
  }));
}

function summaryWorld(name, scheduledTimes, completedWarzones, mark, kills = null) {
  return {
    name,
    last_detected_services: completedWarzones,
    last_detected_kills:
      kills ||
      (completedWarzones > 0
        ? {
            Deathstrike: completedWarzones,
            Gnomevil: completedWarzones,
            Abyssador: completedWarzones,
          }
        : { Deathstrike: 0, Gnomevil: 0, Abyssador: 0 }),
    mark,
    warzone_executions: scheduleEntries(scheduledTimes),
  };
}

const dailySummaryEnglishLabels = {
  heading: (date) => `Warzones on ${date}`,
  categories: {
    completedAll: "Completed all scheduled Warzones",
    partialOrInconsistent: "Completed partially or with inconsistent data",
    noneCompleted: "Had scheduled service times but completed no Warzones",
  },
  markers: {
    uncertain: "uncertain",
    warning: "warning",
  },
  connector: "and",
  none: "none",
};

test("daily Warzone summary classifies scheduled worlds and formats natural sentences", async () => {
  const shared = await loadSharedExports();
  const worlds = [
    summaryWorld("Wintera", 2, 0, "na"),
    summaryWorld("Belobra", 2, 2, "healthy"),
    summaryWorld("Astera", 4, 1, "healthy"),
    summaryWorld("Calmera", 2, 0, "na"),
    summaryWorld("Havera", 1, 1, "inconclusive", {
      Deathstrike: 1,
      Gnomevil: 1,
      Abyssador: 0,
    }),
    summaryWorld("Bona", 1, 1, "healthy"),
    summaryWorld("NoSchedule", 0, 0, "na"),
    summaryWorld("Nevia", 1, 0, "inconclusive", {
      Deathstrike: 1,
      Gnomevil: 0,
      Abyssador: 0,
    }),
    summaryWorld("Quintera", 2, 0, "trolls", {
      Deathstrike: 1,
      Gnomevil: 0,
      Abyssador: 0,
    }),
    summaryWorld("Dia", 1, 0, "na"),
    summaryWorld("Yonabra", 1, 1, "healthy"),
    summaryWorld("Antica", 3, 1, "healthy"),
    summaryWorld("Ustebra", 4, 3, "healthy"),
    summaryWorld("Celesta", 1, 1, "healthy"),
    summaryWorld("Yubra", 2, 0, "na"),
    summaryWorld("Luminera", 3, 0, "na"),
  ];

  const model = shared.buildDailyWarzoneSummaryModel(worlds, {
    date: "2026-07-05",
    locale: "en",
  });
  const summaryText = shared.formatDailyWarzoneSummaryText(
    model,
    dailySummaryEnglishLabels
  );

  assert.equal(
    summaryText,
    [
      "Warzones on 2026-07-05",
      "",
      "Completed all scheduled Warzones: Belobra (2/2), Bona (1/1), Celesta (1/1) and Yonabra (1/1).",
      "Completed partially or with inconsistent data: Antica (1/3), Astera (1/4), Havera (1/1, uncertain), Nevia (0/1, uncertain), Quintera (0/2, warning) and Ustebra (3/4).",
      "Had scheduled service times but completed no Warzones: Calmera (0/2), Dia (0/1), Luminera (0/3), Wintera (0/2) and Yubra (0/2).",
    ].join("\n")
  );
});

test("daily Warzone summary uses locale-specific connector and marker labels", async () => {
  const shared = await loadSharedExports();
  const model = shared.buildDailyWarzoneSummaryModel(
    [
      summaryWorld("Antica", 1, 1, "healthy"),
      summaryWorld("Bona", 1, 1, "healthy"),
      summaryWorld("Havera", 1, 1, "inconclusive", {
        Deathstrike: 1,
        Gnomevil: 0,
        Abyssador: 0,
      }),
    ],
    {
      date: "2026-07-05",
      locale: "pt-BR",
    }
  );
  const summaryText = shared.formatDailyWarzoneSummaryText(model, {
    heading: (date) => `Warzones em ${date}`,
    categories: {
      completedAll: "Completaram tudo",
      partialOrInconsistent: "Parcial ou inconsistente",
      noneCompleted: "Nada concluido",
    },
    markers: {
      uncertain: "incerto",
      warning: "alerta",
    },
    connector: "e",
    none: "nenhum",
  });

  assert.match(summaryText, /Completaram tudo: Antica \(1\/1\) e Bona \(1\/1\)\./);
  assert.match(summaryText, /Parcial ou inconsistente: Havera \(1\/1, incerto\)\./);
});

test("daily Warzone summary labels the observed day, not the UTC collection day", async () => {
  const shared = await loadSharedExports();
  const worlds = [
    {
      ...summaryWorld("Antica", 2, 1, "healthy"),
      history_last_five_days: [
        { date: "2026-07-17", services_completed: 1 },
        { date: "2026-07-16", services_completed: 2 },
      ],
    },
  ];

  const model = shared.buildDailyWarzoneSummaryModel(worlds, { locale: "en" });

  assert.equal(model.date, "2026-07-16");
});
