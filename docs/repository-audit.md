# Repository Audit: tibia-warzones-schedule

## Scope

- Repository: `tibia-warzones-schedule`
- Audit date: 2026-06-02
- Mode: repository discovery and architecture audit
- Validation run:
  - `python3 -m unittest discover -s tests -v` passed 6 tests
  - `python3 -m py_compile` passed for all Python scripts
  - `node --check` passed for all frontend JavaScript files

## Executive Summary

This repository is a static GitHub Pages application backed by committed generated JSON datasets. It has no framework, no bundler, no backend, and no declared package manager configuration. The architecture is straightforward and deployable, but maintenance cost is increasing because the repository blends source code, manually curated inputs, and large generated datasets in one branch and one deployment artifact.

The highest-value improvements are not framework migrations. The highest-value improvements are data-contract validation, better documentation of maintenance workflows, reduction of duplicate fields and dead paths, and modularization of oversized frontend files.

## Repository Inventory

### File Counts

- Total files inspected outside `.git` and `.venv`: 887
- Git-tracked files: 866

### Top-Level Inventory

- `.github/`: 7 files
- `assets/`: 21 files
- `data/`: 823 files
- `logs/`: 3 files
- `scripts/`: 7 source files
- `tests/`: 1 source file
- Root HTML files: 5
- Root docs and config: `README.md`, `Expected_Return_Explanation.md`, `LICENSE`, `.gitignore`, `.vscode/settings.json`

### File Type Counts

- `.html`: 5
- `.js`: 6
- `.css`: 1
- `.py`: 8 including tests
- `.json`: 819
- `.yml`: 7
- `.csv`: 1
- `.txt`: 1
- `.md`: 4
- `.jpg`: 4
- `.png`: 1
- `.m4a`: 7

## Directory Tree

```text
tibia-warzones-schedule/  static site + data generation repo
├─ .github/ 7 YAML files
│  ├─ ISSUE_TEMPLATE/ 3 files
│  │  ├─ config.yml
│  │  ├─ open-house-maintenance.yml
│  │  └─ open-house.yml
│  └─ workflows/ 4 files
│     ├─ deploy-pages.yml
│     ├─ update-market.yml
│     ├─ update-open-houses.yml
│     └─ update-worlds.yml
├─ assets/ 21 files
│  ├─ app.js
│  ├─ bigfoot.js
│  ├─ open-houses.js
│  ├─ ranking.js
│  ├─ shared.js
│  ├─ styles.css
│  ├─ background/ 5 files, includes 4 source JPGs + .DS_Store
│  ├─ logo/ 1 PNG
│  └─ sounds/ 7 M4A files
├─ data/ 823 files
│  ├─ worlds.json  generated
│  ├─ open-houses.json  generated
│  ├─ manual-schedules.json  manually maintained source
│  ├─ active_warzones.txt  committed input-like file, currently unused
│  ├─ history/ 93 generated per-world files
│  ├─ market/
│  │  ├─ items/
│  │  │  ├─ items.csv  manually maintained source catalog
│  │  │  └─ tracked_items.json  manually maintained source subset
│  │  ├─ sync_state.json  generated checkpoint
│  │  └─ world/ 90 world directories, 720 generated JSON files
│  └─ .DS_Store artifacts
├─ docs/
│  └─ repository-audit.md
├─ logs/
│  ├─ .gitkeep
│  ├─ 2026-04-12-496ce10.md
│  └─ 2026-04-12-93e6443.md
├─ scripts/ 7 Python source files
│  ├─ common.py
│  ├─ economic_ranking.py
│  ├─ enrich_worlds_with_rankings.py
│  ├─ fetch_item_history.py
│  ├─ remove_outliers.py
│  ├─ update_data.py
│  └─ update_open_houses.py
├─ tests/
│  └─ test_script_helpers.py
├─ bigfoot.html
├─ index.html
├─ open-houses.html
├─ ranking.html
├─ world.html
├─ Expected_Return_Explanation.md
├─ README.md
├─ LICENSE
├─ .gitignore
└─ .vscode/settings.json
```

## Source vs Generated vs Artifacts

### Source Files

- All root HTML files
- All JavaScript files in `assets/`
- `assets/styles.css`
- All Python scripts in `scripts/`
- All workflow and issue-template YAML files
- `data/manual-schedules.json`
- `data/market/items/items.csv`
- `data/market/items/tracked_items.json`
- `README.md`
- `Expected_Return_Explanation.md`

