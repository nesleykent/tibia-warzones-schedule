// ─────────────────────────────────────────────
//  Tibia Warzones — app.js
// ─────────────────────────────────────────────

const SUPPORTED_TIMEZONES = [
  {
    value: "America/Noronha",
    label: "Fernando de Noronha",
    short: "FNT",
    offset: "GMT-2",
  },
  {
    value: "America/Sao_Paulo",
    label: "Curitiba",
    short: "BRT",
    offset: "GMT-3",
  },
  {
    value: "America/Argentina/Buenos_Aires",
    label: "Buenos Aires",
    short: "ART",
    offset: "GMT-3",
  },
  {
    value: "America/Santiago",
    label: "Santiago",
    short: "CLT",
    offset: "GMT-3",
  },
  { value: "America/Manaus", label: "Manaus", short: "AMT", offset: "GMT-4" },
  { value: "America/Cuiaba", label: "Cuiabá", short: "AMT", offset: "GMT-4" },
  {
    value: "America/Porto_Velho",
    label: "Porto Velho",
    short: "AMT",
    offset: "GMT-4",
  },
  { value: "America/Caracas", label: "Caracas", short: "VET", offset: "GMT-4" },
  {
    value: "America/Rio_Branco",
    label: "Rio Branco",
    short: "ACT",
    offset: "GMT-5",
  },
  { value: "America/Cancun", label: "Cancún", short: "EST", offset: "GMT-5" },
  {
    value: "America/Mexico_City",
    label: "Mexico City",
    short: "CST",
    offset: "GMT-6",
  },
  { value: "America/Tijuana", label: "Tijuana", short: "PST", offset: "GMT-7" },
  { value: "Europe/London", label: "London", short: "GMT", offset: "GMT+0" },
  {
    value: "Europe/Berlin",
    label: "Regensburg",
    short: "CET",
    offset: "GMT+1",
  },
  { value: "Europe/Warsaw", label: "Warsaw", short: "CET", offset: "GMT+1" },
];

