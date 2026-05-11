const {
  escapeHtml,
  fetchJson,
  initSharedUi,
  setHtml,
} = window.TibiaTime;

const OPEN_HOUSES_DATA_PATH = "./data/open-houses.json";
const STORAGE_KEY = "openHouseFilters";
const OPEN_DOOR_REGEX =
  /^You see an open door\. It belongs to house '([^']+)'\. (.+?) owns this house\.$/;
const DEFAULT_FILTERS = {
  houseName: "",
  ownerName: "",
  world: "all",
  town: "all",
  hireling: "all",
  freshness: "active",
  includeStale: false,
  exerciseDummies: false,
  mailbox: false,
  rewardShrine: false,
  imbuingShrine: false,
  sort: "newest",
};
const UTILITY_FILTERS = [
  { key: "includeStale", label: "Include stale and expired" },
  { key: "exerciseDummies", label: "Exercise dummies" },
  { key: "mailbox", label: "Mailbox" },
  { key: "rewardShrine", label: "Reward shrine" },
  { key: "imbuingShrine", label: "Imbuing shrine" },
];

const elements = {};
let allReports = [];
let filterState = loadFilterState();

function loadFilterState() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return { ...DEFAULT_FILTERS };
    return { ...DEFAULT_FILTERS, ...JSON.parse(stored) };
  } catch {
    return { ...DEFAULT_FILTERS };
  }
}

function persistFilterState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filterState));
  } catch {}
}

