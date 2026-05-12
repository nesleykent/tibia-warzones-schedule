const {
  GITHUB_ISSUES_URL,
  WORLDS_DATA_PATH,
  escapeHtml,
  fetchJson,
  getWorldBattleyeKey,
  getWorldPvpKey,
  getWorldRegionKey,
  getWorldTransferLabel,
  getWorldTransferKey,
  initSharedUi,
  setHtml,
  formatTransferType,
} = window.TibiaTime;

const OPEN_HOUSES_DATA_PATH = "./data/open-houses.json";
const STORAGE_KEY = "openHouseFilters";
const OPEN_DOOR_REGEX =
  /You see an open door\. It belongs to house '([^']+)'\. (.+?) owns this house\./;
const FILTER_CONFIGS = [
  {
    group: "region",
    getValue: (world) => getWorldRegionKey(world),
    getLabel: (value) => value,
  },
  {
    group: "pvp",
    getValue: (world) => getWorldPvpKey(world),
    getLabel: (value) => value,
  },
  {
    group: "transfer",
    getValue: (world) => getWorldTransferKey(world),
    getLabel: (value) => formatTransferType(value, value),
  },
  {
    group: "battleye",
    getValue: (world) => getWorldBattleyeKey(world),
    getLabel: (value) => {
      if (value === "GBE") return "Green BattlEye";
      if (value === "YBE") return "Yellow BattlEye";
      return "No BattlEye";
    },
  },
];
const FILTER_GROUPS = FILTER_CONFIGS.map(({ group }) => group);
const FILTER_CONFIGS_BY_GROUP = Object.fromEntries(
  FILTER_CONFIGS.map((config) => [config.group, config])
);
const DEFAULT_FILTERS = {
  search: "",
  activeFilters: Object.fromEntries(FILTER_GROUPS.map((group) => [group, []])),
};

const elements = {};
let allWorlds = [];
let allReports = [];
let filterState = loadFilterState();
let selectedWorldName = "";
const OVERVIEW_TITLE = "Open Houses";
const OVERVIEW_SUBTITLE =
  "Community-reported public houses grouped by world, using the same browsing model as the server overview.";
const HIRELING_WIKI_URL = "https://tibia.fandom.com/wiki/Hireling";
const HIRELING_ORDER = ["Apprentice", "Banker", "Trader", "Steward", "Cook"];

function isWorldDetailRoute() {
  return Boolean(normalizeText(selectedWorldName));
}

function getOpenHousesWorldUrl(worldName) {
  return `./open-houses.html?world=${encodeURIComponent(String(worldName || "").trim())}`;
}

function loadFilterState() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return { ...DEFAULT_FILTERS };
    const parsed = JSON.parse(stored);
    return {
      ...DEFAULT_FILTERS,
      ...parsed,
      activeFilters: Object.fromEntries(
        FILTER_GROUPS.map((group) => [
          group,
          Array.isArray(parsed?.activeFilters?.[group]) ? parsed.activeFilters[group] : [],
        ])
      ),
    };
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

  if (!houseName) throw new Error("House name cannot be empty.");
  if (!ownerName) throw new Error("Owner name cannot be empty.");

  return {
    isOpenDoor: true,
    houseName,
    ownerName,
  };
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
    houseId: Number(rawReport.houseId) || null,
    lastSeenOpen: rawReport.lastSeenOpen,
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
    source: {
      url: source.url || "",
      screenshotUrl: source.screenshotUrl || "",
    },
  };
}

function getSelectedWorld() {
  return (
    allWorlds.find((world) => normalizeText(world?.name) === normalizeText(selectedWorldName)) ||
    null
  );
}

function getBattleyeLabel(world) {
  const key = getWorldBattleyeKey(world);
  if (key === "GBE") return "Green BattlEye";
  if (key === "YBE") return "Yellow BattlEye";
  return "No BattlEye";
}

function getCharacterUrl(characterName) {
  return `https://www.tibia.com/community/?name=${encodeURIComponent(String(characterName || "").trim())}`;
}

function getHouseUrl(report) {
  if (!report?.houseId || !report?.world || !report?.town) return "";
  return `https://www.tibia.com/community/?subtopic=houses&page=view&world=${encodeURIComponent(report.world)}&town=${encodeURIComponent(report.town)}&houseid=${encodeURIComponent(String(report.houseId))}`;
}

