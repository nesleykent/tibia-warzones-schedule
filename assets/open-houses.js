const {
  WORLDS_DATA_PATH,
  escapeHtml,
  fetchJson,
  getWorldBattleyeKey,
  getWorldTransferLabel,
  initSharedUi,
  setHtml,
} = window.TibiaTime;

const OPEN_HOUSES_DATA_PATH = "./data/open-houses.json";
const STORAGE_KEY = "openHouseFilters";
const OPEN_DOOR_REGEX =
  /You see an open door\. It belongs to house '([^']+)'\. (.+?) owns this house\./;
const DEFAULT_FILTERS = {
  houseName: "",
  exerciseDummies: false,
  mailbox: false,
  rewardShrine: false,
  imbuingShrine: false,
};
const UTILITY_FILTERS = [
  { key: "exerciseDummies", label: "Exercise dummies" },
  { key: "mailbox", label: "Mailbox" },
  { key: "rewardShrine", label: "Reward shrine" },
  { key: "imbuingShrine", label: "Imbuing shrine" },
];

const elements = {};
let allReports = [];
let allWorlds = [];
let filterState = loadFilterState();
let selectedWorld = "";

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

function readUtilityLabel(flag, label) {
  return flag ? label : null;
}

function getBattleyeDisplayLabel(key) {
  if (key === "GBE") return "Green BattlEye";
  if (key === "YBE") return "Yellow BattlEye";
  return "No BattlEye";
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

function matchesUtilityFilters(report) {
  const utilities = report.utilities || {};
  if (filterState.exerciseDummies && !utilities.exerciseDummies) return false;
  if (filterState.mailbox && !utilities.mailbox) return false;
  if (filterState.rewardShrine && !utilities.rewardShrine) return false;
  if (filterState.imbuingShrine && !utilities.imbuingShrine) return false;
  return true;
}

function filterReports(reports) {
  return reports.filter((report) => {
    const houseName = normalizeText(filterState.houseName);
    if (houseName && !normalizeText(report.houseName).includes(houseName)) {
      return false;
    }

    return matchesUtilityFilters(report);
  });
}

function sortReports(reports) {
  const items = [...reports];
  items.sort((left, right) => {
    return (
      left.world.localeCompare(right.world) ||
      Date.parse(right.lastSeenOpen || 0) - Date.parse(left.lastSeenOpen || 0) ||
      left.houseName.localeCompare(right.houseName)
    );
  });
  return items;
}

function getWorldByName(name) {
  const target = normalizeText(name);
  return allWorlds.find((world) => normalizeText(world?.name) === target) || null;
}

function getFilteredReports() {
  return sortReports(filterReports(allReports));
}

function getSelectedWorldReports() {
  if (!selectedWorld) return [];

  return getFilteredReports().filter(
    (report) => normalizeText(report.world) === normalizeText(selectedWorld)
  );
}

function getWorldReportCounts(reports) {
  const counts = new Map();

  reports.forEach((report) => {
    const key = normalizeText(report.world);
    counts.set(key, (counts.get(key) || 0) + 1);
  });

  return counts;
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
  const worldCount = new Set(reports.map((report) => report.world).filter(Boolean)).size;

  setHtml(
    elements.summary,
    `<p class="summary-text">${reports.length} open house${reports.length === 1 ? "" : "s"} across ${worldCount} world${worldCount === 1 ? "" : "s"}. Tracking ${allWorlds.length} Tibia worlds.</p>`
  );
}

function renderWorldCards(filteredReports) {
  const reportCounts = getWorldReportCounts(filteredReports);
  const cards = allWorlds
    .slice()
    .sort((left, right) => String(left.name || "").localeCompare(String(right.name || "")))
    .map((world) => {
      const worldName = String(world.name || "").trim();
      const count = reportCounts.get(normalizeText(worldName)) || 0;
      const isSelected = normalizeText(worldName) === normalizeText(selectedWorld);
      const battleyeKey = getWorldBattleyeKey(world);
      const transferLabel = getWorldTransferLabel(world, "N/A");
      const previewText =
        count === 0
          ? "No open houses reported yet."
          : `${count} open house${count === 1 ? "" : "s"} available.`;

      return `
        <article
          class="world-card open-house-world-card${isSelected ? " world-card--selected" : ""}"
          data-open-house-world="${escapeHtml(worldName)}"
          role="button"
          tabindex="0"
          aria-pressed="${isSelected ? "true" : "false"}"
        >
          <h2>
            <span class="world-name">${escapeHtml(worldName)}</span>
            <div class="world-card-header-actions">
              <span class="badge">Open Houses: ${escapeHtml(String(count))}</span>
            </div>
          </h2>
          <div class="world-meta">
            <span class="meta-plain meta-left">${escapeHtml(world.location || "N/A")}</span>
            <span class="meta-plain meta-right">${escapeHtml(world.pvp_type || "N/A")}</span>
            <span class="meta-left">${escapeHtml(transferLabel)}</span>
            <span class="meta-right">${escapeHtml(getBattleyeDisplayLabel(battleyeKey))}</span>
          </div>
          <div class="executions">
            <div class="executions-header">
              <h3>Open Houses</h3>
              <span class="history-link">Select world</span>
            </div>
            <div class="open-house-world-preview">${escapeHtml(previewText)}</div>
          </div>
        </article>
      `;
    })
    .join("");

  setHtml(elements.worldCards, cards);

  elements.worldCards.querySelectorAll("[data-open-house-world]").forEach((card) => {
    const select = () => {
      selectedWorld = card.dataset.openHouseWorld || "";
      render();
      elements.resultsHeading.scrollIntoView({ behavior: "smooth", block: "start" });
    };

    card.addEventListener("click", select);
    card.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      select();
    });
  });
}

