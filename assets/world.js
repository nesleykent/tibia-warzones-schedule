const WORLD_I18N = {
  en: {
    pageTitle: "Warzone History",
    subtitle: "Historical Warzone service records for the selected world.",
    back: "Back to overview",
    loadError: "Failed to load world history.",
    worldNotFound: "World not found.",
    summary: "Summary",
    schedules: "Manual schedule",
    history: "History",
    location: "Region",
    pvp: "PvP",
    transfer: "Transfer",
    battleye: "BattlEye",
    timezone: "Timezone",
    servicesCompleted: "Services completed",
    mark: "Mark",
    deathstrike: "Deathstrike",
    gnomevil: "Gnomevil",
    abyssador: "Abyssador",
    date: "Date",
    noSchedules: "No manual schedules registered yet.",
    noHistory: "No history recorded yet.",
    healthy: "Healthy",
    inconclusive: "Inconclusive",
    trolls: "Trolls",
  },
  "pt-BR": {
    pageTitle: "Histórico de Warzones",
    subtitle: "Registros históricos de services de Warzone do servidor selecionado.",
    back: "Voltar para a visão geral",
    loadError: "Falha ao carregar o histórico do servidor.",
    worldNotFound: "Servidor não encontrado.",
    summary: "Resumo",
    schedules: "Horários manuais",
    history: "Histórico",
    location: "Região",
    pvp: "PvP",
    transfer: "Transferência",
    battleye: "BattlEye",
    timezone: "Timezone",
    servicesCompleted: "Services concluídos",
    mark: "Marca",
    deathstrike: "Deathstrike",
    gnomevil: "Gnomevil",
    abyssador: "Abyssador",
    date: "Data",
    noSchedules: "Ainda não há horários manuais cadastrados.",
    noHistory: "Ainda não há histórico registrado.",
    healthy: "Healthy",
    inconclusive: "Inconclusivo",
    trolls: "Trolls",
  },
  "es-419": {
    pageTitle: "Historial de Warzones",
    subtitle: "Registros históricos de servicios de Warzone del mundo seleccionado.",
    back: "Volver al resumen",
    loadError: "Error al cargar el historial del servidor.",
    worldNotFound: "Servidor no encontrado.",
    summary: "Resumen",
    schedules: "Horario manual",
    history: "Historial",
    location: "Región",
    pvp: "PvP",
    transfer: "Transferencia",
    battleye: "BattlEye",
    timezone: "Zona horaria",
    servicesCompleted: "Servicios completados",
    mark: "Marca",
    deathstrike: "Deathstrike",
    gnomevil: "Gnomevil",
    abyssador: "Abyssador",
    date: "Fecha",
    noSchedules: "Todavía no hay horarios manuales registrados.",
    noHistory: "Todavía no hay historial registrado.",
    healthy: "Healthy",
    inconclusive: "Inconcluso",
    trolls: "Trolls",
  },
  pl: {
    pageTitle: "Historia Warzones",
    subtitle: "Historyczne rekordy usług Warzone dla wybranego serwera.",
    back: "Wróć do podglądu",
    loadError: "Nie udało się wczytać historii serwera.",
    worldNotFound: "Nie znaleziono serwera.",
    summary: "Podsumowanie",
    schedules: "Ręczny harmonogram",
    history: "Historia",
    location: "Region",
    pvp: "PvP",
    transfer: "Transfer",
    battleye: "BattlEye",
    timezone: "Strefa czasowa",
    servicesCompleted: "Ukończone usługi",
    mark: "Oznaczenie",
    deathstrike: "Deathstrike",
    gnomevil: "Gnomevil",
    abyssador: "Abyssador",
    date: "Data",
    noSchedules: "Nie ma jeszcze zapisanych ręcznych harmonogramów.",
    noHistory: "Nie ma jeszcze zapisanej historii.",
    healthy: "Healthy",
    inconclusive: "Niejednoznaczne",
    trolls: "Trolls",
  },
};

const {
  loadSavedTimezone,
  getTimezoneDisplayLabel,
  convertTimeBetweenTimezones: convertSharedTimeBetweenTimezones,
} = window.TibiaTime;

let worldLang = "pt-BR";
let pageTimezone = "UTC";

function getInitialLanguage() {
  try {
    const saved = localStorage.getItem("lang");
    if (saved && WORLD_I18N[saved]) return saved;
    const browser = navigator.language || "pt-BR";
    if (browser.startsWith("pt")) return "pt-BR";
    if (browser.startsWith("es")) return "es-419";
    if (browser.startsWith("pl")) return "pl";
    return "en";
  } catch {
    return "pt-BR";
  }
}

