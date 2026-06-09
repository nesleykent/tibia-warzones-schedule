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
- The admin page is a durable editor for `data/manual-schedules.json` and `data/market/items/tracked_items.json`.
- The admin page can also edit `data/open-houses.json`, but `scripts/update_open_houses.py` regenerates that file from GitHub issues. Open-house edits that do not exist in issue form can be overwritten later.
- `data/active_warzones.txt` is not consumed by the current codebase.
- World history dates on `world.html` are intentionally adjusted one day earlier at render time because TibiaData kill statistics are refreshed after the observation day. Do not rewrite the committed data files just to change the displayed calendar date.
- The scheduled world refresh workflow uses an hourly retry window plus a Berlin-time gate because GitHub cron is not minute-accurate enough to rely on a single daily trigger.

## Source Of Truth

- World metadata and kill statistics: TibiaData
- Manual schedules: `data/manual-schedules.json`
- Market item catalog: `data/market/items/items.csv`
- Enabled market items: `data/market/items/tracked_items.json`
- Open-house input: GitHub issues matching the open-house templates
- Open-house materialized output: `data/open-houses.json`
- Deployment artifact: committed repository state on `main`