function renderSelectedWorldMeta(world, reports) {
  if (!world) {
    elements.resultsHeading.textContent = "Open Houses";
    setHtml(
      elements.selectedWorldMeta,
      `<span class="open-house-muted">Select a world above to view its open houses.</span>`
    );
    return;
  }

  const items = [
    world.location || "N/A",
    world.pvp_type || "N/A",
    getWorldTransferLabel(world, "N/A"),
    getBattleyeDisplayLabel(getWorldBattleyeKey(world)),
    `${reports.length} house${reports.length === 1 ? "" : "s"}`,
  ];

  elements.resultsHeading.textContent = `${world.name} Open Houses`;
  setHtml(
    elements.selectedWorldMeta,
    items.map((item) => `<span>${escapeHtml(item)}</span>`).join("")
  );
}

function renderCards(reports) {
  const selected = getWorldByName(selectedWorld);
  renderSelectedWorldMeta(selected, reports);

  if (!selected) {
    setHtml(
      elements.cards,
      `<div class="empty-state">Select a world card to view its open houses.</div>`
    );
    return;
  }

  if (reports.length === 0) {
    setHtml(
      elements.cards,
      `<div class="empty-state">No open houses match the current filters for ${escapeHtml(selected.name || selectedWorld)}.</div>`
    );
    return;
  }

  const markup = reports
    .map((report) => {
      const utilities = getUtilityTags(report)
        .map((tag) => `<span class="open-house-chip">${escapeHtml(tag)}</span>`)
        .join("");
      const sourceUrl = report.source?.url
        ? `<a class="history-link" href="${escapeHtml(report.source.url)}" target="_blank" rel="noopener noreferrer">Source link</a>`
        : `<span class="open-house-muted">Source unavailable</span>`;
      const screenshotUrl =
        report.source?.screenshotUrl && !/^_no response_$/i.test(report.source.screenshotUrl)
          ? `<a class="history-link" href="${escapeHtml(report.source.screenshotUrl)}" target="_blank" rel="noopener noreferrer">Screenshot</a>`
          : "";

      return `
        <article class="world-card open-house-card">
          <h2>
            <span class="world-name">${escapeHtml(report.houseName)}</span>
          </h2>
          <div class="world-meta open-house-meta">
            <span>${escapeHtml(report.town)}</span>
            <span>${escapeHtml(report.ownerName)}</span>
          </div>
          <div class="executions">
            <div class="executions-header">
              <h3>Utilities</h3>
              ${sourceUrl}
            </div>
            <div class="open-house-chip-row">${utilities || `<span class="open-house-muted">No utilities listed</span>`}</div>
            <p class="open-house-note">Last seen ${escapeHtml(formatDate(report.lastSeenOpen))}</p>
            ${screenshotUrl ? `<div class="open-house-links">${screenshotUrl}</div>` : ""}
          </div>
        </article>
      `;
    })
    .join("");

  setHtml(elements.cards, markup);
}

function syncControls() {
  elements.searchInput.value = filterState.houseName;
}

function render() {
  const filteredReports = getFilteredReports();
  const selectedReports = getSelectedWorldReports();
  renderSummary(allReports);
  renderUtilityFilters();
  renderWorldCards(filteredReports);
  renderCards(selectedReports);
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
  elements.utilityFilters = document.getElementById("openHouseUtilityFilters");
  elements.summary = document.getElementById("openHousesSummary");
  elements.worldCards = document.getElementById("openHouseWorldCards");
  elements.resultsHeading = document.getElementById("openHouseResultsHeading");
  elements.selectedWorldMeta = document.getElementById("selectedWorldMeta");
  elements.cards = document.getElementById("openHouseCards");
}

function bindControls() {
  elements.searchInput.addEventListener("input", (event) => {
    filterState.houseName = event.target.value;
    render();
  });
}

async function init() {
  initSharedUi();
  cacheElements();
  syncControls();
  bindControls();

  try {
    const [worldsPayload, reportsPayload] = await Promise.all([
      fetchJson(WORLDS_DATA_PATH),
      fetchJson(OPEN_HOUSES_DATA_PATH),
    ]);

    allWorlds = Array.isArray(worldsPayload) ? worldsPayload : worldsPayload.worlds || [];
    const records = Array.isArray(reportsPayload) ? reportsPayload : reportsPayload.records;
    allReports = Array.isArray(records) ? records.map(normalizeReport) : [];
    selectedWorld =
      (allReports[0] && allReports[0].world) ||
      (allWorlds[0] && allWorlds[0].name) ||
      "";
    syncControls();
    render();
  } catch (error) {
    setHtml(
      elements.cards,
      `<div class="empty-state">Failed to load open house data.</div>`
    );
    setHtml(elements.worldCards, "");
  }
}

window.OpenHouse = {
  OPEN_DOOR_REGEX,
  parseDoorLog,
  normalizeText,
  normalizeReport,
};

init();
