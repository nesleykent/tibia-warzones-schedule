// ─────────────────────────────────────────────
//  Tibia Warzones — app.js
// ─────────────────────────────────────────────

const {
  DEFAULT_TIMEZONE,
  GITHUB_ISSUES_URL,
  SUPPORTED_TIMEZONES,
  WORLDS_DATA_PATH,
  escapeHtml,
  fetchJson,
  formatTransferType,
  getEffectiveWorldMark,
  getInitialLanguage: getSharedInitialLanguage,
  getNormalizedBossKills,
  initSharedUi,
  loadSavedTimezone,
  readStorage,
  setTextContent,
  getWorldBattleyeKey,
  getWorldBattleyeLabel,
  getWorldMarkLabel,
  getTimezoneDisplayLabel,
  getWorldTransferLabel,
  resolveTimezoneValue,
  writeStorage,
  convertTimeBetweenTimezones: convertSharedTimeBetweenTimezones,
} = window.TibiaTime;

const STORAGE_KEYS = {
  activeFilters: "activeFilters",
  alertOffset: "alertOffset",
  lang: "lang",
  masterVolume: "masterVolume",
  notificationsEnabled: "notificationsEnabled",
  selectedExecutions: "selectedExecutions",
  selectedSound: "selectedSound",
  timezone: "tz",
};

