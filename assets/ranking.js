const {
  SHARED_STORAGE_KEYS,
  WORLDS_DATA_PATH,
  escapeHtml,
  fetchJson,
  formatTransferType,
  getInitialLanguage: getSharedInitialLanguage,
  bindLanguageButtons: bindSharedLanguageButtons,
  getWorldMarkLabel,
  getWorldPvpKey,
  getWorldRegionKey,
  getWorldTransferKey,
  initSharedUi,
  readJsonStorage,
  readStorage,
  setHtml,
  setTextContent,
  updateLanguageButtons: updateSharedLanguageButtons,
  writeJsonStorage,
  writeStorage,
} = window.TibiaTime;

const STORAGE_KEYS = {
  activeFilters: "rankingActiveFilters",
  lang: SHARED_STORAGE_KEYS.language,
};
const FILTER_CONFIGS = [
  { group: "region", getValue: getRegionKey, format: (value) => value },
  { group: "pvp", getValue: getPvpKey, format: (value) => value },
  {
    group: "transfer",
    getValue: getTransferKey,
    format: (value) => formatTransferType(value, value),
  },
  { group: "mark", getValue: getMarkKey, format: getMarkLabel },
];
const FILTER_GROUPS = FILTER_CONFIGS.map(({ group }) => group);
const FILTER_CONFIGS_BY_GROUP = Object.fromEntries(
  FILTER_CONFIGS.map((config) => [config.group, config])
);
const PAGE_ELEMENT_IDS = {
  title: "rankingTitle",
  subtitle: "rankingSubtitle",
  searchLabel: "searchLabel",
  filtersLabel: "filtersLabel",
  searchInput: "searchInput",
  filtersBar: "filtersBar",
  summary: "summary",
  tableWrap: "rankingTableWrap",
};

