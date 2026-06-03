(function () {
  const TibiaTime = window.TibiaTime || {};
  const {
    DEFAULT_TIMEZONE = "America/Sao_Paulo",
    SUPPORTED_TIMEZONES = [],
    WORLDS_DATA_PATH = "./data/worlds.json",
    escapeHtml = (value) => String(value ?? ""),
    initSharedUi = () => {},
    setHtml = (element, markup) => {
      if (element) element.innerHTML = markup;
    },
  } = TibiaTime;

  const REPO_OWNER = "nesleykent";
  const REPO_NAME = "tibia-warzones-schedule";
  const BASE_BRANCH = "main";
  const GITHUB_API_BASE = "https://api.github.com";
  const VALID_WARZONE_ORDERS = ["", "1-2-3", "1-3-2", "2-1-3"];
  const TOKEN_SESSION_KEY = "adminGithubToken";
  const TOKEN_REMEMBER_KEY = "adminGithubTokenRemember";
  const FILE_PATHS = {
    schedules: "data/manual-schedules.json",
    trackedItems: "data/market/items/tracked_items.json",
    openHouses: "data/open-houses.json",
    itemsCatalog: "data/market/items/items.csv",
  };

  const elements = {};
  const state = {
    token: "",
    rememberToken: false,
    connection: null,
    scheduleOrder: [],
    schedules: {},
    selectedScheduleWorld: "",
    worlds: [],
    validWorldNames: new Set(),
    trackedItems: [],
    itemsCatalog: [],
    itemsById: new Map(),
    itemsByName: new Map(),
    openHouses: [],
    selectedOpenHouseIndex: 0,
    openHouseSearch: "",
    originalFiles: {
      schedules: "",
      trackedItems: "",
      openHouses: "",
    },
    pendingReview: null,
    currentWorkingBranch: "",
    createdPullRequestUrl: "",
  };

  document.addEventListener("DOMContentLoaded", init);

  async function init() {
    cacheElements();
    initSharedUi();
    restoreTokenState();
    populateTimezoneDatalist();
    bindStaticEvents();
    await loadInitialData();
    renderAll();
  }

  function cacheElements() {
    [
      "repoDisplay",
      "baseBranchDisplay",
      "workingBranchDisplay",
      "tokenInput",
      "rememberTokenCheckbox",
      "testConnectionButton",
      "clearTokenButton",
      "connectionStatus",
      "scheduleWorldSelect",
      "scheduleWorldAddSelect",
      "scheduleTimezoneInput",
      "addScheduleWorldButton",
      "removeScheduleWorldButton",
      "addScheduleEntryButton",
      "scheduleEntries",
      "scheduleValidation",
      "trackedItemsTable",
      "addTrackedItemButton",
      "marketValidation",
      "openHouseSearchInput",
      "openHouseSelect",
      "addOpenHouseButton",
      "removeOpenHouseButton",
      "openHouseEditor",
      "openHouseValidation",
      "prSummaryInput",
      "reviewChangesButton",
      "createPullRequestButton",
      "workflowStatus",
      "pendingChanges",
      "timezoneOptions",
      "itemsCatalogOptions",
    ].forEach((id) => {
      elements[id] = document.getElementById(id);
    });
  }

  function bindStaticEvents() {
    elements.tokenInput.addEventListener("input", () => {
      state.token = elements.tokenInput.value.trim();
      persistTokenState();
    });

    elements.rememberTokenCheckbox.addEventListener("change", () => {
      state.rememberToken = elements.rememberTokenCheckbox.checked;
      persistTokenState();
    });

    elements.testConnectionButton.addEventListener("click", testGithubConnection);
    elements.clearTokenButton.addEventListener("click", clearToken);

    elements.scheduleWorldSelect.addEventListener("change", () => {
      state.selectedScheduleWorld = elements.scheduleWorldSelect.value;
      renderScheduleEditor();
      updateValidationStatuses();
    });

    elements.scheduleTimezoneInput.addEventListener("input", () => {
      const worldName = state.selectedScheduleWorld;
      const draft = state.schedules[worldName];
      if (!draft) return;
      draft.timezone = elements.scheduleTimezoneInput.value.trim() || DEFAULT_TIMEZONE;
      updateValidationStatuses();
    });

    elements.addScheduleWorldButton.addEventListener("click", addScheduleWorld);
    elements.removeScheduleWorldButton.addEventListener("click", removeSelectedScheduleWorld);
    elements.addScheduleEntryButton.addEventListener("click", addScheduleEntry);

    elements.scheduleEntries.addEventListener("input", handleScheduleEntryInput);
    elements.scheduleEntries.addEventListener("click", handleScheduleEntryClick);

    elements.addTrackedItemButton.addEventListener("click", addTrackedItemRow);
    elements.trackedItemsTable.addEventListener("input", handleTrackedItemInput);
    elements.trackedItemsTable.addEventListener("click", handleTrackedItemClick);

    elements.openHouseSearchInput.addEventListener("input", () => {
      state.openHouseSearch = elements.openHouseSearchInput.value.trim();
      renderOpenHouseSelect();
    });
    elements.openHouseSelect.addEventListener("change", () => {
      state.selectedOpenHouseIndex = Number(elements.openHouseSelect.value) || 0;
      renderOpenHouseEditor();
      updateValidationStatuses();
    });
    elements.addOpenHouseButton.addEventListener("click", addOpenHouse);
    elements.removeOpenHouseButton.addEventListener("click", removeSelectedOpenHouse);
    elements.openHouseEditor.addEventListener("input", handleOpenHouseInput);
    elements.openHouseEditor.addEventListener("click", handleOpenHouseClick);

    elements.reviewChangesButton.addEventListener("click", reviewPendingChanges);
    elements.createPullRequestButton.addEventListener("click", createPullRequestWorkflow);
  }

  function restoreTokenState() {
    state.rememberToken = sessionStorage.getItem(TOKEN_REMEMBER_KEY) === "1";
    state.token = state.rememberToken ? sessionStorage.getItem(TOKEN_SESSION_KEY) || "" : "";
    elements.rememberTokenCheckbox.checked = state.rememberToken;
    elements.tokenInput.value = state.token;
  }

  function persistTokenState() {
    if (state.rememberToken) {
      sessionStorage.setItem(TOKEN_REMEMBER_KEY, "1");
      if (state.token) {
        sessionStorage.setItem(TOKEN_SESSION_KEY, state.token);
      } else {
        sessionStorage.removeItem(TOKEN_SESSION_KEY);
      }
      return;
    }

    sessionStorage.removeItem(TOKEN_REMEMBER_KEY);
    sessionStorage.removeItem(TOKEN_SESSION_KEY);
  }

  function clearToken() {
    state.token = "";
    state.connection = null;
    elements.tokenInput.value = "";
    elements.rememberTokenCheckbox.checked = false;
    state.rememberToken = false;
    persistTokenState();
    setStatus(
      elements.connectionStatus,
      "Token cleared from the page and session storage.",
      "muted"
    );
  }

  function populateTimezoneDatalist() {
    const options = Array.from(
      new Set(
        SUPPORTED_TIMEZONES.map((entry) => entry.value).filter(Boolean).concat(DEFAULT_TIMEZONE)
      )
    )
      .sort()
      .map((value) => `<option value="${escapeAttribute(value)}"></option>`)
      .join("");
    setHtml(elements.timezoneOptions, options);
  }

  async function loadInitialData() {
    setStatus(elements.workflowStatus, "Loading source data from the static site…", "muted");

    const [
      worlds,
      schedulesText,
      trackedItemsText,
      openHousesText,
      itemsCatalogText,
    ] = await Promise.all([
      fetchJson(WORLDS_DATA_PATH),
      fetchText(FILE_PATHS.schedules),
      fetchText(FILE_PATHS.trackedItems),
      fetchText(FILE_PATHS.openHouses),
      fetchText(FILE_PATHS.itemsCatalog),
    ]);

    state.worlds = Array.isArray(worlds) ? worlds : [];
    state.validWorldNames = new Set(state.worlds.map((world) => String(world?.name || "").trim()).filter(Boolean));

    state.originalFiles.schedules = schedulesText;
    state.originalFiles.trackedItems = trackedItemsText;
    state.originalFiles.openHouses = openHousesText;

    const schedulePayload = JSON.parse(schedulesText);
    state.schedules = buildScheduleDrafts(schedulePayload);
    state.scheduleOrder = Object.keys(schedulePayload).sort(compareNormalizedText);
    state.selectedScheduleWorld = state.scheduleOrder[0] || "";

    parseItemsCatalog(itemsCatalogText);
    state.trackedItems = buildTrackedItemDrafts(JSON.parse(trackedItemsText));

    state.openHouses = buildOpenHouseDrafts(JSON.parse(openHousesText));
    state.selectedOpenHouseIndex = state.openHouses.length ? 0 : -1;
  }

  function buildScheduleDrafts(payload) {
    const drafts = {};
    Object.entries(payload || {}).forEach(([worldName, schedule]) => {
      const entries = Array.isArray(schedule?.warzone_executions)
        ? schedule.warzone_executions
            .map((entry, index) => ({
              executionId: Number(entry?.execution_id) || index + 1,
              time: String(entry?.schedule_time || "").trim(),
              order: String(entry?.warzone_sequence || "").trim(),
              source: "",
              notes: "",
            }))
            .sort(compareScheduleEntries)
            .map((entry, index) => ({
              ...entry,
              executionId: index + 1,
            }))
        : [];
      drafts[worldName] = {
        timezone: String(schedule?.timezone || DEFAULT_TIMEZONE),
        entries,
      };
    });
    return drafts;
  }

  function buildTrackedItemDrafts(payload) {
    const names = Array.isArray(payload?.items) ? payload.items : [];
    return names.map((name) => {
      const catalogEntry = state.itemsByName.get(String(name).trim().toLowerCase()) || null;
      return {
        itemId: catalogEntry ? String(catalogEntry.id) : "",
        itemName: String(name || "").trim(),
        category: "",
        enabled: true,
        notes: "",
      };
    });
  }

  function buildOpenHouseDrafts(payload) {
    return Array.isArray(payload)
      ? payload
          .map((record) => ({
          id: String(record?.id || "").trim(),
          houseName: String(record?.houseName || "").trim(),
          ownerName: String(record?.ownerName || "").trim(),
          world: String(record?.world || "").trim(),
          town: String(record?.town || "").trim(),
          houseId:
            typeof record?.houseId === "number" && Number.isFinite(record.houseId)
              ? record.houseId
              : null,
          status: String(record?.status || "").trim(),
          utilities: {
            exerciseDummies: Boolean(record?.utilities?.exerciseDummies),
            rewardShrine: Boolean(record?.utilities?.rewardShrine),
            imbuingShrine: Boolean(record?.utilities?.imbuingShrine),
            mailbox: Boolean(record?.utilities?.mailbox),
            hirelings: Array.isArray(record?.utilities?.hirelings)
              ? record.utilities.hirelings.map((hireling) => ({
                  type: String(hireling?.type || "").trim(),
                  abilities: Array.isArray(hireling?.abilities)
                    ? hireling.abilities.map((ability) => String(ability || "").trim()).filter(Boolean)
                    : [],
                }))
              : [],
          },
          source: {
            type: String(record?.source?.type || "manual").trim(),
            url: String(record?.source?.url || "").trim(),
            submitter: String(record?.source?.submitter || "").trim(),
            log: String(record?.source?.log || "").trim(),
            notes: String(record?.source?.notes || "").trim(),
            screenshotUrl: String(record?.source?.screenshotUrl || "").trim(),
            issueNumber:
              typeof record?.source?.issueNumber === "number" &&
              Number.isFinite(record.source.issueNumber)
                ? record.source.issueNumber
                : 0,
            issueTitle: String(record?.source?.issueTitle || "").trim(),
          },
          lastSeenOpen: normalizeOptionalString(record?.lastSeenOpen),
          createdAt: normalizeOptionalString(record?.createdAt),
          updatedAt: normalizeOptionalString(record?.updatedAt),
        }))
          .sort(compareOpenHouseRecords)
      : [];
  }

  function parseItemsCatalog(csvText) {
    const rows = csvText
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const parts = line.split(",");
        const rawId = String(parts.pop() || "").trim();
        const itemName = parts.join(",").trim();
        return {
          id: Number(rawId),
          name: itemName,
        };
      })
      .filter((row) => row.name && Number.isFinite(row.id));

    state.itemsCatalog = rows;
    state.itemsById = new Map(rows.map((row) => [String(row.id), row]));
    state.itemsByName = new Map(rows.map((row) => [row.name.toLowerCase(), row]));
    setHtml(
      elements.itemsCatalogOptions,
      rows
        .map(
          (row) =>
            `<option value="${escapeAttribute(row.name)}" label="${escapeAttribute(
              `${row.id}`
            )}"></option>`
        )
        .join("")
    );
  }

  function renderAll() {
    renderAuth();
    renderScheduleWorldSelects();
    renderScheduleEditor();
    renderTrackedItems();
    renderOpenHouseSelect();
    renderOpenHouseEditor();
    renderPendingChanges();
    updateValidationStatuses();
  }

  function renderAuth() {
    elements.repoDisplay.value = `${REPO_OWNER}/${REPO_NAME}`;
    elements.baseBranchDisplay.value = BASE_BRANCH;
    elements.workingBranchDisplay.value = state.currentWorkingBranch || "Not created yet";
  }

  function renderScheduleWorldSelects() {
    const scheduledWorlds = state.scheduleOrder
      .filter((worldName) => state.schedules[worldName])
      .sort(compareNormalizedText);
    if (!scheduledWorlds.includes(state.selectedScheduleWorld)) {
      state.selectedScheduleWorld = scheduledWorlds[0] || "";
    }

    setHtml(
      elements.scheduleWorldSelect,
      scheduledWorlds
        .map(
          (worldName) =>
            `<option value="${escapeAttribute(worldName)}"${worldName === state.selectedScheduleWorld ? " selected" : ""}>${escapeHtml(
              worldName
            )}</option>`
        )
        .join("")
    );

    const unscheduledWorlds = state.worlds
      .map((world) => String(world?.name || "").trim())
      .filter(Boolean)
      .filter((worldName) => !state.schedules[worldName])
      .sort(compareNormalizedText);

    setHtml(
      elements.scheduleWorldAddSelect,
      unscheduledWorlds.length
        ? unscheduledWorlds
            .map((worldName) => `<option value="${escapeAttribute(worldName)}">${escapeHtml(worldName)}</option>`)
            .join("")
        : `<option value="">All worlds already have manual schedules</option>`
    );
  }

  function renderScheduleEditor() {
    const worldName = state.selectedScheduleWorld;
    const draft = state.schedules[worldName];

    if (!draft) {
      elements.scheduleTimezoneInput.value = "";
      setHtml(
        elements.scheduleEntries,
        `<div class="admin-empty">No world selected. Add a world schedule to begin.</div>`
      );
      return;
    }

    elements.scheduleTimezoneInput.value = draft.timezone || DEFAULT_TIMEZONE;

    setHtml(
      elements.scheduleEntries,
      draft.entries.length
        ? draft.entries
            .map((entry, index) => renderScheduleEntryCard(entry, index))
            .join("")
        : `<div class="admin-empty">No executions for ${escapeHtml(worldName)} yet.</div>`
    );
  }

  function renderScheduleEntryCard(entry, index) {
    const orderOptions = VALID_WARZONE_ORDERS.map((order) => {
      const label = order || "Default / unspecified";
      return `<option value="${escapeAttribute(order)}"${entry.order === order ? " selected" : ""}>${escapeHtml(label)}</option>`;
    }).join("");

    return `
      <article class="admin-subcard" data-entry-index="${index}">
        <div class="admin-subcard-header">
          <h3>Execution ${index + 1}</h3>
          <button type="button" class="admin-button admin-button--ghost admin-remove-entry" data-index="${index}">
            Remove
          </button>
        </div>
        <div class="admin-grid admin-grid--schedule-row">
          <label class="admin-field">
            <span>World</span>
            <input type="text" value="${escapeAttribute(state.selectedScheduleWorld)}" readonly />
          </label>
          <label class="admin-field">
            <span>Time</span>
            <input
              type="text"
              data-index="${index}"
              data-field="time"
              inputmode="numeric"
              placeholder="HH:MM"
              value="${escapeAttribute(entry.time)}"
            />
          </label>
          <label class="admin-field">
            <span>Order</span>
            <select data-index="${index}" data-field="order">
              ${orderOptions}
            </select>
          </label>
          <label class="admin-field">
            <span>Source (PR note only)</span>
            <input
              type="text"
              data-index="${index}"
              data-field="source"
              placeholder="Discord, screenshot, maintainer note…"
              value="${escapeAttribute(entry.source)}"
            />
          </label>
          <label class="admin-field admin-field--wide">
            <span>Notes (PR note only)</span>
            <textarea
              rows="2"
              data-index="${index}"
              data-field="notes"
              placeholder="Context for reviewers"
            >${escapeHtml(entry.notes)}</textarea>
          </label>
        </div>
      </article>
    `;
  }

  function renderTrackedItems() {
    const rows = state.trackedItems
      .map((row, index) => {
        return `
          <tr>
            <td>
              <input
                type="text"
                data-index="${index}"
                data-field="itemId"
                inputmode="numeric"
                value="${escapeAttribute(row.itemId)}"
              />
            </td>
            <td>
              <input
                type="text"
                data-index="${index}"
                data-field="itemName"
                list="itemsCatalogOptions"
                value="${escapeAttribute(row.itemName)}"
              />
            </td>
            <td>
              <input
                type="text"
                data-index="${index}"
                data-field="category"
                placeholder="PR note only"
                value="${escapeAttribute(row.category)}"
              />
            </td>
            <td class="admin-cell-checkbox">
              <input
                type="checkbox"
                data-index="${index}"
                data-field="enabled"
                ${row.enabled ? "checked" : ""}
              />
            </td>
            <td>
              <input
                type="text"
                data-index="${index}"
                data-field="notes"
                placeholder="PR note only"
                value="${escapeAttribute(row.notes)}"
              />
            </td>
            <td class="admin-cell-actions">
              <button type="button" class="admin-button admin-button--ghost" data-action="remove-tracked-item" data-index="${index}">
                Remove
              </button>
            </td>
          </tr>
        `;
      })
      .join("");

    setHtml(
      elements.trackedItemsTable,
      `
        <table class="admin-table">
          <thead>
            <tr>
              <th>Item ID</th>
              <th>Item name</th>
              <th>Category</th>
              <th>Enabled</th>
              <th>Notes</th>
              <th></th>
            </tr>
          </thead>
          <tbody>${rows || `<tr><td colspan="6" class="admin-empty-cell">No tracked items loaded.</td></tr>`}</tbody>
        </table>
      `
    );
  }

  function renderOpenHouseSelect() {
    const filtered = getFilteredOpenHouses();
    if (!filtered.some((item) => item.index === state.selectedOpenHouseIndex)) {
      state.selectedOpenHouseIndex = filtered.length ? filtered[0].index : -1;
    }

    setHtml(
      elements.openHouseSelect,
      filtered.length
        ? filtered
            .map(
              ({ index, record }) =>
                `<option value="${index}"${index === state.selectedOpenHouseIndex ? " selected" : ""}>${escapeHtml(
                  `${record.world || "Unknown"} · ${record.houseName || "Untitled"} · ${
                    record.ownerName || "Unknown owner"
                  }`
                )}</option>`
            )
            .join("")
        : `<option value="-1">No open house matches the current filter</option>`
    );
  }

  function renderOpenHouseEditor() {
    const record = state.openHouses[state.selectedOpenHouseIndex];
    if (!record) {
      setHtml(
        elements.openHouseEditor,
        `<div class="admin-empty">No open house selected. Add one to begin editing.</div>`
      );
      return;
    }

    setHtml(
      elements.openHouseEditor,
      `
        <article class="admin-subcard">
          <div class="admin-subcard-header">
            <h3>${escapeHtml(record.houseName || "Selected open house")}</h3>
            <span class="admin-chip">${escapeHtml(record.world || "Unknown world")}</span>
          </div>

          <div class="admin-grid admin-grid--open-house">
            ${renderOpenHouseField("Record id", "id", record.id)}
            ${renderOpenHouseField("House name", "houseName", record.houseName)}
            ${renderOpenHouseField("Owner name", "ownerName", record.ownerName)}
            ${renderOpenHouseWorldSelect(record.world)}
            ${renderOpenHouseField("Town", "town", record.town)}
            ${renderOpenHouseField("House ID", "houseId", record.houseId == null ? "" : String(record.houseId), "number")}
            ${renderOpenHouseField("Status", "status", record.status)}
            ${renderOpenHouseField("Last seen open", "lastSeenOpen", record.lastSeenOpen)}
            ${renderOpenHouseField("Created at", "createdAt", record.createdAt)}
            ${renderOpenHouseField("Updated at", "updatedAt", record.updatedAt)}
          </div>

          <div class="admin-divider"></div>

          <div class="admin-grid admin-grid--utilities">
            ${renderCheckboxField("Exercise dummies", "utilities.exerciseDummies", record.utilities.exerciseDummies)}
            ${renderCheckboxField("Reward shrine", "utilities.rewardShrine", record.utilities.rewardShrine)}
            ${renderCheckboxField("Imbuing shrine", "utilities.imbuingShrine", record.utilities.imbuingShrine)}
            ${renderCheckboxField("Mailbox", "utilities.mailbox", record.utilities.mailbox)}
          </div>

          <div class="admin-subcard-header admin-subcard-header--compact">
            <h3>Hirelings</h3>
            <button type="button" class="admin-button admin-button--secondary" data-action="add-hireling">
              Add hireling
            </button>
          </div>
          <div class="admin-stack">
            ${
              record.utilities.hirelings.length
                ? record.utilities.hirelings
                    .map((hireling, index) => renderHirelingCard(hireling, index))
                    .join("")
                : `<div class="admin-empty">No hirelings listed for this house.</div>`
            }
          </div>

          <div class="admin-divider"></div>

          <div class="admin-subcard-header admin-subcard-header--compact">
            <h3>Source</h3>
          </div>
          <div class="admin-grid admin-grid--open-house">
            ${renderOpenHouseField("Source type", "source.type", record.source.type)}
            ${renderOpenHouseField("Source URL", "source.url", record.source.url)}
            ${renderOpenHouseField("Submitter", "source.submitter", record.source.submitter)}
            ${renderOpenHouseField("Issue number", "source.issueNumber", String(record.source.issueNumber), "number")}
            ${renderOpenHouseField("Issue title", "source.issueTitle", record.source.issueTitle)}
            ${renderOpenHouseField("Screenshot URL", "source.screenshotUrl", record.source.screenshotUrl)}
            ${renderOpenHouseTextarea("Door log", "source.log", record.source.log)}
            ${renderOpenHouseTextarea("Source notes", "source.notes", record.source.notes)}
          </div>
        </article>
      `
    );
  }

  function renderOpenHouseField(label, path, value, type = "text") {
    return `
      <label class="admin-field${path === "source.log" || path === "source.notes" ? " admin-field--wide" : ""}">
        <span>${escapeHtml(label)}</span>
        <input type="${escapeAttribute(type)}" data-path="${escapeAttribute(path)}" value="${escapeAttribute(value || "")}" />
      </label>
    `;
  }

  function renderOpenHouseTextarea(label, path, value) {
    return `
      <label class="admin-field admin-field--wide">
        <span>${escapeHtml(label)}</span>
        <textarea rows="3" data-path="${escapeAttribute(path)}">${escapeHtml(value || "")}</textarea>
      </label>
    `;
  }

  function renderOpenHouseWorldSelect(value) {
    return `
      <label class="admin-field">
        <span>World</span>
        <select data-path="world">
          ${state.worlds
            .map((world) => String(world?.name || "").trim())
            .filter(Boolean)
            .map(
              (worldName) =>
                `<option value="${escapeAttribute(worldName)}"${worldName === value ? " selected" : ""}>${escapeHtml(
                  worldName
                )}</option>`
            )
            .join("")}
        </select>
      </label>
    `;
  }

  function renderCheckboxField(label, path, checked) {
    return `
      <label class="admin-checkbox admin-checkbox--card">
        <input type="checkbox" data-path="${escapeAttribute(path)}" ${checked ? "checked" : ""} />
        <span>${escapeHtml(label)}</span>
      </label>
    `;
  }

  function renderHirelingCard(hireling, index) {
    return `
      <article class="admin-subcard admin-subcard--nested">
        <div class="admin-subcard-header admin-subcard-header--compact">
          <h4>Hireling ${index + 1}</h4>
          <button type="button" class="admin-button admin-button--ghost" data-action="remove-hireling" data-index="${index}">
            Remove
          </button>
        </div>
        <div class="admin-grid admin-grid--two">
          <label class="admin-field">
            <span>Type</span>
            <input
              type="text"
              data-hireling-index="${index}"
              data-hireling-field="type"
              value="${escapeAttribute(hireling.type)}"
            />
          </label>
          <label class="admin-field admin-field--wide">
            <span>Abilities (one per line)</span>
            <textarea
              rows="3"
              data-hireling-index="${index}"
              data-hireling-field="abilities"
            >${escapeHtml(hireling.abilities.join("\n"))}</textarea>
          </label>
        </div>
      </article>
    `;
  }

  function renderPendingChanges() {
    const review = state.pendingReview;
    if (!review) {
      setHtml(
        elements.pendingChanges,
        `<div class="admin-empty">Run “Review pending file changes” to validate the editor state and preview the files that will be committed.</div>`
      );
      return;
    }

    if (review.errors.length) {
      setHtml(
        elements.pendingChanges,
        `
          <div class="admin-error-list">
            <h3>Validation errors</h3>
            <ul>${review.errors.map((message) => `<li>${escapeHtml(message)}</li>`).join("")}</ul>
          </div>
        `
      );
      return;
    }

    if (!review.files.length) {
      setHtml(
        elements.pendingChanges,
        `<div class="admin-empty">No file content changed. The editor would not create a branch or PR.</div>`
      );
      return;
    }

    setHtml(
      elements.pendingChanges,
      review.files
        .map(
          (file) => `
            <details class="admin-preview" open>
              <summary>
                <span>${escapeHtml(file.path)}</span>
                <span class="admin-chip">${escapeHtml(file.summary)}</span>
              </summary>
              <pre>${escapeHtml(file.content)}</pre>
            </details>
          `
        )
        .join("")
    );
  }

  function addScheduleWorld() {
    const worldName = elements.scheduleWorldAddSelect.value;
    if (!worldName || state.schedules[worldName]) return;

    state.schedules[worldName] = {
      timezone: DEFAULT_TIMEZONE,
      entries: [],
    };
    state.scheduleOrder.push(worldName);
    state.scheduleOrder.sort(compareNormalizedText);
    state.selectedScheduleWorld = worldName;
    renderScheduleWorldSelects();
    renderScheduleEditor();
    updateValidationStatuses();
  }

  function removeSelectedScheduleWorld() {
    const worldName = state.selectedScheduleWorld;
    if (!worldName || !state.schedules[worldName]) return;

    delete state.schedules[worldName];
    state.scheduleOrder = state.scheduleOrder.filter((entry) => entry !== worldName);
    state.selectedScheduleWorld = state.scheduleOrder[0] || "";
    renderScheduleWorldSelects();
    renderScheduleEditor();
    updateValidationStatuses();
  }

  function addScheduleEntry() {
    const draft = state.schedules[state.selectedScheduleWorld];
    if (!draft) return;
    draft.entries.push({
      executionId: draft.entries.length + 1,
      time: "",
      order: "",
      source: "",
      notes: "",
    });
    renderScheduleEditor();
    updateValidationStatuses();
  }

  function handleScheduleEntryInput(event) {
    const input = event.target;
    const index = Number(input.dataset.index);
    const field = input.dataset.field;
    const draft = state.schedules[state.selectedScheduleWorld];
    if (!draft || !Number.isInteger(index) || !draft.entries[index] || !field) return;
    draft.entries[index][field] = input.value;
    updateValidationStatuses();
  }

  function handleScheduleEntryClick(event) {
    const button = event.target.closest(".admin-remove-entry");
    if (!button) return;
    const index = Number(button.dataset.index);
    const draft = state.schedules[state.selectedScheduleWorld];
    if (!draft || !Number.isInteger(index)) return;
    draft.entries.splice(index, 1);
    renderScheduleEditor();
    updateValidationStatuses();
  }

  function addTrackedItemRow() {
    state.trackedItems.push({
      itemId: "",
      itemName: "",
      category: "",
      enabled: true,
      notes: "",
    });
    renderTrackedItems();
    updateValidationStatuses();
  }

  function handleTrackedItemInput(event) {
    const input = event.target;
    const index = Number(input.dataset.index);
    const field = input.dataset.field;
    const row = state.trackedItems[index];
    if (!row || !field) return;

    if (field === "enabled") {
      row.enabled = Boolean(input.checked);
      updateValidationStatuses();
      return;
    }

    row[field] = input.value;

    if (field === "itemId") {
      const catalogEntry = state.itemsById.get(String(input.value).trim());
      if (catalogEntry) row.itemName = catalogEntry.name;
      renderTrackedItems();
    } else if (field === "itemName") {
      const catalogEntry = state.itemsByName.get(String(input.value).trim().toLowerCase());
      if (catalogEntry) row.itemId = String(catalogEntry.id);
      renderTrackedItems();
    }

    updateValidationStatuses();
  }

  function handleTrackedItemClick(event) {
    const button = event.target.closest("[data-action='remove-tracked-item']");
    if (!button) return;
    const index = Number(button.dataset.index);
    if (!Number.isInteger(index)) return;
    state.trackedItems.splice(index, 1);
    renderTrackedItems();
    updateValidationStatuses();
  }

  function getFilteredOpenHouses() {
    const query = normalizeText(state.openHouseSearch);
    return state.openHouses
      .map((record, index) => ({ record, index }))
      .filter(({ record }) => {
        if (!query) return true;
        const haystack = [
          record.world,
          record.houseName,
          record.ownerName,
          record.town,
          record.id,
        ]
          .map(normalizeText)
          .join(" ");
        return haystack.includes(query);
      });
  }

  function addOpenHouse() {
    const fallbackWorld =
      state.worlds.find((world) => String(world?.name || "").trim())?.name || "";
    state.openHouses.push(createEmptyOpenHouse(fallbackWorld));
    state.selectedOpenHouseIndex = state.openHouses.length - 1;
    renderOpenHouseSelect();
    renderOpenHouseEditor();
    updateValidationStatuses();
  }

  function removeSelectedOpenHouse() {
    if (!state.openHouses[state.selectedOpenHouseIndex]) return;
    state.openHouses.splice(state.selectedOpenHouseIndex, 1);
    state.selectedOpenHouseIndex = Math.min(
      state.selectedOpenHouseIndex,
      state.openHouses.length - 1
    );
    renderOpenHouseSelect();
    renderOpenHouseEditor();
    updateValidationStatuses();
  }

  function createEmptyOpenHouse(worldName) {
    return {
      id: "",
      houseName: "",
      ownerName: "",
      world: String(worldName || "").trim(),
      town: "",
      houseId: null,
      status: "open",
      utilities: {
        exerciseDummies: false,
        rewardShrine: false,
        imbuingShrine: false,
        mailbox: false,
        hirelings: [],
      },
      source: {
        type: "manual",
        url: "",
        submitter: "",
        log: "",
        notes: "",
        screenshotUrl: "",
        issueNumber: 0,
        issueTitle: "Manual maintainer update",
      },
      lastSeenOpen: "",
      createdAt: "",
      updatedAt: "",
    };
  }

  function handleOpenHouseInput(event) {
    const target = event.target;
    const record = state.openHouses[state.selectedOpenHouseIndex];
    if (!record) return;

    const hirelingIndex = Number(target.dataset.hirelingIndex);
    const hirelingField = target.dataset.hirelingField;
    if (Number.isInteger(hirelingIndex) && hirelingField) {
      const hireling = record.utilities.hirelings[hirelingIndex];
      if (!hireling) return;
      if (hirelingField === "abilities") {
        hireling.abilities = splitLines(target.value);
      } else {
        hireling[hirelingField] = target.value;
      }
      updateValidationStatuses();
      return;
    }

    const path = target.dataset.path;
    if (!path) return;
    const nextValue =
      target.type === "checkbox"
        ? Boolean(target.checked)
        : target.type === "number"
          ? parseNumberInput(target.value)
          : target.value;
    setValueAtPath(record, path, nextValue);
    updateValidationStatuses();
  }

  function handleOpenHouseClick(event) {
    const actionTarget = event.target.closest("[data-action]");
    if (!actionTarget) return;
    const record = state.openHouses[state.selectedOpenHouseIndex];
    if (!record) return;

    const action = actionTarget.dataset.action;
    if (action === "add-hireling") {
      record.utilities.hirelings.push({ type: "", abilities: [] });
      renderOpenHouseEditor();
      updateValidationStatuses();
      return;
    }

    if (action === "remove-hireling") {
      const index = Number(actionTarget.dataset.index);
      if (!Number.isInteger(index)) return;
      record.utilities.hirelings.splice(index, 1);
      renderOpenHouseEditor();
      updateValidationStatuses();
    }
  }

  function updateValidationStatuses() {
    const scheduleErrors = validateSchedules();
    const trackedItemErrors = validateTrackedItems();
    const openHouseErrors = validateOpenHouses();

    renderValidationList(elements.scheduleValidation, scheduleErrors, "No schedule validation errors.");
    renderValidationList(elements.marketValidation, trackedItemErrors, "No tracked item validation errors.");
    renderValidationList(elements.openHouseValidation, openHouseErrors, "No open house validation errors.");
  }

  function renderValidationList(element, errors, successMessage) {
    if (!errors.length) {
      setStatus(element, successMessage, "success");
      return;
    }

    setHtml(
      element,
      `
        <div class="admin-status admin-status--error">
          <strong>${errors.length} validation issue${errors.length === 1 ? "" : "s"}</strong>
          <ul>${errors.map((error) => `<li>${escapeHtml(error)}</li>`).join("")}</ul>
        </div>
      `
    );
  }

  function validateSchedules() {
    const errors = [];
    for (const worldName of state.scheduleOrder) {
      const draft = state.schedules[worldName];
      if (!draft) continue;

      if (!state.validWorldNames.has(worldName)) {
        errors.push(`Schedule: unknown world ${worldName}.`);
      }

      if (draft.timezone && typeof draft.timezone !== "string") {
        errors.push(`Schedule: ${worldName} timezone must be a string.`);
      }

      const seenTimes = new Set();
      draft.entries.forEach((entry, index) => {
        const executionLabel = `${worldName} execution ${index + 1}`;
        if (entry.time === UNKNOWN_SCHEDULE_PLACEHOLDER) {
          // Keep the known placeholder valid while sorting it after concrete times.
        } else if (!TIME_PATTERN.test(entry.time)) {
          errors.push(`Schedule: ${executionLabel} must use HH:MM.`);
        } else {
          const [hour, minute] = entry.time.split(":").map(Number);
          if (hour > 23 || minute > 59) {
            errors.push(`Schedule: ${executionLabel} has an impossible time ${entry.time}.`);
          }
        }

        if (seenTimes.has(entry.time)) {
          errors.push(`Schedule: ${worldName} has duplicate time ${entry.time}.`);
        }
        if (entry.time) seenTimes.add(entry.time);

        if (!VALID_WARZONE_ORDERS.includes(entry.order)) {
          errors.push(`Schedule: ${executionLabel} has invalid order ${entry.order || "(blank)"}.`);
        }
      });
    }
    return errors;
  }

  function validateTrackedItems() {
    const errors = [];
    const seenIds = new Set();
    const seenNames = new Set();

    state.trackedItems.forEach((row, index) => {
      const label = `Tracked item row ${index + 1}`;
      const idKey = String(row.itemId || "").trim();
      const nameKey = String(row.itemName || "").trim();

      if (!idKey && !nameKey) {
        errors.push(`${label}: item id and item name cannot both be blank.`);
        return;
      }

      const catalogById = idKey ? state.itemsById.get(idKey) : null;
      const catalogByName = nameKey ? state.itemsByName.get(nameKey.toLowerCase()) : null;

      if (!catalogById && !catalogByName) {
        errors.push(`${label}: item must exist in items.csv.`);
        return;
      }

      const resolved = catalogById || catalogByName;
      if (resolved) {
        if (idKey && String(resolved.id) !== idKey) {
          errors.push(`${label}: item id ${idKey} does not match item name ${nameKey}.`);
        }
        if (nameKey && resolved.name.toLowerCase() !== nameKey.toLowerCase()) {
          errors.push(`${label}: item name ${nameKey} does not match item id ${idKey}.`);
        }
      }

      if (!row.enabled || !resolved) return;

      const normalizedId = String(resolved.id);
      const normalizedName = resolved.name.toLowerCase();
      if (seenIds.has(normalizedId)) {
        errors.push(`${label}: duplicate enabled item id ${normalizedId}.`);
      }
      if (seenNames.has(normalizedName)) {
        errors.push(`${label}: duplicate enabled item name ${resolved.name}.`);
      }
      seenIds.add(normalizedId);
      seenNames.add(normalizedName);
    });

    return errors;
  }

  function validateOpenHouses() {
    const errors = [];
    const seenHouseIds = new Set();

    state.openHouses.forEach((record, index) => {
      const label = `Open house record ${index + 1}`;

      for (const fieldName of ["id", "houseName", "ownerName", "world", "town", "status"]) {
        if (!String(record[fieldName] || "").trim()) {
          errors.push(`${label}: ${fieldName} is required.`);
        }
      }

      if (record.world && !state.validWorldNames.has(record.world)) {
        errors.push(`${label}: unknown world ${record.world}.`);
      }

      if (record.houseId != null && !Number.isInteger(record.houseId)) {
        errors.push(`${label}: houseId must be numeric or blank.`);
      }

      if (record.houseId != null && record.world) {
        const key = `${record.world.toLowerCase()}::${record.houseId}`;
        if (seenHouseIds.has(key)) {
          errors.push(`${label}: duplicate houseId ${record.houseId} for world ${record.world}.`);
        }
        seenHouseIds.add(key);
      }

      for (const key of ["exerciseDummies", "rewardShrine", "imbuingShrine", "mailbox"]) {
        if (typeof record.utilities[key] !== "boolean") {
          errors.push(`${label}: utilities.${key} must be boolean.`);
        }
      }

      if (!Array.isArray(record.utilities.hirelings)) {
        errors.push(`${label}: utilities.hirelings must be a list.`);
      } else {
        record.utilities.hirelings.forEach((hireling, hirelingIndex) => {
          if (!String(hireling.type || "").trim()) {
            errors.push(`${label}: hireling ${hirelingIndex + 1} requires a type.`);
          }
          if (!Array.isArray(hireling.abilities)) {
            errors.push(`${label}: hireling ${hirelingIndex + 1} abilities must be a list.`);
          }
        });
      }

      for (const key of [
        "type",
        "url",
        "submitter",
        "log",
        "notes",
        "screenshotUrl",
        "issueTitle",
      ]) {
        if (typeof record.source[key] !== "string") {
          errors.push(`${label}: source.${key} must be a string.`);
        }
      }

      if (!Number.isInteger(record.source.issueNumber)) {
        errors.push(`${label}: source.issueNumber must be numeric.`);
      }

      for (const key of ["lastSeenOpen", "createdAt", "updatedAt"]) {
        const value = record[key];
        if (!value) continue;
        if (typeof value !== "string" || !DATE_PATTERN.test(value)) {
          errors.push(`${label}: ${key} must use YYYY-MM-DD or ISO-like text.`);
        }
      }
    });

    return errors;
  }

  function reviewPendingChanges() {
    state.pendingReview = buildPendingReview();
    renderPendingChanges();
    if (state.pendingReview.errors.length) {
      setStatus(
        elements.workflowStatus,
        `Review blocked by ${state.pendingReview.errors.length} validation issue${
          state.pendingReview.errors.length === 1 ? "" : "s"
        }.`,
        "error"
      );
      return;
    }

    if (!state.pendingReview.files.length) {
      setStatus(elements.workflowStatus, "No file changes detected.", "muted");
      return;
    }

    setStatus(
      elements.workflowStatus,
      `Ready to create a PR with ${state.pendingReview.files.length} changed file${
        state.pendingReview.files.length === 1 ? "" : "s"
      }.`,
      "success"
    );
  }

  function buildPendingReview() {
    const errors = [
      ...validateSchedules(),
      ...validateTrackedItems(),
      ...validateOpenHouses(),
    ];
    const files = [];
    const schedulePayload = buildManualSchedulesPayload();
    const trackedItemsPayload = buildTrackedItemsPayload();
    const openHousesPayload = buildOpenHousesPayload();

    const nextScheduleText = stringifyManualSchedules(schedulePayload);
    const nextTrackedItemsText = `${JSON.stringify(trackedItemsPayload, null, 2)}\n`;
    const nextOpenHousesText = `${JSON.stringify(openHousesPayload, null, 2)}\n`;

    const originalSchedulePayload = tryParseJson(state.originalFiles.schedules);
    const originalTrackedItemsPayload = tryParseJson(state.originalFiles.trackedItems);
    const originalOpenHousesPayload = tryParseJson(state.originalFiles.openHouses);

    if (!jsonDeepEqual(schedulePayload, originalSchedulePayload)) {
      files.push({
        path: FILE_PATHS.schedules,
        content: nextScheduleText,
        summary: `${Object.keys(schedulePayload).length} worlds`,
      });
    }

    if (!jsonDeepEqual(trackedItemsPayload, originalTrackedItemsPayload)) {
      files.push({
        path: FILE_PATHS.trackedItems,
        content: nextTrackedItemsText,
        summary: `${trackedItemsPayload.items.length} enabled items`,
      });
    }

    if (!jsonDeepEqual(openHousesPayload, originalOpenHousesPayload)) {
      files.push({
        path: FILE_PATHS.openHouses,
        content: nextOpenHousesText,
        summary: `${openHousesPayload.length} records`,
      });
    }

    return { errors, files };
  }

  function buildManualSchedulesPayload() {
    const payload = {};
    for (const worldName of [...state.scheduleOrder].sort(compareNormalizedText)) {
      const draft = state.schedules[worldName];
      if (!draft) continue;
      const sortedEntries = [...draft.entries]
        .sort(compareScheduleEntries)
        .map((entry, index) => ({
          execution_id: index + 1,
          schedule_time: String(entry.time || "").trim(),
          warzone_sequence: String(entry.order || "").trim(),
        }));
      payload[worldName] = {
        timezone: String(draft.timezone || DEFAULT_TIMEZONE).trim() || DEFAULT_TIMEZONE,
        warzone_executions: sortedEntries,
      };
    }
    return payload;
  }

  function buildTrackedItemsPayload() {
    return {
      items: state.trackedItems
        .filter((row) => row.enabled)
        .map((row) => {
          const byId = state.itemsById.get(String(row.itemId || "").trim());
          const byName = state.itemsByName.get(String(row.itemName || "").trim().toLowerCase());
          return byId?.name || byName?.name || String(row.itemName || "").trim();
        })
        .filter(Boolean),
    };
  }

  function buildOpenHousesPayload() {
    return state.openHouses
      .map((record) => {
        const normalized = {
          id:
            String(record.id || "").trim() ||
            buildOpenHouseId(record.world, record.houseName, record.ownerName),
          houseName: String(record.houseName || "").trim(),
          ownerName: String(record.ownerName || "").trim(),
          world: String(record.world || "").trim(),
          town: String(record.town || "").trim(),
          houseId: record.houseId == null ? null : Number(record.houseId),
          status: String(record.status || "").trim(),
          utilities: {
            exerciseDummies: Boolean(record.utilities.exerciseDummies),
            rewardShrine: Boolean(record.utilities.rewardShrine),
            imbuingShrine: Boolean(record.utilities.imbuingShrine),
            mailbox: Boolean(record.utilities.mailbox),
            hirelings: Array.isArray(record.utilities.hirelings)
              ? record.utilities.hirelings.map((hireling) => ({
                  type: String(hireling.type || "").trim(),
                  abilities: Array.isArray(hireling.abilities)
                    ? hireling.abilities.map((ability) => String(ability || "").trim()).filter(Boolean)
                    : [],
                }))
              : [],
          },
          source: {
            type: String(record.source.type || "manual").trim(),
            url: String(record.source.url || "").trim(),
            submitter: String(record.source.submitter || "").trim(),
            log: String(record.source.log || "").trim(),
            notes: String(record.source.notes || "").trim(),
            screenshotUrl: String(record.source.screenshotUrl || "").trim(),
            issueNumber: Number.isInteger(record.source.issueNumber) ? record.source.issueNumber : 0,
            issueTitle:
              String(record.source.issueTitle || "").trim() || "Manual maintainer update",
          },
        };

        for (const maybeDateKey of ["lastSeenOpen", "createdAt", "updatedAt"]) {
          const value = String(record[maybeDateKey] || "").trim();
          if (value) normalized[maybeDateKey] = value;
        }

        return normalized;
      })
      .sort(compareOpenHouseRecords);
  }

  async function createPullRequestWorkflow() {
    reviewPendingChanges();
    const review = state.pendingReview;

    if (!review || review.errors.length || !review.files.length) {
      return;
    }

    const token = state.token || elements.tokenInput.value.trim();
    if (!token) {
      setStatus(elements.workflowStatus, "Enter a GitHub token before creating a pull request.", "error");
      return;
    }

    setBusy(true);
    try {
      await ensureGithubConnection(token);
      const branchName = `maintainer-update-${formatBranchTimestamp(new Date())}`;
      state.currentWorkingBranch = branchName;
      renderAuth();

      await createGithubBranch(token, branchName);

      for (const file of review.files) {
        await updateGithubFile(token, branchName, file);
      }

      const pullRequest = await createGithubPullRequest(token, branchName, review.files);
      state.createdPullRequestUrl = pullRequest.html_url || pullRequest.url || "";

      setStatus(
        elements.workflowStatus,
        state.createdPullRequestUrl
          ? `Pull request created successfully: ${state.createdPullRequestUrl}`
          : "Pull request created successfully.",
        "success"
      );
    } catch (error) {
      setStatus(elements.workflowStatus, error.message || "GitHub workflow failed.", "error");
    } finally {
      setBusy(false);
    }
  }

  async function testGithubConnection() {
    const token = state.token || elements.tokenInput.value.trim();
    if (!token) {
      setStatus(elements.connectionStatus, "Enter a token before testing the connection.", "error");
      return;
    }

    setBusy(true);
    try {
      const connection = await ensureGithubConnection(token);
      state.connection = connection;
      setStatus(
        elements.connectionStatus,
        `Connected as @${connection.user.login}. Token can reach ${REPO_OWNER}/${REPO_NAME} on base branch ${BASE_BRANCH}.`,
        "success"
      );
    } catch (error) {
      setStatus(elements.connectionStatus, error.message || "Connection test failed.", "error");
    } finally {
      setBusy(false);
    }
  }

  async function ensureGithubConnection(token) {
    const user = await githubRequest("/user", { token });
    const repo = await githubRequest(`/repos/${REPO_OWNER}/${REPO_NAME}`, { token });
    return { user, repo };
  }

  async function createGithubBranch(token, branchName) {
    const ref = await githubRequest(
      `/repos/${REPO_OWNER}/${REPO_NAME}/git/ref/heads/${encodeURIComponent(BASE_BRANCH)}`,
      { token }
    );

    await githubRequest(`/repos/${REPO_OWNER}/${REPO_NAME}/git/refs`, {
      method: "POST",
      token,
      body: {
        ref: `refs/heads/${branchName}`,
        sha: ref.object.sha,
      },
    });
  }

  async function updateGithubFile(token, branchName, file) {
    const path = toGitHubContentPath(file.path);
    const current = await githubRequest(
      `/repos/${REPO_OWNER}/${REPO_NAME}/contents/${path}?ref=${encodeURIComponent(branchName)}`,
      { token }
    );

    await githubRequest(`/repos/${REPO_OWNER}/${REPO_NAME}/contents/${path}`, {
      method: "PUT",
      token,
      body: {
        message: `chore(admin): update ${file.path}`,
        content: toBase64Utf8(file.content),
        branch: branchName,
        sha: current.sha,
      },
    });
  }

  async function createGithubPullRequest(token, branchName, files) {
    const title = `chore: maintainer data update ${branchName.replace("maintainer-update-", "")}`;
    const body = buildPullRequestBody(branchName, files);
    return githubRequest(`/repos/${REPO_OWNER}/${REPO_NAME}/pulls`, {
      method: "POST",
      token,
      body: {
        title,
        head: branchName,
        base: BASE_BRANCH,
        body,
      },
    });
  }

  function buildPullRequestBody(branchName, files) {
    const summary = String(elements.prSummaryInput.value || "").trim();
    const scheduleNotes = collectScheduleNotes();
    const trackedItemNotes = collectTrackedItemNotes();
    const openHouseStats = collectOpenHouseStats();

    return [
      "## Maintainer Data Update",
      summary || "Updated repository source data through the browser-based maintainer editor.",
      "",
      "## Branch",
      `- ${branchName}`,
      "",
      "## Changed Files",
      ...files.map((file) => `- \`${file.path}\` (${file.summary})`),
      "",
      "## Schedule Notes",
      ...(scheduleNotes.length ? scheduleNotes.map((line) => `- ${line}`) : ["- No extra schedule notes supplied."]),
      "",
      "## Tracked Item Notes",
      ...(trackedItemNotes.length
        ? trackedItemNotes.map((line) => `- ${line}`)
        : ["- No extra tracked-item notes supplied."]),
      "",
      "## Open House Summary",
      `- Added: ${openHouseStats.added}`,
      `- Removed: ${openHouseStats.removed}`,
      `- Total records after edit: ${openHouseStats.total}`,
      "",
      "## Source File Scope",
      `- \`${FILE_PATHS.schedules}\``,
      `- \`${FILE_PATHS.trackedItems}\``,
      `- \`${FILE_PATHS.openHouses}\``,
      "",
      "Generated files remain untouched in this PR and should refresh through the existing GitHub Actions workflow after merge.",
    ].join("\n");
  }

  function collectScheduleNotes() {
    const notes = [];
    for (const worldName of state.scheduleOrder) {
      const draft = state.schedules[worldName];
      if (!draft) continue;
      draft.entries.forEach((entry, index) => {
        const extra = [entry.source, entry.notes].map((value) => String(value || "").trim()).filter(Boolean);
        if (!extra.length) return;
        notes.push(`${worldName} execution ${index + 1} (${entry.time || "no time"}): ${extra.join(" | ")}`);
      });
    }
    return notes;
  }

  function collectTrackedItemNotes() {
    return state.trackedItems
      .map((row) => {
        const resolvedName =
          state.itemsById.get(String(row.itemId || "").trim())?.name ||
          state.itemsByName.get(String(row.itemName || "").trim().toLowerCase())?.name ||
          row.itemName;
        const details = [row.category, row.notes].map((value) => String(value || "").trim()).filter(Boolean);
        if (!details.length && row.enabled) return "";
        return `${resolvedName || "Unnamed item"} (${row.enabled ? "enabled" : "disabled"}): ${
          details.length ? details.join(" | ") : "no extra notes"
        }`;
      })
      .filter(Boolean);
  }

  function collectOpenHouseStats() {
    const currentIds = new Set(
      buildOpenHousesPayload()
        .map((record) => record.id)
        .filter(Boolean)
    );
    const originalIds = new Set(
      JSON.parse(state.originalFiles.openHouses)
        .map((record) => record.id)
        .filter(Boolean)
    );

    let added = 0;
    let removed = 0;
    currentIds.forEach((id) => {
      if (!originalIds.has(id)) added += 1;
    });
    originalIds.forEach((id) => {
      if (!currentIds.has(id)) removed += 1;
    });
    return { added, removed, total: currentIds.size };
  }

  async function githubRequest(path, { method = "GET", token, body } = {}) {
    const response = await fetch(`${GITHUB_API_BASE}${path}`, {
      method,
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const rawText = await response.text();
    const payload = rawText ? tryParseJson(rawText) : null;

    if (!response.ok) {
      const errorMessage =
        payload?.message ||
        payload?.errors?.map((entry) => entry.message || entry.code).filter(Boolean).join("; ") ||
        rawText ||
        `GitHub API request failed with status ${response.status}`;
      throw new Error(errorMessage);
    }

    return payload;
  }

  function stringifyManualSchedules(payload) {
    const lines = ["{"];
    const worldNames = Object.keys(payload);

    worldNames.forEach((worldName, worldIndex) => {
      const draft = payload[worldName];
      lines.push(`  ${JSON.stringify(worldName)}: {`);
      lines.push(`    "timezone": ${JSON.stringify(draft.timezone)},`);
      lines.push(`    "warzone_executions": [`);
      draft.warzone_executions.forEach((entry, entryIndex) => {
        const executionLine = `      { "execution_id": ${entry.execution_id}, "schedule_time": ${JSON.stringify(
          entry.schedule_time
        )}, "warzone_sequence": ${JSON.stringify(entry.warzone_sequence)} }`;
        const suffix = entryIndex === draft.warzone_executions.length - 1 ? "" : ",";
        lines.push(`${executionLine}${suffix}`);
      });
      lines.push("    ]");
      lines.push(`  }${worldIndex === worldNames.length - 1 ? "" : ","}`);
    });

    lines.push("}");
    return `${lines.join("\n")}\n`;
  }

  function normalizeText(value) {
    return String(value || "")
      .trim()
      .replace(/\s+/g, " ")
      .toLowerCase();
  }

  function compareNormalizedText(left, right) {
    return normalizeText(left).localeCompare(normalizeText(right));
  }

  function scheduleTimeSortKey(value) {
    const text = String(value || "").trim();
    if (text === UNKNOWN_SCHEDULE_PLACEHOLDER) {
      return [1, 99, 99, text];
    }

    if (TIME_PATTERN.test(text)) {
      const hour = Number(text.slice(0, 2));
      const minute = Number(text.slice(3));
      if (hour <= 23 && minute <= 59) {
        return [0, hour, minute, text];
      }
    }

    return [1, 99, 99, text.toLowerCase()];
  }

  function compareScheduleEntries(left, right) {
    const leftKey = scheduleTimeSortKey(left?.time);
    const rightKey = scheduleTimeSortKey(right?.time);
    for (let index = 0; index < leftKey.length; index += 1) {
      if (leftKey[index] < rightKey[index]) return -1;
      if (leftKey[index] > rightKey[index]) return 1;
    }
    return Number(left?.executionId || 0) - Number(right?.executionId || 0);
  }

  function compareOpenHouseRecords(left, right) {
    const fields = ["world", "town", "houseName"];
    for (const fieldName of fields) {
      const result = compareNormalizedText(left?.[fieldName], right?.[fieldName]);
      if (result !== 0) return result;
    }
    return compareNormalizedText(left?.ownerName, right?.ownerName);
  }

  function normalizeOptionalString(value) {
    return value == null ? "" : String(value).trim();
  }

  function splitLines(value) {
    return String(value || "")
      .split(/\r?\n|,/)
      .map((entry) => entry.trim())
      .filter(Boolean);
  }

  function buildOpenHouseId(world, houseName, ownerName) {
    return [world, houseName, ownerName]
      .map((part) =>
        String(part || "")
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "")
      )
      .filter(Boolean)
      .join("-");
  }

  function setValueAtPath(target, path, value) {
    const segments = path.split(".");
    const finalKey = segments.pop();
    let cursor = target;
    segments.forEach((segment) => {
      if (!cursor[segment] || typeof cursor[segment] !== "object") {
        cursor[segment] = {};
      }
      cursor = cursor[segment];
    });
    cursor[finalKey] = value;
  }

  function parseNumberInput(value) {
    const trimmed = String(value || "").trim();
    if (!trimmed) return null;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
  }

  function setStatus(element, message, tone) {
    if (!element) return;
    element.className = `admin-status admin-status--${tone}`;
    element.textContent = message;
  }

  function setBusy(isBusy) {
    [
      elements.testConnectionButton,
      elements.clearTokenButton,
      elements.addScheduleWorldButton,
      elements.removeScheduleWorldButton,
      elements.addScheduleEntryButton,
      elements.addTrackedItemButton,
      elements.addOpenHouseButton,
      elements.removeOpenHouseButton,
      elements.reviewChangesButton,
      elements.createPullRequestButton,
    ].forEach((button) => {
      if (button) button.disabled = isBusy;
    });
  }

  async function fetchText(path) {
    const response = await fetch(path, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`Failed to load ${path}: ${response.status}`);
    }
    return response.text();
  }

  async function fetchJson(path) {
    const response = await fetch(path, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`Failed to load ${path}: ${response.status}`);
    }
    return response.json();
  }

  function tryParseJson(value) {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }

  function jsonDeepEqual(left, right) {
    return JSON.stringify(left) === JSON.stringify(right);
  }

  function toBase64Utf8(value) {
    const bytes = new TextEncoder().encode(value);
    let binary = "";
    bytes.forEach((byte) => {
      binary += String.fromCharCode(byte);
    });
    return btoa(binary);
  }

  function toGitHubContentPath(path) {
    return path
      .split("/")
      .map((segment) => encodeURIComponent(segment))
      .join("/");
  }

  function formatBranchTimestamp(date) {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, "0");
    const day = String(date.getUTCDate()).padStart(2, "0");
    const hour = String(date.getUTCHours()).padStart(2, "0");
    const minute = String(date.getUTCMinutes()).padStart(2, "0");
    const second = String(date.getUTCSeconds()).padStart(2, "0");
    return `${year}${month}${day}-${hour}${minute}${second}`;
  }

  function escapeAttribute(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  const TIME_PATTERN = /^\d{2}:\d{2}$/;
  const UNKNOWN_SCHEDULE_PLACEHOLDER = "??:00";
  const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}(?:[T ][^ ]+)?$/;
})();