const I18N = {
  en: {
    pageTitle: "Tibia Warzones Schedule",
    heroTitle: "Tibia Warzones Schedule",
    heroSubtitle:
      "Warzone services inferred from Deathstrike, Gnomevil, and Abyssador kill statistics.",
    questLinksLabel: "Bigfoot's Burden:",
    search: "Search server",
    timezone: "Show times in",
    summary: (total, activeWorlds, withSchedules, tzLabel) =>
      `Tibia's got ${total} worlds atm. ${activeWorlds} ran warzones services, and we know the schedule for ${withSchedules} of them. Timezone's ${tzLabel}.`,
    warzones: "Warzones",
    region: "Region",
    pvp: "PvP",
    transfer: "Transfer",
    battleye: "BattlEye",
    services: "Services",
    servicesCompleted: "Services completed",
    noSchedules: "No services registered yet",
    reportIssueCta: "If you know any, just report it on",
    noServersFound: "No servers found",
    notAvailable: "N/A",
    loadError: "Failed to load worlds.json",
    schedulePanel: "Warzones",
    noSelection: "Select servers on the cards to build your schedule.",
    notifyOn: "Sound on",
    notifyOff: "Sound off",
    selectServer: "Select",
    selectedServer: "Selected",
    copySchedule: "Copy",
    copied: "Copied!",
    nextWarzone: "Next warzone",
    inMinutes: (n) => `in ${n} min`,
    inSeconds: (n) => `in ${n}s`,
    now: "NOW",
    noUpcoming: "No upcoming warzones today",
    alertBefore: "Alert",
    alertBeforeMin: (n) => `${n} min before`,
    notifyBodyBefore: (min, name, seq) =>
      `${name}${seq ? ` (${seq})` : ""} in ${min} min`,
    notifyBodyNow: (name, seq) =>
      `${name}${seq ? ` (${seq})` : ""} — starting now!`,
    pastLabel: "done",
    testSound: "Test",
    volume: "Volume",
    filterRegion: "Region",
    filterPvp: "PvP Type",
    filterBattleye: "BattlEye",
    filterTransfer: "Transfer",
    filterAll: "All",
    filterLabel: "Filters",
    warzonePlannerLabel: "Warzone Planner",
    clearFilters: "Clear filters",
    bgeLabel: "Green BattlEye",
    ybeLabel: "Yellow BattlEye",
    noneLabel: "None",
    tooltipClose: "Close",
    tooltipRemove: "Remove",
    tooltipAddExec: "Add to schedule",
    tooltipRemoveExec: "Remove from schedule",
    tooltipClearPlanner: "Clear planner",
    tooltipPickSound: "Choose sound",
    tooltipAlertMinus: "Decrease",
    tooltipAlertPlus: "Increase",
    conflictWarn: "Some warzones are <20 min apart — tight but possible!",
    noAudio: "No audio",
    searchPlaceholder: "Server name…",
    deathstrike: "Deathstrike",
    gnomevil: "Gnomevil",
    abyssador: "Abyssador",
    mark: "Mark",
    healthy: "Healthy",
    inconclusive: "Inconclusive",
    trolls: "Trolls",
    history: "History",
    viewHistory: "View history",
    servicesTooltip: (d, g, a) =>
      `Deathstrike kills: ${d}\nGnomevil kills: ${g}\nAbyssador kills: ${a}`,
    scheduleCount: (count) => `${count} schedules`,
    noServicesLabel: "No services",
  },
  "pt-BR": {
    pageTitle: "Tibia Warzones Schedule",
    heroTitle: "Tibia Warzones Schedule",
    heroSubtitle:
      "Services de Warzone inferidos pelas kills de Deathstrike, Gnomevil e Abyssador.",
    questLinksLabel: "Bigfoot's Burden:",
    search: "Buscar servidor",
    timezone: "Exibir horários em",
    summary: (total, activeWorlds, withSchedules, tzLabel) =>
      `Tibia tem ${total} mundos no momento. ${activeWorlds} rodaram services de warzone, e a gente conhece o horário de ${withSchedules} deles. Timezone: ${tzLabel}.`,
    warzones: "Warzones",
    region: "Região",
    pvp: "PvP",
    transfer: "Transferência",
    battleye: "BattlEye",
    services: "Services",
    servicesCompleted: "Services concluídos",
    noSchedules: "Ainda não há nenhum service cadastrado",
    reportIssueCta: "Se souber de algum, reporte no",
    noServersFound: "Nenhum servidor encontrado",
    notAvailable: "N/D",
    loadError: "Falha ao carregar worlds.json",
    schedulePanel: "Warzones",
    noSelection: "Selecione servidores nos cards para montar sua agenda.",
    notifyOn: "Som ativo",
    notifyOff: "Som desativado",
    selectServer: "Selecionar",
    selectedServer: "Selecionado",
    copySchedule: "Copiar",
    copied: "Copiado!",
    nextWarzone: "Próxima warzone",
    inMinutes: (n) => `em ${n} min`,
    inSeconds: (n) => `em ${n}s`,
    now: "AGORA",
    noUpcoming: "Sem warzones hoje",
    alertBefore: "Avisar",
    alertBeforeMin: (n) => `${n} min antes`,
    notifyBodyBefore: (min, name, seq) =>
      `${name}${seq ? ` (${seq})` : ""} em ${min} min`,
    notifyBodyNow: (name, seq) =>
      `${name}${seq ? ` (${seq})` : ""} — começando agora!`,
    pastLabel: "feito",
    testSound: "Testar",
    volume: "Volume",
    filterRegion: "Região",
    filterPvp: "Tipo PvP",
    filterBattleye: "BattlEye",
    filterTransfer: "Transferência",
    filterAll: "Todos",
    filterLabel: "Filtros",
    warzonePlannerLabel: "Warzone Planner",
    clearFilters: "Limpar filtros",
    bgeLabel: "Green BattlEye",
    ybeLabel: "Yellow BattlEye",
    noneLabel: "Nenhum",
    tooltipClose: "Close",
    tooltipRemove: "Remove",
    tooltipAddExec: "Add to schedule",
    tooltipRemoveExec: "Remove from schedule",
    tooltipClearPlanner: "Clear planner",
    tooltipPickSound: "Choose sound",
    tooltipAlertMinus: "Decrease",
    tooltipAlertPlus: "Increase",
    conflictWarn: "Some warzones are <20 min apart — tight but possible!",
    noAudio: "No audio",
    searchPlaceholder: "Server name…",
    deathstrike: "Deathstrike",
    gnomevil: "Gnomevil",
    abyssador: "Abyssador",
    mark: "Marca",
    healthy: "Healthy",
    inconclusive: "Inconclusivo",
    trolls: "Trolls",
    history: "Histórico",
    viewHistory: "Ver histórico",
    servicesTooltip: (d, g, a) =>
      `Kills de Deathstrike: ${d}\nKills de Gnomevil: ${g}\nKills de Abyssador: ${a}`,
    scheduleCount: (count) => `${count} horários`,
    noServicesLabel: "Sem services",
  },
  "es-419": {
    pageTitle: "Tibia Warzones Schedule",
    heroTitle: "Tibia Warzones Schedule",
    heroSubtitle:
      "Servicios de Warzone inferidos por las muertes de Deathstrike, Gnomevil y Abyssador.",
    questLinksLabel: "Bigfoot's Burden:",
    search: "Buscar servidor",
    timezone: "Mostrar horarios en",
    summary: (total, activeWorlds, withSchedules, tzLabel) =>
      `Tibia tiene ${total} mundos ahora mismo. ${activeWorlds} hicieron servicios de warzone, y conocemos el horario de ${withSchedules} de ellos. Zona horaria: ${tzLabel}.`,
    warzones: "Warzones",
    region: "Región",
    pvp: "PvP",
    transfer: "Transferencia",
    battleye: "BattlEye",
    services: "Services",
    servicesCompleted: "Servicios completados",
    noSchedules: "Aún no hay ningún service registrado",
    reportIssueCta: "Si sabes alguno, repórtalo en",
    noServersFound: "No se encontraron servidores",
    notAvailable: "N/D",
    loadError: "Error al cargar worlds.json",
    schedulePanel: "Warzones",
    noSelection: "Selecciona servidores en las tarjetas para ver el resumen.",
    notifyOn: "Sonido activo",
    notifyOff: "Sonido desactivado",
    selectServer: "Seleccionar",
    selectedServer: "Seleccionado",
    copySchedule: "Copiar",
    copied: "¡Copiado!",
    nextWarzone: "Próxima warzone",
    inMinutes: (n) => `en ${n} min`,
    inSeconds: (n) => `en ${n}s`,
    now: "AHORA",
    noUpcoming: "Sin warzones hoy",
    alertBefore: "Avisar",
    alertBeforeMin: (n) => `${n} min antes`,
    notifyBodyBefore: (min, name, seq) =>
      `${name}${seq ? ` (${seq})` : ""} en ${min} min`,
    notifyBodyNow: (name, seq) =>
      `${name}${seq ? ` (${seq})` : ""} — ¡empieza ahora!`,
    pastLabel: "listo",
    testSound: "Probar",
    volume: "Volumen",
    filterRegion: "Región",
    filterPvp: "Tipo PvP",
    filterBattleye: "BattlEye",
    filterTransfer: "Transferencia",
    filterAll: "Todos",
    filterLabel: "Filtros",
    warzonePlannerLabel: "Warzone Planner",
    bgeLabel: "Green BattlEye",
    ybeLabel: "Yellow BattlEye",
    noneLabel: "Ninguno",
    tooltipClose: "Close",
    tooltipRemove: "Remove",
    tooltipAddExec: "Add to schedule",
    tooltipRemoveExec: "Remove from schedule",
    tooltipClearPlanner: "Clear planner",
    tooltipPickSound: "Choose sound",
    tooltipAlertMinus: "Decrease",
    tooltipAlertPlus: "Increase",
    conflictWarn: "Some warzones are <20 min apart — tight but possible!",
    noAudio: "No audio",
    searchPlaceholder: "Server name…",
    deathstrike: "Deathstrike",
    gnomevil: "Gnomevil",
    abyssador: "Abyssador",
    mark: "Marca",
    healthy: "Healthy",
    inconclusive: "Inconcluso",
    trolls: "Trolls",
    history: "Historial",
    viewHistory: "Ver historial",
    servicesTooltip: (d, g, a) =>
      `Muertes de Deathstrike: ${d}\nMuertes de Gnomevil: ${g}\nMuertes de Abyssador: ${a}`,
    scheduleCount: (count) => `${count} horarios`,
    noServicesLabel: "Sin services",
  },
  pl: {
    pageTitle: "Tibia Warzones Schedule",
    heroTitle: "Tibia Warzones Schedule",
    heroSubtitle:
      "Usługi Warzone wyliczone na podstawie zabójstw Deathstrike, Gnomevil i Abyssador.",
    questLinksLabel: "Bigfoot's Burden:",
    search: "Szukaj serwera",
    timezone: "Pokaż godziny w",
    summary: (total, activeWorlds, withSchedules, tzLabel) =>
      `Tibia ma teraz ${total} światy. ${activeWorlds} miało usługi warzone, a harmonogram znamy dla ${withSchedules} z nich. Strefa czasowa: ${tzLabel}.`,
    warzones: "Warzones",
    region: "Region",
    pvp: "PvP",
    transfer: "Transfer",
    battleye: "BattlEye",
    services: "Services",
    servicesCompleted: "Ukończone usługi",
    noSchedules: "Nie ma jeszcze żadnego zarejestrowanego service",
    reportIssueCta: "Jesli znasz jakis termin, zglos go na",
    noServersFound: "Nie znaleziono serwerów",
    notAvailable: "Brak",
    loadError: "Nie udało się wczytać worlds.json",
    schedulePanel: "Warzones",
    noSelection: "Zaznacz serwery na kartach, aby zobaczyć harmonogram.",
    notifyOn: "Dźwięk włączony",
    notifyOff: "Dźwięk wyłączony",
    selectServer: "Wybierz",
    selectedServer: "Wybrany",
    copySchedule: "Kopiuj",
    copied: "Skopiowano!",
    nextWarzone: "Następna warzone",
    inMinutes: (n) => `za ${n} min`,
    inSeconds: (n) => `za ${n}s`,
    now: "TERAZ",
    noUpcoming: "Brak warzones na dziś",
    alertBefore: "Powiadom",
    alertBeforeMin: (n) => `${n} min wcześniej`,
    notifyBodyBefore: (min, name, seq) =>
      `${name}${seq ? ` (${seq})` : ""} za ${min} min`,
    notifyBodyNow: (name, seq) =>
      `${name}${seq ? ` (${seq})` : ""} — zaczyna się teraz!`,
    pastLabel: "gotowe",
    testSound: "Testuj",
    volume: "Głośność",
    filterRegion: "Region",
    filterPvp: "Typ PvP",
    filterBattleye: "BattlEye",
    filterTransfer: "Transfer",
    filterAll: "Wszystkie",
    filterLabel: "Filtry",
    warzonePlannerLabel: "Warzone Planner",
    clearFilters: "Wyczyść filtry",
    bgeLabel: "Green BattlEye",
    ybeLabel: "Yellow BattlEye",
    noneLabel: "Brak",
    tooltipClose: "Close",
    tooltipRemove: "Remove",
    tooltipAddExec: "Add to schedule",
    tooltipRemoveExec: "Remove from schedule",
    tooltipClearPlanner: "Clear planner",
    tooltipPickSound: "Choose sound",
    tooltipAlertMinus: "Decrease",
    tooltipAlertPlus: "Increase",
    conflictWarn: "Some warzones are <20 min apart — tight but possible!",
    noAudio: "No audio",
    searchPlaceholder: "Server name…",
    deathstrike: "Deathstrike",
    gnomevil: "Gnomevil",
    abyssador: "Abyssador",
    mark: "Oznaczenie",
    healthy: "Healthy",
    inconclusive: "Niejednoznaczne",
    trolls: "Trolls",
    history: "Historia",
    viewHistory: "Zobacz historię",
    servicesTooltip: (d, g, a) =>
      `Zabójstwa Deathstrike: ${d}\nZabójstwa Gnomevil: ${g}\nZabójstwa Abyssador: ${a}`,
    scheduleCount: (count) => `${count} harmonogramy`,
    noServicesLabel: "Brak services",
  },
};

