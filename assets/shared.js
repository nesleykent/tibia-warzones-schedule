(function () {
  const DEFAULT_TIMEZONE = "America/Sao_Paulo#Curitiba";
  const GITHUB_REPO_URL =
    "https://github.com/nesleykent/tibia-warzones-schedule";
  const GITHUB_ISSUES_URL =
    "https://github.com/nesleykent/tibia-warzones-schedule/issues";
  const EXPECTED_RETURN_DOC_URL =
    "https://github.com/nesleykent/tibia-warzones-schedule/blob/main/Expected_Return_Explanation.md";
  const SITE_NAME = "Tibia Warzones Schedule";
  const SITE_FOOTER_COPYRIGHT =
    "© 2026 Tibia Warzones Schedule Contributors. All rights reserved.";
  const SITE_FOOTER_DISCLAIMER =
    "Tibia remains a registered trademark of CipSoft GmbH. All related names, assets, and content remain the property of CipSoft GmbH. This project operates independently and holds no affiliation, sponsorship, or endorsement from CipSoft GmbH or Tibia.com.";
  const STORAGE_KEY_LANGUAGE = "lang";
  const STORAGE_KEY_TIMEZONE = "tz";
  const SHARED_STORAGE_KEYS = {
    language: STORAGE_KEY_LANGUAGE,
    timezone: STORAGE_KEY_TIMEZONE,
  };
  const WORLDS_DATA_PATH = "./data/worlds.json";
  const MANUAL_SCHEDULES_PATH = "./data/manual-schedules.json";
  const SUPPORTED_TIMEZONES = [
    {
      group: "Americas",
      value: "America/Los_Angeles",
      label: "Los Angeles",
      short: "PDT",
      offset: "GMT-7",
    },
    {
      group: "Americas",
      value: "America/Tijuana",
      label: "Tijuana",
      short: "PDT",
      offset: "GMT-7",
    },
    {
      group: "Americas",
      value: "America/Denver",
      label: "Denver",
      short: "MDT",
      offset: "GMT-6",
    },
    {
      group: "Americas",
      value: "America/Mexico_City",
      label: "Mexico City",
      short: "CST",
      offset: "GMT-6",
    },
    {
      group: "Americas",
      value: "America/Bogota",
      label: "Bogotá",
      short: "COT",
      offset: "GMT-5",
    },
    {
      group: "Americas",
      value: "America/Cancun",
      label: "Cancún",
      short: "EST",
      offset: "GMT-5",
    },
    {
      group: "Americas",
      value: "America/Chicago",
      label: "Chicago",
      short: "CDT",
      offset: "GMT-5",
    },
    {
      group: "Americas",
      value: "America/Lima",
      label: "Lima",
      short: "PET",
      offset: "GMT-5",
    },
    {
      group: "Americas",
      value: "America/Rio_Branco",
      label: "Rio Branco",
      short: "ACT",
      offset: "GMT-5",
    },
    {
      group: "Americas",
      value: "America/Caracas",
      label: "Caracas",
      short: "VET",
      offset: "GMT-4",
    },
    {
      group: "Americas",
      value: "America/Cuiaba",
      label: "Cuiabá",
      short: "AMT",
      offset: "GMT-4",
    },
    {
      group: "Americas",
      value: "America/Manaus",
      label: "Manaus",
      short: "AMT",
      offset: "GMT-4",
    },
    {
      group: "Americas",
      value: "America/New_York",
      label: "New York",
      short: "EDT",
      offset: "GMT-4",
    },
    {
      group: "Americas",
      value: "America/Porto_Velho",
      label: "Porto Velho",
      short: "AMT",
      offset: "GMT-4",
    },
    {
      group: "Americas",
      value: "America/Santiago",
      label: "Santiago",
      short: "CLT",
      offset: "GMT-4",
    },
    {
      group: "Americas",
      value: "America/Argentina/Buenos_Aires",
      label: "Buenos Aires",
      short: "ART",
      offset: "GMT-3",
    },
    {
      group: "Americas",
      value: DEFAULT_TIMEZONE,
      timeZone: "America/Sao_Paulo",
      label: "Curitiba",
      short: "BRT",
      offset: "GMT-3",
    },
    {
      group: "Americas",
      value: "America/Bahia",
      label: "Xique-Xique",
      short: "BRT",
      offset: "GMT-3",
    },
    {
      group: "Americas",
      value: "America/Noronha",
      label: "Fernando de Noronha",
      short: "FNT",
      offset: "GMT-2",
    },
    {
      group: "Europe",
      value: "Europe/Lisbon",
      label: "Lisbon",
      short: "WEST",
      offset: "GMT+1",
    },
    {
      group: "Europe",
      value: "Europe/London",
      label: "London",
      short: "BST",
      offset: "GMT+1",
    },
    {
      group: "Europe",
      value: "Europe/Amsterdam",
      label: "Amsterdam",
      short: "CEST",
      offset: "GMT+2",
    },
    {
      group: "Europe",
      value: "Europe/Berlin",
      label: "Berlin",
      short: "CEST",
      offset: "GMT+2",
    },
    {
      group: "Europe",
      value: "Europe/Madrid",
      label: "Madrid",
      short: "CEST",
      offset: "GMT+2",
    },
    {
      group: "Europe",
      value: "Europe/Paris",
      label: "Paris",
      short: "CEST",
      offset: "GMT+2",
    },
    {
      group: "Europe",
      value: "Europe/Rome",
      label: "Rome",
      short: "CEST",
      offset: "GMT+2",
    },
    {
      group: "Europe",
      value: "Europe/Stockholm",
      label: "Stockholm",
      short: "CEST",
      offset: "GMT+2",
    },
    {
      group: "Europe",
      value: "Europe/Warsaw",
      label: "Warsaw",
      short: "CEST",
      offset: "GMT+2",
    },
    {
      group: "Europe",
      value: "Europe/Athens",
      label: "Athens",
      short: "EEST",
      offset: "GMT+3",
    },
    {
      group: "Europe",
      value: "Europe/Bucharest",
      label: "Bucharest",
      short: "EEST",
      offset: "GMT+3",
    },
    {
      group: "Europe",
      value: "Europe/Helsinki",
      label: "Helsinki",
      short: "EEST",
      offset: "GMT+3",
    },
    {
      group: "Europe",
      value: "Europe/Istanbul",
      label: "Istanbul",
      short: "TRT",
      offset: "GMT+3",
    },
    {
      group: "Europe",
      value: "Europe/Moscow",
      label: "Moscow",
      short: "MSK",
      offset: "GMT+3",
    },
    {
      group: "Asia / Pacific",
      value: "Asia/Dubai",
      label: "Dubai",
      short: "GST",
      offset: "GMT+4",
    },
    {
      group: "Asia / Pacific",
      value: "Asia/Kolkata",
      label: "Kolkata",
      short: "IST",
      offset: "GMT+5:30",
    },
    {
      group: "Asia / Pacific",
      value: "Asia/Singapore",
      label: "Singapore",
      short: "SGT",
      offset: "GMT+8",
    },
    {
      group: "Asia / Pacific",
      value: "Asia/Seoul",
      label: "Seoul",
      short: "KST",
      offset: "GMT+9",
    },
    {
      group: "Asia / Pacific",
      value: "Asia/Tokyo",
      label: "Tokyo",
      short: "JST",
      offset: "GMT+9",
    },
    {
      group: "Asia / Pacific",
      value: "Australia/Sydney",
      label: "Sydney",
      short: "AEST",
      offset: "GMT+10",
    },
    {
      group: "Asia / Pacific",
      value: "Pacific/Auckland",
      label: "Auckland",
      short: "NZST",
      offset: "GMT+12",
    },
  ];

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function setTextContent(element, value) {
    if (element) {
      element.textContent = value;
    }
  }

  function setHtml(element, html) {
    if (element) {
      element.innerHTML = html;
    }
  }

  function renderFilterPill({ active, group, label, value, isAll = false }) {
    const classes = ["filter-pill"];
    if (isAll) classes.push("filter-pill--all");
    if (active) classes.push("is-active");

    return `<button type="button" class="${classes.join(" ")}" aria-pressed="${
      active ? "true" : "false"
    }" data-filter-group="${escapeHtml(group)}" data-filter-value="${escapeHtml(
      value
    )}">${escapeHtml(label)}</button>`;
  }

  async function fetchJson(path) {
    const response = await fetch(path);
    if (!response.ok) {
      throw new Error(String(response.status));
    }

    return response.json();
  }

  function normalizeScheduleTimezone(value) {
    if (value == null) return null;
    const trimmed = String(value).trim();
    return trimmed || null;
  }

  function normalizeScheduleExecutions(executions) {
    if (!Array.isArray(executions)) return [];

    return executions
      .filter((entry) => entry && typeof entry === "object" && !Array.isArray(entry))
      .map((entry, index) => ({
        execution_id: Number(entry.execution_id) || index + 1,
        schedule_time: String(entry.schedule_time || "").trim(),
        warzone_sequence: String(entry.warzone_sequence || "").trim(),
      }));
  }

  function overlayWorldSchedules(worldsPayload, manualSchedulesPayload) {
    const worlds = Array.isArray(worldsPayload) ? worldsPayload : [];
    const schedules =
      manualSchedulesPayload &&
      typeof manualSchedulesPayload === "object" &&
      !Array.isArray(manualSchedulesPayload)
        ? manualSchedulesPayload
        : null;

    if (!schedules) return worlds;

    return worlds.map((world) => {
      if (!world || typeof world !== "object" || Array.isArray(world)) {
        return world;
      }

      const worldName = String(world.name || "").trim();
      const manualSchedule = schedules[worldName];
      if (
        !worldName ||
        !manualSchedule ||
        typeof manualSchedule !== "object" ||
        Array.isArray(manualSchedule)
      ) {
        return world;
      }

      const nextWorld = { ...world };
      if (Object.prototype.hasOwnProperty.call(manualSchedule, "timezone")) {
        nextWorld.timezone = normalizeScheduleTimezone(manualSchedule.timezone);
      }
      if (Object.prototype.hasOwnProperty.call(manualSchedule, "warzone_executions")) {
        nextWorld.warzone_executions = normalizeScheduleExecutions(
          manualSchedule.warzone_executions
        );
      }
      return nextWorld;
    });
  }

  async function loadWorldsData(options = {}) {
    const worldsPath = options.worldsPath || WORLDS_DATA_PATH;
    const schedulesPath = options.schedulesPath || MANUAL_SCHEDULES_PATH;
    const worldsPayload = await fetchJson(worldsPath);

    let manualSchedulesPayload = null;
    try {
      manualSchedulesPayload = await fetchJson(schedulesPath);
    } catch (error) {
      if (typeof console !== "undefined" && typeof console.warn === "function") {
        console.warn(
          `Failed to load ${schedulesPath}; falling back to schedule data embedded in ${worldsPath}.`,
          error
        );
      }
    }

    return overlayWorldSchedules(worldsPayload, manualSchedulesPayload);
  }

  function readStorage(key, fallbackValue = null) {
    try {
      const storedValue = localStorage.getItem(key);
      return storedValue ?? fallbackValue;
    } catch {
      return fallbackValue;
    }
  }

  function writeStorage(key, value) {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch {
      return false;
    }
  }

  function readJsonStorage(key, fallbackValue = null) {
    const storedValue = readStorage(key);
    if (storedValue == null) return fallbackValue;

    try {
      return JSON.parse(storedValue);
    } catch {
      return fallbackValue;
    }
  }

  function writeJsonStorage(key, value) {
    try {
      return writeStorage(key, JSON.stringify(value));
    } catch {
      return false;
    }
  }

  function findSupportedTimezoneEntry(tz) {
    return (
      SUPPORTED_TIMEZONES.find((item) => item.value === tz) ||
      SUPPORTED_TIMEZONES.find((item) => item.timeZone === tz) ||
      null
    );
  }

  function pickRandomItem(items) {
    if (!Array.isArray(items) || items.length === 0) return null;
    return items[Math.floor(Math.random() * items.length)];
  }

  function getInitialLanguage(supportedLanguages, fallbackLanguage = "pt-BR") {
    const availableLanguages =
      supportedLanguages && typeof supportedLanguages === "object"
        ? supportedLanguages
        : {};
    const savedLanguage = readStorage(STORAGE_KEY_LANGUAGE);

    if (savedLanguage && availableLanguages[savedLanguage]) {
      return savedLanguage;
    }

    const browserLanguage = navigator.language || fallbackLanguage;
    if (browserLanguage.startsWith("pt") && availableLanguages["pt-BR"]) {
      return "pt-BR";
    }
    if (browserLanguage.startsWith("es") && availableLanguages["es-419"]) {
      return "es-419";
    }
    if (browserLanguage.startsWith("pl") && availableLanguages.pl) {
      return "pl";
    }
    if (availableLanguages.en) {
      return "en";
    }

    return fallbackLanguage;
  }

  function getBrowserTimezone() {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    } catch {
      return "UTC";
    }
  }

  function loadSavedTimezone() {
    return (
      readStorage(STORAGE_KEY_TIMEZONE, DEFAULT_TIMEZONE) || DEFAULT_TIMEZONE
    );
  }

  function getWorldBattleyeKey(world) {
    if (world?.battleye_date === "release") return "GBE";
    if (world?.battleye_date) return "YBE";
    return "none";
  }

  function getWorldBattleyeLabel(world, fallbackLabel = "N/A") {
    const key = getWorldBattleyeKey(world);
    if (key === "GBE") return "GBE";
    if (key === "YBE") return "YBE";
    return fallbackLabel;
  }

  function formatTransferType(transferType, fallbackLabel = "N/A") {
    const value = String(transferType || "")
      .trim()
      .toLowerCase();

    if (!value) return fallbackLabel;
    if (value === "regular") return "Regular Transfer";
    if (value === "blocked") return "Blocked Transfer";
    if (value === "locked") return "Locked Transfer";
    return `${value.charAt(0).toUpperCase()}${value.slice(1)} Transfer`;
  }

  function getWorldTransferLabel(world, fallbackLabel = "N/A") {
    return formatTransferType(world?.transfer_type, fallbackLabel);
  }

  function getWorldRegionKey(world) {
    return String(world?.location || "").trim() || "unknown";
  }

  function getWorldPvpKey(world) {
    return String(world?.pvp_type || "").trim() || "unknown";
  }

  function getWorldTransferKey(world) {
    const value = String(world?.transfer_type || "")
      .trim()
      .toLowerCase();

    if (!value) return "locked";
    if (value === "regular") return "regular";
    if (value === "blocked") return "blocked";
    return value;
  }

  function getNormalizedBossKills(kills) {
    const source = kills && typeof kills === "object" ? kills : {};

    return {
      deathstrike: Number(source.Deathstrike ?? source.deathstrike ?? 0),
      gnomevil: Number(source.Gnomevil ?? source.gnomevil ?? 0),
      abyssador: Number(source.Abyssador ?? source.abyssador ?? 0),
    };
  }

  function getEffectiveWorldMark(mark, kills) {
    const totals = getNormalizedBossKills(kills);
    const hasNoActivity =
      totals.deathstrike === 0 &&
      totals.gnomevil === 0 &&
      totals.abyssador === 0;

    if (hasNoActivity) return "na";
    return String(mark || "inconclusive");
  }

  function getWorldMarkLabel(mark, labels = {}) {
    if (mark === "na") return labels.notAvailable || "N/A";
    if (mark === "healthy") return labels.healthy || "Healthy";
    if (mark === "trolls") return labels.trolls || "Trolls";
    return labels.inconclusive || "Inconclusive";
  }

  const DAILY_SUMMARY_CATEGORY_ORDER = [
    "completedAll",
    "partialOrInconsistent",
    "noneCompleted",
  ];
  const DAILY_SUMMARY_WARNING_MARKERS = {
    inconclusive: "uncertain",
    trolls: "warning",
  };

  function normalizeDailySummaryCount(value) {
    const count = Number(value);
    if (!Number.isFinite(count) || count < 0) return 0;
    return Math.floor(count);
  }

  function isIsoDateStamp(value) {
    return /^\d{4}-\d{2}-\d{2}$/.test(String(value || "").trim());
  }

  function formatLocalDateStamp(value = new Date()) {
    if (typeof value === "string" && isIsoDateStamp(value)) return value;

    const date = value instanceof Date ? value : new Date(value);
    const safeDate = Number.isNaN(date.getTime()) ? new Date() : date;
    const year = String(safeDate.getFullYear());
    const month = String(safeDate.getMonth() + 1).padStart(2, "0");
    const day = String(safeDate.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function getDailySummaryHistoryDates(world) {
    const dates = [];
    const rankingHistory =
      world?.warzone_economic_ranking?.history_last_five_days;
    const directHistory = world?.history_last_five_days;

    [rankingHistory, directHistory].forEach((history) => {
      if (!Array.isArray(history)) return;
      history.forEach((entry) => {
        const date = String(entry?.date || "").trim();
        if (isIsoDateStamp(date)) dates.push(date);
      });
    });

    return dates;
  }

  function resolveDailyWarzoneSummaryDate(worldsPayload, fallbackDate = new Date()) {
    const worlds = Array.isArray(worldsPayload) ? worldsPayload : [];
    const dates = worlds.flatMap(getDailySummaryHistoryDates);
    if (dates.length > 0) return dates.sort().at(-1);
    return formatLocalDateStamp(fallbackDate);
  }

  function getDailySummaryWarningMarker(world) {
    const effectiveMark = getEffectiveWorldMark(
      world?.mark,
      world?.last_detected_kills
    );
    return DAILY_SUMMARY_WARNING_MARKERS[effectiveMark] || null;
  }

  function buildDailyWarzoneSummaryModel(worldsPayload, options = {}) {
    const categories = Object.fromEntries(
      DAILY_SUMMARY_CATEGORY_ORDER.map((key) => [key, []])
    );
    const worlds = Array.isArray(worldsPayload) ? worldsPayload : [];
    const locale = options.locale || undefined;

    worlds.forEach((world) => {
      if (!world || typeof world !== "object" || Array.isArray(world)) return;

      const worldName = String(world.name || "").trim();
      const scheduledTimes = Array.isArray(world.warzone_executions)
        ? world.warzone_executions.length
        : 0;
      if (!worldName || scheduledTimes <= 0) return;

      const completedWarzones = normalizeDailySummaryCount(
        world.last_detected_services
      );
      const warningMarker = getDailySummaryWarningMarker(world);
      const summaryItem = {
        name: worldName,
        completedWarzones,
        scheduledTimes,
        warningMarker,
      };

      if (
        warningMarker ||
        (completedWarzones > 0 && completedWarzones !== scheduledTimes)
      ) {
        categories.partialOrInconsistent.push(summaryItem);
      } else if (completedWarzones === scheduledTimes) {
        categories.completedAll.push(summaryItem);
      } else {
        categories.noneCompleted.push(summaryItem);
      }
    });

    Object.values(categories).forEach((items) => {
      items.sort((left, right) => left.name.localeCompare(right.name, locale));
    });

    return {
      date:
        typeof options.date === "string" && isIsoDateStamp(options.date)
          ? options.date
          : resolveDailyWarzoneSummaryDate(worlds, options.fallbackDate),
      categories: DAILY_SUMMARY_CATEGORY_ORDER.map((key) => ({
        key,
        items: categories[key],
      })),
    };
  }

  function formatNaturalLanguageList(items, connector) {
    if (!Array.isArray(items) || items.length === 0) return "";
    if (items.length === 1) return items[0];
    if (items.length === 2) return `${items[0]} ${connector} ${items[1]}`;

    const leadingItems = items.slice(0, -1).join(", ");
    return `${leadingItems} ${connector} ${items.at(-1)}`;
  }

  function formatDailySummaryItem(item, labels) {
    const markerLabel = item.warningMarker
      ? labels.markers?.[item.warningMarker]
      : "";
    const markerSuffix = markerLabel ? `, ${markerLabel}` : "";
    return `${item.name} (${item.completedWarzones}/${item.scheduledTimes}${markerSuffix})`;
  }

  function formatDailyWarzoneSummaryText(model, labels) {
    const heading =
      typeof labels.heading === "function"
        ? labels.heading(model.date)
        : String(labels.heading || model.date || "");
    const lines = [heading, ""];
    const categoryLabels = labels.categories || {};

    model.categories.forEach((category) => {
      const formattedItems = category.items.map((item) =>
        formatDailySummaryItem(item, labels)
      );
      const listText =
        formattedItems.length > 0
          ? formatNaturalLanguageList(formattedItems, labels.connector)
          : labels.none;

      lines.push(`${categoryLabels[category.key]}: ${listText}.`);
    });

    return lines.join("\n");
  }

  function getDateTimeParts(date, timeZone, options = {}) {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      ...options,
    }).formatToParts(date);
  }

  function getPartsMap(parts) {
    return Object.fromEntries(
      parts
        .filter((part) => part.type !== "literal")
        .map((part) => [part.type, part.value])
    );
  }

  function getTimezoneOffsetLabel(tz, referenceDate = new Date()) {
    const resolvedTimezone = resolveTimezoneValue(tz);
    try {
      const parts = new Intl.DateTimeFormat("en", {
        timeZone: resolvedTimezone,
        timeZoneName: "longOffset",
      }).formatToParts(referenceDate);
      const value =
        parts.find((part) => part.type === "timeZoneName")?.value || "GMT";
      return value.replace("GMT", "UTC");
    } catch {
      return "UTC";
    }
  }

  function getTimezoneShortLabel(tz, referenceDate = new Date()) {
    const resolvedTimezone = resolveTimezoneValue(tz);
    try {
      const parts = new Intl.DateTimeFormat("en", {
        timeZone: resolvedTimezone,
        timeZoneName: "short",
      }).formatToParts(referenceDate);
      const value = parts.find((part) => part.type === "timeZoneName")?.value || "";
      return value.replace(/^GMT([+-]\d{1,2})(?::\d{2})?$/, "UTC$1");
    } catch {
      return "";
    }
  }

  function formatCompactGmtOffset(value) {
    return String(value || "UTC")
      .replace("UTC", "GMT")
      .replace(/:00$/, "")
      .replace(/([+-])0(\d)$/, "$1$2");
  }

  function getTimezoneLocationLabel(tz) {
    const entry = findSupportedTimezoneEntry(tz);
    if (entry?.label) return entry.label;
    return resolveTimezoneValue(tz) || String(tz || "UTC");
  }

  function getTimezoneContextLabel(tz, referenceDate = new Date()) {
    return `${getTimezoneLocationLabel(tz)} (${formatCompactGmtOffset(
      getTimezoneOffsetLabel(tz, referenceDate)
    )})`;
  }

  function getTimezoneDisplayLabel(tz, referenceDate = new Date()) {
    const entry = findSupportedTimezoneEntry(tz);
    const shortLabel = getTimezoneShortLabel(tz, referenceDate);
    const offsetRaw = getTimezoneOffsetLabel(tz, referenceDate);
    const offsetCompact = formatCompactGmtOffset(offsetRaw);
    const normalizedShort = shortLabel
      .replace("UTC", "GMT")
      .replace(/:00$/, "")
      .replace(/([+-])0(\d)$/, "$1$2");

    if (entry) {
      return shortLabel && normalizedShort !== offsetCompact
        ? `${entry.label} (${shortLabel}, ${offsetCompact})`
        : `${entry.label} (${offsetCompact})`;
    }
    return `${tz} (${offsetCompact})`;
  }

  function resolveTimezoneValue(tz) {
    const entry = findSupportedTimezoneEntry(tz);
    return entry?.timeZone || tz;
  }

  function initBackgroundArtwork() {
    const layer = document.getElementById("bg-layer");
    if (!layer) return;

    const artworks = String(layer.dataset.artworks || "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

    if (artworks.length === 0) return;

    const applyArtwork = (fileName) => {
      layer.style.backgroundImage = `url(assets/background/${fileName})`;
      layer.style.opacity = "1";
    };

    const initialPick = pickRandomItem(artworks);
    const image = new Image();

    image.onload = () => applyArtwork(initialPick);
    image.onerror = () => {
      const remaining = artworks.filter((artwork) => artwork !== initialPick);
      if (remaining.length > 0) {
        applyArtwork(pickRandomItem(remaining));
      }
    };

    layer.style.opacity = "0";
    image.src = `assets/background/${initialPick}`;
  }

  function renderSiteFooter() {
    return `
      <div class="container site-footer-inner">
        <div class="footer-top">
          <div class="footer-brand">
            <a href="${GITHUB_REPO_URL}" target="_blank" rel="noopener noreferrer" class="footer-link">
              <img
                class="footer-icon"
                src="./assets/logo/logo.png"
                alt="Tibia Warzones logo"
              />
            </a>
            <a href="${GITHUB_REPO_URL}" target="_blank" rel="noopener noreferrer" class="footer-link footer-brand-name">${SITE_NAME}</a>
          </div>

          <div class="footer-sep-v" aria-hidden="true"></div>

          <div class="footer-notice">
            <p>
              A community maintained schedule for Warzone services across multiple worlds. Data derives from kill statistics of Deathstrike, Gnomevil, and Abyssador, combined with verified player reports. Schedules reflect observed patterns and may vary due to delays, in game events, disruptive activity, or shifts in world conditions. Service availability follows current game mechanics and world rules. The Expected Return metric follows a standardized methodology for cross-world comparison and profitability assessment. Full documentation is available at <a href="${EXPECTED_RETURN_DOC_URL}" target="_blank" rel="noopener noreferrer" class="footer-link">GitHub</a>.
            </p>
            <p>
              Sources and acknowledgments include
              <a href="https://www.tibia.com" target="_blank" rel="noopener noreferrer" class="footer-link">Tibia.com</a>,
              <a href="https://www.cipsoft.com" target="_blank" rel="noopener noreferrer" class="footer-link">CipSoft GmbH</a>,
              <a href="https://tibiadata.com" target="_blank" rel="noopener noreferrer" class="footer-link">TibiaData</a>,
              <a href="https://www.tibiamarket.top" target="_blank" rel="noopener noreferrer" class="footer-link">TibiaMarket.top</a>,
              <a href="https://www.exevopan.com" target="_blank" rel="noopener noreferrer" class="footer-link">Exevo Pan</a>,
              and
              <a href="https://youtube.com/@warzoneirostibia" target="_blank" rel="noopener noreferrer" class="footer-link">Warzoneiros Tibia</a>.
              Community input sustains accuracy through continuous updates and validation. Want to fix or share a schedule? Use
              <a href="${GITHUB_ISSUES_URL}" target="_blank" rel="noopener noreferrer" class="footer-link">GitHub Issues</a>.
            </p>
          </div>

          <a
            href="${GITHUB_ISSUES_URL}"
            target="_blank"
            rel="noopener noreferrer"
            class="footer-gh-btn"
            aria-label="Report on GitHub Issues"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"
              />
            </svg>
            Report on GitHub
          </a>
        </div>

        <div class="footer-bottom">
          <span class="footer-copy">${SITE_FOOTER_COPYRIGHT}</span>
          <span class="footer-disclaimer">${SITE_FOOTER_DISCLAIMER}</span>
        </div>
      </div>
    `;
  }

  function initSiteFooter() {
    const footer = document.querySelector("[data-site-footer]");
    if (!footer) return;
    setHtml(footer, renderSiteFooter());
  }

  function initLanguageDropdown() {
    const button = document.getElementById("langMenuBtn");
    const menu = document.getElementById("langMenu");
    const wrapper = document.getElementById("langDropdown");

    if (!button || !menu || !wrapper) return;

    const openMenu = () => {
      menu.classList.add("is-open");
      button.setAttribute("aria-expanded", "true");
    };

    const closeMenu = () => {
      menu.classList.remove("is-open");
      button.setAttribute("aria-expanded", "false");
    };

    const toggleMenu = () => {
      if (menu.classList.contains("is-open")) {
        closeMenu();
        return;
      }

      openMenu();
    };

    button.addEventListener("click", (event) => {
      event.stopPropagation();
      toggleMenu();
    });

    document.addEventListener("click", (event) => {
      if (!wrapper.contains(event.target)) {
        closeMenu();
      }
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        closeMenu();
      }
    });
  }

  function updateLanguageButtons(activeLanguage) {
    document.querySelectorAll(".lang-flag").forEach((button) => {
      const isActive = button.dataset.lang === activeLanguage;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-pressed", isActive ? "true" : "false");
    });
  }

  function bindLanguageButtons(onSelectLanguage) {
    if (typeof onSelectLanguage !== "function") return;

    document.querySelectorAll(".lang-flag").forEach((button) => {
      button.addEventListener("click", () => {
        const nextLanguage = button.dataset.lang;
        if (nextLanguage) {
          onSelectLanguage(nextLanguage);
        }
      });
    });
  }

  function initBackLinks() {
    const backLinks = document.querySelectorAll("[data-back-link]");
    if (backLinks.length === 0) return;

    let sameOriginReferrer = null;
    try {
      if (document.referrer) {
        const referrerUrl = new URL(document.referrer, window.location.href);
        if (referrerUrl.origin === window.location.origin) {
          sameOriginReferrer = `${referrerUrl.pathname}${referrerUrl.search}${referrerUrl.hash}`;
        }
      }
    } catch {
      sameOriginReferrer = null;
    }

    backLinks.forEach((link) => {
      if (!(link instanceof HTMLAnchorElement)) return;

      const fallbackHref =
        link.dataset.defaultHref || link.getAttribute("href") || "./index.html";

      link.setAttribute("href", sameOriginReferrer || fallbackHref);

      link.addEventListener("click", (event) => {
        if (
          event.defaultPrevented ||
          event.button !== 0 ||
          event.metaKey ||
          event.ctrlKey ||
          event.shiftKey ||
          event.altKey
        ) {
          return;
        }

        if (sameOriginReferrer && window.history.length > 1) {
          event.preventDefault();
          window.history.back();
        }
      });
    });
  }

  function initSharedUi() {
    initSiteFooter();
    initBackgroundArtwork();
    initLanguageDropdown();
    initBackLinks();
  }

  function buildRecurringTimeConversion(
    scheduleTime,
    sourceTimezone,
    targetTimezone,
    referenceDate = new Date()
  ) {
    if (!scheduleTime || !sourceTimezone || !targetTimezone) return null;
    if (String(scheduleTime).includes("?")) return null;

    const resolvedSourceTimezone = resolveTimezoneValue(sourceTimezone);
    const resolvedTargetTimezone = resolveTimezoneValue(targetTimezone);
    const parts = String(scheduleTime).split(":");
    if (parts.length !== 2) return null;
    const hour = Number(parts[0]);
    const minute = Number(parts[1]);
    if (Number.isNaN(hour) || Number.isNaN(minute)) return null;

    const sourceReferenceParts = getPartsMap(
      getDateTimeParts(referenceDate, resolvedSourceTimezone, {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hourCycle: "h23",
      })
    );
    const sourceWallClockUtc = Date.UTC(
      Number(sourceReferenceParts.year),
      Number(sourceReferenceParts.month) - 1,
      Number(sourceReferenceParts.day),
      hour,
      minute,
      0
    );
    const probeDate = new Date(sourceWallClockUtc);
    const offsetText =
      new Intl.DateTimeFormat("en", {
        timeZone: resolvedSourceTimezone,
        timeZoneName: "longOffset",
      })
        .formatToParts(probeDate)
        .find((part) => part.type === "timeZoneName")?.value || "GMT+00:00";
    const normalized = offsetText.replace("GMT", "");
    const match = normalized.match(/^([+-])(\d{2}):(\d{2})$/);
    let offMin = 0;
    if (match) {
      const sign = match[1] === "-" ? -1 : 1;
      offMin = sign * (Number(match[2]) * 60 + Number(match[3]));
    }

    const actualDate = new Date(sourceWallClockUtc - offMin * 60 * 1000);
    const sourceParts = getPartsMap(
      getDateTimeParts(actualDate, resolvedSourceTimezone, {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hourCycle: "h23",
      })
    );
    const targetParts = getPartsMap(
      getDateTimeParts(actualDate, resolvedTargetTimezone, {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hourCycle: "h23",
      })
    );
    const sourceDayUtc = Date.UTC(
      Number(sourceParts.year),
      Number(sourceParts.month) - 1,
      Number(sourceParts.day)
    );
    const targetDayUtc = Date.UTC(
      Number(targetParts.year),
      Number(targetParts.month) - 1,
      Number(targetParts.day)
    );

    return {
      actualDate,
      dayOffset: Math.round((targetDayUtc - sourceDayUtc) / 86400000),
      sourceTime: `${sourceParts.hour}:${sourceParts.minute}`,
      targetTime: `${targetParts.hour}:${targetParts.minute}`,
    };
  }

  function convertTimeBetweenTimezones(
    scheduleTime,
    sourceTimezone,
    targetTimezone,
    locale,
    options = {}
  ) {
    if (!scheduleTime || !sourceTimezone || !targetTimezone)
      return scheduleTime || "";
    if (String(scheduleTime).includes("?")) return String(scheduleTime);
    const conversion = buildRecurringTimeConversion(
      scheduleTime,
      sourceTimezone,
      targetTimezone,
      options.referenceDate
    );
    if (!conversion) return scheduleTime;

    const resolvedTargetTimezone = resolveTimezoneValue(targetTimezone);

    try {
      return new Intl.DateTimeFormat(locale || "en", {
        timeZone: resolvedTargetTimezone,
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
      }).format(conversion.actualDate);
    } catch {
      return scheduleTime;
    }
  }

  function formatObservedKillStatisticsDate(isoDate) {
    if (typeof isoDate !== "string") return "";
    const trimmed = isoDate.trim();
    if (!trimmed) return "";
    const match = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return trimmed;

    const year = Number(match[1]);
    const monthIndex = Number(match[2]) - 1;
    const day = Number(match[3]);
    const date = new Date(Date.UTC(year, monthIndex, day));
    if (Number.isNaN(date.getTime())) return trimmed;

    date.setUTCDate(date.getUTCDate() - 1);
    return date.toISOString().slice(0, 10);
  }

  window.TibiaTime = {
    GITHUB_ISSUES_URL,
    WORLDS_DATA_PATH,
    MANUAL_SCHEDULES_PATH,
    SUPPORTED_TIMEZONES,
    DEFAULT_TIMEZONE,
    SHARED_STORAGE_KEYS,
    escapeHtml,
    setTextContent,
    setHtml,
    renderFilterPill,
    fetchJson,
    loadWorldsData,
    overlayWorldSchedules,
    readStorage,
    writeStorage,
    readJsonStorage,
    writeJsonStorage,
    getInitialLanguage,
    getBrowserTimezone,
    loadSavedTimezone,
    getTimezoneOffsetLabel,
    getTimezoneShortLabel,
    getTimezoneLocationLabel,
    getTimezoneContextLabel,
    getTimezoneDisplayLabel,
    resolveTimezoneValue,
    getWorldBattleyeKey,
    getWorldBattleyeLabel,
    formatTransferType,
    getWorldTransferLabel,
    getWorldRegionKey,
    getWorldPvpKey,
    getWorldTransferKey,
    getNormalizedBossKills,
    getEffectiveWorldMark,
    getWorldMarkLabel,
    buildDailyWarzoneSummaryModel,
    formatDailyWarzoneSummaryText,
    formatNaturalLanguageList,
    buildRecurringTimeConversion,
    convertTimeBetweenTimezones,
    formatObservedKillStatisticsDate,
    initBackgroundArtwork,
    initSiteFooter,
    initLanguageDropdown,
    updateLanguageButtons,
    bindLanguageButtons,
    initBackLinks,
    initSharedUi,
  };
})();
