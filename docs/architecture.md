# Architecture

This repository is a static GitHub Pages application. Browsers fetch committed JSON files directly. Python scripts refresh those files, and GitHub Actions commit the refreshed outputs back to `main`.

## High-Level Shape

- Frontend: plain HTML, CSS, and browser JavaScript in the repo root and `assets/`
- Data: committed JSON and CSV files in `data/`
- Automation: Python scripts in `scripts/` and workflows in `.github/workflows/`
- Deployment: GitHub Pages publishes a copied `_site` artifact built from committed files

There is no backend server, database, bundler, or JavaScript package build step.

## Frontend Entry Points

### `index.html`

- Controller: `assets/app.js`
- Shared runtime: `assets/shared.js`
- Purpose: world discovery, planner selections, countdowns, filters, and notifications
- Evidence: `assets/app.js:init()`, `renderWorld()`, `renderSchedulePanel()`, `updateCountdownPanel()`

### `world.html`

- Controller: `assets/world.js`
- Shared runtime: `assets/shared.js`
- Purpose: one-world summary, schedules, market tables and charts, history table, and external links
- Evidence: `assets/world.js:loadWorldPage()`, `renderMarketPrices()`, `renderHistory()`

### `ranking.html`

- Controller: `assets/ranking.js`
- Shared runtime: `assets/shared.js`
- Purpose: sortable ranking table built from `worlds.json`
- Evidence: `assets/ranking.js:init()`, `render()`, `renderTable()`

### `open-houses.html`

- Controller: `assets/open-houses.js`
- Shared runtime: `assets/shared.js`
- Purpose: world overview and per-world detail for open-house records
- Evidence: `assets/open-houses.js:init()`, `getVisibleWorlds()`, `renderWorldDetail()`

### `bigfoot.html`

- Controller: `assets/bigfoot.js`
- Shared runtime: `assets/shared.js`
- Purpose: static quest reference page
- Evidence: `assets/bigfoot.js`

### `admin.html`

- Controller: `assets/admin.js`
- Shared runtime: `assets/shared.js`
- Purpose: browser maintainer editor that opens GitHub branches, commits, and pull requests
- Evidence: `assets/admin.js:init()`, `buildPendingReview()`, `createPullRequestWorkflow()`

## Shared Frontend Runtime

`assets/shared.js` defines `window.TibiaTime`, which all page controllers use for:

- fetching JSON
- storage helpers
- timezone conversion
- language controls
- world metadata labels
- footer rendering

The page scripts are independent files that read helpers from that shared global.

## Data Model

### `data/worlds.json`

Primary site dataset. It is consumed by the home page, world page, ranking page, open-houses page, and admin page.

Each world record includes:

- upstream world metadata
- current kill counts
- current service counters
- merged manual schedule data
- history presence flags
- embedded `warzone_economic_ranking`

Produced by:

- `scripts/update_data.py`
- `scripts/enrich_worlds_with_rankings.py`

### `data/history/*.json`

One file per world. Each file stores dated kill counts, service counts, and marks.

Consumed by:

- `assets/world.js`
- `scripts/economic_ranking.py`

Produced by:

- `scripts/update_data.py`

### `data/market/world/<World>/<world>_<item>.json`

One file per world and tracked item. Files store `last_run_at`, `status`, and `snapshots`.

Consumed by:

- `assets/world.js`
- `scripts/economic_ranking.py`

Produced by:

- `scripts/fetch_item_history.py`
- optionally rewritten by `scripts/remove_outliers.py`

### `data/manual-schedules.json`

Manual source input for schedule and timezone data. Merged into `data/worlds.json` by `scripts/update_data.py`.

### `data/market/items/items.csv`

Market item catalog used by `scripts/common.py` and `assets/admin.js`.

### `data/market/items/tracked_items.json`

List of enabled tracked market items. Used by `scripts/common.py` and `assets/admin.js`.

### `data/open-houses.json`