// ─── State ───────────────────────────────────────────
let worlds = [];
let timezone = "UTC";
let lang = "pt-BR";

// Keys: "worldName|executionId"
let selectedExecutions = new Set();

// ─── Filter state ─────────────────────────────────
let activeFilters = {
  region:   new Set(), // e.g. "South America", "Europe", "North America"
  pvp:      new Set(), // e.g. "Open PvP", "Optional PvP", "Retro Open PvP", "Retro Hardcore PvP", "Hardcore PvP"
  battleye: new Set(), // "GBE", "YBE", "none"
  transfer: new Set(), // "Regular", "Blocked", "Locked"
};

function execKey(worldName, execId) {
  return worldName + "|" + execId;
}
let notificationsEnabled = false;
let alertOffsetMinutes = 5;
let selectedSound = "serversave";
let masterVolume = 0.5; // 0.0–1.0

const SOUNDS = [
  { id: "achievements", label: "Achievements" },
  { id: "findfiend", label: "Find Fiend" },
  { id: "globalevent", label: "Global Event" },
  { id: "levelup", label: "Level Up" },
  { id: "serversave", label: "Server Save" },
  { id: "vipoff", label: "Vip Off" },
  { id: "vipon", label: "Vip On" },
];

let firedNotifications = new Set();
let firedDay = "";

let tickInterval = null;
let lastTickMin = -1;

let _soundPickerCloseHandler = null;

// ─── Audio ───────────────────────────────────────────
let audioCtx = null;
let audioBuffer = null;
let audioLoadError = false;

function getAudioContext() {
  if (!audioCtx) {
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    } catch {
      return null;
    }
  }
  return audioCtx;
}

async function loadAudio(forceReload) {
  if (audioBuffer && !forceReload) return;
  audioLoadError = false;
  audioBuffer = null;
  const ctx = getAudioContext();
  if (!ctx) {
    audioLoadError = true;
    return;
  }
  try {
    const res = await fetch("./assets/sounds/" + selectedSound + ".m4a");
    if (!res.ok) throw new Error("audio 404");
    const buf = await res.arrayBuffer();
    audioBuffer = await ctx.decodeAudioData(buf);
  } catch {
    audioLoadError = true;
  }
}

function playSound() {
  const ctx = getAudioContext();
  if (!ctx || !audioBuffer) return;
  if (ctx.state === "suspended") ctx.resume();
  const src = ctx.createBufferSource();
  src.buffer = audioBuffer;
  const gain = ctx.createGain();
  gain.gain.value = masterVolume;
  src.connect(gain);
  gain.connect(ctx.destination);
  src.start(0);
}

// ─── Time helpers ────────────────────────────────────

function nowMinutesInTZ(tz) {
  const now = new Date();
  const resolvedTimezone = resolveTimezoneValue(tz);
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: resolvedTimezone,
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(now);
    const h = Number(parts.find((p) => p.type === "hour")?.value || 0);
    const m = Number(parts.find((p) => p.type === "minute")?.value || 0);
    return h * 60 + m;
  } catch {
    return now.getHours() * 60 + now.getMinutes();
  }
}

function nowSecondsInTZ(tz) {
  const now = new Date();
  const resolvedTimezone = resolveTimezoneValue(tz);
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: resolvedTimezone,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    }).formatToParts(now);
    return Number(parts.find((p) => p.type === "second")?.value || 0);
  } catch {
    return now.getSeconds();
  }
}

function hhmm2min(hhmm) {
  const [h, m] = String(hhmm).split(":").map(Number);
  return h * 60 + m;
}