### Generated Files

- `data/worlds.json`
- `data/history/*.json`
- `data/open-houses.json`
- `data/market/world/**/*.json`
- `data/market/sync_state.json`

### Local or Build Artifacts

- `.venv/`
- `__pycache__/`
- `.DS_Store`
- `_site/` in CI only, not committed

### Deployment Files

- `.github/workflows/deploy-pages.yml`
- Static site assets copied to `_site/` in CI:
  - `assets/`
  - `data/`
  - `index.html`
  - `open-houses.html`
  - `ranking.html`
  - `bigfoot.html`
  - `world.html`
  - `LICENSE`
  - `README.md`

## Architecture Overview

### Runtime Model

This project is a pure static multi-page application served from GitHub Pages. The browser fetches committed JSON files directly from the repository. Python scripts refresh those JSON files and GitHub Actions commits the updated data back into `main`.

There is no server-side rendering, no Node build pipeline, no package manifest, and no frontend compilation step.

### Frontend Entry Points

- [`index.html`](/Users/nesleykent/Code/tibia-warzones-schedule/index.html)
  - Scripts: `assets/shared.js`, `assets/app.js`
  - Purpose: world overview, search, filters, planner, notification UI
- [`world.html`](/Users/nesleykent/Code/tibia-warzones-schedule/world.html)
  - Scripts: `assets/shared.js`, `assets/world.js`
  - Purpose: per-world summary, schedule, ranking summary, market detail, history
- [`ranking.html`](/Users/nesleykent/Code/tibia-warzones-schedule/ranking.html)
  - Scripts: `assets/shared.js`, `assets/ranking.js`
  - Purpose: ranking table derived from embedded economic ranking data
- [`open-houses.html`](/Users/nesleykent/Code/tibia-warzones-schedule/open-houses.html)
  - Scripts: `assets/shared.js`, `assets/open-houses.js`
  - Purpose: overview and per-world detail for public houses
- [`bigfoot.html`](/Users/nesleykent/Code/tibia-warzones-schedule/bigfoot.html)
  - Scripts: `assets/shared.js`, `assets/bigfoot.js`
  - Purpose: static outbound reference page

### JavaScript Entry Points

- [`assets/shared.js`](/Users/nesleykent/Code/tibia-warzones-schedule/assets/shared.js)
  - Shared constants, timezones, storage helpers, DOM helpers, footer, background, language dropdown
  - Exposes `window.TibiaTime`
- [`assets/app.js`](/Users/nesleykent/Code/tibia-warzones-schedule/assets/app.js)
  - Home page controller
  - Loads `data/worlds.json`
  - Handles planner state, sounds, filters, language and timezone UI
- [`assets/world.js`](/Users/nesleykent/Code/tibia-warzones-schedule/assets/world.js)
  - World page controller
  - Loads `data/worlds.json`
  - Loads `data/history/<slug>.json`
  - Loads `data/market/items/tracked_items.json`
  - Loads `data/market/world/<world>/<world>_<item>.json`
- [`assets/ranking.js`](/Users/nesleykent/Code/tibia-warzones-schedule/assets/ranking.js)
  - Ranking page controller
  - Loads `data/worlds.json`
- [`assets/open-houses.js`](/Users/nesleykent/Code/tibia-warzones-schedule/assets/open-houses.js)
  - Open houses overview and detail controller
  - Loads `data/worlds.json` and `data/open-houses.json`
- [`assets/bigfoot.js`](/Users/nesleykent/Code/tibia-warzones-schedule/assets/bigfoot.js)
  - Minimal bootstrap calling `initSharedUi()`

## Dependency Map

### Python Data Pipeline

- [`scripts/update_data.py`](/Users/nesleykent/Code/tibia-warzones-schedule/scripts/update_data.py)
  - Fetches TibiaData world list and kill statistics
  - Merges local `manual-schedules.json`
  - Writes `data/history/*.json`
  - Writes `data/worlds.json`
  - Calls `attach_ranking_metrics()` from `economic_ranking.py`

- [`scripts/economic_ranking.py`](/Users/nesleykent/Code/tibia-warzones-schedule/scripts/economic_ranking.py)
  - Reads `data/history/*.json`
  - Reads `data/market/world/**/*.json`
  - Computes expected return, liquidity, and ranking metrics
  - Produces embedded `warzone_economic_ranking` objects

