# Tibia Warzones Schedule

This repository publishes a static site for Tibia warzone planning. The site combines live world activity from TibiaData, manually curated schedule data, market-derived ranking data, and a GitHub issue backed open-house registry.

Code-backed documentation:

- [Architecture](./docs/architecture.md)
- [Operational runbook](./docs/operational-runbook.md)
- [Repository audit](./docs/repository-audit.md)
- [Ranking methodology](./Expected_Return_Explanation.md)

## What The Repository Contains

- Static HTML entry points: `index.html`, `world.html`, `ranking.html`, `open-houses.html`, `bigfoot.html`, `admin.html`
- Frontend controllers in `assets/*.js`
- Committed datasets under `data/`
- Python refresh and validation scripts under `scripts/`
- GitHub Actions workflows under `.github/workflows/`

The repository does not contain a backend service, database, bundler, or JavaScript package manifest. Pages are deployed directly from committed files.

## Verified Purpose

The current codebase provides:

- world activity summaries from TibiaData
- manual warzone schedules
- per-world detail pages with history and tracked market data
- a ranking page built from market-derived economic metrics embedded in `data/worlds.json`
- an open-house registry built from GitHub issues
- a browser-based maintainer page at `admin.html`

## Quick Start

Repository checks:

```bash
python3 -m py_compile scripts/*.py
python3 -m unittest discover -s tests -v
python3 scripts/validate_content.py
node --check assets/*.js
node --test tests/test_admin_editor.mjs
node --test tests/test_frontend_dates.mjs
```

Optional dependency:

```bash
python3 -m pip install -r requirements.txt
```

`requirements.txt` only provides `numpy`, which is needed by `scripts/remove_outliers.py`. The main refresh scripts use only the standard library.

Local preview:

```bash
python3 -m http.server 4173
```

Useful URLs:

- `http://127.0.0.1:4173/index.html`
- `http://127.0.0.1:4173/world.html?name=Antica`
- `http://127.0.0.1:4173/ranking.html`
- `http://127.0.0.1:4173/open-houses.html`
- `http://127.0.0.1:4173/admin.html`

## Update Commands

Refresh worlds and history:

```bash
python3 scripts/update_data.py
```

Refresh market files and rebuild rankings:

```bash
python3 scripts/fetch_item_history.py
python3 scripts/enrich_worlds_with_rankings.py
```

Rebuild the open-house registry from GitHub issues:

```bash
GITHUB_TOKEN=... GITHUB_REPOSITORY=owner/repo python3 scripts/update_open_houses.py
```

## Important Maintenance Facts

- `admin.html` is deployed with the public Pages artifact even though the main site navigation does not link to it.
- The admin page is a durable editor for `data/manual-schedules.json` and `data/market/items/tracked_items.json`, and it commits those source files directly to `main`.
- Public pages overlay `data/manual-schedules.json` onto `data/worlds.json` at runtime, so schedule-only edits go live through `Deploy Pages` without waiting for `Update Worlds`.
- Schedule times are wall-clock times in the schedule's `timezone`. European worlds are stored canonically in `Europe/Berlin` (CET/CEST), so their local Warzone time stays fixed while displays in other zones shift with European DST. Other regions keep the timezone entered (for example `America/Sao_Paulo#Curitiba`). The canonical map has a single source of truth, `data/schedule-timezones.json`, read by `scripts/common.py` and fetched by the admin editor. Python and JavaScript resolve DST-transition wall times identically (PEP 495 `fold=0`: ambiguous fall-back times take the first occurrence; nonexistent spring-forward times shift forward, e.g. 02:30 Berlin → 03:30 CEST).
- The admin editor converts schedules entered in a non-canonical timezone before committing, using the save date as the DST reference, and reloads its drafts from the committed file so it immediately shows the stored timezone and times. `scripts/validate_content.py` rejects non-canonical European schedules and any `worlds.json` schedule drift. To migrate existing data idempotently: `python3 scripts/canonicalize_manual_schedules.py --reference-date YYYY-MM-DD` (run from the repo root; it rewrites `data/manual-schedules.json` and mirrors it into `data/worlds.json`).
- The admin page does not write durable open-house changes; `scripts/update_open_houses.py` regenerates `data/open-houses.json` from GitHub issues.
- `data/active_warzones.txt` is not consumed by the current codebase.
- World history and Daily Summary dates are intentionally adjusted one day earlier at render time because TibiaData kill statistics are refreshed after the observation day. Do not rewrite the committed data files just to change the displayed calendar date.
- The scheduled world refresh workflow uses an hourly retry window plus a Berlin-time gate because GitHub cron is not minute-accurate enough to rely on a single daily trigger.
- `scripts/update_data.py` retries retryable TibiaData HTTP/network failures. The workflow keeps the last committed generated data unchanged when an upstream outage leaves a refresh incomplete.
- GitHub Pages deployment retries once after a transient Pages service failure; validation and artifact upload still run before deployment.
- The scheduled market refresh workflow now uses an hourly retry window because GitHub cron can drift by hours there as well.

## Source Of Truth

- World metadata and kill statistics: TibiaData
- Manual schedules: `data/manual-schedules.json`
- Market item catalog: `data/market/items/items.csv`
- Enabled market items: `data/market/items/tracked_items.json`
- Open-house input: GitHub issues matching the open-house templates
- Open-house materialized output: `data/open-houses.json`
- Deployment artifact: committed repository state on `main`

## Market data sources

- TibiaMarket is the primary and only persisted source for all market data. Persisted price models in `data/worlds.json` carry `"source": "tibiamarket"`.
- Tibia Coins only: when the TibiaMarket Tibia Coin observation is missing or older than 48 hours, the ranking page reads a fresher Tibia Coin quote from [Tibinance](https://nesleykent.github.io/Tibinance/) (`data/observations.csv`, latest `offers` sell price per world) at runtime in the browser and labels it "via Tibinance". Warzone items and every other item never fall back to Tibinance, which does not collect them. The economic score and ranking order stay based on persisted TibiaMarket data.
- Tibinance values are transient: they are held in memory only and are never written to repository data, caches, or history, because Tibinance consumes Warzones data and persisting them would create circular provenance. Every Python data writer calls `assert_persistable_market_payload` (`scripts/common.py`), and `scripts/validate_content.py` fails if any file under `data/` contains Tibinance data or a price model with a source other than `tibiamarket`.