const I18N = {
  en: {
    pageTitle: "Tibia Warzones Schedule",
    heroTitle: "Tibia Warzones Schedule",
    heroSubtitle:
      "Servers with Warzones activity based on Gnomevil boss kills.",
    questLinksLabel: "Bigfoot's Burden:",
    search: "Search server",
    timezone: "Show times in",
    summary: (total, withSchedules, tzLabel) =>
      `${total} servers. ${withSchedules} with services. Timezone: ${tzLabel}`,
    warzones: "Warzones",
    region: "Region",
    pvp: "PvP",
    transfer: "Transfer",
    battleye: "BattlEye",
    services: "Services",
    noSchedules: "No services registered yet",
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
    clearFilters: "Clear filters",
    bgeLabel: "Green BattlEye",
    ybeLabel: "Yellow BattlEye",
    noneLabel: "None",
  },
  "pt-BR": {
    pageTitle: "Tibia Warzones Schedule",
    heroTitle: "Tibia Warzones Schedule",
    heroSubtitle:
      "Servidores com atividade de Warzones baseada nas kills do boss Gnomevil.",
    questLinksLabel: "Bigfoot's Burden:",
    search: "Buscar servidor",
    timezone: "Exibir horários em",
    summary: (total, withSchedules, tzLabel) =>
      `${total} servidores. ${withSchedules} com services. Timezone: ${tzLabel}`,
    warzones: "Warzones",
    region: "Região",
    pvp: "PvP",
    transfer: "Transferência",
    battleye: "BattlEye",
    services: "Services",
    noSchedules: "Ainda não há nenhum service cadastrado",
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
    clearFilters: "Limpar filtros",
    bgeLabel: "Green BattlEye",
    ybeLabel: "Yellow BattlEye",
    noneLabel: "Nenhum",
  },
  "es-419": {
    pageTitle: "Tibia Warzones Schedule",
    heroTitle: "Tibia Warzones Schedule",
    heroSubtitle:
      "Servidores con actividad de Warzones basada en las muertes del boss Gnomevil.",
    questLinksLabel: "Bigfoot's Burden:",
    search: "Buscar servidor",
    timezone: "Mostrar horarios en",
    summary: (total, withSchedules, tzLabel) =>
      `${total} servidores. ${withSchedules} con services. Zona: ${tzLabel}`,
    warzones: "Warzones",
    region: "Región",
    pvp: "PvP",
    transfer: "Transferencia",
    battleye: "BattlEye",
    services: "Services",
    noSchedules: "Aún no hay ningún service registrado",
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
    clearFilters: "Limpiar filtros",
    bgeLabel: "Green BattlEye",
    ybeLabel: "Yellow BattlEye",
    noneLabel: "Ninguno",
  },
  pl: {
    pageTitle: "Tibia Warzones Schedule",
    heroTitle: "Tibia Warzones Schedule",
    heroSubtitle:
      "Serwery z aktywnością Warzones na podstawie liczby zabójstw bossa Gnomevil.",
    questLinksLabel: "Bigfoot's Burden:",
    search: "Szukaj serwera",
    timezone: "Pokaż godziny w",
    summary: (total, withSchedules, tzLabel) =>
      `${total} serwerów. ${withSchedules} z services. Strefa: ${tzLabel}`,
    warzones: "Warzones",
    region: "Region",
    pvp: "PvP",
    transfer: "Transfer",
    battleye: "BattlEye",
    services: "Services",
    noSchedules: "Nie ma jeszcze żadnego zarejestrowanego service",
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
    clearFilters: "Wyczyść filtry",
    bgeLabel: "Green BattlEye",
    ybeLabel: "Yellow BattlEye",
    noneLabel: "Brak",
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
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: tz,
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
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: tz,
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
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
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
    <button type="button" class="toast-close" aria-label="Fechar">✕</button>
  `;
  toast.querySelector(".toast-close").onclick = () => toast.remove();
  document.body.appendChild(toast);
  setTimeout(() => toast?.remove(), 8000);
  requestAnimationFrame(() => toast.classList.add("is-visible"));
}

// ─── Clock ───────────────────────────────────────────

function getCurrentTimeStr(tz) {
  try {
    return new Intl.DateTimeFormat("en-GB", {
      timeZone: tz,
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

  panel.style.display = "";
  panel.innerHTML = html;
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

  const notifyIcon = notificationsEnabled
    ? `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>`
    : `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/><line x1="2" y1="2" x2="22" y2="22"/></svg>`;

  const notifyLabel = notificationsEnabled ? dict.notifyOn : dict.notifyOff;
  const notifyActive = notificationsEnabled ? "is-active" : "";

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
      <button type="button" class="schedule-remove-btn" data-exec-key="${removeKey}" title="Remover">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>`;
    })
    .join("");

  // Build sound options for picker
  const soundOptions = SOUNDS.map(
    (s) =>
      `<button type="button" class="sound-option${
        s.id === selectedSound ? " is-active" : ""
      }" data-sound="${s.id}">
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
      ${escapeHtml(s.label)}
    </button>`
  ).join("");

  const offsetLabel = alertOffsetMinutes > 0 ? alertOffsetMinutes + "m" : "off";
  panel.innerHTML = `
    <div class="schedule-header">
      <span class="schedule-title">WARZONE PLANNER</span>
      <div class="schedule-header-actions">
        <button type="button" class="schedule-btn schedule-icon-btn schedule-clear-btn" id="scheduleClearBtn" title="Limpar planner">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
        </button>
        <button type="button" class="schedule-btn schedule-icon-btn schedule-copy-btn" id="scheduleCopyBtn" title="${escapeHtml(dict.copySchedule)}">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
        </button>
      </div>
    </div>
    <div class="schedule-rows" id="scheduleRows">${rows}</div>
    <div class="schedule-toolbar">
      <button type="button" class="schedule-btn schedule-icon-btn schedule-notify-btn ${notifyActive}" id="scheduleNotifyBtn" title="${escapeHtml(
    notifyLabel
  )}">
        ${notifyIcon}
      </button>
      <div class="alert-offset-group" id="alertOffsetGroup"${
        notificationsEnabled ? "" : ' style="display:none"'
      }>
        <button type="button" class="stepper-btn" id="offsetMinus" aria-label="Diminuir">−</button>
        <span class="stepper-val" id="offsetDisplay">${alertOffsetMinutes}</span>
        <button type="button" class="stepper-btn" id="offsetPlus" aria-label="Aumentar">+</button>
        <span class="stepper-unit" id="alertOffsetUnit">${offsetLabel}</span>
      </div>
      <button type="button" class="schedule-btn schedule-icon-btn schedule-test-btn" id="scheduleTestBtn" title="${escapeHtml(
        dict.testSound
      )}">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
      </button>
      <div class="volume-ctrl" title="${escapeHtml(dict.volume)}">
        <input type="range" id="volumeSlider" class="volume-slider" min="0" max="100" step="1" value="${Math.round(
          masterVolume * 100
        )}" aria-label="${escapeHtml(dict.volume)}">
      </div>
      <div class="sound-picker-wrap" id="soundPickerWrap">
        <button type="button" class="schedule-btn schedule-icon-btn sound-picker-btn" id="soundPickerBtn" title="Escolher som">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
        </button>
        <div class="sound-picker-menu" id="soundPickerMenu">${soundOptions}</div>
      </div>
    </div>
  `;

  document
    .getElementById("scheduleNotifyBtn")
    ?.addEventListener("click", toggleNotifications);
  document
    .getElementById("scheduleCopyBtn")
    ?.addEventListener("click", copyScheduleToClipboard);
  document
    .getElementById("scheduleClearBtn")
    ?.addEventListener("click", () => {
      selectedExecutions.clear();
      try { localStorage.setItem("selectedExecutions", JSON.stringify([])); } catch {}
      renderSchedulePanel();
      updateCountdownPanel();
      renderSelectedBadges();
    });
  document
    .getElementById("offsetMinus")
    ?.addEventListener("click", () => changeAlertOffset(-1));
  document
    .getElementById("offsetPlus")
    ?.addEventListener("click", () => changeAlertOffset(1));
  document.getElementById("volumeSlider")?.addEventListener("input", (e) => {
    masterVolume = parseInt(e.target.value, 10) / 100;
    try {
      localStorage.setItem("masterVolume", String(masterVolume));
    } catch {}
  });
  document.getElementById("scheduleTestBtn")?.addEventListener("click", () => {
    const ctx = getAudioContext();
    if (ctx?.state === "suspended") ctx.resume();
    loadAudio(false).then(() => {
      if (audioBuffer) {
        playSound();
      } else {
        const btn = document.getElementById("scheduleTestBtn");
        const span = btn?.querySelector("span");
        if (span) {
          const o = span.textContent;
          span.textContent = "Sem áudio";
          setTimeout(() => (span.textContent = o), 2000);
        }
      }
    });
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
  // Sound picker hamburger
  const pickerBtn = document.getElementById("soundPickerBtn");
  const pickerMenu = document.getElementById("soundPickerMenu");
  const pickerWrap = document.getElementById("soundPickerWrap");
  if (pickerBtn && pickerMenu) {
    pickerBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const isOpen = pickerMenu.classList.toggle("is-open");
      pickerBtn.setAttribute("aria-expanded", isOpen);
    });
    pickerMenu.addEventListener("click", (e) => {
      const opt = e.target.closest(".sound-option");
      if (opt) {
        const id = opt.dataset.sound;
        if (id) {
          saveSelectedSound(id);
          pickerMenu.classList.remove("is-open");
          // Play preview
          setTimeout(() => {
            const ctx = getAudioContext();
            if (ctx?.state === "suspended") ctx.resume();
            loadAudio(false).then(() => {
              if (audioBuffer) playSound();
            });
          }, 150);
        }
      }
    });
    // Close on outside click
    document.addEventListener(
      "click",
      (e) => {
        if (pickerWrap && !pickerWrap.contains(e.target)) {
          pickerMenu.classList.remove("is-open");
        }
      },
      { capture: false }
    );
  }
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
    localStorage.setItem("alertOffset", String(alertOffsetMinutes));
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
    localStorage.setItem("notificationsEnabled", String(notificationsEnabled));
  } catch {}
  if (notificationsEnabled) {
    loadAudio();
    const ctx = getAudioContext();
    if (ctx?.state === "suspended") ctx.resume();
  }
  renderSchedulePanel();
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
    localStorage.setItem(
      "selectedExecutions",
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
    btn.setAttribute("title", isSel ? "Remover" : "Adicionar ao resumo");
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

  const warn = document.createElement("div");
  warn.id = "scheduleConflictWarn";
  warn.className = "conflict-warn";
  warn.innerHTML = `
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
    <span>Some warzones are &lt;20 min apart — tight but possible!</span>
    <button type="button" class="conflict-close" aria-label="Dismiss">✕</button>
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
    const saved = localStorage.getItem("selectedExecutions");
    if (saved) {
      const arr = JSON.parse(saved);
      if (Array.isArray(arr)) selectedExecutions = new Set(arr);
    }
  } catch {}
}

function loadNotificationsPref() {
  try {
    notificationsEnabled =
      localStorage.getItem("notificationsEnabled") === "true";
  } catch {}
}

function loadAlertOffset() {
  try {
    const v = localStorage.getItem("alertOffset");
    if (v !== null) {
      const n = parseInt(v, 10);
      if (!isNaN(n)) alertOffsetMinutes = Math.max(0, Math.min(60, n));
    }
  } catch {}
}

function loadSelectedSound() {
  try {
    const v = localStorage.getItem("selectedSound");
    if (v && SOUNDS.some((s) => s.id === v)) selectedSound = v;
  } catch {}
  try {
    const vol = localStorage.getItem("masterVolume");
    if (vol !== null) {
      const n = parseFloat(vol);
      if (!isNaN(n)) masterVolume = Math.min(1, Math.max(0, n));
    }
  } catch {}
}

function saveSelectedSound(id) {
  selectedSound = id;
  try {
    localStorage.setItem("selectedSound", id);
  } catch {}
  loadAudio(true); // reload audio with new sound
}

// ─── Existing helpers ────────────────────────────────

function getBrowserTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

function getInitialLanguage() {
  try {
    const saved = localStorage.getItem("lang");
    if (saved && I18N[saved]) return saved;
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
  return I18N[lang] || I18N["pt-BR"];
}

function saveLang(value) {
  lang = value;
  try {
    localStorage.setItem("lang", value);
  } catch {}
  applyStaticLabels();
  updateLanguageButtons();
  populateTimezoneSelect();
  render();
}

function saveTZ(value) {
  timezone = value;
  try {
    localStorage.setItem("tz", value);
  } catch {}
  populateTimezoneSelect();
  updateClock();
  render();
}

function loadSettings() {
  lang = getInitialLanguage();
  try {
    const savedTZ = localStorage.getItem("tz");
    timezone = savedTZ || getBrowserTimezone();
  } catch {
    timezone = getBrowserTimezone();
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getTimezoneShortName(tz) {
  try {
    const parts = new Intl.DateTimeFormat("en", {
      timeZone: tz,
      timeZoneName: "short",
    }).formatToParts(new Date());
    return parts.find((p) => p.type === "timeZoneName")?.value || tz;
  } catch {
    return tz;
  }
}

function getTimezoneOffsetLabel(tz) {
  try {
    const parts = new Intl.DateTimeFormat("en", {
      timeZone: tz,
      timeZoneName: "longOffset",
    }).formatToParts(new Date());
    const value = parts.find((p) => p.type === "timeZoneName")?.value || "GMT";
    return value.replace("GMT", "UTC");
  } catch {
    return "UTC";
  }
}

function getTimezoneDisplayLabel(tz) {
  const entry = SUPPORTED_TIMEZONES.find((item) => item.value === tz);
  if (entry) {
    return `${entry.label} (${entry.short}, ${entry.offset})`;
  }
  // Fallback for unknown timezones (e.g. browser-detected zone not in list)
  const offsetRaw = getTimezoneOffsetLabel(tz);
  const offsetCompact = offsetRaw
    .replace("UTC", "GMT")
    .replace(/:00$/, "")
    .replace(/([+-])0(\d)$/, "$1$2");
  return `${tz} (${offsetCompact})`;
}

function offsetMinutes(tz) {
  try {
    const now = new Date();
    const zoned = new Date(now.toLocaleString("en-US", { timeZone: tz }));
    return Math.round((zoned.getTime() - now.getTime()) / 60000);
  } catch {
    return 0;
  }
}

function populateTimezoneSelect() {
  const select = document.getElementById("timezoneSelect");
  if (!select) return;
  const options = [...SUPPORTED_TIMEZONES];
  if (!options.some((item) => item.value === timezone))
    options.push({ value: timezone, label: timezone });
  options.sort((a, b) => {
    const d = offsetMinutes(a.value) - offsetMinutes(b.value);
    return d !== 0 ? d : a.label.localeCompare(b.label, "en");
  });
  select.innerHTML = options
    .map((item) => {
      const sel = item.value === timezone ? "selected" : "";
      return `<option value="${escapeHtml(item.value)}" ${sel}>${escapeHtml(
        getTimezoneDisplayLabel(item.value)
      )}</option>`;
    })
    .join("");
  select.onchange = (e) => saveTZ(e.target.value);
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
    btn.onclick = () => {
      if (btn.dataset.lang) saveLang(btn.dataset.lang);
    };
  });
}

function applyStaticLabels() {
  const d = t();
  document.title = d.pageTitle;
  const qs = (s) => document.querySelector(s);
  if (qs(".site-header h1")) qs(".site-header h1").textContent = d.heroTitle;
  if (qs(".site-header p")) qs(".site-header p").textContent = d.heroSubtitle;
  const qsl = document.getElementById("questLinksLabel");
  if (qsl) qsl.textContent = d.questLinksLabel;
  const sl = qs('label[for="searchInput"]');
  if (sl) sl.textContent = d.search;
  const tl = qs('label[for="timezoneSelect"]');
  if (tl) tl.textContent = d.timezone;
  const si = document.getElementById("searchInput");
  if (si) si.placeholder = d.search;
  const fl = document.getElementById("filtersLabel");
  if (fl) fl.textContent = d.filterLabel || "Filtros";
}

function convertTimeBetweenTimezones(
  scheduleTime,
  sourceTimezone,
  targetTimezone
) {
  if (!scheduleTime) return "";
  if (!sourceTimezone || !targetTimezone) return scheduleTime;
  const parts = String(scheduleTime).split(":");
  if (parts.length !== 2) return scheduleTime;
  const hour = Number(parts[0]);
  const minute = Number(parts[1]);
  if (Number.isNaN(hour) || Number.isNaN(minute)) return scheduleTime;
  try {
    const ref = new Date(Date.UTC(2025, 0, 15, 12, 0, 0));
    const srcParts = new Intl.DateTimeFormat("en-CA", {
      timeZone: sourceTimezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    }).formatToParts(ref);
    const map = {};
    for (const p of srcParts) {
      if (p.type !== "literal") map[p.type] = p.value;
    }
    const wallClockUtc = Date.UTC(
      Number(map.year),
      Number(map.month) - 1,
      Number(map.day),
      hour,
      minute,
      0
    );
    const probeDate = new Date(wallClockUtc);
    const offParts = new Intl.DateTimeFormat("en", {
      timeZone: sourceTimezone,
      timeZoneName: "longOffset",
    }).formatToParts(probeDate);
    const offsetText =
      offParts.find((p) => p.type === "timeZoneName")?.value || "GMT+00:00";
    const normalized = offsetText.replace("GMT", "");
    const match = normalized.match(/^([+-])(\d{2}):(\d{2})$/);
    let offMin = 0;
    if (match) {
      const sign = match[1] === "-" ? -1 : 1;
      offMin = sign * (Number(match[2]) * 60 + Number(match[3]));
    }
    const actualDate = new Date(wallClockUtc - offMin * 60 * 1000);
    return new Intl.DateTimeFormat(lang, {
      timeZone: targetTimezone,
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).format(actualDate);
  } catch {
    return scheduleTime;
  }
}

function getBattleyeLabel(world) {
  if (world.battleye_date === "release") return "GBE";
  if (world.battleye_date) return "YBE";
  return t().notAvailable;
}

function getTransferLabel(world) {
  const v = String(world.transfer_type || "").trim();
  if (!v) return t().notAvailable;
  if (v.toLowerCase() === "regular") return "Regular Transfer";
  if (v.toLowerCase() === "blocked") return "Blocked Transfer";
  if (v.toLowerCase() === "locked")  return "Locked Transfer";
  return v.charAt(0).toUpperCase() + v.slice(1) + " Transfer";
}

function renderExecutions(world) {
  const dict = t();
  const executions = Array.isArray(world.warzone_executions)
    ? [...world.warzone_executions]
    : [];
  if (executions.length === 0)
    return "<p>" + escapeHtml(dict.noSchedules) + "</p>";
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
        (isSel ? "Remover do resumo" : "Adicionar ao resumo") +
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
  return `
    <div class="world-card${
      hasAny ? " world-card--selected" : ""
    }" data-world-name="${escapeHtml(world.name)}">
      <h2>
        <span class="world-name">${escapeHtml(world.name || "")}</span>
        <span class="badge">${escapeHtml(dict.warzones)}: ${escapeHtml(
    String(world.warzonesperday ?? 0)
  )}</span>
      </h2>
      <div class="world-meta">
        <span class="meta-plain meta-left">${escapeHtml(
          world.location || dict.notAvailable
        )}</span>
        <span class="meta-plain meta-right">${escapeHtml(
          world.pvp_type || dict.notAvailable
        )}</span>
        <span class="meta-left">${escapeHtml(getTransferLabel(world))}</span>
        <span class="meta-right">${escapeHtml(getBattleyeDisplayLabel(getBattleyeKey(world)))}</span>
      </div>
      <div class="executions">
        <div class="executions-header">
          <h3>${escapeHtml(dict.services)}</h3>
        </div>
        ${renderExecutions(world)}
      </div>
    </div>
  `;
}

function bindSelectButtons() {
  // No-op: handled via event delegation set up once in init()
}

// ─── Filter helpers ───────────────────────────────

function getBattleyeKey(world) {
  if (world.battleye_date === "release") return "GBE";
  if (world.battleye_date) return "YBE";
  return "none";
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
    localStorage.setItem("activeFilters", JSON.stringify({
      region:   [...activeFilters.region],
      pvp:      [...activeFilters.pvp],
      battleye: [...activeFilters.battleye],
      transfer: [...activeFilters.transfer],
    }));
  } catch {}
}

function loadFilters() {
  try {
    const saved = localStorage.getItem("activeFilters");
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
  if (key === "regular") return "Regular Transfer";
  if (key === "blocked") return "Blocked Transfer";
  if (key === "locked")  return "Locked Transfer";
  return key.charAt(0).toUpperCase() + key.slice(1) + " Transfer";
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

  el.querySelectorAll(".filter-pill").forEach(btn => {
    btn.addEventListener("click", () => {
      const group = btn.dataset.filterGroup;
      const value = btn.dataset.filterValue;
      if (group === "__all__") {
        clearAllFilters();
      } else {
        toggleFilter(group, value);
      }
    });
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

  // All worlds that perform warzones (base pool for filter options)
  const warzoneWorlds = worlds.filter((w) => w && w.performs_warzone);

  // Render filter bar based on full pool (not search-narrowed)
  renderFilters(warzoneWorlds);

  const filtered = warzoneWorlds
    .filter((w) => worldPassesFilters(w))
    .filter((w) =>
      String(w.name || "")
        .toLowerCase()
        .includes(query)
    )
    .sort((a, b) => {
      const aH =
        Array.isArray(a.warzone_executions) && a.warzone_executions.length > 0
          ? 1
          : 0;
      const bH =
        Array.isArray(b.warzone_executions) && b.warzone_executions.length > 0
          ? 1
          : 0;
      if (bH !== aH) return bH - aH;
      return String(a.name || "").localeCompare(String(b.name || ""), lang);
    });

  const withSchedules = filtered.filter(
    (w) =>
      Array.isArray(w.warzone_executions) && w.warzone_executions.length > 0
  ).length;

  summary.textContent = dict.summary(
    filtered.length,
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
  bindSelectButtons();
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
    bindSelectButtons();
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
    bindSelectButtons();
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
  loadSettings();
  loadSelectedWorlds();
  loadNotificationsPref();
  loadAlertOffset();
  loadSelectedSound();
  loadFilters();
  applyStaticLabels();
  bindLanguageButtons();
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
      }
    });
  }

  const searchInput = document.getElementById("searchInput");
  if (searchInput) searchInput.oninput = render;

  try {
    const response = await fetch("./data/worlds.json");
    if (!response.ok) throw new Error(`${t().loadError}: ${response.status}`);
    worlds = await response.json();
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
ENDOFFILE;