const I18N = {
  en: {
    pageTitle: "Warzones Ranking",
    title: "Warzones Ranking",
    subtitle: "Ranking based on expected return only.",
    explanationTitle: "Understanding the calculation",
    explanationIntro:
      "The ranking normalizes each world's service value by the Tibia Coins price, so worlds can be compared on the same scale.",
    explanationRankingFormulaTitle: "Ranking formula",
    explanationRankingFormula:
      String.raw`\[
\mathrm{ER}_{xTC} = \frac{\mathrm{ServiceEV}_{gold}}{P_{TC}}
\]`,
    explanationRankingFormulaText:
      "This converts the expected service value from gold coins into a Tibia-Coin-denominated value.",
    explanationServiceFormulaTitle: "Service EV formula",
    explanationServiceFormula:
      String.raw`\[
\mathrm{ServiceEV}_{gold} = EV_{WZ1} + EV_{WZ2} + EV_{WZ3}
\]`,
    explanationServiceFormulaText:
      "The service EV is the total expected gold value produced by completing the three Bigfoot's Burden warzones.",
    explanationComponentsTitle: "Warzone expected values",
    explanationComponentsIntro:
      "Each warzone EV is computed from the fixed gold reward plus the market value of its item drops.",
    explanationComponentsFormulas:
      [
        String.raw`\[
EV_{WZ1} = 30000 + 0.5 \cdot P_{GCS} + P_{GN}
\]`,
        String.raw`\[
EV_{WZ2} = 40000 + P_{BCS} + P_{PN}
\]`,
        String.raw`\[
EV_{WZ3} = 50000 + P_{VCS} + P_{PR}
\]`,
      ],
    explanationVariablesTitle: "Variables",
    explanationVariables: [
      {
        term: String.raw`\(\mathrm{ER}_{xTC}\)`,
        description: "expected return expressed in Tibia Coins.",
      },
      {
        term: String.raw`\(\mathrm{ServiceEV}_{gold}\)`,
        description: "expected return expressed in gold coins.",
      },
      {
        term: String.raw`\(P_{TC}\)`,
        description: "average Tibia Coins price from the last 7 market entries for that world.",
      },
      {
        term: String.raw`\(P_{GCS}, P_{BCS}, P_{VCS}\)`,
        description:
          "market prices for the green, blue, and violet crystal shard components used in the model.",
      },
      {
        term: String.raw`\(P_{GN}\)`,
        description: "market price of Gill Necklace.",
      },
      {
        term: String.raw`\(P_{PN}\)`,
        description: "market price of Prismatic Necklace.",
      },
      {
        term: String.raw`\(P_{PR}\)`,
        description: "market price of Prismatic Ring.",
      },
    ],
    explanationNotesTitle: "Notes",
    explanationNotes: [
      "Gold values alone are not directly comparable between worlds with very different Tibia Coins prices.",
      "The Tibia Coins price uses the rolling market value stored in the ranking dataset.",
      "ER (xGold) on the world page is the raw Service EV, while ER (xTC) is the normalized ranking value.",
    ],
    explanationLink: "Understanding the calculation",
    close: "Close",
    search: "Search world",
    searchPlaceholder: "World name…",
    filters: "Filters",
    summary: (total, ranked) => `${ranked} ranked worlds out of ${total} total worlds.`,
    noWorlds: "No ranked worlds match the current filters.",
    all: "All",
    expectedReturn: "Expected Return",
    rank: "Rank",
    tibiaCoin: "Tibia Coins Price",
    pvpType: "PvP Type",
    serviceExpectedValue: "Service EV",
    expectedReturnXtc: "Expected Return",
    world: "World",
    services: "Services completed",
    mark: "Current mark",
    healthy: "Healthy",
    inconclusive: "Inconclusive",
    trolls: "Trolls",
    notAvailable: "N/A",
  },
  "pt-BR": {
    pageTitle: "Warzones Ranking",
    title: "Warzones Ranking",
    subtitle: "Ranking baseado apenas em expected return.",
    explanationTitle: "Understanding the calculation",
    explanationIntro:
      "O ranking normaliza o valor esperado do service pelo preço da Tibia Coins, para que os mundos possam ser comparados na mesma escala.",
    explanationRankingFormulaTitle: "Fórmula do ranking",
    explanationRankingFormula:
      String.raw`\[
\mathrm{ER}_{xTC} = \frac{\mathrm{ServiceEV}_{gold}}{P_{TC}}
\]`,
    explanationRankingFormulaText:
      "Isso converte o valor esperado do service, em gold coins, para uma unidade baseada em Tibia Coins.",
    explanationServiceFormulaTitle: "Fórmula do Service EV",
    explanationServiceFormula:
      String.raw`\[
\mathrm{ServiceEV}_{gold} = EV_{WZ1} + EV_{WZ2} + EV_{WZ3}
\]`,
    explanationServiceFormulaText:
      "O Service EV é o valor total esperado, em gold, ao completar as três warzones de Bigfoot's Burden.",
    explanationComponentsTitle: "Valores esperados por warzone",
    explanationComponentsIntro:
      "O EV de cada warzone é calculado a partir da recompensa fixa em gold e do valor de mercado dos drops.",
    explanationComponentsFormulas: [
      String.raw`\[
EV_{WZ1} = 30000 + 0.5 \cdot P_{GCS} + P_{GN}
\]`,
      String.raw`\[
EV_{WZ2} = 40000 + P_{BCS} + P_{PN}
\]`,
      String.raw`\[
EV_{WZ3} = 50000 + P_{VCS} + P_{PR}
\]`,
    ],
    explanationVariablesTitle: "Variáveis",
    explanationVariables: [
      {
        term: String.raw`\(\mathrm{ER}_{xTC}\)`,
        description: "expected return expresso em Tibia Coins.",
      },
      {
        term: String.raw`\(\mathrm{ServiceEV}_{gold}\)`,
        description: "expected return expresso em gold coins.",
      },
      {
        term: String.raw`\(P_{TC}\)`,
        description: "preço rolling de 7 dias da Tibia Coins naquele mundo.",
      },
      {
        term: String.raw`\(P_{GCS}, P_{BCS}, P_{VCS}\)`,
        description:
          "preços de mercado dos componentes green, blue e violet crystal shard usados no modelo.",
      },
      {
        term: String.raw`\(P_{GN}\)`,
        description: "preço de mercado de Gill Necklace.",
      },
      {
        term: String.raw`\(P_{PN}\)`,
        description: "preço de mercado de Prismatic Necklace.",
      },
      {
        term: String.raw`\(P_{PR}\)`,
        description: "preço de mercado de Prismatic Ring.",
      },
    ],
    explanationNotesTitle: "Notas",
    explanationNotes: [
      "Valores em gold puro não são diretamente comparáveis entre mundos com preços muito diferentes de Tibia Coins.",
      "O preço da Tibia Coins usa o valor rolling salvo no dataset do ranking.",
      "ER (xGold) na world page é o Service EV bruto, enquanto ER (xTC) é o valor normalizado do ranking.",
    ],
    explanationLink: "Understanding the calculation",
    close: "Fechar",
    search: "Buscar mundo",
    searchPlaceholder: "Nome do mundo…",
    filters: "Filtros",
    summary: (total, ranked) => `${ranked} mundos ranqueados de ${total} mundos totais.`,
    noWorlds: "Nenhum mundo ranqueado corresponde aos filtros atuais.",
    all: "Todos",
    expectedReturn: "Expected Return",
    rank: "Rank",
    tibiaCoin: "Tibia Coins Price",
    pvpType: "Tipo PvP",
    serviceExpectedValue: "Service EV",
    expectedReturnXtc: "Expected Return",
    world: "Mundo",
    services: "Services concluídos",
    mark: "Marca atual",
    healthy: "Healthy",
    inconclusive: "Inconclusivo",
    trolls: "Trolls",
    notAvailable: "N/D",
  },
  "es-419": {
    pageTitle: "Warzones Ranking",
    title: "Warzones Ranking",
    subtitle: "Ranking basado solo en expected return.",
    explanationTitle: "Understanding the calculation",
    explanationIntro:
      "El ranking normaliza el valor esperado del service por el precio de Tibia Coins, para comparar mundos en la misma escala.",
    explanationRankingFormulaTitle: "Fórmula del ranking",
    explanationRankingFormula:
      String.raw`\[
\mathrm{ER}_{xTC} = \frac{\mathrm{ServiceEV}_{gold}}{P_{TC}}
\]`,
    explanationRankingFormulaText:
      "Esto convierte el valor esperado del service desde gold coins a una unidad basada en Tibia Coins.",
    explanationServiceFormulaTitle: "Fórmula del Service EV",
    explanationServiceFormula:
      String.raw`\[
\mathrm{ServiceEV}_{gold} = EV_{WZ1} + EV_{WZ2} + EV_{WZ3}
\]`,
    explanationServiceFormulaText:
      "El Service EV es el valor total esperado, en gold, al completar las tres warzones de Bigfoot's Burden.",
    explanationComponentsTitle: "Valores esperados por warzone",
    explanationComponentsIntro:
      "El EV de cada warzone se calcula con la recompensa fija en gold y el valor de mercado de sus drops.",
    explanationComponentsFormulas: [
      String.raw`\[
EV_{WZ1} = 30000 + 0.5 \cdot P_{GCS} + P_{GN}
\]`,
      String.raw`\[
EV_{WZ2} = 40000 + P_{BCS} + P_{PN}
\]`,
      String.raw`\[
EV_{WZ3} = 50000 + P_{VCS} + P_{PR}
\]`,
    ],
    explanationVariablesTitle: "Variables",
    explanationVariables: [
      {
        term: String.raw`\(\mathrm{ER}_{xTC}\)`,
        description: "expected return expresado en Tibia Coins.",
      },
      {
        term: String.raw`\(\mathrm{ServiceEV}_{gold}\)`,
        description: "expected return expresado en gold coins.",
      },
      {
        term: String.raw`\(P_{TC}\)`,
        description: "precio rolling de 7 días de Tibia Coins en ese mundo.",
      },
      {
        term: String.raw`\(P_{GCS}, P_{BCS}, P_{VCS}\)`,
        description:
          "precios de mercado de los componentes green, blue y violet crystal shard usados en el modelo.",
      },
      {
        term: String.raw`\(P_{GN}\)`,
        description: "precio de mercado de Gill Necklace.",
      },
      {
        term: String.raw`\(P_{PN}\)`,
        description: "precio de mercado de Prismatic Necklace.",
      },
      {
        term: String.raw`\(P_{PR}\)`,
        description: "precio de mercado de Prismatic Ring.",
      },
    ],
    explanationNotesTitle: "Notas",
    explanationNotes: [
      "Los valores brutos en gold no son directamente comparables entre mundos con precios muy distintos de Tibia Coins.",
      "El precio de Tibia Coins usa el valor rolling guardado en el dataset del ranking.",
      "ER (xGold) en la world page es el Service EV bruto, mientras ER (xTC) es el valor normalizado del ranking.",
    ],
    explanationLink: "Understanding the calculation",
    close: "Cerrar",
    search: "Buscar mundo",
    searchPlaceholder: "Nombre del mundo…",
    filters: "Filtros",
    summary: (total, ranked) => `${ranked} mundos clasificados de ${total} mundos totales.`,
    noWorlds: "Ningún mundo clasificado coincide con los filtros actuales.",
    all: "Todos",
    expectedReturn: "Expected Return",
    rank: "Rank",
    tibiaCoin: "Tibia Coins Price",
    pvpType: "Tipo PvP",
    serviceExpectedValue: "Service EV",
    expectedReturnXtc: "Expected Return",
    world: "Mundo",
    services: "Servicios completados",
    mark: "Marca actual",
    healthy: "Healthy",
    inconclusive: "Inconclusivo",
    trolls: "Trolls",
    notAvailable: "N/D",
  },
  pl: {
    pageTitle: "Warzones Ranking",
    title: "Warzones Ranking",
    subtitle: "Ranking oparty wyłącznie na expected return.",
    explanationTitle: "Understanding the calculation",
    explanationIntro:
      "Ranking normalizuje oczekiwaną wartość service przez cenę Tibia Coins, aby porównywać światy na tej samej skali.",
    explanationRankingFormulaTitle: "Wzór rankingu",
    explanationRankingFormula:
      String.raw`\[
\mathrm{ER}_{xTC} = \frac{\mathrm{ServiceEV}_{gold}}{P_{TC}}
\]`,
    explanationRankingFormulaText:
      "To przelicza oczekiwaną wartość service z gold coins na jednostkę opartą o Tibia Coins.",
    explanationServiceFormulaTitle: "Wzór Service EV",
    explanationServiceFormula:
      String.raw`\[
\mathrm{ServiceEV}_{gold} = EV_{WZ1} + EV_{WZ2} + EV_{WZ3}
\]`,
    explanationServiceFormulaText:
      "Service EV to całkowita oczekiwana wartość w gold po ukończeniu trzech warzones z Bigfoot's Burden.",
    explanationComponentsTitle: "Oczekiwane wartości warzones",
    explanationComponentsIntro:
      "EV każdej warzone liczy się z gwarantowanej nagrody w gold oraz wartości rynkowej dropów.",
    explanationComponentsFormulas: [
      String.raw`\[
EV_{WZ1} = 30000 + 0.5 \cdot P_{GCS} + P_{GN}
\]`,
      String.raw`\[
EV_{WZ2} = 40000 + P_{BCS} + P_{PN}
\]`,
      String.raw`\[
EV_{WZ3} = 50000 + P_{VCS} + P_{PR}
\]`,
    ],
    explanationVariablesTitle: "Zmienne",
    explanationVariables: [
      {
        term: String.raw`\(\mathrm{ER}_{xTC}\)`,
        description: "expected return wyrażony w Tibia Coins.",
      },
      {
        term: String.raw`\(\mathrm{ServiceEV}_{gold}\)`,
        description: "expected return wyrażony w gold coins.",
      },
      {
        term: String.raw`\(P_{TC}\)`,
        description: "7-dniowa rolling price Tibia Coins dla danego świata.",
      },
      {
        term: String.raw`\(P_{GCS}, P_{BCS}, P_{VCS}\)`,
        description:
          "ceny rynkowe komponentów green, blue i violet crystal shard używanych w modelu.",
      },
      {
        term: String.raw`\(P_{GN}\)`,
        description: "cena rynkowa Gill Necklace.",
      },
      {
        term: String.raw`\(P_{PN}\)`,
        description: "cena rynkowa Prismatic Necklace.",
      },
      {
        term: String.raw`\(P_{PR}\)`,
        description: "cena rynkowa Prismatic Ring.",
      },
    ],
    explanationNotesTitle: "Uwagi",
    explanationNotes: [
      "Surowe wartości w gold nie są bezpośrednio porównywalne między światami z bardzo różnymi cenami Tibia Coins.",
      "Cena Tibia Coins używa rolling value zapisanego w dataset rankingu.",
      "ER (xGold) na world page to surowy Service EV, a ER (xTC) to znormalizowana wartość rankingowa.",
    ],
    explanationLink: "Understanding the calculation",
    close: "Zamknij",
    search: "Szukaj świata",
    searchPlaceholder: "Nazwa świata…",
    filters: "Filtry",
    summary: (total, ranked) => `${ranked} sklasyfikowanych światów z ${total} wszystkich światów.`,
    noWorlds: "Żaden sklasyfikowany świat nie pasuje do aktywnych filtrów.",
    all: "Wszystkie",
    expectedReturn: "Expected Return",
    rank: "Rank",
    tibiaCoin: "Tibia Coins Price",
    pvpType: "Typ PvP",
    serviceExpectedValue: "Service EV",
    expectedReturnXtc: "Expected Return",
    world: "Świat",
    services: "Ukończone usługi",
    mark: "Bieżące oznaczenie",
    healthy: "Healthy",
    inconclusive: "Niejednoznaczne",
    trolls: "Trolls",
    notAvailable: "Brak",
  },
};