function normalizeText(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function slugify(value) {
  return normalizeText(value)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function parseDoorLog(log) {
  const source = String(log || "").trim();
  const match = source.match(OPEN_DOOR_REGEX);
  if (!match) {
    throw new Error("Door log does not match the supported open door pattern.");
  }

  const houseName = match[1].trim();
  const ownerName = match[2].trim();

  if (!houseName) {
    throw new Error("House name cannot be empty.");
  }

  if (!ownerName) {
    throw new Error("Owner name cannot be empty.");
  }

  return {
    isOpenDoor: true,
    houseName,
    ownerName,
  };
}

function getAgeInDays(isoDate) {
  const timestamp = Date.parse(isoDate);
  if (!Number.isFinite(timestamp)) return Number.POSITIVE_INFINITY;
  return Math.floor((Date.now() - timestamp) / 86400000);
}

function getFreshnessBucket(report) {
  const ageInDays = getAgeInDays(report.lastSeenOpen);
  if (ageInDays <= 6) return "fresh";
  if (ageInDays <= 13) return "stale";
  return "expired";
}

function isDefaultVisible(report) {
  return getFreshnessBucket(report) !== "expired";
}

function formatFreshness(report) {
  const bucket = getFreshnessBucket(report);
  if (bucket === "fresh") return "Fresh";
  if (bucket === "stale") return "Stale";
  return "Expired";
}

function formatDate(isoDate) {
  const timestamp = Date.parse(isoDate);
  if (!Number.isFinite(timestamp)) return "Unknown";
  return new Intl.DateTimeFormat("en", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  }).format(new Date(timestamp));
}

function formatConfidence(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return "N/A";
  return numeric.toFixed(2);
}

function readUtilityLabel(flag, label) {
  return flag ? label : null;
}

function getUtilityTags(report) {
  const utilities = report.utilities || {};
  const tags = [
    readUtilityLabel(utilities.exerciseDummies, "Exercise dummies"),
    readUtilityLabel(utilities.mailbox, "Mailbox"),
    readUtilityLabel(utilities.rewardShrine, "Reward shrine"),
    readUtilityLabel(utilities.imbuingShrine, "Imbuing shrine"),
  ].filter(Boolean);

  const hirelings = Array.isArray(utilities.hirelings)
    ? utilities.hirelings.map((entry) => entry.type).filter(Boolean)
    : [];

  if (hirelings.length > 0) {
    tags.push(`Hirelings: ${hirelings.join(", ")}`);
  }

  return tags;
}

function buildSearchHaystack(report) {
  return normalizeText(
    [
      report.houseName,
      report.world,
      report.town,
      report.ownerName,
      report.source?.log,
      report.source?.notes,
    ].join(" ")
  );
}

function matchesFreshness(report) {
  const bucket = getFreshnessBucket(report);
  const filter = filterState.freshness;

  if (!filterState.includeStale && !isDefaultVisible(report)) {
    return false;
  }

  if (filter === "all") return filterState.includeStale || isDefaultVisible(report);
  if (filter === "active") return bucket === "fresh" || bucket === "stale";
  return bucket === filter;
}

function matchesUtilityFilters(report) {
  const utilities = report.utilities || {};
  if (filterState.exerciseDummies && !utilities.exerciseDummies) return false;
  if (filterState.mailbox && !utilities.mailbox) return false;
  if (filterState.rewardShrine && !utilities.rewardShrine) return false;
  if (filterState.imbuingShrine && !utilities.imbuingShrine) return false;

  if (filterState.hireling !== "all") {
    const hirelings = Array.isArray(utilities.hirelings) ? utilities.hirelings : [];
    const hasMatch = hirelings.some(
      (entry) => normalizeText(entry.type) === normalizeText(filterState.hireling)
    );
    if (!hasMatch) return false;
  }

  return true;
}

function filterReports(reports) {
  return reports.filter((report) => {
    const houseName = normalizeText(filterState.houseName);
    if (houseName && !normalizeText(report.houseName).includes(houseName)) {
      return false;
    }

    const ownerName = normalizeText(filterState.ownerName);
    if (ownerName && !normalizeText(report.ownerName).includes(ownerName)) {
      return false;
    }

    if (
      filterState.world !== "all" &&
      normalizeText(report.world) !== normalizeText(filterState.world)
    ) {
      return false;
    }

    if (
      filterState.town !== "all" &&
      normalizeText(report.town) !== normalizeText(filterState.town)
    ) {
      return false;
    }

    if (!matchesFreshness(report)) {
      return false;
    }

    return matchesUtilityFilters(report);
  });
}

function sortReports(reports) {
  const items = [...reports];
  items.sort((left, right) => {
    if (filterState.sort === "world") {
      return (
        left.world.localeCompare(right.world) ||
        left.town.localeCompare(right.town) ||
        left.houseName.localeCompare(right.houseName)
      );
    }

    if (filterState.sort === "town") {
      return (
        left.town.localeCompare(right.town) ||
        left.world.localeCompare(right.world) ||
        left.houseName.localeCompare(right.houseName)
      );
    }

    if (filterState.sort === "house") {
      return (
        left.houseName.localeCompare(right.houseName) ||
        left.world.localeCompare(right.world)
      );
    }

    if (filterState.sort === "confidence") {
      return (
        Number(right.confidence || 0) - Number(left.confidence || 0) ||
        Date.parse(right.lastSeenOpen || 0) - Date.parse(left.lastSeenOpen || 0)
      );
    }

    return Date.parse(right.lastSeenOpen || 0) - Date.parse(left.lastSeenOpen || 0);
  });
  return items;
}

function groupReportsByWorld(reports) {
  const groups = new Map();

  reports.forEach((report) => {
    const key = report.world || "Unknown";
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key).push(report);
  });

  return [...groups.entries()]
    .sort(([leftWorld], [rightWorld]) => leftWorld.localeCompare(rightWorld))
    .map(([world, items]) => ({
      world,
      items,
    }));
}

function populateSelect(select, values, selectedValue, label) {
  const options = [`<option value="all">${escapeHtml(label)}</option>`];
  values.forEach((value) => {
    const selected = value === selectedValue ? ' selected="selected"' : "";
    options.push(
      `<option value="${escapeHtml(value)}"${selected}>${escapeHtml(value)}</option>`
    );
  });
  setHtml(select, options.join(""));
}

function renderUtilityFilters() {
  const markup = `
    <div class="filter-pills-row">
      ${UTILITY_FILTERS.map(({ key, label }) => {
        const isActive = Boolean(filterState[key]);
        return `
          <button
            type="button"
            class="filter-pill${isActive ? " is-active" : ""}"
            data-utility-filter="${escapeHtml(key)}"
            aria-pressed="${isActive ? "true" : "false"}"
          >
            ${escapeHtml(label)}
          </button>
        `;
      }).join("")}
    </div>
  `;

  setHtml(elements.utilityFilters, markup);

  elements.utilityFilters
    .querySelectorAll("[data-utility-filter]")
    .forEach((button) => {
      button.addEventListener("click", () => {
        const key = button.dataset.utilityFilter;
        if (!key) return;
        filterState[key] = !filterState[key];
        render();
      });
    });
}