- [`scripts/enrich_worlds_with_rankings.py`](/Users/nesleykent/Code/tibia-warzones-schedule/scripts/enrich_worlds_with_rankings.py)
  - Standalone ranking rebuild using existing `data/worlds.json`

- [`scripts/common.py`](/Users/nesleykent/Code/tibia-warzones-schedule/scripts/common.py)
  - Shared market paths and tracked-item discovery

- [`scripts/fetch_item_history.py`](/Users/nesleykent/Code/tibia-warzones-schedule/scripts/fetch_item_history.py)
  - Reads `data/market/items/items.csv`
  - Reads `data/market/items/tracked_items.json`
  - Reads tracked worlds from existing market world directories
  - Fetches TibiaMarket history
  - Writes `data/market/world/**/*.json`
  - Writes `data/market/sync_state.json`

- [`scripts/remove_outliers.py`](/Users/nesleykent/Code/tibia-warzones-schedule/scripts/remove_outliers.py)
  - Reads and rewrites market JSON files in place
  - Depends on `numpy`

- [`scripts/update_open_houses.py`](/Users/nesleykent/Code/tibia-warzones-schedule/scripts/update_open_houses.py)
  - Reads GitHub issues
  - Resolves world, town, and house through TibiaData APIs
  - Writes `data/open-houses.json`

### Frontend Dependency Graph

- `index.html` -> `shared.js` -> `app.js` -> `data/worlds.json`
- `ranking.html` -> `shared.js` -> `ranking.js` -> `data/worlds.json`
- `world.html` -> `shared.js` -> `world.js` -> `data/worlds.json`
- `world.js` -> `data/history/<world>.json`
- `world.js` -> `data/market/items/tracked_items.json`
- `world.js` -> `data/market/world/<world>/<world>_<item>.json`
- `open-houses.html` -> `shared.js` -> `open-houses.js` -> `data/worlds.json`
- `open-houses.js` -> `data/open-houses.json`
- `bigfoot.html` -> `shared.js` -> `bigfoot.js`

## Data Flow Map

### Warzone/World Flow

```text
TibiaData /worlds
  + TibiaData /killstatistics/<world>
  + data/manual-schedules.json
    -> scripts/update_data.py
      -> data/history/<world>.json
      -> data/worlds.json
        -> assets/app.js
        -> assets/world.js
        -> assets/ranking.js
        -> assets/open-houses.js
```

### Market/Ranking Flow

```text
data/market/items/items.csv
  + data/market/items/tracked_items.json
  + TibiaMarket API
    -> scripts/fetch_item_history.py
      -> data/market/world/<world>/<world>_<item>.json
        -> scripts/economic_ranking.py
          + data/history/<world>.json
          + data/worlds.json
            -> enriched data/worlds.json
              -> assets/ranking.js
              -> assets/world.js
```

### Open Houses Flow

```text
GitHub issues [Open House]: / [Open House Maintenance]:
  + TibiaData character + houses endpoints
    -> scripts/update_open_houses.py
      -> data/open-houses.json
        -> assets/open-houses.js
```

## Data Ownership

### Warzone Schedules

- Source of truth:
  - Exact schedule times: `data/manual-schedules.json`
  - Observed service activity: TibiaData kill statistics
- Generated output:
  - `data/worlds.json`
  - `data/history/*.json`
- Scripts involved:
  - `scripts/update_data.py`
- Frontend consumers:
  - `assets/app.js`
  - `assets/world.js`
  - world metadata also indirectly used by `assets/ranking.js` and `assets/open-houses.js`

Notes:
- `manual-schedules.json` contains 55 worlds and 93 schedule entries.
- All worlds with manual schedules also have tracked warzone activity.
- There are 7 tracked-service worlds without manual schedules.
- One manual schedule entry contains an unknown time: `Gentebra -> ??:00`.

### Open Houses

- Source of truth:
  - GitHub issues with title prefix `[Open House]:`
  - Maintenance issues with title prefix `[Open House Maintenance]:`
  - TibiaData owner and house lookup for canonical world, town, and house ID
- Generated output:
  - `data/open-houses.json`
- Scripts involved:
  - `scripts/update_open_houses.py`
- Frontend consumers:
  - `assets/open-houses.js`

Notes:
- Current registry size: 30 open houses.
- All current entries include resolved `houseId`.

### Rankings