let worlds = [];
let lang = "pt-BR";
let explanationModalKeydownHandler = null;
let activeFilters = createEmptyFilterState();
const pageElements = {};

function createEmptyFilterState() {
  return Object.fromEntries(FILTER_GROUPS.map((group) => [group, new Set()]));
}

function cachePageElements() {
  Object.entries(PAGE_ELEMENT_IDS).forEach(([key, id]) => {
    pageElements[key] = document.getElementById(id);
  });
}

function t() {
  return I18N[lang] || I18N["pt-BR"];
}


function getMarkKey(world) {
  return String(world?.mark || "").trim().toLowerCase();
}

function getMarkLabel(mark) {
  return getWorldMarkLabel(mark, {
    notAvailable: t().notAvailable,
    healthy: t().healthy,
    trolls: t().trolls,
    inconclusive: t().inconclusive,
  });
}

function getRegionKey(world) {
  return getWorldRegionKey(world);
}

function getPvpKey(world) {
  return getWorldPvpKey(world);
}

function getTransferKey(world) {
  return getWorldTransferKey(world);
}

function hasActiveFilters() {
  return FILTER_GROUPS.some((group) => activeFilters[group].size > 0);
}

function worldPassesFilters(world) {
  return FILTER_CONFIGS.every(({ group, getValue }) => {
    const values = activeFilters[group];
    return values.size === 0 || values.has(getValue(world));
  });
}