Materialized registry consumed by `assets/open-houses.js` and `assets/admin.js`.

Produced by:

- `scripts/update_open_houses.py`

Important constraint:

- this file is output, not the durable source of truth
- the durable source is GitHub issues parsed by `scripts/update_open_houses.py`

## Script Layer

### `scripts/update_data.py`

Pipeline:

1. fetch world metadata from TibiaData
2. fetch per-world kill statistics from TibiaData
3. merge manual schedules from `data/manual-schedules.json`
4. append or replace today’s history row in `data/history/*.json`
5. build world summaries
6. attach ranking metrics through `attach_ranking_metrics()`
7. validate and write `data/worlds.json`

Key functions:

- `get_worlds()`
- `get_kill_statistics()`
- `build_world_summary()`
- `main()`

### `scripts/economic_ranking.py`

Responsibilities:

- load market files and history files
- compute expected return and supporting metrics
- embed `warzone_economic_ranking` into each world record
- assign `ranking_position`

Key functions:

- `load_market_models()`
- `load_recent_history_marks()`
- `compute_world_ranking_metrics()`
- `attach_ranking_metrics()`

### `scripts/enrich_worlds_with_rankings.py`

Standalone ranking rebuild using existing local data. It rewrites only `data/worlds.json`.

### `scripts/fetch_item_history.py`

Responsibilities:

- discover tracked worlds from directories under `data/market/world/`
- discover tracked items from `items.csv` filtered by `tracked_items.json`
- fetch TibiaMarket item history
- merge rows by `(id, time)`
- update `data/market/sync_state.json`

Key functions:

- `resolve_worlds()`
- `resolve_items()`
- `merge_rows()`
- `write_sync_checkpoint()`
- `run()`

### `scripts/update_open_houses.py`

Pipeline:

1. fetch GitHub issues
2. keep issues whose titles match the open-house prefixes
3. parse issue body sections
4. resolve owner and house metadata through TibiaData
5. apply maintenance issues
6. normalize and write `data/open-houses.json`

Key functions:

- `parse_sections()`
- `build_record_from_issue()`
- `apply_maintenance_issue()`
- `build_registry()`

### `scripts/validate_content.py`

Repository contract validator for:

- schedules
- world records
- ranking blocks
- market files
- open-house payloads

### `scripts/remove_outliers.py`

Manual maintenance utility that rewrites market files in place after percentile-based filtering. It is not part of any GitHub Actions workflow.

## Deployment Flow

`deploy-pages.yml` does four things:

1. validate Python syntax
2. run unit tests
3. run repository content validation and JavaScript syntax validation
4. copy `assets`, `data`, the HTML entry points, `LICENSE`, and `README.md` into `_site` and deploy that artifact

Deployment does not rebuild data. It publishes whatever is already committed.

## Automation Flow

### World refresh

`.github/workflows/update-worlds.yml` runs `scripts/update_data.py`, validates the repo, and commits `data/worlds.json` plus `data/history/`.

### Market refresh

`.github/workflows/update-market.yml` builds a tracked-item matrix, refreshes market files in per-item shards, downloads those refreshed artifacts into a final job, then runs `scripts/enrich_worlds_with_rankings.py`, validates the repo, and commits `data/market/world/` plus `data/worlds.json`.

### Open-house refresh

`.github/workflows/update-open-houses.yml` runs `scripts/update_open_houses.py`, validates the repo, commits `data/open-houses.json`, and comments on and closes accepted issue submissions.

## External Services

### TibiaData

Used for:

- world list
- kill statistics
- character lookup
- house lookup

### TibiaMarket

Used for tracked item history snapshots.

### GitHub

Used for:

- issue-backed open-house input
- Actions automation
- Pages deployment
- browser-side maintainer PR creation from `admin.html`

### Other outbound links

The frontend links users to Tibia.com, Exevo Pan, and project GitHub pages, but those services are not part of the data refresh pipeline.