function t() {
  return WORLD_I18N[worldLang] || WORLD_I18N["pt-BR"];
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function slugifyWorldName(worldName) {
  return String(worldName || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function getMarkLabel(mark) {
  const dict = t();
  if (mark === "healthy") return dict.healthy;
  if (mark === "trolls") return dict.trolls;
  return dict.inconclusive;
}

function convertTimeBetweenTimezones(scheduleTime, sourceTimezone, targetTimezone) {
  return convertSharedTimeBetweenTimezones(
    scheduleTime,
    sourceTimezone,
    targetTimezone,
    worldLang
  );
}

function getTransferLabel(world) {
  const value = String(world.transfer_type || "").trim().toLowerCase();
  if (!value) return "N/A";
  if (value === "regular") return "Regular Transfer";
  if (value === "blocked") return "Blocked Transfer";
  if (value === "locked") return "Locked Transfer";
  return value;
}

function getBattleyeLabel(world) {
  if (world.battleye_date === "release") return "GBE";
  if (world.battleye_date) return "YBE";
  return "N/A";
}

function updateLanguageButtons() {
  document.querySelectorAll(".lang-flag").forEach((btn) => {
    const active = btn.dataset.lang === worldLang;
    btn.classList.toggle("is-active", active);
    btn.setAttribute("aria-pressed", active ? "true" : "false");
  });
}

function applyStaticLabels() {
  const dict = t();
  document.title = dict.pageTitle;
  const back = document.getElementById("backToIndex");
  if (back) back.textContent = dict.back;
  const subtitle = document.getElementById("worldSubtitle");
  if (subtitle) subtitle.textContent = dict.subtitle;
}

function renderEmptyCard(title, body) {
  return `
    <div class="world-detail-card-header">
      <h2>${escapeHtml(title)}</h2>
    </div>
    <p class="world-detail-empty">${escapeHtml(body)}</p>
  `;
}

function renderSummary(world) {
  const dict = t();
  const kills = world.last_detected_kills || {};
  const services = Number(world.last_detected_services || 0);

  return `
    <div class="world-detail-card-header">
      <h2>${escapeHtml(dict.summary)}</h2>
    </div>
    <div class="world-detail-grid">
      <div class="world-detail-stat"><span>${escapeHtml(dict.location)}</span><strong>${escapeHtml(world.location || "N/A")}</strong></div>
      <div class="world-detail-stat"><span>${escapeHtml(dict.pvp)}</span><strong>${escapeHtml(world.pvp_type || "N/A")}</strong></div>
      <div class="world-detail-stat"><span>${escapeHtml(dict.transfer)}</span><strong>${escapeHtml(getTransferLabel(world))}</strong></div>
      <div class="world-detail-stat"><span>${escapeHtml(dict.battleye)}</span><strong>${escapeHtml(getBattleyeLabel(world))}</strong></div>
      <div class="world-detail-stat"><span>${escapeHtml(dict.timezone)}</span><strong>${escapeHtml(getTimezoneDisplayLabel(pageTimezone))}</strong></div>
      <div class="world-detail-stat"><span>${escapeHtml(dict.servicesCompleted)}</span><strong>${escapeHtml(String(services))}</strong></div>
      <div class="world-detail-stat"><span>${escapeHtml(dict.mark)}</span><strong>${escapeHtml(getMarkLabel(world.mark))}</strong></div>
      <div class="world-detail-stat"><span>${escapeHtml(dict.deathstrike)}</span><strong>${escapeHtml(String(kills.Deathstrike || 0))}</strong></div>
      <div class="world-detail-stat"><span>${escapeHtml(dict.gnomevil)}</span><strong>${escapeHtml(String(kills.Gnomevil || 0))}</strong></div>
      <div class="world-detail-stat"><span>${escapeHtml(dict.abyssador)}</span><strong>${escapeHtml(String(kills.Abyssador || 0))}</strong></div>
    </div>
  `;
}

function renderSchedules(world) {
  const dict = t();
  const executions = Array.isArray(world.warzone_executions)
    ? world.warzone_executions
    : [];

  if (executions.length === 0) {
    return renderEmptyCard(dict.schedules, dict.noSchedules);
  }

  const items = executions
    .slice()
    .sort((a, b) => Number(a.execution_id || 0) - Number(b.execution_id || 0))
    .map((execution) => {
      const shownTime = convertTimeBetweenTimezones(
        execution.schedule_time,
        world.timezone,
        pageTimezone
      );
      return `
        <li class="world-schedule-item">
          <span class="world-schedule-time">${escapeHtml(shownTime || "N/A")}</span>
          <span class="world-schedule-seq">${escapeHtml(execution.warzone_sequence || "-")}</span>
        </li>
      `
    })
    .join("");

  return `
    <div class="world-detail-card-header">
      <h2>${escapeHtml(dict.schedules)}</h2>
      <span class="world-detail-inline-note">${escapeHtml(
        getTimezoneDisplayLabel(pageTimezone)
      )}</span>
    </div>
    <ul class="world-schedule-list">${items}</ul>
  `;
}

function renderHistory(historyData) {
  const dict = t();
  const items = Array.isArray(historyData?.history) ? historyData.history : [];

  if (items.length === 0) {
    return renderEmptyCard(dict.history, dict.noHistory);
  }

  const rows = items
    .map(
      (item) => `
        <tr>
          <td>${escapeHtml(item.date || "")}</td>
          <td>${escapeHtml(String(item.deathstrike_kills || 0))}</td>
          <td>${escapeHtml(String(item.gnomevil_kills || 0))}</td>
          <td>${escapeHtml(String(item.abyssador_kills || 0))}</td>
          <td>${escapeHtml(String(item.services_completed || 0))}</td>
          <td>${escapeHtml(getMarkLabel(item.mark))}</td>
        </tr>
      `
    )
    .join("");

  return `
    <div class="world-detail-card-header">
      <h2>${escapeHtml(dict.history)}</h2>
    </div>
    <div class="world-history-table-wrap">
      <table class="world-history-table">
        <thead>
          <tr>
            <th>${escapeHtml(dict.date)}</th>
            <th>${escapeHtml(dict.deathstrike)}</th>
            <th>${escapeHtml(dict.gnomevil)}</th>
            <th>${escapeHtml(dict.abyssador)}</th>
            <th>${escapeHtml(dict.servicesCompleted)}</th>
            <th>${escapeHtml(dict.mark)}</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

async function loadWorldPage() {
  const dict = t();
  const params = new URLSearchParams(window.location.search);
  const worldName = params.get("name");
  const summaryCard = document.getElementById("worldSummaryCard");
  const schedulesCard = document.getElementById("worldSchedulesCard");
  const historyCard = document.getElementById("worldHistoryCard");

  if (!worldName || !summaryCard || !schedulesCard || !historyCard) {
    if (summaryCard) summaryCard.innerHTML = renderEmptyCard(dict.summary, dict.worldNotFound);
    return;
  }

  try {
    const worldsResponse = await fetch("./data/worlds.json");
    if (!worldsResponse.ok) throw new Error(String(worldsResponse.status));
    const worlds = await worldsResponse.json();
    const world = Array.isArray(worlds)
      ? worlds.find((item) => item && item.name === worldName)
      : null;

    if (!world) {
      summaryCard.innerHTML = renderEmptyCard(dict.summary, dict.worldNotFound);
      schedulesCard.innerHTML = "";
      historyCard.innerHTML = "";
      return;
    }

    document.getElementById("worldTitle").textContent = world.name;
    summaryCard.innerHTML = renderSummary(world);
    schedulesCard.innerHTML = renderSchedules(world);

    const historyResponse = await fetch(
      "./data/history/" + slugifyWorldName(world.name) + ".json"
    );
    let historyData = { history: [] };
    if (historyResponse.ok) {
      historyData = await historyResponse.json();
    }
    historyCard.innerHTML = renderHistory(historyData);
  } catch {
    summaryCard.innerHTML = renderEmptyCard(dict.summary, dict.loadError);
    schedulesCard.innerHTML = "";
    historyCard.innerHTML = "";
  }
}

function bindLanguageButtons() {
  document.querySelectorAll(".lang-flag").forEach((btn) => {
    btn.onclick = () => {
      if (!btn.dataset.lang) return;
      worldLang = btn.dataset.lang;
      try {
        localStorage.setItem("lang", worldLang);
      } catch {}
      applyStaticLabels();
      updateLanguageButtons();
      loadWorldPage();
    };
  });
}

function initWorldPage() {
  worldLang = getInitialLanguage();
  pageTimezone = loadSavedTimezone();
  applyStaticLabels();
  updateLanguageButtons();
  bindLanguageButtons();
  loadWorldPage();
}

initWorldPage();