function loadSettings() {
  lang = getSharedInitialLanguage(I18N);
  const savedFilters = readJsonStorage(STORAGE_KEYS.activeFilters, {});

  FILTER_GROUPS.forEach((group) => {
    if (Array.isArray(savedFilters[group])) {
      activeFilters[group] = new Set(savedFilters[group]);
    }
  });
}

function saveFilters() {
  writeJsonStorage(
    STORAGE_KEYS.activeFilters,
    Object.fromEntries(
      FILTER_GROUPS.map((group) => [group, [...activeFilters[group]]])
    )
  );
}

function toggleFilter(group, value) {
  if (activeFilters[group].has(value)) activeFilters[group].delete(value);
  else activeFilters[group].add(value);
  saveFilters();
  render();
}

function clearFilters() {
  FILTER_GROUPS.forEach((group) => activeFilters[group].clear());
  saveFilters();
  render();
}

function applyStaticLabels() {
  const dict = t();
  document.title = dict.pageTitle;
  setTextContent(pageElements.title, dict.title);
  setTextContent(pageElements.subtitle, dict.subtitle);
  setTextContent(pageElements.searchLabel, dict.search);
  setTextContent(pageElements.filtersLabel, dict.filters);
  if (pageElements.searchInput) {
    pageElements.searchInput.placeholder = dict.searchPlaceholder;
  }
}