function todayKeyInTZ(tz) {
  const resolvedTimezone = resolveTimezoneValue(tz);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: resolvedTimezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

// ─── Build schedule entries ──────────────────────────

function buildScheduleEntries() {
  const entries = [];
  for (const world of worlds) {
    if (!Array.isArray(world.warzone_executions)) continue;
    for (const ex of world.warzone_executions) {
      const key = execKey(world.name, ex.execution_id);
      if (!selectedExecutions.has(key)) continue;
      const converted = convertTimeBetweenTimezones(
        ex.schedule_time,
        world.timezone,
        timezone
      );
      if (!converted) continue;
      entries.push({
        name: world.name,
        sequence: ex.warzone_sequence || "",
        timeStr: converted,
        totalMin: hhmm2min(converted),
        execId: ex.execution_id,
      });
    }
  }
  entries.sort((a, b) => a.totalMin - b.totalMin);
  return entries;
}

// ─── Notifications ───────────────────────────────────

function checkNotifications() {
  if (!notificationsEnabled) return;
  if (selectedExecutions.size === 0) return;

  const todayKey = todayKeyInTZ(timezone);
  if (firedDay !== todayKey) {
    firedNotifications = new Set();
    firedDay = todayKey;
  }

  const nowMin = nowMinutesInTZ(timezone);
  const entries = buildScheduleEntries();

  for (const entry of entries) {
    fireIfDue(entry, 0, nowMin);
    if (alertOffsetMinutes > 0) fireIfDue(entry, alertOffsetMinutes, nowMin);
  }
}

function fireIfDue(entry, offsetMin, nowMin) {
  const triggerMin = entry.totalMin - offsetMin;
  if (triggerMin < 0) return;
  if (nowMin !== triggerMin) return;
  const key = `${entry.name}|${entry.timeStr}|${offsetMin}`;
  if (firedNotifications.has(key)) return;
  firedNotifications.add(key);
  playSound();
  showToast(entry, offsetMin);
}

function showToast(entry, offsetMin) {
  const dict = t();
  const msg =
    offsetMin > 0
      ? dict.notifyBodyBefore(offsetMin, entry.name, entry.sequence)
      : dict.notifyBodyNow(entry.name, entry.sequence);

  document.querySelector(".warzone-toast")?.remove();

  const toast = document.createElement("div");
  toast.className = "warzone-toast";
  toast.innerHTML = `
    <span class="toast-icon">⚔️</span>
    <span class="toast-text">${escapeHtml(msg)}</span>
    <button type="button" class="toast-close" aria-label="${escapeHtml(dict.tooltipClose)}">✕</button>
  `;
  toast.querySelector(".toast-close").onclick = () => toast.remove();
  document.body.appendChild(toast);
  setTimeout(() => toast?.remove(), 8000);
  requestAnimationFrame(() => toast.classList.add("is-visible"));
}

// ─── Clock ───────────────────────────────────────────

function getCurrentTimeStr(tz) {
  const resolvedTimezone = resolveTimezoneValue(tz);
  try {
    return new Intl.DateTimeFormat("en-GB", {
      timeZone: resolvedTimezone,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    }).format(new Date());
  } catch {
    return new Date().toTimeString().slice(0, 8);
  }
}

function updateClock() {
  const el = document.getElementById("liveClock");
  if (el) el.textContent = getCurrentTimeStr(timezone);
}

// ─── Next warzone bar ────────────────────────────────

function updateCountdownPanel() {
  const panel = document.getElementById("nextWarzoneBar");
  if (!panel) return;
  if (selectedExecutions.size === 0) {
    panel.style.display = "none";
    return;
  }

  const entries = buildScheduleEntries();
  if (entries.length === 0) {
    panel.style.display = "none";
    return;
  }

  const nowMin = nowMinutesInTZ(timezone);
  const nowSec = nowSecondsInTZ(timezone);
  const dict = t();

  // Separate into happening-now (within 0..59s after scheduled minute) and upcoming
  const upcoming = entries.filter((e) => e.totalMin >= nowMin);
  let current = null;
  let next = null;

  if (upcoming.length > 0) {
    const first = upcoming[0];
    // "now" = scheduled minute matches current minute
    if (first.totalMin === nowMin) {
      current = first;
      next = upcoming[1] || null;
    } else {
      next = first;
    }
  }

  let html = "";

  if (current) {
    const seq = current.sequence ? ` (${current.sequence})` : "";
    html += `<div class="next-wz-item next-wz-now">
      <span class="next-wz-pill now-pill">${escapeHtml(dict.now)}</span>
      <span class="next-wz-entry">
        <span class="next-wz-time">${escapeHtml(current.timeStr)}</span>
        <span class="next-wz-name">${escapeHtml(current.name)}${escapeHtml(
      seq
    )}</span>
      </span>
    </div>`;
  }

  if (next) {
    const diffSec = Math.max(1, (next.totalMin - nowMin) * 60 - nowSec);
    const diffMinRound = Math.ceil(diffSec / 60);
    const seq = next.sequence ? ` (${next.sequence})` : "";
    const showCountdown = diffMinRound < 60;
    const timeLabel =
      diffSec < 60
        ? dict.inSeconds(Math.ceil(diffSec))
        : dict.inMinutes(diffMinRound);
    const isUrgent =
      showCountdown &&
      diffMinRound <= alertOffsetMinutes &&
      alertOffsetMinutes > 0;
    const urgentClass = isUrgent ? " next-wz-urgent" : "";
    const countdownHtml = showCountdown
      ? `<span class="next-wz-countdown">${escapeHtml(timeLabel)}</span>`
      : "";

    html += `<div class="next-wz-item${urgentClass}">
      <span class="next-wz-label">${escapeHtml(dict.nextWarzone)}</span>
      <span class="next-wz-entry">
        <span class="next-wz-time">${escapeHtml(next.timeStr)}</span>
        <span class="next-wz-name">${escapeHtml(next.name)}${escapeHtml(
      seq
    )}</span>
        ${countdownHtml}
      </span>
    </div>`;
  } else if (!current) {
    html += `<div class="next-wz-item next-wz-empty">
      <span class="next-wz-label">${escapeHtml(dict.noUpcoming)}</span>
    </div>`;
  }

  // If panel was previously hidden, clear stale content so toolbar gets built fresh
  if (panel.style.display === "none") {
    panel.innerHTML = "";
  }

  panel.style.display = "";

  // Build or reuse stable sub-elements — toolbar must NOT be re-rendered every tick
  let contentEl = panel.querySelector(".next-wz-content");

  if (!contentEl) {
    // First render — build full structure once
    panel.innerHTML = `
      <div class="next-wz-content"></div>
      <div class="next-wz-sep"></div>
      ${buildNotifyToolbarHtml()}
    `;
    bindNotifyToolbarEvents(panel);
    contentEl = panel.querySelector(".next-wz-content");
  }

  // Only update the countdown portion each tick
  contentEl.innerHTML = html;
}

function refreshNotifyToolbar() {
  const panel = document.getElementById("nextWarzoneBar");
  if (!panel) return;
  const toolbarEl = panel.querySelector(".schedule-toolbar");
  if (!toolbarEl) return;
  toolbarEl.outerHTML = buildNotifyToolbarHtml();
  bindNotifyToolbarEvents(panel);
}

function buildNotifyToolbarHtml() {
  const dict = t();
  const notifyIcon = notificationsEnabled
    ? `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>`
    : `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/><line x1="2" y1="2" x2="22" y2="22"/></svg>`;
  const notifyLabel = notificationsEnabled ? dict.notifyOn : dict.notifyOff;
  const notifyActive = notificationsEnabled ? "is-active" : "";
  const offsetLabel = alertOffsetMinutes > 0 ? alertOffsetMinutes + "m" : "off";
  const soundOptions = SOUNDS.map(
    (s) => `<button type="button" class="sound-option${s.id === selectedSound ? " is-active" : ""}" data-sound="${s.id}">
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
      ${escapeHtml(s.label)}
    </button>`
  ).join("");

  return `
    <div class="schedule-toolbar">
      <button type="button" class="schedule-btn schedule-icon-btn schedule-notify-btn ${notifyActive}" id="scheduleNotifyBtn" title="${escapeHtml(notifyLabel)}">
        ${notifyIcon}
      </button>
      <div class="alert-offset-group" id="alertOffsetGroup"${notificationsEnabled ? "" : ' style="display:none"'}>
        <button type="button" class="stepper-btn" id="offsetMinus" aria-label="${escapeHtml(dict.tooltipAlertMinus)}">−</button>
        <span class="stepper-val" id="offsetDisplay">${alertOffsetMinutes}</span>
        <button type="button" class="stepper-btn" id="offsetPlus" aria-label="${escapeHtml(dict.tooltipAlertPlus)}">+</button>
        <span class="stepper-unit" id="alertOffsetUnit">${offsetLabel}</span>
      </div>
      <button type="button" class="schedule-btn schedule-icon-btn schedule-test-btn" id="scheduleTestBtn" title="${escapeHtml(dict.testSound)}">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
      </button>
      <div class="volume-ctrl" title="${escapeHtml(dict.volume)}">
        <input type="range" id="volumeSlider" class="volume-slider" min="0" max="100" step="1" value="${Math.round(masterVolume * 100)}" aria-label="${escapeHtml(dict.volume)}">
      </div>
      <div class="sound-picker-wrap" id="soundPickerWrap">
        <button type="button" class="schedule-btn schedule-icon-btn sound-picker-btn" id="soundPickerBtn" title="${escapeHtml(dict.tooltipPickSound)}">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
        </button>
        <div class="sound-picker-menu" id="soundPickerMenu">${soundOptions}</div>
      </div>
    </div>
  `;
}

function bindNotifyToolbarEvents(container) {
  container.querySelector("#scheduleNotifyBtn")?.addEventListener("click", toggleNotifications);
  container.querySelector("#offsetMinus")?.addEventListener("click", () => changeAlertOffset(-1));
  container.querySelector("#offsetPlus")?.addEventListener("click", () => changeAlertOffset(1));
  container.querySelector("#volumeSlider")?.addEventListener("input", (e) => {
    masterVolume = parseInt(e.target.value, 10) / 100;
    writeStorage(STORAGE_KEYS.masterVolume, String(masterVolume));
  });
  container.querySelector("#scheduleTestBtn")?.addEventListener("click", () => {
    const ctx = getAudioContext();
    if (ctx?.state === "suspended") ctx.resume();
    loadAudio(false).then(() => {
      if (!audioBuffer) return;
      playSound();
    });
  });
  const pickerBtn  = container.querySelector("#soundPickerBtn");
  const pickerMenu = container.querySelector("#soundPickerMenu");
  const pickerWrap = container.querySelector("#soundPickerWrap");
  if (pickerBtn && pickerMenu) {
    pickerBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const isOpen = pickerMenu.classList.toggle("is-open");
      pickerBtn.setAttribute("aria-expanded", isOpen);
    });
    pickerMenu.addEventListener("click", (e) => {
      const opt = e.target.closest(".sound-option");
      if (opt?.dataset.sound) {
        saveSelectedSound(opt.dataset.sound);
        pickerMenu.classList.remove("is-open");
        setTimeout(() => {
          const ctx = getAudioContext();
          if (ctx?.state === "suspended") ctx.resume();
          loadAudio(false).then(() => { if (audioBuffer) playSound(); });
        }, 150);
      }
    });
    if (_soundPickerCloseHandler) {
      document.removeEventListener("click", _soundPickerCloseHandler);
    }
    _soundPickerCloseHandler = (e) => {
      if (pickerWrap && !pickerWrap.contains(e.target)) {
        pickerMenu.classList.remove("is-open");
      }
    };
    document.addEventListener("click", _soundPickerCloseHandler);
  }
}

