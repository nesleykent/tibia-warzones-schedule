const SUPPORTED_TIMEZONES = [
  { value: "UTC", label: "UTC" },

  { value: "America/Noronha", label: "Fernando de Noronha" },
  { value: "America/Sao_Paulo", label: "Curitiba" },
  { value: "America/Manaus", label: "Manaus" },
  { value: "America/Cuiaba", label: "Cuiabá" },
  { value: "America/Porto_Velho", label: "Porto Velho" },
  { value: "America/Rio_Branco", label: "Rio Branco" },

  { value: "America/Argentina/Buenos_Aires", label: "Buenos Aires" },
  { value: "America/Santiago", label: "Santiago" },
  { value: "America/Mexico_City", label: "Mexico City" },
  { value: "America/Cancun", label: "Cancún" },
  { value: "America/Tijuana", label: "Tijuana" },
  { value: "America/Caracas", label: "Caracas" },

  { value: "Europe/Warsaw", label: "Warsaw" },
  { value: "Europe/Berlin", label: "Regensburg" },
  { value: "Europe/London", label: "London" },
];

const I18N = {
  en: {
    pageTitle: "Tibia Warzones Schedule",
    heroTitle: "Tibia Warzones Schedule",
    heroSubtitle:
      "Servers with Warzones activity based on Abyssador boss kills.",
    questLinksLabel: "Bigfoot's Burden Quest:",
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
  },
  "pt-BR": {
    pageTitle: "Tibia Warzones Schedule",
    heroTitle: "Tibia Warzones Schedule",
    heroSubtitle:
      "Servidores com atividade de Warzones baseada nas kills do boss Abyssador.",
    questLinksLabel: "Bigfoot's Burden Quest:",
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
  },
  "es-419": {
    pageTitle: "Tibia Warzones Schedule",
    heroTitle: "Tibia Warzones Schedule",
    heroSubtitle:
      "Servidores con actividad de Warzones basada en las muertes del boss Abyssador.",
    questLinksLabel: "Bigfoot's Burden Quest:",
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
  },
  pl: {
    pageTitle: "Tibia Warzones Schedule",
    heroTitle: "Tibia Warzones Schedule",
    heroSubtitle:
      "Serwery z aktywnością Warzones na podstawie liczby zabójstw bossa Abyssador.",
    questLinksLabel: "Bigfoot's Burden Quest:",
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
  },
};

let worlds = [];
let timezone = "UTC";
let lang = "pt-BR";

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
    if (saved && I18N[saved]) {
      return saved;
    }

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

    return parts.find((part) => part.type === "timeZoneName")?.value || tz;
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

    const value =
      parts.find((part) => part.type === "timeZoneName")?.value || "GMT";
    return value.replace("GMT", "UTC");
  } catch {
    return "UTC";
  }
}

function getTimezoneDisplayLabel(tz) {
  const entry = SUPPORTED_TIMEZONES.find((item) => item.value === tz);
  const label = entry ? entry.label : tz;
  const shortName = getTimezoneShortName(tz);
  const offset = getTimezoneOffsetLabel(tz);

  return `${label} (${shortName}, ${offset})`;
}

function offsetMinutes(tz) {
  try {
    const now = new Date();
    const localeString = now.toLocaleString("en-US", { timeZone: tz });
    const zoned = new Date(localeString);
    return Math.round((zoned.getTime() - now.getTime()) / 60000);
  } catch {
    return 0;
  }
}

function populateTimezoneSelect() {
  const select = document.getElementById("timezoneSelect");
  if (!select) return;

  const options = [...SUPPORTED_TIMEZONES];

  if (!options.some((item) => item.value === timezone)) {
    options.push({ value: timezone, label: timezone });
  }

  options.sort((a, b) => {
    const offsetDiff = offsetMinutes(a.value) - offsetMinutes(b.value);
    if (offsetDiff !== 0) return offsetDiff;
    return a.label.localeCompare(b.label, "en");
  });

  select.innerHTML = options
    .map((item) => {
      const selected = item.value === timezone ? "selected" : "";
      const label = getTimezoneDisplayLabel(item.value);
      return `<option value="${escapeHtml(
        item.value
      )}" ${selected}>${escapeHtml(label)}</option>`;
    })
    .join("");

  select.onchange = (event) => saveTZ(event.target.value);
}

function updateLanguageButtons() {
  const buttons = document.querySelectorAll(".lang-flag");
  buttons.forEach((button) => {
    const isActive = button.dataset.lang === lang;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", isActive ? "true" : "false");
  });
}

function bindLanguageButtons() {
  const buttons = document.querySelectorAll(".lang-flag");
  buttons.forEach((button) => {
    button.onclick = () => {
      const selectedLang = button.dataset.lang;
      if (selectedLang) {
        saveLang(selectedLang);
      }
    };
  });
}