function renderSummary(reports) {
  const fresh = reports.filter((report) => getFreshnessBucket(report) === "fresh").length;
  const stale = reports.filter((report) => getFreshnessBucket(report) === "stale").length;
  const expired = reports.filter((report) => getFreshnessBucket(report) === "expired").length;

  setHtml(
    elements.summary,
    `<p class="summary-text">${reports.length} open house reports loaded. ${fresh} fresh, ${stale} stale, ${expired} expired.</p>`
  );
}

function renderCards(reports) {
  if (reports.length === 0) {
    setHtml(
      elements.cards,
      `<div class="empty-state">No open houses match the current filters.</div>`
    );
    return;
  }

  const markup = groupReportsByWorld(reports)
    .map(({ world, items }) => {
      const cards = items
        .map((report) => {
          const utilities = getUtilityTags(report)
            .map((tag) => `<span class="open-house-chip">${escapeHtml(tag)}</span>`)
            .join("");
          const freshness = formatFreshness(report);
          const sourceUrl = report.source?.url
            ? `<a class="history-link" href="${escapeHtml(report.source.url)}" target="_blank" rel="noopener noreferrer">Source link</a>`
            : `<span class="open-house-muted">Source unavailable</span>`;
          const screenshotUrl = report.source?.screenshotUrl
            ? `<a class="history-link" href="${escapeHtml(report.source.screenshotUrl)}" target="_blank" rel="noopener noreferrer">Screenshot</a>`
            : "";

          return `
            <article class="world-card open-house-card">
              <h2>
                <span class="world-name">${escapeHtml(report.houseName)}</span>
                <span class="badge">${escapeHtml(freshness)}</span>
              </h2>
              <div class="world-meta open-house-meta">
                <span>${escapeHtml(report.town)}</span>
                <span>${escapeHtml(report.ownerName)}</span>
                <span>Confidence ${escapeHtml(formatConfidence(report.confidence))}</span>
                <span>${escapeHtml(formatDate(report.lastSeenOpen))}</span>
              </div>
              <div class="executions">
                <div class="executions-header">
                  <h3>Utilities</h3>
                  ${sourceUrl}
                </div>
                <div class="open-house-chip-row">${utilities || `<span class="open-house-muted">No utilities listed</span>`}</div>
                <p class="open-house-log">${escapeHtml(report.source?.log || "")}</p>
                ${screenshotUrl ? `<div class="open-house-links">${screenshotUrl}</div>` : ""}
              </div>
            </article>
          `;
        })
        .join("");

      return `
        <section class="world-detail-card open-house-world-group">
          <div class="world-detail-card-header">
            <h2>${escapeHtml(world)}</h2>
            <a
              class="history-link"
              href="https://github.com/nesleykent/tibia-warzones-schedule/issues/new?template=open-house.yml"
              target="_blank"
              rel="noopener noreferrer"
            >
              ${items.length} house${items.length === 1 ? "" : "s"}
            </a>
          </div>
          <div class="worlds-list open-house-worlds-list">${cards}</div>
        </section>
      `;
    })
    .join("");

  setHtml(elements.cards, markup);
}

function syncControls() {
  elements.searchInput.value = filterState.houseName;
  elements.ownerSearchInput.value = filterState.ownerName;
  elements.freshnessFilter.value = filterState.freshness;
  elements.sortFilter.value = filterState.sort;
}

function render() {
  const reports = sortReports(filterReports(allReports));
  renderSummary(allReports);
  renderUtilityFilters();
  renderCards(reports);
  persistFilterState();
}