// ─── Schedule panel ───────────────────────────────────

function renderSchedulePanel() {
  const panel = document.getElementById("schedulePanel");
  if (!panel) return;

  const dict = t();
  const entries = buildScheduleEntries();

  if (entries.length === 0) {
    panel.innerHTML = `<div class="schedule-empty">${escapeHtml(
      dict.noSelection
    )}</div>`;
    return;
  }

  const nowMin = nowMinutesInTZ(timezone);

  const rows = entries
    .map((entry) => {
      const isPast = entry.totalMin < nowMin;
      const seq = entry.sequence ? ` (${escapeHtml(entry.sequence)})` : "";
      const statusDot = isPast
        ? `<span class="schedule-status past-dot" title="${escapeHtml(
            dict.pastLabel
          )}">✓</span>`
        : `<span class="schedule-status upcoming-dot"></span>`;
      const removeKey = escapeHtml(execKey(entry.name, entry.execId));
      return `<div class="schedule-row${isPast ? " is-past" : ""}">
      ${statusDot}
      <span class="schedule-time">${escapeHtml(entry.timeStr)}</span>
      <span class="schedule-name">${escapeHtml(entry.name)}${seq}</span>
      <button type="button" class="schedule-remove-btn" data-exec-key="${removeKey}" title="${escapeHtml(dict.tooltipRemove)}">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>`;
    })
    .join("");

  panel.innerHTML = `
    <div class="schedule-header">
      <span class="schedule-title">WARZONE DRAFTS</span>
      <div class="schedule-header-actions">
        <button type="button" class="schedule-btn schedule-icon-btn schedule-clear-btn" id="scheduleClearBtn" title="${escapeHtml(dict.tooltipClearPlanner)}">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
        </button>
        <button type="button" class="schedule-btn schedule-icon-btn schedule-copy-btn" id="scheduleCopyBtn" title="${escapeHtml(dict.copySchedule)}">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
        </button>
      </div>
    </div>
    <div class="schedule-rows" id="scheduleRows">${rows}</div>
  `;

  document
    .getElementById("scheduleCopyBtn")
    ?.addEventListener("click", copyScheduleToClipboard);
  document
    .getElementById("scheduleClearBtn")
    ?.addEventListener("click", () => {
      selectedExecutions.clear();
      writeStorage(STORAGE_KEYS.selectedExecutions, JSON.stringify([]));
      renderSchedulePanel();
      updateCountdownPanel();
      renderSelectedBadges();
    });
  document.getElementById("scheduleRows")?.addEventListener("click", (e) => {
    const btn = e.target.closest(".schedule-remove-btn");
    if (btn) {
      const key = btn.dataset.execKey;
      if (key) {
        const [worldName, execId] = key.split("|");
        toggleExecutionSelection(worldName, execId);
      }
    }
  });
}

function refreshScheduleRowStates() {
  const container = document.getElementById("scheduleRows");
  if (!container) return;
  const rows = container.querySelectorAll(".schedule-row");
  if (!rows.length) return;
  const nowMin = nowMinutesInTZ(timezone);
  const entries = buildScheduleEntries();
  rows.forEach((row, i) => {
    const entry = entries[i];
    if (!entry) return;
    row.classList.toggle("is-past", entry.totalMin < nowMin);
  });
}

function changeAlertOffset(delta) {
  alertOffsetMinutes = Math.max(0, Math.min(60, alertOffsetMinutes + delta));
  try {
    writeStorage(STORAGE_KEYS.alertOffset, String(alertOffsetMinutes));
  } catch {}
  const el = document.getElementById("offsetDisplay");
  if (el) el.textContent = alertOffsetMinutes;
  const unitEl = document.getElementById("alertOffsetUnit");
  if (unitEl)
    unitEl.textContent =
      alertOffsetMinutes > 0 ? alertOffsetMinutes + "m" : "off";
}

function toggleNotifications() {
  notificationsEnabled = !notificationsEnabled;
  try {
    writeStorage(
      STORAGE_KEYS.notificationsEnabled,
      String(notificationsEnabled)
    );
  } catch {}
  if (notificationsEnabled) {
    loadAudio();
    const ctx = getAudioContext();
    if (ctx?.state === "suspended") ctx.resume();
  }
  renderSchedulePanel();
  refreshNotifyToolbar();
}

