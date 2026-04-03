(function () {
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

  function getBrowserTimezone() {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    } catch {
      return "UTC";
    }
  }

  function loadSavedTimezone() {
    try {
      return localStorage.getItem("tz") || getBrowserTimezone();
    } catch {
      return getBrowserTimezone();
    }
  }

  function getTimezoneOffsetLabel(tz) {
    try {
      const parts = new Intl.DateTimeFormat("en", {
        timeZone: tz,
        timeZoneName: "longOffset",
      }).formatToParts(new Date());
      const value = parts.find((part) => part.type === "timeZoneName")?.value || "GMT";
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
    const offsetRaw = getTimezoneOffsetLabel(tz);
    const offsetCompact = offsetRaw
      .replace("UTC", "GMT")
      .replace(/:00$/, "")
      .replace(/([+-])0(\d)$/, "$1$2");
    return `${tz} (${offsetCompact})`;
  }

  function convertTimeBetweenTimezones(scheduleTime, sourceTimezone, targetTimezone, locale) {
    if (!scheduleTime || !sourceTimezone || !targetTimezone) return scheduleTime || "";
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
        timeZone: sourceTimezone,
        timeZoneName: "longOffset",
      }).formatToParts(probeDate);
      const offsetText =
        offParts.find((part) => part.type === "timeZoneName")?.value || "GMT+00:00";
      const normalized = offsetText.replace("GMT", "");
      const match = normalized.match(/^([+-])(\d{2}):(\d{2})$/);
      let offMin = 0;
      if (match) {
        const sign = match[1] === "-" ? -1 : 1;
        offMin = sign * (Number(match[2]) * 60 + Number(match[3]));
      }
      const actualDate = new Date(wallClockUtc - offMin * 60 * 1000);
      return new Intl.DateTimeFormat(locale || "en", {
        timeZone: targetTimezone,
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
    getBrowserTimezone,
    loadSavedTimezone,
    getTimezoneOffsetLabel,
    getTimezoneDisplayLabel,
    convertTimeBetweenTimezones,
  };
})();
