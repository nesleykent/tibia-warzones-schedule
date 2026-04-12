(function () {
  const DEFAULT_TIMEZONE = "America/Sao_Paulo#Curitiba";
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

  function getInitialLanguage(supportedLanguages, fallbackLanguage = "pt-BR") {
    const availableLanguages =
      supportedLanguages && typeof supportedLanguages === "object"
        ? supportedLanguages
        : {};
    const savedLanguage = readStorage("lang");

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
    return readStorage("tz", DEFAULT_TIMEZONE) || DEFAULT_TIMEZONE;
  }

  function getTimezoneOffsetLabel(tz) {
    const resolvedTimezone = resolveTimezoneValue(tz);
    try {
      const parts = new Intl.DateTimeFormat("en", {
        timeZone: resolvedTimezone,
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
    const entry =
      SUPPORTED_TIMEZONES.find((item) => item.value === tz) ||
      SUPPORTED_TIMEZONES.find((item) => item.timeZone === tz);
    if (entry) {
      return entry.short
        ? `${entry.label} (${entry.short}, ${entry.offset})`
        : `${entry.label} (${entry.offset})`;
    }
    const offsetRaw = getTimezoneOffsetLabel(tz);
    const offsetCompact = offsetRaw
      .replace("UTC", "GMT")
      .replace(/:00$/, "")
      .replace(/([+-])0(\d)$/, "$1$2");
    return `${tz} (${offsetCompact})`;
  }

  function resolveTimezoneValue(tz) {
    const entry = SUPPORTED_TIMEZONES.find((item) => item.value === tz);
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

    const pickRandomArtwork = (choices) =>
      choices[Math.floor(Math.random() * choices.length)];

    const applyArtwork = (fileName) => {
      layer.style.backgroundImage = `url(assets/background/${fileName})`;
      layer.style.opacity = "1";
    };

    const initialPick = pickRandomArtwork(artworks);
    const image = new Image();

    image.onload = () => applyArtwork(initialPick);
    image.onerror = () => {
      const remaining = artworks.filter((artwork) => artwork !== initialPick);
      if (remaining.length > 0) {
        applyArtwork(pickRandomArtwork(remaining));
      }
    };

    layer.style.opacity = "0";
    image.src = `assets/background/${initialPick}`;
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

  function initSharedUi() {
    initBackgroundArtwork();
    initLanguageDropdown();
  }

  function convertTimeBetweenTimezones(
    scheduleTime,
    sourceTimezone,
    targetTimezone,
    locale
  ) {
    if (!scheduleTime || !sourceTimezone || !targetTimezone)
      return scheduleTime || "";
    const resolvedSourceTimezone = resolveTimezoneValue(sourceTimezone);
    const resolvedTargetTimezone = resolveTimezoneValue(targetTimezone);
    const parts = String(scheduleTime).split(":");
    if (parts.length !== 2) return scheduleTime;
    const hour = Number(parts[0]);
    const minute = Number(parts[1]);
    if (Number.isNaN(hour) || Number.isNaN(minute)) return scheduleTime;

    try {
      const ref = new Date(Date.UTC(2025, 0, 15, 12, 0, 0));
      const srcParts = new Intl.DateTimeFormat("en-CA", {
        timeZone: resolvedSourceTimezone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hourCycle: "h23",
      }).formatToParts(ref);
      const map = {};
      for (const part of srcParts) {
        if (part.type !== "literal") map[part.type] = part.value;
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
        timeZone: resolvedSourceTimezone,
        timeZoneName: "longOffset",
      }).formatToParts(probeDate);
      const offsetText =
        offParts.find((part) => part.type === "timeZoneName")?.value ||
        "GMT+00:00";
      const normalized = offsetText.replace("GMT", "");
      const match = normalized.match(/^([+-])(\d{2}):(\d{2})$/);
      let offMin = 0;
      if (match) {
        const sign = match[1] === "-" ? -1 : 1;
        offMin = sign * (Number(match[2]) * 60 + Number(match[3]));
      }
      const actualDate = new Date(wallClockUtc - offMin * 60 * 1000);
      return new Intl.DateTimeFormat(locale || "en", {
        timeZone: resolvedTargetTimezone,
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
      }).format(actualDate);
    } catch {
      return scheduleTime;
    }
  }

  window.TibiaTime = {
    SUPPORTED_TIMEZONES,
    DEFAULT_TIMEZONE,
    escapeHtml,
    readStorage,
    writeStorage,
    getInitialLanguage,
    getBrowserTimezone,
    loadSavedTimezone,
    getTimezoneOffsetLabel,
    getTimezoneDisplayLabel,
    resolveTimezoneValue,
    convertTimeBetweenTimezones,
    initBackgroundArtwork,
    initLanguageDropdown,
    initSharedUi,
  };
})();