function copyScheduleToClipboard() {
  const dict = t();
  const entries = buildScheduleEntries();
  if (!entries.length) return;
  const lines = [
    `# ${dict.schedulePanel}`,
    ...entries.map((e) => {
      const seq = e.sequence ? ` (${e.sequence})` : "";
      return `${e.timeStr}\t${e.name}${seq}`;
    }),
  ];
  const text = lines.join("\n");
  navigator.clipboard
    .writeText(text)
    .then(() => {
      const btn = document.getElementById("scheduleCopyBtn");
      const span = btn?.querySelector("span");
      if (span) {
        const orig = span.textContent;
        span.textContent = dict.copied;
        setTimeout(() => {
          span.textContent = orig;
        }, 2000);
      }
    })
    .catch(() => {
      const ta = Object.assign(document.createElement("textarea"), {
        value: text,
      });
      ta.style.cssText = "position:fixed;opacity:0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    });
}

// ─── Selection ───────────────────────────────────────

function toggleExecutionSelection(worldName, execId) {
  const key = execKey(worldName, execId);
  if (selectedExecutions.has(key)) {
    selectedExecutions.delete(key);
  } else {
    selectedExecutions.add(key);
    loadAudio();
  }
  try {
    writeStorage(
      STORAGE_KEYS.selectedExecutions,
      JSON.stringify([...selectedExecutions])
    );
  } catch {}
  renderSchedulePanel();
  updateCountdownPanel();
  renderSelectedBadges();
  checkScheduleConflicts();
}

function renderSelectedBadges() {
  document.querySelectorAll(".exec-select-btn").forEach((btn) => {
    const key = btn.dataset.execKey;
    if (!key) return;
    const isSel = selectedExecutions.has(key);
    btn.classList.toggle("is-selected", isSel);
    btn.setAttribute("aria-pressed", String(isSel));
    btn.setAttribute("title", isSel ? t().tooltipRemoveExec : t().tooltipAddExec);
    btn.innerHTML = isSel
      ? '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>'
      : '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>';
  });
  // Card highlight if ANY execution selected
  document.querySelectorAll(".world-card").forEach((card) => {
    const worldName = card.dataset.worldName;
    if (!worldName) return;
    const hasAny = [...selectedExecutions].some((k) =>
      k.startsWith(worldName + "|")
    );
    card.classList.toggle("world-card--selected", hasAny);
  });
}

// ─── Schedule conflict warning ───────────────────────

function checkScheduleConflicts() {
  const existing = document.getElementById("scheduleConflictWarn");

  const entries = buildScheduleEntries();
  if (entries.length < 2) {
    if (existing) existing.remove();
    return;
  }

  // Find any pair with gap < 20 min (including exact same time)
  let hasConflict = false;
  for (let i = 0; i < entries.length - 1; i++) {
    const gap = entries[i + 1].totalMin - entries[i].totalMin;
    if (gap < 20) {
      hasConflict = true;
      break;
    }
  }

  if (!hasConflict) {
    if (existing) existing.remove();
    return;
  }

  if (existing) return; // already showing

  const dict = t();
  const warn = document.createElement("div");
  warn.id = "scheduleConflictWarn";
  warn.className = "conflict-warn";
  warn.innerHTML = `
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
    <span>${escapeHtml(dict.conflictWarn)}</span>
    <button type="button" class="conflict-close" aria-label="${escapeHtml(dict.tooltipClose)}">✕</button>
  `;
  warn.querySelector(".conflict-close").onclick = () => warn.remove();

  // Insert after schedulePanel
  const panel = document.getElementById("schedulePanel");
  if (panel?.parentNode) panel.parentNode.insertBefore(warn, panel.nextSibling);

  // Auto-dismiss after 8s
  setTimeout(() => warn?.remove(), 8000);
}

// ─── Persistence ─────────────────────────────────────

function loadSelectedWorlds() {
  try {
    const saved = readStorage(STORAGE_KEYS.selectedExecutions);
    if (saved) {
      const arr = JSON.parse(saved);
      if (Array.isArray(arr)) selectedExecutions = new Set(arr);
    }
  } catch {}
}

function loadNotificationsPref() {
  try {
    notificationsEnabled =
      readStorage(STORAGE_KEYS.notificationsEnabled) === "true";
  } catch {}
}

function loadAlertOffset() {
  try {
    const v = readStorage(STORAGE_KEYS.alertOffset);
    if (v !== null) {
      const n = parseInt(v, 10);
      if (!isNaN(n)) alertOffsetMinutes = Math.max(0, Math.min(60, n));
    }
  } catch {}
}

function loadSelectedSound() {
  try {
    const v = readStorage(STORAGE_KEYS.selectedSound);
    if (v && SOUNDS.some((s) => s.id === v)) selectedSound = v;
  } catch {}
  try {
    const vol = readStorage(STORAGE_KEYS.masterVolume);
    if (vol !== null) {
      const n = parseFloat(vol);
      if (!isNaN(n)) masterVolume = Math.min(1, Math.max(0, n));
    }
  } catch {}
}

function saveSelectedSound(id) {
  selectedSound = id;
  try {
    writeStorage(STORAGE_KEYS.selectedSound, id);
  } catch {}
  loadAudio(true); // reload audio with new sound
}

// ─── Existing helpers ────────────────────────────────

function t() {
  return I18N[lang] || I18N["pt-BR"];
}

function saveLang(value) {
  lang = value;
  writeStorage(STORAGE_KEYS.lang, value);
  applyStaticLabels();
  updateLanguageButtons();
  populateTimezoneSelect();
  render();
}

function saveTZ(value) {
  timezone = value;
  writeStorage(STORAGE_KEYS.timezone, value);
  populateTimezoneSelect();
  updateClock();
  render();
}

function loadSettings() {
  lang = getSharedInitialLanguage(I18N);
  timezone = loadSavedTimezone();
  if (!timezone) timezone = DEFAULT_TIMEZONE;
}

function getTimezoneShortName(tz) {
  const resolvedTimezone = resolveTimezoneValue(tz);
  try {
    const parts = new Intl.DateTimeFormat("en", {
      timeZone: resolvedTimezone,
      timeZoneName: "short",
    }).formatToParts(new Date());
    return parts.find((p) => p.type === "timeZoneName")?.value || tz;
  } catch {
    return tz;
  }
}

function offsetMinutes(tz) {
  try {
    const now = new Date();
    const resolvedTimezone = resolveTimezoneValue(tz);
    const zoned = new Date(
      now.toLocaleString("en-US", { timeZone: resolvedTimezone })
    );
    return Math.round((zoned.getTime() - now.getTime()) / 60000);
  } catch {
    return 0;
  }
}

function populateTimezoneSelect() {
  const select = document.getElementById("timezoneSelect");
  if (!select) return;
  const fragment = document.createDocumentFragment();
  let currentGroup = null;
  let currentOptgroup = null;

  SUPPORTED_TIMEZONES.forEach((item) => {
    if (item.group !== currentGroup) {
      currentGroup = item.group || "";
      currentOptgroup = document.createElement("optgroup");
      currentOptgroup.label = currentGroup;
      fragment.appendChild(currentOptgroup);
    }

    if (!currentOptgroup) return;

    const option = document.createElement("option");
    option.value = item.value;
    option.textContent = getTimezoneDisplayLabel(item.value);
    option.selected = item.value === timezone;
    currentOptgroup.appendChild(option);
  });

  if (!SUPPORTED_TIMEZONES.some((item) => item.value === timezone)) {
    const option = document.createElement("option");
    option.value = timezone;
    option.textContent = getTimezoneDisplayLabel(timezone);
    option.selected = true;
    if (currentOptgroup) {
      currentOptgroup.appendChild(option);
    } else {
      fragment.appendChild(option);
    }
  }

  select.replaceChildren(fragment);
  select.onchange = (event) => {
    const nextTimezone = event.target?.value;
    if (nextTimezone) {
      saveTZ(nextTimezone);
    }
  };
}

function updateLanguageButtons() {
  document.querySelectorAll(".lang-flag").forEach((btn) => {
    const isActive = btn.dataset.lang === lang;
    btn.classList.toggle("is-active", isActive);
    btn.setAttribute("aria-pressed", isActive ? "true" : "false");
  });
}

function bindLanguageButtons() {
  document.querySelectorAll(".lang-flag").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (btn.dataset.lang) saveLang(btn.dataset.lang);
    });
  });
}

function applyStaticLabels() {
  const d = t();
  document.title = d.pageTitle;
  const heroTitle = document.querySelector(".site-header h1");
  const heroSubtitle = document.querySelector(".site-header p");
  const questLinksLabel = document.getElementById("questLinksLabel");
  const searchLabel = document.querySelector('label[for="searchInput"]');
  const timezoneLabel = document.querySelector('label[for="timezoneSelect"]');
  const searchInput = document.getElementById("searchInput");
  const filtersLabel = document.getElementById("filtersLabel");
  const plannerLabel = document.getElementById("warzonePlannerLabel");

  setTextContent(heroTitle, d.heroTitle);
  setTextContent(heroSubtitle, d.heroSubtitle);
  setTextContent(questLinksLabel, d.questLinksLabel);
  setTextContent(searchLabel, d.search);
  setTextContent(timezoneLabel, d.timezone);
  if (searchInput) searchInput.placeholder = d.searchPlaceholder || d.search;
  setTextContent(filtersLabel, d.filterLabel || "Filtros");
  setTextContent(plannerLabel, d.warzonePlannerLabel || "Warzone Planner");
}

function convertTimeBetweenTimezones(scheduleTime, sourceTimezone, targetTimezone) {
  return convertSharedTimeBetweenTimezones(
    scheduleTime,
    sourceTimezone,
    targetTimezone,
    lang
  );
}

function getBattleyeLabel(world) {
  return getWorldBattleyeLabel(world, t().notAvailable);
}

function getTransferLabel(world) {
  return getWorldTransferLabel(world, t().notAvailable);
}