function formatDate(value) {
  const timestamp = Date.parse(value);
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

function setPageHeader(title, subtitle) {
  document.title = title;
  elements.pageTitle.textContent = title;
  elements.pageSubtitle.textContent = subtitle;
}

function hasActiveWorldFilters() {
  return FILTER_GROUPS.some((group) => (filterState.activeFilters[group] || []).length > 0);
}

function toggleWorldFilter(group, value) {
  const current = new Set(filterState.activeFilters[group] || []);
  if (current.has(value)) {
    current.delete(value);
  } else {
    current.add(value);
  }
  filterState.activeFilters[group] = [...current];
  render();
}

function clearWorldFilters() {
  FILTER_GROUPS.forEach((group) => {
    filterState.activeFilters[group] = [];
  });
  render();
}

function getFilteredReports() {
  return allReports;
}

function getColumnCount(container) {
  const width = container.offsetWidth;
  if (width >= 1020) return 3;
  if (width >= 680) return 2;
  return 1;
}

function applyMasonry(container) {
  const cols = getColumnCount(container);
  const cards = [...container.querySelectorAll(".world-card, .empty-state")];
  container.replaceChildren();

  if (cols === 1) {
    container.style.cssText = "display:flex;flex-direction:column;";
    cards.forEach((card) => container.appendChild(card));
    return;
  }

  const gap = cols === 3 ? 16 : 14;
  const columns = Array.from({ length: cols }, () => {
    const col = document.createElement("div");
    col.className = "masonry-col";
    col.style.cssText = `display:flex;flex-direction:column;gap:${gap}px;flex:1;min-width:0;`;
    container.appendChild(col);
    return col;
  });

  container.style.cssText = `display:flex;align-items:flex-start;gap:${gap}px;`;
  cards.forEach((card, i) => columns[i % cols].appendChild(card));

  requestAnimationFrame(() => {
    cards.forEach((card) => card.remove());
    columns.forEach((column) => column.replaceChildren());
    const heights = new Array(cols).fill(0);
    cards.forEach((card) => {
      const shortest = heights.indexOf(Math.min(...heights));
      columns[shortest].appendChild(card);
      heights[shortest] += card.getBoundingClientRect().height + gap;
    });
  });
}

function renderFilters() {
  const isAllActive = !hasActiveWorldFilters();
  const filterOptions = Object.fromEntries(
    FILTER_CONFIGS.map(({ group, getValue }) => [
      group,
      new Set(allWorlds.map((world) => getValue(world)).filter(Boolean)),
    ])
  );
  setHtml(
    elements.filtersBar,
    `
      <div class="filter-pills-row">
        <button
          type="button"
          class="filter-pill filter-pill--all${isAllActive ? " is-active" : ""}"
          data-filter-group="__all__"
          data-filter-value="__all__"
        >
          All
        </button>
        ${FILTER_GROUPS.map((group) =>
          [...filterOptions[group]]
            .sort()
            .map((value) => {
              const isActive = (filterState.activeFilters[group] || []).includes(value);
              return `
                <button
                  type="button"
                  class="filter-pill${isActive ? " is-active" : ""}"
                  data-filter-group="${escapeHtml(group)}"
                  data-filter-value="${escapeHtml(value)}"
                >
                  ${escapeHtml(FILTER_CONFIGS_BY_GROUP[group].getLabel(value))}
                </button>
              `;
            })
            .join("")
        ).join("")}
      </div>
    `
  );
}

function renderSummary(reports, visibleWorlds = null) {
  const scopedReports = Array.isArray(visibleWorlds)
    ? reports.filter((report) =>
        visibleWorlds.some((world) => normalizeText(world.name) === normalizeText(report.world))
      )
    : reports;
  const worldCount = Array.isArray(visibleWorlds)
    ? visibleWorlds.length
    : new Set(scopedReports.map((report) => report.world).filter(Boolean)).size;
  setHtml(
    elements.summary,
    `<p class="summary-text">${scopedReports.length} open house${scopedReports.length === 1 ? "" : "s"} across ${worldCount} world${worldCount === 1 ? "" : "s"}.</p>`
  );
}

function renderCardHeader(title, extraContent = "") {
  return `
    <div class="world-detail-card-header">
      <h2>${escapeHtml(title)}</h2>
      ${extraContent}
    </div>
  `;
}

function renderWorldPreview(reports) {
  if (reports.length === 0) {
    return `<p>No open houses registered yet. If you know any, just report it on <a href="${GITHUB_ISSUES_URL}" target="_blank" rel="noopener noreferrer" class="empty-state-link">GitHub Issues</a>.</p>`;
  }

  return `
    <ul class="executions-list">
      ${reports
        .slice(0, 3)
        .map(
          (report) => `
            <li class="execution-item">
              <span class="execution-time">${escapeHtml(report.town || "Town")}</span>
              <span class="execution-order">${escapeHtml(report.houseName)}</span>
            </li>
          `
        )
        .join("")}
    </ul>
  `;
}

function renderWorldCard(world, reports) {
  const worldUrl = getOpenHousesWorldUrl(world.name);
  return `
    <div
      class="world-card"
      data-world-name="${escapeHtml(world.name)}"
      data-world-url="${escapeHtml(worldUrl)}"
      role="button"
      tabindex="0"
      aria-label="Open ${escapeHtml(world.name)} open houses"
    >
      <h2>
        <a class="world-name world-name-link" href="${escapeHtml(worldUrl)}">${escapeHtml(world.name)}</a>
        <div class="world-card-header-actions">
          <span class="badge">Open Houses: ${escapeHtml(String(reports.length))}</span>
        </div>
      </h2>
      <div class="world-meta">
        <span class="meta-plain meta-left">${escapeHtml(world.location || "N/A")}</span>
        <span class="meta-plain meta-right">${escapeHtml(world.pvp_type || "N/A")}</span>
        <span class="meta-left">${escapeHtml(getWorldTransferLabel(world, "N/A"))}</span>
        <span class="meta-right">${escapeHtml(getBattleyeLabel(world))}</span>
      </div>
      <div class="executions">
        <div class="executions-header">
          <h3>Open Houses</h3>
          <a class="history-link" href="${GITHUB_ISSUES_URL}" target="_blank" rel="noopener noreferrer">GitHub Issues</a>
        </div>
        ${renderWorldPreview(reports)}
      </div>
    </div>
  `;
}

function getVisibleWorlds(reports) {
  const query = normalizeText(filterState.search);
  return allWorlds
    .filter((world) => {
      if (!query) return true;
      return normalizeText(world.name).includes(query);
    })
    .filter((world) =>
      FILTER_CONFIGS.every(({ group, getValue }) => {
        const active = filterState.activeFilters[group] || [];
        return active.length === 0 || active.includes(getValue(world));
      })
    )
    .sort((left, right) => String(left.name || "").localeCompare(String(right.name || "")));
}

function renderWorlds(reports, worlds) {
  const visibleWorlds = Array.isArray(worlds) ? worlds : [];

  if (visibleWorlds.length === 0) {
    setHtml(elements.worldsList, '<div class="empty-state">No worlds match the current search.</div>');
    return;
  }

  setHtml(
    elements.worldsList,
    visibleWorlds
      .map((world) => {
        const worldReports = reports.filter(
          (report) => normalizeText(report.world) === normalizeText(world.name)
        );
        return renderWorldCard(world, worldReports);
      })
      .join("")
  );
  requestAnimationFrame(() => applyMasonry(elements.worldsList));
}

function getUtilityRows(report) {
  const rows = [];
  const utilities = report.utilities || {};

  if (utilities.exerciseDummies) rows.push(["Exercise", "Exercise dummies"]);
  if (utilities.rewardShrine) rows.push(["Reward", "Reward shrine"]);
  if (utilities.imbuingShrine) rows.push(["Imbuing", "Imbuing shrine"]);
  if (utilities.mailbox) rows.push(["Mailbox", "Mailbox"]);

  const hirelings = (utilities.hirelings || [])
    .map((hireling) => String(hireling?.type || "").trim())
    .filter(Boolean)
    .sort((left, right) => HIRELING_ORDER.indexOf(left) - HIRELING_ORDER.indexOf(right));
  if (hirelings.length > 0) {
    rows.push(["Hireling", hirelings.join(", ")]);
  }

  return rows;
}

function renderUtilityMarkup(report) {
  const utilityRows = getUtilityRows(report);
  if (utilityRows.length === 0) return "No utilities listed";

  return utilityRows
    .map(([label, value]) => {
      if (label === "Hireling") {
        return `<a class="history-link" href="${HIRELING_WIKI_URL}" target="_blank" rel="noopener noreferrer">Hireling</a> (${escapeHtml(value)})`;
      }
      return escapeHtml(value);
    })
    .join("; ");
}

function renderWorldDetail(reports) {
  const world = getSelectedWorld();
  if (!world) {
    setPageHeader("Open Houses", "Selected world was not found.");
    setHtml(
      elements.worldSummaryCard,
      `${renderCardHeader("Summary", '<a class="history-link" href="./open-houses.html">Back to overview</a>')}<p class="world-detail-empty">World not found.</p>`
    );
    setHtml(elements.worldHousesCard, "");
    return;
  }

  const worldReports = reports
    .filter((report) => normalizeText(report.world) === normalizeText(world.name))
    .sort((left, right) => {
      return (
        Date.parse(right.lastSeenOpen || 0) - Date.parse(left.lastSeenOpen || 0) ||
        left.houseName.localeCompare(right.houseName)
      );
    });

  setPageHeader(
    `${world.name} Open Houses`,
    `Community-reported public houses for ${world.name}.`
  );
  setHtml(
    elements.worldSummaryCard,
    `
      ${renderCardHeader("Summary", '<a class="history-link" href="./open-houses.html">Back to overview</a>')}
      <div class="world-detail-grid">
        <div class="world-detail-stat"><span>Region</span><strong>${escapeHtml(world.location || "N/A")}</strong></div>
        <div class="world-detail-stat"><span>PvP</span><strong>${escapeHtml(world.pvp_type || "N/A")}</strong></div>
        <div class="world-detail-stat"><span>Transfer</span><strong>${escapeHtml(getWorldTransferLabel(world, "N/A"))}</strong></div>
        <div class="world-detail-stat"><span>BattlEye</span><strong>${escapeHtml(getBattleyeLabel(world))}</strong></div>
      </div>
    `
  );

  if (worldReports.length === 0) {
    setHtml(
      elements.worldHousesCard,
      `${renderCardHeader("Open Houses")}<p class="world-detail-empty">No open houses registered yet. If you know any, just report it on <a href="${GITHUB_ISSUES_URL}" target="_blank" rel="noopener noreferrer" class="empty-state-link">GitHub Issues</a>.</p>`
    );
    return;
  }

  setHtml(
    elements.worldHousesCard,
    `
      ${renderCardHeader("Open Houses", `<span class="world-detail-inline-note">${escapeHtml(String(worldReports.length))} listed</span>`)}
      <div class="world-history-table-wrap">
        <table class="world-history-table">
          <thead>
            <tr>
              <th>House</th>
              <th>Town</th>
              <th>Owner</th>
              <th>Utilities</th>
              <th>Source</th>
            </tr>
          </thead>
          <tbody>
            ${worldReports
              .map((report) => {
                const houseLabel = report.houseId
                  ? `<a class="history-link" href="${escapeHtml(getHouseUrl(report))}" target="_blank" rel="noopener noreferrer">${escapeHtml(report.houseName)}</a>`
                  : escapeHtml(report.houseName);
                const ownerLabel = report.ownerName
                  ? `<a class="history-link" href="${escapeHtml(getCharacterUrl(report.ownerName))}" target="_blank" rel="noopener noreferrer">${escapeHtml(report.ownerName)}</a>`
                  : "N/A";
                const sourceLink = report.source?.url
                  ? `<a class="history-link" href="${escapeHtml(report.source.url)}" target="_blank" rel="noopener noreferrer">Link</a>`
                  : "N/A";
                return `
                  <tr>
                    <td>${houseLabel}</td>
                    <td>${escapeHtml(report.town || "N/A")}</td>
                    <td>${ownerLabel}</td>
                    <td>${renderUtilityMarkup(report)}</td>
                    <td>${sourceLink}</td>
                  </tr>
                `;
              })
              .join("")}
          </tbody>
        </table>
      </div>
    `
  );
}

function ensureSelectedWorld() {
  if (!isWorldDetailRoute()) return;
  if (getSelectedWorld()) return;
}

function renderRouteState(reports) {
  if (isWorldDetailRoute()) {
    elements.overviewControls.hidden = true;
    elements.summary.hidden = true;
    elements.worldsSection.hidden = true;
    elements.worldPage.hidden = false;
    renderWorldDetail(reports);
    return;
  }

  setPageHeader(OVERVIEW_TITLE, OVERVIEW_SUBTITLE);
  elements.overviewControls.hidden = false;
  elements.summary.hidden = false;
  elements.worldsSection.hidden = false;
  elements.worldPage.hidden = true;
  setHtml(elements.worldSummaryCard, "");
  setHtml(elements.worldHousesCard, "");
}

function syncControls() {
  elements.searchInput.value = filterState.search;
}

function render() {
  ensureSelectedWorld();
  const reports = getFilteredReports();
  const visibleWorlds = getVisibleWorlds(reports);
  renderFilters();
  renderSummary(reports, isWorldDetailRoute() ? null : visibleWorlds);
  if (isWorldDetailRoute()) {
    renderRouteState(reports);
  } else {
    renderWorlds(reports, visibleWorlds);
    renderRouteState(reports);
  }
  persistFilterState();
}

function cacheElements() {
  elements.pageTitle = document.getElementById("pageTitle");
  elements.pageSubtitle = document.getElementById("pageSubtitle");
  elements.overviewControls = document.getElementById("overviewControls");
  elements.searchControlGroup = document.getElementById("searchControlGroup");
  elements.searchInput = document.getElementById("searchInput");
  elements.filtersBar = document.getElementById("filtersBar");
  elements.summary = document.getElementById("summary");
  elements.worldsSection = document.getElementById("worldsSection");
  elements.worldsList = document.getElementById("worldsList");
  elements.worldPage = document.getElementById("worldPage");
  elements.worldSummaryCard = document.getElementById("worldSummaryCard");
  elements.worldHousesCard = document.getElementById("worldHousesCard");
}

function bindControls() {
  elements.searchInput.addEventListener("input", (event) => {
    filterState.search = event.target.value;
    render();
  });

  elements.filtersBar.addEventListener("click", (event) => {
    const button = event.target.closest(".filter-pill");
    if (!button) return;

    const group = button.dataset.filterGroup;
    const value = button.dataset.filterValue;
    if (group === "__all__") {
      clearWorldFilters();
      return;
    }
    if (group && value) {
      toggleWorldFilter(group, value);
    }
  });

  elements.worldsList.addEventListener("click", (event) => {
    const card = event.target.closest(".world-card");
    const blocked = event.target.closest(".world-name-link, .history-link, button");
    if (card && !blocked && card.dataset.worldUrl) {
      window.location.href = card.dataset.worldUrl;
    }
  });

  elements.worldsList.addEventListener("keydown", (event) => {
    const card = event.target.closest(".world-card");
    if (!card || !card.dataset.worldUrl) return;
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    window.location.href = card.dataset.worldUrl;
  });
}

async function init() {
  initSharedUi();
  cacheElements();
  bindControls();
  syncControls();

  try {
    const [worldsPayload, reportsPayload] = await Promise.all([
      fetchJson(WORLDS_DATA_PATH),
      fetchJson(OPEN_HOUSES_DATA_PATH),
    ]);

    allWorlds = Array.isArray(worldsPayload) ? worldsPayload : worldsPayload.worlds || [];
    const records = Array.isArray(reportsPayload) ? reportsPayload : reportsPayload.records;
    allReports = Array.isArray(records) ? records.map(normalizeReport) : [];
    selectedWorldName = new URLSearchParams(window.location.search).get("world") || "";
    render();
  } catch {
    if (isWorldDetailRoute()) {
      elements.overviewControls.hidden = true;
      elements.summary.hidden = true;
      elements.worldsSection.hidden = true;
      elements.worldPage.hidden = false;
      setPageHeader("Open Houses", "Failed to load open house data.");
      setHtml(
        elements.worldSummaryCard,
        `${renderCardHeader("Summary", '<a class="history-link" href="./open-houses.html">Back to overview</a>')}<p class="world-detail-empty">Failed to load open house data.</p>`
      );
      setHtml(elements.worldHousesCard, "");
    } else {
      setHtml(
        elements.worldsList,
        '<div class="empty-state">Failed to load open house data.</div>'
      );
    }
  }
}

window.OpenHouse = {
  OPEN_DOOR_REGEX,
  parseDoorLog,
  normalizeReport,
  normalizeText,
};

init();