- Source of truth:
  - Computed, not manually maintained
  - Formula constants in `scripts/economic_ranking.py`
  - Input world state from `data/worlds.json`
  - History from `data/history/*.json`
  - Market data from `data/market/world/**/*.json`
- Generated output:
  - `warzone_economic_ranking` embedded in `data/worlds.json`
- Scripts involved:
  - `scripts/economic_ranking.py`
  - `scripts/enrich_worlds_with_rankings.py`
  - `scripts/update_data.py`
- Frontend consumers:
  - `assets/ranking.js`
  - `assets/world.js`

Notes:
- 61 worlds currently rank successfully.
- 22 worlds are excluded only because they are `na`.
- 3 worlds have no market files at all: `Floribra`, `Junera`, `Maligna`.

### Market Items

- Source of truth:
  - Master item catalog: `data/market/items/items.csv`
  - Tracked subset: `data/market/items/tracked_items.json`
  - Historical prices: TibiaMarket API
- Generated output:
  - `data/market/world/**/*.json`
  - ranking fields embedded in `data/worlds.json`
- Scripts involved:
  - `scripts/common.py`
  - `scripts/fetch_item_history.py`
  - `scripts/economic_ranking.py`
  - `scripts/remove_outliers.py`
- Frontend consumers:
  - `assets/world.js`
  - `assets/ranking.js` through embedded ranking data

Notes:
- Tracked items count: 8
- Market world directories: 90
- Market files: 720, exactly 8 per tracked market world

### World Metadata

- Source of truth:
  - TibiaData `/worlds`
- Generated output:
  - `data/worlds.json`
- Scripts involved:
  - `scripts/update_data.py`
- Frontend consumers:
  - `assets/app.js`
  - `assets/world.js`
  - `assets/ranking.js`
  - `assets/open-houses.js`

Notes:
- No local override layer exists for correcting upstream world metadata.

### History

- Source of truth:
  - Daily snapshot inferred from TibiaData kill statistics
  - Derived mark and services-completed rules in `update_data.py`
- Generated output:
  - `data/history/*.json`
- Scripts involved:
  - `scripts/update_data.py`
- Frontend consumers:
  - `assets/world.js`
  - `scripts/economic_ranking.py`

Notes:
- 93 history files exist, one per world.
- History lengths currently vary between 13 and 62 entries.

## Deployment Flow

### GitHub Actions

#### `update-worlds.yml`

- Triggers:
  - manual dispatch
  - scheduled cron
  - push to `main` on selected data/script paths
- Steps:
  - checkout
  - setup Python 3.12
  - run `python scripts/update_data.py`
  - validate shape of `data/worlds.json`
  - commit `data/worlds.json` and `data/history`

#### `update-market.yml`

- Triggers:
  - manual dispatch with `force_refresh`
  - scheduled cron
  - push to `main` on selected market-script paths
- Steps:
  - checkout
  - setup Python 3.12
  - run `python3 scripts/fetch_item_history.py`
  - run `python3 scripts/enrich_worlds_with_rankings.py`
  - compile-check Python scripts
  - commit `data/market` and `data/worlds.json`

#### `update-open-houses.yml`

- Triggers:
  - manual dispatch
  - issue opened, edited, reopened, or closed
- Steps:
  - checkout
  - setup Python 3.12
  - run `python3 scripts/update_open_houses.py`
  - validate shape of `data/open-houses.json`
  - commit `data/open-houses.json`
  - comment on accepted issue
  - close accepted issue

#### `deploy-pages.yml`

- Triggers:
  - push to `main`
  - manual dispatch
  - scheduled cron
- Steps:
  - checkout
  - setup Node 20
  - `node --check` all frontend JS
  - assert required files exist
  - copy site files into `_site`
  - upload Pages artifact
  - deploy Pages artifact

### Production Hosting

- GitHub Pages
- Static files only
- Data is deployed as committed JSON, not fetched from a live backend owned by this repo

## Maintenance Workflow Analysis

### Adding Warzone Schedules

- Files involved:
  - `data/manual-schedules.json`
  - then `data/worlds.json` and `data/history/*.json` after regeneration
- Workflow:
  - add a world entry or append a `warzone_executions` item
  - run `scripts/update_data.py` or wait for workflow
- Effort: medium
- Complexity: medium
- Risks:
  - manual JSON editing
  - weak validation of semantic correctness
  - schedule times can be placeholder-like and still pass current regex, such as `??:00`

