function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderExecutions(executions) {
  if (!Array.isArray(executions) || executions.length === 0) {
    return "<p>Horários ainda não cadastrados.</p>";
  }

  const items = executions
    .slice()
    .sort((a, b) => a.execution_id - b.execution_id)
    .map((execution) => {
      const time = escapeHtml(execution.schedule_time ?? "");
      const sequence = escapeHtml(execution.warzone_sequence ?? "");
      const id = escapeHtml(execution.execution_id ?? "");
      return `<li>Execução ${id}: ${time} | sequência ${sequence}</li>`;
    })
    .join("");

  return `<ul>${items}</ul>`;
}

function renderWorldCard(world) {
  const name = escapeHtml(world.name ?? "");
  const status = escapeHtml(world.status ?? "");
  const location = escapeHtml(world.location ?? "");
  const pvpType = escapeHtml(world.pvp_type ?? "");
  const timezone = escapeHtml(world.timezone ?? "Não definido");
  const warzonesPerDay = escapeHtml(world.warzonesperday ?? 0);

  return `
    <article class="world-card">
      <h2>${name}</h2>

      <div class="world-meta">
        <span class="badge">Warzones/dia: ${warzonesPerDay}</span>
        <span>Status: ${status}</span>
        <span>Região: ${location}</span>
        <span>PvP: ${pvpType}</span>
        <span>Timezone: ${timezone}</span>
      </div>

      <div class="executions">
        <h3>Execuções</h3>
        ${renderExecutions(world.warzone_executions)}
      </div>
    </article>
  `;
}

function updateSummary(worlds) {
  const summary = document.getElementById("summary");
  const total = worlds.length;
  const withSchedules = worlds.filter(
    (world) =>
      Array.isArray(world.warzone_executions) &&
      world.warzone_executions.length > 0
  ).length;

  summary.textContent = `${total} servidores com Warzone ativa. ${withSchedules} com horários cadastrados.`;
}

function renderWorlds(worlds) {
  const container = document.getElementById("worldsList");

  if (worlds.length === 0) {
    container.innerHTML = `<div class="empty-state">Nenhum servidor encontrado.</div>`;
    updateSummary([]);
    return;
  }

  container.innerHTML = worlds.map(renderWorldCard).join("");
  updateSummary(worlds);
}

async function loadWorlds() {
  const response = await fetch("./data/worlds.json");

  if (!response.ok) {
    throw new Error(`Falha ao carregar worlds.json: ${response.status}`);
  }

  const worlds = await response.json();

  return worlds
    .filter((world) => world.performs_warzone)
    .sort((a, b) => {
      if (b.warzonesperday !== a.warzonesperday) {
        return b.warzonesperday - a.warzonesperday;
      }
      return a.name.localeCompare(b.name);
    });
}

async function init() {
  const searchInput = document.getElementById("searchInput");

  try {
    const worlds = await loadWorlds();
    renderWorlds(worlds);

    searchInput.addEventListener("input", () => {
      const query = searchInput.value.trim().toLowerCase();

      const filtered = worlds.filter((world) =>
        world.name.toLowerCase().includes(query)
      );

      renderWorlds(filtered);
    });
  } catch (error) {
    const container = document.getElementById("worldsList");
    container.innerHTML = `<div class="empty-state">${escapeHtml(
      error.message
    )}</div>`;
    updateSummary([]);
  }
}

init();