function getBossKills(world) {
  return getNormalizedBossKills(world?.last_detected_kills);
}

function getMarkLabel(mark) {
  return getWorldMarkLabel(mark, {
    notAvailable: t().notAvailable,
    healthy: t().healthy,
    trolls: t().trolls,
    inconclusive: t().inconclusive,
  });
}

function getMarkIcon(mark) {
  if (mark === "healthy") return "●";
  if (mark === "trolls") return "!";
  return "?";
}

function getEffectiveMark(mark, kills) {
  return getEffectiveWorldMark(mark, kills);
}

function getWorldHistoryUrl(worldName) {
  return "./world.html?name=" + encodeURIComponent(worldName);
}

function renderNoSchedulesMessage(world) {
  const dict = t();
  const kills = getBossKills(world);
  const effectiveMark = getEffectiveMark(world?.mark, kills);

  if (effectiveMark === "na") {
    return "";
  }

  return `<p>${escapeHtml(dict.noSchedules)}. ${escapeHtml(
    dict.reportIssueCta
  )} <a href="${GITHUB_ISSUES_URL}" target="_blank" rel="noopener noreferrer" class="empty-state-link">GitHub Issues</a>.</p>`;
}

function renderExecutions(world) {
  const dict = t();
  const executions = Array.isArray(world.warzone_executions)
    ? [...world.warzone_executions]
    : [];
  if (executions.length === 0) return renderNoSchedulesMessage(world);
  executions.sort(
    (a, b) => (Number(a.execution_id) || 0) - (Number(b.execution_id) || 0)
  );
  const items = executions
    .map((ex) => {
      const shownTime = convertTimeBetweenTimezones(
        ex.schedule_time,
        world.timezone,
        timezone
      );
      const key = execKey(world.name, ex.execution_id);
      const isSel = selectedExecutions.has(key);
      const orderHtml = ex.warzone_sequence
        ? '<span class="execution-order">(' +
          escapeHtml(ex.warzone_sequence) +
          ")</span>"
        : "";
      const plusSvg =
        '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>';
      const checkSvg =
        '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';
      return (
        '<li class="execution-item' +
        (isSel ? " is-selected" : "") +
        '">' +
        '<span class="execution-time">' +
        escapeHtml(shownTime) +
        "</span>" +
        orderHtml +
        '<button type="button" class="exec-select-btn' +
        (isSel ? " is-selected" : "") +
        '"' +
        ' data-exec-key="' +
        escapeHtml(key) +
        '"' +
        ' aria-pressed="' +
        isSel +
        '"' +
        ' title="' +
        escapeHtml(isSel ? dict.tooltipRemoveExec : dict.tooltipAddExec) +
        '">' +
        (isSel ? checkSvg : plusSvg) +
        "</button>" +
        "</li>"
      );
    })
    .join("");
  return '<ul class="executions-list">' + items + "</ul>";
}

function renderWorld(world) {
  const dict = t();
  const hasAny = [...selectedExecutions].some((k) =>
    k.startsWith(world.name + "|")
  );
  const kills = getBossKills(world);
  const serviceCount = Number(
    world.last_detected_services ?? world.warzone_services_per_day ?? 0
  );
  const badgeTitle = dict.servicesTooltip(
    kills.deathstrike,
    kills.gnomevil,
    kills.abyssador
  );
  const mark = getEffectiveMark(world.mark, kills);
  const executionsTitle =
    mark === "na" && !world.has_service_history
      ? dict.noServicesLabel || dict.noSchedules
      : t().services;
  const markHtml =
    mark !== "na"
      ? `<span class="service-mark service-mark--${escapeHtml(mark)}" title="${escapeHtml(
          getMarkLabel(mark)
        )}" aria-label="${escapeHtml(getMarkLabel(mark))}">
          <span class="service-mark-icon" aria-hidden="true">${escapeHtml(
            getMarkIcon(mark)
          )}</span>
        </span>`
      : "";

  return `
    <div class="world-card${
      hasAny ? " world-card--selected" : ""
    }" data-world-name="${escapeHtml(world.name)}" data-world-url="${escapeHtml(
    getWorldHistoryUrl(world.name)
  )}">
      <h2>
        <a class="world-name world-name-link" href="${escapeHtml(
          getWorldHistoryUrl(world.name)
        )}">${escapeHtml(world.name || "")}</a>
        <div class="world-card-header-actions">
          <span class="badge" title="${escapeHtml(badgeTitle)}">${escapeHtml(
    t().warzones
  )}: ${escapeHtml(String(serviceCount))}</span>
          ${markHtml}
        </div>
      </h2>
      <div class="world-meta">
        <span class="meta-plain meta-left">${escapeHtml(
          world.location || t().notAvailable
        )}</span>
        <span class="meta-plain meta-right">${escapeHtml(
          world.pvp_type || t().notAvailable
        )}</span>
        <span class="meta-left">${escapeHtml(getTransferLabel(world))}</span>
        <span class="meta-right">${escapeHtml(getBattleyeDisplayLabel(getBattleyeKey(world)))}</span>
      </div>
      <div class="executions">
        <div class="executions-header">
          <h3>${escapeHtml(executionsTitle)}</h3>
          <a class="history-link" href="${escapeHtml(
            getWorldHistoryUrl(world.name)
          )}">${escapeHtml(t().viewHistory)}</a>
        </div>
        ${renderExecutions(world)}
      </div>
    </div>
  `;
}

// ─── Filter helpers ───────────────────────────────

function getBattleyeKey(world) {
  return getWorldBattleyeKey(world);
}

function getTransferKey(world) {
  const v = String(world.transfer_type || "").trim().toLowerCase();
  if (!v) return "locked";
  if (v === "regular") return "regular";
  if (v === "blocked") return "blocked";
  return v;
}

function getRegionKey(world) {
  return String(world.location || "").trim() || "unknown";
}

function getPvpKey(world) {
  return String(world.pvp_type || "").trim() || "unknown";
}

function hasActiveFilters() {
  return (
    activeFilters.region.size > 0 ||
    activeFilters.pvp.size > 0 ||
    activeFilters.battleye.size > 0 ||
    activeFilters.transfer.size > 0
  );
}

function worldPassesFilters(world) {
  if (activeFilters.region.size > 0 && !activeFilters.region.has(getRegionKey(world))) return false;
  if (activeFilters.pvp.size > 0 && !activeFilters.pvp.has(getPvpKey(world))) return false;
  if (activeFilters.battleye.size > 0 && !activeFilters.battleye.has(getBattleyeKey(world))) return false;
  if (activeFilters.transfer.size > 0 && !activeFilters.transfer.has(getTransferKey(world))) return false;
  return true;
}

function getFilterOptions(warzone_worlds) {
  const regions   = new Set();
  const pvpTypes  = new Set();
  const battleyeSet = new Set();
  const transferSet = new Set();
  for (const w of warzone_worlds) {
    regions.add(getRegionKey(w));
    pvpTypes.add(getPvpKey(w));
    battleyeSet.add(getBattleyeKey(w));
    transferSet.add(getTransferKey(w));
  }
  return { regions, pvpTypes, battleyeSet, transferSet };
}

function toggleFilter(group, value) {
  if (activeFilters[group].has(value)) {
    activeFilters[group].delete(value);
  } else {
    activeFilters[group].add(value);
  }
  saveFilters();
  render();
}

function clearAllFilters() {
  activeFilters.region.clear();
  activeFilters.pvp.clear();
  activeFilters.battleye.clear();
  activeFilters.transfer.clear();
  saveFilters();
  render();
}