function normalizeReport(rawReport) {
  const parsedLog = parseDoorLog(rawReport?.source?.log || "");
  const source = rawReport.source || {};
  const utilities = rawReport.utilities || {};
  const hirelings = Array.isArray(utilities.hirelings) ? utilities.hirelings : [];

  return {
    id:
      rawReport.id ||
      [rawReport.world, parsedLog.houseName, parsedLog.ownerName]
        .map(slugify)
        .filter(Boolean)
        .join("-"),
    houseName: rawReport.houseName || parsedLog.houseName,
    ownerName: rawReport.ownerName || parsedLog.ownerName,
    world: String(rawReport.world || "").trim(),
    town: String(rawReport.town || "").trim(),
    status: rawReport.status || "open",
    utilities: {
      exerciseDummies: Boolean(utilities.exerciseDummies),
      mailbox: Boolean(utilities.mailbox),
      rewardShrine: Boolean(utilities.rewardShrine),
      imbuingShrine: Boolean(utilities.imbuingShrine),
      hirelings: hirelings
        .filter((entry) => entry && entry.type)
        .map((entry) => ({
          type: String(entry.type).trim(),
          abilities: Array.isArray(entry.abilities)
            ? entry.abilities.map((ability) => String(ability).trim()).filter(Boolean)
            : [],
        })),
    },
    lastSeenOpen: rawReport.lastSeenOpen,
    confidence: Number(rawReport.confidence ?? 1),
    source: {
      type: source.type || "github",
      url: source.url || "",
      submitter: source.submitter || "",
      log: source.log || "",
      notes: source.notes || "",
      screenshotUrl: source.screenshotUrl || "",
    },
  };
}

function cacheElements() {
  elements.searchInput = document.getElementById("houseSearchInput");
  elements.ownerSearchInput = document.getElementById("ownerSearchInput");
  elements.worldFilter = document.getElementById("worldFilter");
  elements.townFilter = document.getElementById("townFilter");
  elements.hirelingFilter = document.getElementById("hirelingFilter");
  elements.freshnessFilter = document.getElementById("freshnessFilter");
  elements.sortFilter = document.getElementById("sortFilter");
  elements.utilityFilters = document.getElementById("openHouseUtilityFilters");
  elements.summary = document.getElementById("openHousesSummary");
  elements.cards = document.getElementById("openHouseCards");
}

function bindControls() {
  elements.searchInput.addEventListener("input", (event) => {
    filterState.houseName = event.target.value;
    render();
  });

  elements.ownerSearchInput.addEventListener("input", (event) => {
    filterState.ownerName = event.target.value;
    render();
  });

  [
    ["worldFilter", "world"],
    ["townFilter", "town"],
    ["hirelingFilter", "hireling"],
    ["freshnessFilter", "freshness"],
    ["sortFilter", "sort"],
  ].forEach(([elementKey, stateKey]) => {
    elements[elementKey].addEventListener("change", (event) => {
      filterState[stateKey] = event.target.value;
      render();
    });
  });

}

function populateFilters(reports) {
  const worlds = [...new Set(reports.map((report) => report.world).filter(Boolean))].sort();
  const towns = [...new Set(reports.map((report) => report.town).filter(Boolean))].sort();
  const hirelings = [
    ...new Set(
      reports.flatMap((report) =>
        (report.utilities?.hirelings || []).map((entry) => entry.type).filter(Boolean)
      )
    ),
  ].sort();

  populateSelect(elements.worldFilter, worlds, filterState.world, "All worlds");
  populateSelect(elements.townFilter, towns, filterState.town, "All towns");
  populateSelect(
    elements.hirelingFilter,
    hirelings,
    filterState.hireling,
    "All hirelings"
  );
}

async function init() {
  initSharedUi();
  cacheElements();
  syncControls();
  bindControls();

  try {
    const payload = await fetchJson(OPEN_HOUSES_DATA_PATH);
    const records = Array.isArray(payload) ? payload : payload.records;
    allReports = Array.isArray(records) ? records.map(normalizeReport) : [];
    populateFilters(allReports);
    syncControls();
    render();
  } catch (error) {
    setHtml(
      elements.cards,
      `<div class="empty-state">Failed to load open house data.</div>`
    );
    setHtml(elements.tableWrap, "");
  }
}

window.OpenHouse = {
  OPEN_DOOR_REGEX,
  parseDoorLog,
  normalizeText,
  normalizeReport,
  getFreshnessBucket,
  isDefaultVisible,
};

init();