### Editing Warzone Schedules

- Files involved:
  - `data/manual-schedules.json`
- Effort: medium
- Complexity: medium
- Risks:
  - no strong schema enforcement for ordering, duplication, or realistic times
  - schedule display and planner behavior depend on stable shape

### Adding Market Items

- Files involved:
  - `data/market/items/tracked_items.json`
  - `data/market/items/items.csv`
  - possibly `assets/world.js` ordering
  - possibly `scripts/economic_ranking.py` if the item should influence ranking
- Effort: high
- Complexity: high
- Risks:
  - item must exist in catalog and tracked subset
  - fetch must backfill every tracked world
  - ranking formulas and world-page presentation are separate concerns

### Updating Ranking Inputs

- Files involved:
  - `scripts/economic_ranking.py`
  - `Expected_Return_Explanation.md`
  - then regenerated `data/worlds.json`
- Effort: medium
- Complexity: medium-high
- Risks:
  - code and documentation can drift
  - rankings are embedded in `worlds.json`, so rebuild is required for every change

### Adding Open Houses

- Files involved:
  - preferably none directly; submit issue
  - generated output `data/open-houses.json`
- Effort: low
- Complexity: low-medium
- Risks:
  - depends on GitHub issue parsing format
  - depends on TibiaData being able to resolve owner and house

### Updating World Metadata

- Files involved:
  - typically no source file inside repo
  - generated `data/worlds.json`
- Effort: low for normal refresh
- Complexity: high if upstream metadata is wrong
- Risks:
  - no override layer
  - corrections to upstream-fed fields require code changes or manual edits to generated data

### Correcting Historical Records

- Files involved:
  - `data/history/<world>.json`
  - possibly `scripts/update_data.py`
- Effort: medium-high
- Complexity: high
- Risks:
  - file is generated, so direct edits are vulnerable to later overwrite
  - no correction override or patch layer

## Technical Debt

### Oversized Files

- `assets/styles.css`: 3254 lines
- `assets/world.js`: 2029 lines
- `assets/app.js`: 1798 lines
- `assets/shared.js`: 863 lines
- `assets/ranking.js`: 740 lines
- `assets/open-houses.js`: 711 lines
- `scripts/fetch_item_history.py`: 730 lines
- `scripts/economic_ranking.py`: 585 lines

### Duplicated Logic

- Slugification exists in multiple places:
  - `scripts/common.py`
  - `scripts/economic_ranking.py`
  - `scripts/update_data.py`
  - `scripts/update_open_houses.py`
  - `assets/world.js`
  - `assets/open-houses.js`

- Open-house door-log parsing exists in both:
  - `scripts/update_open_houses.py`
  - `assets/open-houses.js`

- Filter-state patterns are repeated with variations across:
  - `assets/app.js`
  - `assets/ranking.js`
  - `assets/open-houses.js`

### Duplicated Data

- `data/worlds.json` contains overlapping fields:
  - `tracks_warzone_service`
  - `performs_warzone`
  - `warzone_services_per_day`
  - `last_detected_services`
  - `warzonesperday`

These indicate backward-compatibility or drift rather than a normalized data contract.

### Hardcoded Values

- Ranking constants are hardcoded in `scripts/economic_ranking.py`
- Supported timezones are hardcoded in `assets/shared.js`
- Known towns and hireling abilities are hardcoded in `scripts/update_open_houses.py`
- TibiaMarket bearer token fallback is hardcoded in `scripts/fetch_item_history.py`
- Several repository URLs are hardcoded in `assets/shared.js`

### Fragile Dependencies

- `scripts/remove_outliers.py` depends on `numpy`, but the repo has no dependency manifest
- `scripts/fetch_item_history.py` uses a bundled bearer token fallback
- Open house generation depends on issue-body markdown section parsing
- World page market loading still probes legacy fallback paths that are not part of current repository layout

### Missing Validation

- No schema file or schema tooling for `manual-schedules.json`
- No dedicated validation for:
  - duplicate execution IDs
  - overlapping schedules
  - invalid semantic values like placeholder schedule times
  - market dataset completeness before ranking rebuild

### Missing Tests

- Existing tests only cover helper functions in one file
- No tests for:
  - full `update_data.py` integration
  - `economic_ranking.py`
  - `fetch_item_history.py`
  - `remove_outliers.py`
  - frontend rendering
  - data contracts
  - workflow behavior