function applyStaticLabels() {
  const dictionary = t();

  document.title = dictionary.pageTitle;

  const heroTitle = document.querySelector(".site-header h1");
  const heroSubtitle = document.querySelector(".site-header p");
  const questLinksLabel = document.getElementById("questLinksLabel");
  const searchLabel = document.querySelector('label[for="searchInput"]');
  const timezoneLabel = document.querySelector('label[for="timezoneSelect"]');
  const searchInput = document.getElementById("searchInput");

  if (heroTitle) heroTitle.textContent = dictionary.heroTitle;
  if (heroSubtitle) heroSubtitle.textContent = dictionary.heroSubtitle;
  if (questLinksLabel) questLinksLabel.textContent = dictionary.questLinksLabel;
  if (searchLabel) searchLabel.textContent = dictionary.search;
  if (timezoneLabel) timezoneLabel.textContent = dictionary.timezone;
  if (searchInput) {
    searchInput.placeholder = dictionary.search;
  }
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

  if (Number.isNaN(hour) || Number.isNaN(minute)) {
    return scheduleTime;
  }

  try {
    const referenceUtcDate = new Date(Date.UTC(2025, 0, 15, 12, 0, 0));

    const sourceParts = new Intl.DateTimeFormat("en-CA", {
      timeZone: sourceTimezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    }).formatToParts(referenceUtcDate);

    const map = {};
    for (const part of sourceParts) {
      if (part.type !== "literal") {
        map[part.type] = part.value;
      }
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

    const offsetParts = new Intl.DateTimeFormat("en", {
      timeZone: sourceTimezone,
      timeZoneName: "longOffset",
    }).formatToParts(probeDate);

    const offsetText =
      offsetParts.find((part) => part.type === "timeZoneName")?.value ||
      "GMT+00:00";
    const normalized = offsetText.replace("GMT", "");
    const match = normalized.match(/^([+-])(\d{2}):(\d{2})$/);

    let offsetMinutesValue = 0;
    if (match) {
      const sign = match[1] === "-" ? -1 : 1;
      const hh = Number(match[2]);
      const mm = Number(match[3]);
      offsetMinutesValue = sign * (hh * 60 + mm);
    }

    const actualUtcTimestamp = wallClockUtc - offsetMinutesValue * 60 * 1000;
    const actualDate = new Date(actualUtcTimestamp);

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
  const value = world.battleye_date;

  if (value === "release") {
    return "GBE";
  }

  if (value) {
    return "YBE";
  }

  return t().notAvailable;
}

function getTransferLabel(world) {
  const value = String(world.transfer_type || "").trim();

  if (!value) {
    return t().notAvailable;
  }

  if (value.toLowerCase() === "regular") {
    return "Regular";
  }

  return value.charAt(0).toUpperCase() + value.slice(1);
}

function renderExecutions(world) {
  const dictionary = t();
  const executions = Array.isArray(world.warzone_executions)
    ? [...world.warzone_executions]
    : [];

  if (executions.length === 0) {
    return `<p>${escapeHtml(dictionary.noSchedules)}</p>`;
  }

  executions.sort((a, b) => {
    const idA = Number(a.execution_id) || 0;
    const idB = Number(b.execution_id) || 0;
    return idA - idB;
  });

  const items = executions
    .map((execution) => {
      const shownTime = convertTimeBetweenTimezones(
        execution.schedule_time,
        world.timezone,
        timezone
      );

      const orderHtml = execution.warzone_sequence
        ? `<span class="execution-order">(${escapeHtml(
            execution.warzone_sequence
          )})</span>`
        : `<span class="execution-order"></span>`;

      return `
        <li class="execution-item">
          <span class="execution-time">${escapeHtml(shownTime)}</span>
          ${orderHtml}
        </li>
      `;
    })
    .join("");

  return `<ul class="executions-list">${items}</ul>`;
}

function renderWorld(world) {
  const dictionary = t();

  const regionText = world.location || dictionary.notAvailable;
  const pvpText = world.pvp_type || dictionary.notAvailable;
  const transferText = getTransferLabel(world);
  const battleyeText = getBattleyeLabel(world);
  const warzonesText = world.warzonesperday ?? 0;

  return `
    <div class="world-card">
      <h2>${escapeHtml(world.name || "")}</h2>

      <div class="world-meta">
        <span class="badge">${escapeHtml(dictionary.warzones)}: ${escapeHtml(
    warzonesText
  )}</span>
        <span>${escapeHtml(dictionary.region)}: ${escapeHtml(regionText)}</span>
        <span>${escapeHtml(dictionary.pvp)}: ${escapeHtml(pvpText)}</span>
        <span>${escapeHtml(dictionary.transfer)}: ${escapeHtml(
    transferText
  )}</span>
        <span>${escapeHtml(dictionary.battleye)}: ${escapeHtml(
    battleyeText
  )}</span>
      </div>

      <div class="executions">
        <h3>${escapeHtml(dictionary.services)}</h3>
        ${renderExecutions(world)}
      </div>
    </div>
  `;
}

function render() {
  const dictionary = t();
  const searchInput = document.getElementById("searchInput");
  const summary = document.getElementById("summary");
  const worldsList = document.getElementById("worldsList");

  if (!summary || !worldsList) return;

  const query = (searchInput?.value || "").trim().toLowerCase();

  const filtered = worlds
    .filter((world) => world && world.performs_warzone)
    .filter((world) =>
      String(world.name || "")
        .toLowerCase()
        .includes(query)
    )
    .sort((a, b) => {
      const aHas = Array.isArray(a.warzone_executions) && a.warzone_executions.length > 0 ? 1 : 0;
      const bHas = Array.isArray(b.warzone_executions) && b.warzone_executions.length > 0 ? 1 : 0;
      if (bHas !== aHas) return bHas - aHas;
      return String(a.name || "").localeCompare(String(b.name || ""), lang);
    });

  const withSchedules = filtered.filter(
    (world) =>
      Array.isArray(world.warzone_executions) &&
      world.warzone_executions.length > 0
  ).length;

  summary.textContent = dictionary.summary(
    filtered.length,
    withSchedules,
    getTimezoneDisplayLabel(timezone)
  );

  if (filtered.length === 0) {
    worldsList.innerHTML = `<div class="empty-state">${escapeHtml(
      dictionary.noServersFound
    )}</div>`;
    return;
  }

  // Distribui os cards em colunas para evitar espaços vazios (masonry JS)
  const html = filtered.map(renderWorld).join("");
  worldsList.innerHTML = html;
  // Aguarda o browser pintar os cards antes de medir alturas
  requestAnimationFrame(() => applyMasonry(worldsList));
}

function getColumnCount(container) {
  const width = container.offsetWidth;
  if (width >= 1020) return 3;
  if (width >= 680)  return 2;
  return 1;
}

function applyMasonry(container) {
  const cols = getColumnCount(container);

  // Coleta todos os cards (podem estar em .masonry-col de render anterior)
  const cards = [];
  container.querySelectorAll(".world-card, .empty-state").forEach((c) => cards.push(c));

  // Limpa o container
  container.innerHTML = "";

  if (cols === 1) {
    // Mobile: empilha direto sem colunas
    container.style.cssText = "display:flex;flex-direction:column;";
    cards.forEach((card) => container.appendChild(card));
    return;
  }

  const gap = cols === 3 ? 16 : 14;

  // Cria as colunas
  const columns = Array.from({ length: cols }, () => {
    const col = document.createElement("div");
    col.className = "masonry-col";
    col.style.cssText = `display:flex;flex-direction:column;gap:${gap}px;flex:1;min-width:0;`;
    container.appendChild(col);
    return col;
  });

  container.style.cssText = `display:flex;align-items:flex-start;gap:${gap}px;`;

  // Distribui round-robin primeiro para que todos os cards estejam no DOM e mensuráveis
  cards.forEach((card, i) => columns[i % cols].appendChild(card));

  // Segunda passagem: re-distribui pela altura real
  requestAnimationFrame(() => {
    // Remove dos containers atuais
    cards.forEach((card) => card.remove());
    columns.forEach((col) => (col.innerHTML = ""));

    const heights = new Array(cols).fill(0);
    cards.forEach((card) => {
      const shortest = heights.indexOf(Math.min(...heights));
      columns[shortest].appendChild(card);
      // Força leitura de layout para obter altura real
      heights[shortest] += card.getBoundingClientRect().height + gap;
    });
  });
}

async function init() {
  loadSettings();
  applyStaticLabels();
  bindLanguageButtons();
  updateLanguageButtons();
  populateTimezoneSelect();

  const searchInput = document.getElementById("searchInput");
  if (searchInput) {
    searchInput.oninput = render;
  }

  try {
    const response = await fetch("./data/worlds.json");
    if (!response.ok) {
      throw new Error(`${t().loadError}: ${response.status}`);
    }

    worlds = await response.json();
    render();

    // Re-aplica masonry ao redimensionar janela
    let resizeTimer;
    window.addEventListener("resize", () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(render, 120);
    });
  } catch (error) {
    const summary = document.getElementById("summary");
    const worldsList = document.getElementById("worldsList");

    if (summary) {
      summary.textContent = "";
    }

    if (worldsList) {
      worldsList.innerHTML = `<div class="empty-state">${escapeHtml(
        error.message
      )}</div>`;
    }
  }
}

init();