function updateLanguageButtons() {
  updateSharedLanguageButtons(lang);
}

function bindLanguageButtons() {
  bindSharedLanguageButtons((nextLang) => {
    lang = nextLang;
    writeStorage(STORAGE_KEYS.lang, lang);
    closeExplanationModal();
    applyStaticLabels();
    updateLanguageButtons();
    render();
  });
}

function formatRankingNumber(value, maximumFractionDigits = 3) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return t().notAvailable;
  return new Intl.NumberFormat(lang, {
    minimumFractionDigits: 0,
    maximumFractionDigits,
  }).format(numeric);
}

function getRanking(world) {
  return world?.warzone_economic_ranking || null;
}

function compareWorlds(a, b) {
  return (
    (getRanking(a)?.ranking_position || Number.MAX_SAFE_INTEGER) -
    (getRanking(b)?.ranking_position || Number.MAX_SAFE_INTEGER)
  );
}

function renderFilters() {
  const dict = t();
  const filterBar = pageElements.filtersBar;
  if (!filterBar) return;

  const rankedWorlds = worlds.filter((world) => getRanking(world)?.is_ranked);

  function pills(group, values, format) {
    return [...values]
      .sort()
      .map((value) => {
        const active = activeFilters[group].has(value);
        return `<button type="button" class="filter-pill${active ? " is-active" : ""}" data-filter-group="${escapeHtml(group)}" data-filter-value="${escapeHtml(value)}">${escapeHtml(format(value))}</button>`;
      })
      .join("");
  }

  const allPill = `<button type="button" class="filter-pill filter-pill--all${!hasActiveFilters() ? " is-active" : ""}" data-filter-group="__all__" data-filter-value="__all__">${escapeHtml(dict.all)}</button>`;
  filterBar.innerHTML = `<div class="filter-pills-row">${
    allPill +
    FILTER_CONFIGS
      .map(({ group, format }) =>
        pills(
          group,
          new Set(
            rankedWorlds.map((world) => FILTER_CONFIGS_BY_GROUP[group].getValue(world))
          ),
          format
        )
      )
      .join("")
  }</div>`;
}

