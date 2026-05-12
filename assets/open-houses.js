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
  search: "",
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
let allWorlds = [];
let allReports = [];
let filterState = loadFilterState();
let selectedWorldName = "";

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

function matchesUtilityFilters(report) {
  const utilities = report.utilities || {};
  if (filterState.exerciseDummies && !utilities.exerciseDummies) return false;
  if (filterState.mailbox && !utilities.mailbox) return false;
  if (filterState.rewardShrine && !utilities.rewardShrine) return false;
  if (filterState.imbuingShrine && !utilities.imbuingShrine) return false;
  return true;
}

function matchesSearch(report) {
  const query = normalizeText(filterState.search);
  if (!query) return true;

  return normalizeText(
    [report.world, report.houseName, report.ownerName, report.town].join(" ")
  ).includes(query);
}

function getFilteredReports() {
  return allReports.filter((report) => matchesUtilityFilters(report) && matchesSearch(report));
}

function getWorldCounts(reports) {
  const counts = new Map();
  reports.forEach((report) => {
    const key = normalizeText(report.world);
    counts.set(key, (counts.get(key) || 0) + 1);
  });
  return counts;
}

function renderFilters() {
  setHtml(
    elements.filtersBar,
    `
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
    `
  );

  elements.filtersBar.querySelectorAll("[data-utility-filter]").forEach((button) => {
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
    `<p class="summary-text">${reports.length} open house${reports.length === 1 ? "" : "s"} across ${worldCount} world${worldCount === 1 ? "" : "s"}.</p>`
  );
}

function renderWorldPreview(reports) {
  if (reports.length === 0) {
    return "<p>No open houses registered yet.</p>";
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
  const isSelected = normalizeText(world.name) === normalizeText(selectedWorldName);
  return `
    <div
      class="world-card${isSelected ? " world-card--selected" : ""}"
      data-world-name="${escapeHtml(world.name)}"
      role="button"
      tabindex="0"
      aria-pressed="${isSelected ? "true" : "false"}"
    >
      <h2>
        <span class="world-name">${escapeHtml(world.name)}</span>
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
        </div>
        ${renderWorldPreview(reports)}
      </div>
    </div>
  `;
}

function renderWorlds(reports) {
  const query = normalizeText(filterState.search);
  const worlds = allWorlds
    .filter((world) => {
      if (!query) return true;
      const worldName = normalizeText(world.name);
      if (worldName.includes(query)) return true;
      return reports.some(
        (report) =>
          normalizeText(report.world) === worldName &&
          normalizeText([report.houseName, report.ownerName, report.town].join(" ")).includes(query)
      );
    })
    .sort((left, right) => String(left.name || "").localeCompare(String(right.name || "")));

  if (worlds.length === 0) {
    setHtml(elements.worldsList, '<div class="empty-state">No worlds match the current search.</div>');
    return;
  }

  setHtml(
    elements.worldsList,
    worlds
      .map((world) => {
        const worldReports = reports.filter(
          (report) => normalizeText(report.world) === normalizeText(world.name)
        );
        return renderWorldCard(world, worldReports);
      })
      .join("")
  );

  elements.worldsList.querySelectorAll(".world-card").forEach((card) => {
    const select = () => {
      selectedWorldName = card.dataset.worldName || "";
      render();
      elements.selectedWorldLabel.scrollIntoView({ behavior: "smooth", block: "start" });
    };

    card.addEventListener("click", select);
    card.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      select();
    });
  });
}

function getUtilityRows(report) {
  const rows = [];
  const utilities = report.utilities || {};

  if (utilities.exerciseDummies) rows.push(["Exercise", "Exercise dummies"]);
  if (utilities.mailbox) rows.push(["Mailbox", "Mailbox available"]);
  if (utilities.rewardShrine) rows.push(["Reward", "Reward shrine"]);
  if (utilities.imbuingShrine) rows.push(["Imbuing", "Imbuing shrine"]);

  (utilities.hirelings || []).forEach((hireling) => {
    rows.push(["Hireling", hireling.type || "Unknown"]);
  });

  return rows;
}