### Missing Documentation

- No maintainer playbook for data refreshes and corrections
- No architecture document before this audit
- No dependency bootstrap file
- No data-contract documentation beyond code and workflow assertions

### Dead or Legacy Paths

- `data/active_warzones.txt` is included in workflow triggers but not used by current code
- `assets/world.js` tries several fallback market paths:
  - `./data/market/<file>.json`
  - `./data/market/items/<file>.json`
  - `./data/market/history/<file>.json`
  - these do not reflect the primary current storage layout

## Architecture Options

### A. Keep Current Architecture

- Migration effort: none
- Risk: low
- GitHub Pages compatibility: excellent
- Maintenance impact:
  - deploy model stays simple
  - current technical debt remains
  - best short-term choice if paired with validation and documentation improvements

### B. TypeScript Migration

- Migration effort: medium-high
- Risk: medium
- GitHub Pages compatibility: excellent after transpilation
- Maintenance impact:
  - stronger contracts in frontend code
  - does not address data-contract and repo-structure issues by itself
  - likely requires introducing a build step or checked-in compiled JS policy

### C. Vite + TypeScript

- Migration effort: high
- Risk: medium-high
- GitHub Pages compatibility: good
- Maintenance impact:
  - better module boundaries and developer ergonomics
  - useful for splitting oversized JS files
  - adds build complexity to a repo that currently deploys raw static files directly

### D. Astro + TypeScript

- Migration effort: very high
- Risk: high
- GitHub Pages compatibility: good
- Maintenance impact:
  - least natural fit for current architecture
  - main problems are not content authoring or component templating
  - does not solve Python data pipeline complexity

### E. Hybrid Approach

- Migration effort: medium
- Risk: low-medium
- GitHub Pages compatibility: excellent
- Maintenance impact:
  - preserves static Pages architecture
  - allows incremental improvements:
    - data schemas
    - better docs
    - modular JS split
    - optional gradual TS on selected frontend files
  - best ROI path

## Recommendations

### High ROI

1. Add explicit schema validation for:
   - `data/manual-schedules.json`
   - `data/worlds.json`
   - `data/open-houses.json`
   - assumptions about market JSON shape

2. Normalize the `worlds.json` contract by removing or deprecating duplicate fields:
   - `performs_warzone`
   - `warzonesperday`
   - redundant service counters where possible

3. Document maintainer workflows for:
   - adding/editing schedules
   - adding tracked market items
   - correcting history
   - correcting world metadata
   - triaging open-house issues

4. Split oversized frontend files into smaller modules while keeping the current static architecture.

5. Add a dependency manifest for Python runtime expectations, especially `numpy`.

### Medium ROI

1. Add integration tests for:
   - `update_data.py`
   - `economic_ranking.py`
   - `update_open_houses.py`

2. Remove dead or legacy paths and inputs:
   - unused `data/active_warzones.txt` trigger coupling
   - legacy market fallback paths in `assets/world.js`

3. Introduce an override or correction layer for:
   - world metadata exceptions
   - historical record corrections

4. Extract shared parsing and slug logic where practical to reduce drift across scripts and frontend code.

### Low ROI

1. Full Astro migration
2. Immediate full frontend rewrite
3. Replacing GitHub Pages with backend infrastructure

## Recommended Direction

The recommended path is **E. Hybrid Approach**.

Keep the current static GitHub Pages model and Python data pipeline. Improve the repository first where the maintenance burden actually sits:

- data validation
- documentation
- elimination of redundant fields
- modularization of large JS files
- reproducible script environment

Only after those changes should a TypeScript or Vite move be reconsidered. A framework migration now would repackage the same operational complexity without materially reducing the most important maintenance risks.

## What Would Need More Inspection Before Bigger Architectural Recommendations

The repository itself does not contain:

- production usage telemetry
- Pages artifact size history
- contributor workflow documentation
- error-rate or refresh SLA tracking

Those would need inspection outside the repository before making a strong case for a large migration on performance or team-productivity grounds.

## Appendix: Key Repository Facts

- Worlds in `data/worlds.json`: 93
- History files: 93
- Market world directories: 90
- Market history files: 720
- Tracked market items: 8
- Ranked worlds: 61
- Worlds with manual schedules: 55
- Worlds with detected service activity: 62
- Open houses in registry: 30
- Tests present: 1 file, 6 discovered tests