function saveFilters() {
  try {
    writeStorage(
      STORAGE_KEYS.activeFilters,
      JSON.stringify({
        region: [...activeFilters.region],
        pvp: [...activeFilters.pvp],
        battleye: [...activeFilters.battleye],
        transfer: [...activeFilters.transfer],
      })
    );
  } catch {}
}

function loadFilters() {
  try {
    const saved = readStorage(STORAGE_KEYS.activeFilters);
    if (saved) {
      const obj = JSON.parse(saved);
      if (obj.region)   activeFilters.region   = new Set(obj.region);
      if (obj.pvp)      activeFilters.pvp      = new Set(obj.pvp);
      if (obj.battleye) activeFilters.battleye = new Set(obj.battleye);
      if (obj.transfer) activeFilters.transfer = new Set(obj.transfer);
    }
  } catch {}
}

function getBattleyeDisplayLabel(key) {
  const dict = t();
  if (key === "GBE") return dict.bgeLabel;
  if (key === "YBE") return dict.ybeLabel;
  return dict.noneLabel;
}

function getTransferDisplayLabel(key) {
  return formatTransferType(key, key);
}

function renderFilters(warzone_worlds) {
  const el = document.getElementById("filtersBar");
  if (!el) return;
  if (warzone_worlds.length === 0) { el.innerHTML = ""; return; }

  const dict = t();
  const { regions, pvpTypes, battleyeSet, transferSet } = getFilterOptions(warzone_worlds);
  const isAllActive = !hasActiveFilters();

  function pills(group, values, labelFn) {
    return [...values].sort().map(v => {
      const active = activeFilters[group].has(v);
      return `<button type="button" class="filter-pill${active ? " is-active" : ""}" data-filter-group="${escapeHtml(group)}" data-filter-value="${escapeHtml(v)}">${escapeHtml(labelFn(v))}</button>`;
    }).join("");
  }

  const allPill = `<button type="button" class="filter-pill filter-pill--all${isAllActive ? " is-active" : ""}" data-filter-group="__all__" data-filter-value="__all__">${escapeHtml(dict.filterAll)}</button>`;

  const rest =
    pills("region",   regions,      v => v) +
    pills("pvp",      pvpTypes,     v => v) +
    pills("battleye", battleyeSet,  getBattleyeDisplayLabel) +
    pills("transfer", transferSet,  getTransferDisplayLabel);

  el.innerHTML = `<div class="filter-pills-row">${allPill}${rest}</div>`;
}

function bindFilterBar() {
  const filterBar = document.getElementById("filtersBar");
  if (!filterBar) return;

  filterBar.addEventListener("click", (event) => {
    const button = event.target.closest(".filter-pill");
    if (!button) return;

    const group = button.dataset.filterGroup;
    const value = button.dataset.filterValue;
    if (group === "__all__") {
      clearAllFilters();
      return;
    }
    if (group && value) {
      toggleFilter(group, value);
    }
  });
}

// ─── Main render ─────────────────────────────────────

function render() {
  const dict = t();
  const searchInput = document.getElementById("searchInput");
  const summary = document.getElementById("summary");
  const worldsList = document.getElementById("worldsList");
  if (!summary || !worldsList) return;

  const query = (searchInput?.value || "").trim().toLowerCase();

  const availableWorlds = worlds.filter(Boolean);

  // Render filter bar based on full pool (not search-narrowed)
  renderFilters(availableWorlds);

  const filtered = availableWorlds
    .filter((w) => worldPassesFilters(w))
    .filter((w) =>
      String(w.name || "")
        .toLowerCase()
        .includes(query)
    )
    .sort((a, b) =>
      String(a.name || "").localeCompare(String(b.name || ""), lang)
    );

  const activeWorlds = availableWorlds.filter(
    (w) => w && w.tracks_warzone_service
  ).length;

  const withSchedules = availableWorlds.filter(
    (w) =>
      Array.isArray(w.warzone_executions) && w.warzone_executions.length > 0
  ).length;

  summary.textContent = dict.summary(
    availableWorlds.length,
    activeWorlds,
    withSchedules,
    getTimezoneDisplayLabel(timezone)
  );

  if (filtered.length === 0) {
    worldsList.innerHTML = `<div class="empty-state">${escapeHtml(
      dict.noServersFound
    )}</div>`;
    return;
  }

  worldsList.innerHTML = filtered.map(renderWorld).join("");
  requestAnimationFrame(() => applyMasonry(worldsList));

  renderSchedulePanel();
  updateCountdownPanel();
}

function getColumnCount(container) {
  const w = container.offsetWidth;
  if (w >= 1020) return 3;
  if (w >= 680) return 2;
  return 1;
}

function applyMasonry(container) {
  const cols = getColumnCount(container);
  const cards = [...container.querySelectorAll(".world-card, .empty-state")];
  container.innerHTML = "";
  if (cols === 1) {
    container.style.cssText = "display:flex;flex-direction:column;";
    cards.forEach((c) => container.appendChild(c));
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
    cards.forEach((c) => c.remove());
    columns.forEach((c) => (c.innerHTML = ""));
    const heights = new Array(cols).fill(0);
    cards.forEach((card) => {
      const s = heights.indexOf(Math.min(...heights));
      columns[s].appendChild(card);
      heights[s] += card.getBoundingClientRect().height + gap;
    });
  });
}

// ─── Master tick ─────────────────────────────────────

function masterTick() {
  updateClock();
  updateCountdownPanel();
  const nowMin = nowMinutesInTZ(timezone);
  if (nowMin !== lastTickMin) {
    lastTickMin = nowMin;
    checkNotifications();
    refreshScheduleRowStates();
  }
}

// ─── Init ─────────────────────────────────────────────

async function init() {
  initSharedUi();
  loadSettings();
  loadSelectedWorlds();
  loadNotificationsPref();
  loadAlertOffset();
  loadSelectedSound();
  loadFilters();
  applyStaticLabels();
  bindLanguageButtons();
  bindFilterBar();
  updateLanguageButtons();
  populateTimezoneSelect();

  masterTick();
  tickInterval = setInterval(masterTick, 1000);

  renderSchedulePanel();
  updateCountdownPanel();

  // Single delegated listener for all .world-select-btn clicks (survives masonry re-renders)
  const worldsList = document.getElementById("worldsList");
  if (worldsList) {
    worldsList.addEventListener("click", (e) => {
      const btn = e.target.closest(".exec-select-btn");
      if (btn) {
        const key = btn.dataset.execKey;
        if (key) {
          const [worldName, execId] = key.split("|");
          toggleExecutionSelection(worldName, execId);
        }
        return;
      }

      const card = e.target.closest(".world-card");
      const blocked = e.target.closest(
        ".exec-select-btn, .history-link, .world-name-link, button"
      );
      if (card && !blocked && card.dataset.worldUrl) {
        window.location.href = card.dataset.worldUrl;
      }
    });
  }

  const searchInput = document.getElementById("searchInput");
  if (searchInput) searchInput.addEventListener("input", render);

  try {
    const worldsData = await fetchJson(WORLDS_DATA_PATH).catch((error) => {
      throw new Error(`${t().loadError}: ${error.message}`);
    });
    worlds = Array.isArray(worldsData) ? worldsData : [];
    render();
    let resizeTimer;
    window.addEventListener("resize", () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(render, 120);
    });
  } catch (error) {
    const summary = document.getElementById("summary");
    const worldsList = document.getElementById("worldsList");
    if (summary) summary.textContent = "";
    if (worldsList)
      worldsList.innerHTML = `<div class="empty-state">${escapeHtml(
        error.message
      )}</div>`;
  }
}

init();