function renderHouseCard(report) {
  const linkParts = [];
  if (report.source?.url) {
    linkParts.push(
      `<a class="history-link" href="${escapeHtml(report.source.url)}" target="_blank" rel="noopener noreferrer">Source link</a>`
    );
  }
  if (report.source?.screenshotUrl && !/^_no response_$/i.test(report.source.screenshotUrl)) {
    linkParts.push(
      `<a class="history-link" href="${escapeHtml(report.source.screenshotUrl)}" target="_blank" rel="noopener noreferrer">Screenshot</a>`
    );
  }
  const links = linkParts.join(" ");

  const utilityRows = getUtilityRows(report);
  const utilityMarkup =
    utilityRows.length > 0
      ? `
        <ul class="executions-list">
          ${utilityRows
            .map(
              ([label, value]) => `
                <li class="execution-item">
                  <span class="execution-time">${escapeHtml(label)}</span>
                  <span class="execution-order">${escapeHtml(value)}</span>
                </li>
              `
            )
            .join("")}
        </ul>
      `
      : "<p>No utilities listed.</p>";

  return `
    <div class="world-card open-house-card">
      <h2>
        <span class="world-name">${escapeHtml(report.houseName)}</span>
        <div class="world-card-header-actions">
          <span class="badge">Open</span>
        </div>
      </h2>
      <div class="world-meta">
        <span class="meta-plain meta-left">${escapeHtml(report.town || "N/A")}</span>
        <span class="meta-plain meta-right">${escapeHtml(report.ownerName || "N/A")}</span>
      </div>
      <div class="executions">
        <div class="executions-header">
          <h3>Utilities</h3>
          ${links}
        </div>
        ${utilityMarkup}
        <div class="execution-time-note">Last seen open: ${escapeHtml(formatDate(report.lastSeenOpen))}</div>
      </div>
    </div>
  `;
}

function renderSelectedWorldMeta(world, reports) {
  if (!world) {
    elements.selectedWorldLabel.textContent = "Open Houses";
    setHtml(elements.selectedWorldMeta, "<span>Select a world card above to open its houses.</span>");
    return;
  }

  elements.selectedWorldLabel.textContent = "Open Houses";
  setHtml(
    elements.selectedWorldMeta,
    [
      world.name,
      world.location || "N/A",
      world.pvp_type || "N/A",
      getWorldTransferLabel(world, "N/A"),
      getBattleyeLabel(world),
      `${reports.length} house${reports.length === 1 ? "" : "s"}`,
    ]
      .map((value) => `<span>${escapeHtml(value)}</span>`)
      .join("")
  );
}

function renderSelectedWorldHouses(reports) {
  const world = getSelectedWorld();
  if (!world) {
    renderSelectedWorldMeta(null, []);
    setHtml(
      elements.selectedWorldHouses,
      '<div class="empty-state">Select a world card above to view its open houses.</div>'
    );
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

  renderSelectedWorldMeta(world, worldReports);

  if (worldReports.length === 0) {
    setHtml(
      elements.selectedWorldHouses,
      `<div class="empty-state">No open houses match the current filters for ${escapeHtml(world.name)}.</div>`
    );
    return;
  }

  setHtml(
    elements.selectedWorldHouses,
    worldReports.map((report) => renderHouseCard(report)).join("")
  );
}

function ensureSelectedWorld() {
  if (getSelectedWorld()) return;
  selectedWorldName =
    (allReports[0] && allReports[0].world) ||
    (allWorlds[0] && allWorlds[0].name) ||
    "";
}

function syncControls() {
  elements.searchInput.value = filterState.search;
}

function render() {
  ensureSelectedWorld();
  const reports = getFilteredReports();
  renderFilters();
  renderSummary(reports);
  renderWorlds(reports);
  renderSelectedWorldHouses(reports);
  persistFilterState();
}

function cacheElements() {
  elements.searchInput = document.getElementById("searchInput");
  elements.filtersBar = document.getElementById("filtersBar");
  elements.summary = document.getElementById("summary");
  elements.worldsList = document.getElementById("worldsList");
  elements.selectedWorldLabel = document.getElementById("selectedWorldLabel");
  elements.selectedWorldMeta = document.getElementById("selectedWorldMeta");
  elements.selectedWorldHouses = document.getElementById("selectedWorldHouses");
}

function bindControls() {
  elements.searchInput.addEventListener("input", (event) => {
    filterState.search = event.target.value;
    render();
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
    selectedWorldName =
      (allReports[0] && allReports[0].world) ||
      (allWorlds[0] && allWorlds[0].name) ||
      "";
    render();
  } catch {
    setHtml(
      elements.worldsList,
      '<div class="empty-state">Failed to load open house data.</div>'
    );
    setHtml(elements.selectedWorldHouses, "");
  }
}

window.OpenHouse = {
  OPEN_DOOR_REGEX,
  parseDoorLog,
  normalizeReport,
  normalizeText,
};

init();