function bindFilterBar() {
  const filterBar = pageElements.filtersBar;
  if (!filterBar) return;
  filterBar.addEventListener("click", (event) => {
    const button = event.target.closest(".filter-pill");
    if (!button) return;
    const group = button.dataset.filterGroup;
    const value = button.dataset.filterValue;
    if (group === "__all__") {
      clearFilters();
      return;
    }
    if (group && value) toggleFilter(group, value);
  });
}

function bindRankingTable() {
  const wrap = pageElements.tableWrap;
  if (!wrap) return;

  wrap.addEventListener("click", (event) => {
    if (event.target.closest("a, button")) return;
    const row = event.target.closest(".ranking-table-row");
    if (row?.dataset.worldUrl) {
      window.location.href = row.dataset.worldUrl;
    }
  });

  wrap.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    const row = event.target.closest(".ranking-table-row");
    if (!row?.dataset.worldUrl) return;
    event.preventDefault();
    window.location.href = row.dataset.worldUrl;
  });
}

function renderEmptyState(container, message) {
  if (!container) return;
  container.innerHTML = `<div class="empty-state">${escapeHtml(
    message
  )}</div>`;
}

function renderTable(rows) {
  const dict = t();
  const wrap = pageElements.tableWrap;
  if (!wrap) return;

  if (rows.length === 0) {
    renderEmptyState(wrap, dict.noWorlds);
    return;
  }

  wrap.innerHTML = `
    <table class="ranking-table">
      <thead>
        <tr>
          <th scope="col">${escapeHtml(dict.rank)}</th>
          <th scope="col">${escapeHtml(dict.world)}</th>
          <th scope="col">${escapeHtml(dict.expectedReturnXtc)}</th>
          <th scope="col">${escapeHtml(dict.pvpType)}</th>
          <th scope="col">${escapeHtml(dict.tibiaCoin)}</th>
          <th scope="col">${escapeHtml(dict.serviceExpectedValue)}</th>
        </tr>
      </thead>
      <tbody>
        ${rows
          .map((world) => {
            const ranking = getRanking(world);
            const market = ranking.market || {};
            return `
              <tr class="ranking-table-row" data-world-url="./world.html?name=${encodeURIComponent(world.name)}" tabindex="0" role="link" aria-label="Open ${escapeHtml(world.name)} world page">
                <td>${escapeHtml(
                  ranking.ranking_position
                    ? `#${String(ranking.ranking_position)}`
                    : String(dict.notAvailable)
                )}</td>
                <td><a class="world-name-link" href="./world.html?name=${encodeURIComponent(world.name)}">${escapeHtml(world.name)}</a></td>
                <td>${escapeHtml(formatRankingNumber(ranking.economic_score_raw, 2))}</td>
                <td>${escapeHtml(world.pvp_type || dict.notAvailable)}</td>
                <td>${escapeHtml(formatRankingNumber(market.tibia_coin?.rolling_window_price, 0))}</td>
                <td>${escapeHtml(formatRankingNumber(ranking.service_expected_value, 0))}</td>
              </tr>
            `;
          })
          .join("")}
      </tbody>
    </table>
  `;
}

function render() {
  const query = String(pageElements.searchInput?.value || "")
    .trim()
    .toLowerCase();
  const rows = worlds
    .filter((world) => getRanking(world)?.is_ranked)
    .filter((world) => worldPassesFilters(world))
    .filter((world) => String(world.name || "").toLowerCase().includes(query))
    .sort(compareWorlds);
  if (pageElements.summary) {
    setHtml(
      pageElements.summary,
      `<span class="summary-text">${escapeHtml(
        t().summary(worlds.length, rows.length)
      )}</span>`
    );
  }
  renderFilters();
  renderTable(rows);
}

async function init() {
  initSharedUi();
  cachePageElements();
  loadSettings();
  applyStaticLabels();
  updateLanguageButtons();
  bindLanguageButtons();
  bindFilterBar();
  bindRankingTable();

  const searchInput = pageElements.searchInput;
  if (searchInput) searchInput.addEventListener("input", render);

  const worldsData = await fetchJson(WORLDS_DATA_PATH);
  worlds = Array.isArray(worldsData) ? worldsData : [];
  render();
}

init().catch((error) => {
  renderEmptyState(pageElements.tableWrap, error.message);
});
