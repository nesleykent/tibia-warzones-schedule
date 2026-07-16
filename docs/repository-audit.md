# Repository Audit

Audit date: 2026-06-04

Scope:

- source code
- scripts
- configuration
- workflows
- generated outputs
- tests
- runtime behavior

Discovery was done from code first. Existing documentation was only read later to check whether it matched the code.

## Verified Repository Purpose

This repository publishes a static GitHub Pages site for Tibia warzone planning and world comparison.

The current codebase provides:

- world activity summaries from TibiaData
- manual warzone schedules
- market-backed ranking metrics
- per-world market and history views
- an issue-backed open-house registry
- a browser-based maintainer page

Primary code evidence:

- `scripts/update_data.py:get_worlds()`, `get_kill_statistics()`, `build_world_summary()`, `main()`
- `scripts/economic_ranking.py:compute_world_ranking_metrics()`, `attach_ranking_metrics()`
- `scripts/update_open_houses.py:build_record_from_issue()`, `build_registry()`
- `assets/app.js:init()`
- `assets/world.js:loadWorldPage()`
- `assets/ranking.js:init()`
- `assets/open-houses.js:init()`
- `assets/admin.js:createPullRequestWorkflow()`

## Verification Performed

Executed during the audit:

- `python3 -m py_compile scripts/*.py`
- `python3 -m unittest discover -s tests -v`
- `python3 scripts/validate_content.py`
- `node --check assets/*.js`

Results:

- Python compilation passed
- 25 unit tests passed
- content validation passed with warnings for known missing market worlds `Floribra`, `Junera`, and `Maligna`
- JavaScript syntax validation passed

Additional runtime checks:

- `scripts/update_data.py` was run in a clean temporary copy with live network access on 2026-06-04 and reproduced the committed `data/worlds.json` and every `data/history/*.json` file exactly
- `scripts/fetch_item_history.py --world Antica --item "Tibia Coins" --max-requests 1 --reset-progress` successfully fetched fresh data and proved the committed market dataset predates the audit date
- `scripts/enrich_worlds_with_rankings.py` reproduced ranking values from local data
- `scripts/update_open_houses.py` refused to run locally without `GITHUB_TOKEN` and `GITHUB_REPOSITORY`, matching the code
- browser smoke tests passed for `index.html`, `ranking.html`, `world.html?name=Antica`, `open-houses.html`, `open-houses.html?world=Belobra`, `admin.html`, and `bigfoot.html`

## Current Repository State

Observed from committed data:

- `93` worlds in `data/worlds.json`
- `93` history files in `data/history/`
- `61` ranked worlds
- `63` worlds with detected warzone activity
- `57` worlds with manual schedule entries
- `30` open-house records
- `8` tracked market items
- `90` market world directories
- `720` market files

Market freshness on 2026-06-04:

- `data/market/sync_state.json.updated_at = 2026-05-30T11:03:32.886244Z`
- market file `last_run_at` range: `2026-05-29T11:48:54.232089Z` through `2026-05-30T11:03:32.885644Z`

## Architecture Summary

- static site pages read JSON directly from `data/`
- Python scripts generate and validate those JSON files
- GitHub Actions commit refresh outputs back to `main`
- GitHub Pages deploys committed files without a frontend build step

See [`docs/architecture.md`](./architecture.md) for the complete architecture reference.

## Execution And Data Flow

### World pipeline

`scripts/update_data.py`:

1. fetches world metadata from TibiaData
2. fetches kill statistics per world
3. merges `data/manual-schedules.json`
4. updates `data/history/*.json`
5. builds world summaries
6. attaches embedded ranking metrics
7. writes `data/worlds.json`

### Market pipeline

`scripts/fetch_item_history.py`:

1. discovers worlds from existing directories under `data/market/world/`
2. discovers enabled items from `items.csv` filtered by `tracked_items.json`
3. fetches TibiaMarket history
4. merges rows by `(id, time)`
5. writes market files and `data/market/sync_state.json`

Then `scripts/enrich_worlds_with_rankings.py` reruns ranking attachment and rewrites `data/worlds.json`.

### Open-house pipeline

`scripts/update_open_houses.py`:

1. fetches GitHub issues with `state=all`
2. parses issues whose titles match the open-house prefixes
3. resolves house and owner data through TibiaData
4. applies maintenance issues
5. overwrites `data/open-houses.json`

### Deployment pipeline

`.github/workflows/deploy-pages.yml`:

1. validates Python
2. runs tests
3. validates repo content
4. validates JavaScript syntax
5. copies static files into `_site`
6. deploys `_site` to GitHub Pages

## External Services

- TibiaData: world list, kill statistics, character lookup, house lookup
- TibiaMarket: tracked item history
- GitHub: issue input, Actions, Pages, and REST API from `admin.html`

## Findings

### 1. `admin.html` is deployed but hidden from the main site navigation

The public navigation in `index.html`, `ranking.html`, `open-houses.html`, `world.html`, and `bigfoot.html` contains no `Admin` link, but `deploy-pages.yml` still publishes `admin.html`, and `admin.html` links to itself in its own nav.

Evidence:

- `.github/workflows/deploy-pages.yml`
- `index.html`
- `ranking.html`
- `open-houses.html`
- `world.html`
- `bigfoot.html`
- `admin.html`

### 2. The market dataset is stale relative to the audit date

The world and history pipeline matched live data on 2026-06-04, but the market dataset last refreshed on 2026-05-29 through 2026-05-30.

Evidence:

- `data/market/sync_state.json`
- sampled live refresh through `scripts/fetch_item_history.py`

### 3. `data/active_warzones.txt` is dead input

No current code reads it. The only remaining live reference is the trigger path in `.github/workflows/update-worlds.yml`.

Evidence:

- repo search outside documentation found no consumer
- `.github/workflows/update-worlds.yml`

### 4. `data/worlds.json` contains duplicated fields

`scripts/update_data.py` writes these fields with the same source values:

- `tracks_warzone_service` and `performs_warzone`
- `warzone_services_per_day`, `last_detected_services`, and `warzonesperday`

Consumption is thin:

- `assets/app.js` uses `last_detected_services ?? warzone_services_per_day`
- `performs_warzone` and `warzonesperday` are not meaningfully consumed outside validation and tests

Evidence:

- `scripts/update_data.py:build_world_summary()`
- `assets/app.js:renderWorld()`
- `scripts/validate_content.py`

### 5. Rank order uses expected return only

`scripts/economic_ranking.py` computes:

- `market_liquidity_score`
- `history_health_score`
- `current_operational_score`
- `warzone_health_score`

But the actual order is still assigned by `economic_score_raw` descending, and `final_score` is set equal to `economic_score_raw`.

Evidence:

- `scripts/economic_ranking.py:compute_world_ranking_metrics()`
- `scripts/economic_ranking.py:attach_ranking_metrics()`

### 6. Unranked worlds can still carry computed economic values

Worlds with `mark == "na"` are excluded from ranking, but the code computes market models and expected-value fields before applying that exclusion. The committed dataset currently contains `22` unranked worlds with non-null `economic_score_raw`.

Evidence:

- `scripts/economic_ranking.py:compute_world_ranking_metrics()`
- committed `data/worlds.json`

### 7. Open-house editing in `admin.html` is not a durable source-of-truth workflow

`assets/admin.js` allows maintainers to edit `data/open-houses.json` and open a PR. But `scripts/update_open_houses.py` rebuilds that file from GitHub issues only and does not read the existing file as input.

Effect:

- direct open-house edits can be overwritten by the next issue-driven rebuild

Evidence:

- `assets/admin.js:FILE_PATHS`, `buildOpenHousesPayload()`, `createPullRequestWorkflow()`
- `scripts/update_open_houses.py:build_registry()`, `main()`

### 8. Open-house maintenance edits can erase utility data

When a maintenance issue requests an edit and provides a replacement door log, `apply_maintenance_issue()` creates a synthetic open-house issue body that hardcodes:

- exercise dummies `false`
- reward shrine `false`
- imbuing shrine `false`
- mailbox `false`
- no hirelings

Effect:

- correcting a record through the maintenance template can wipe previously known utility details

Evidence:

- `scripts/update_open_houses.py:apply_maintenance_issue()`
- `.github/ISSUE_TEMPLATE/open-house-maintenance.yml`

### 9. Open-house issue failures are skipped silently

Per-issue exceptions inside `build_registry()` are caught and ignored. Bad submissions disappear from the rebuilt registry unless someone inspects workflow logs.

Evidence:

- `scripts/update_open_houses.py:build_registry()`

### 10. `scripts/update_data.py` can succeed with partial degraded data

Per-world exceptions are caught inside the main loop. Failed worlds are converted into fallback records with mark `na`, and the script still returns success after writing output.

Effect:

- a workflow can commit degraded world data without failing the job

Evidence:

- `scripts/update_data.py:main()`
- `scripts/update_data.py:build_error_world_summary()`

### 11. Market world selection is directory-driven

`scripts/fetch_item_history.py` does not derive default worlds from `data/worlds.json`. It derives them from directories already present under `data/market/world/`. Requested `--world` values are also validated against that directory list.

Effect:

- seeding a brand-new world is not a straightforward supported workflow

Evidence:

- `scripts/common.py:get_tracked_worlds()`
- `scripts/fetch_item_history.py:resolve_worlds()`

### 12. `scripts/remove_outliers.py` is manual-only and risky by default

Observed properties:

- requires `numpy`
- defaults to `DRY_RUN = False`
- is not called by workflows
- rewrites market files in place

In the audit temp copy, its first real run rewrote hundreds of files.

Evidence:

- `requirements.txt`
- `scripts/remove_outliers.py`
- workflow files do not reference it

### 13. A bearer token fallback is embedded in source

`scripts/fetch_item_history.py` ships with a hardcoded `DEFAULT_BEARER_TOKEN`.

Evidence:

- `scripts/fetch_item_history.py`

### 14. Frontend logic is duplicated across large page controllers

Examples still requiring follow-up:

- filter persistence exists independently in `assets/app.js`, `assets/ranking.js`, and `assets/open-houses.js`
- `assets/admin.js` defines its own normalization helpers instead of sharing script-side behavior

Resolved since the original audit:

- JavaScript masonry was removed from `assets/app.js` and `assets/open-houses.js`; both lists now use the shared CSS multicolumn flow contract covered by `tests/test_frontend_layout.mjs`.

Evidence:

- `assets/app.js`
- `assets/open-houses.js`
- `assets/ranking.js`
- `assets/admin.js`

## Documentation Versus Code

Pre-audit documentation mismatches confirmed from code:

- old `README.md` said the main navigation included `Admin`, but only `admin.html` exposes that link
- old `docs/repository-audit.md` claimed there was no dependency manifest, but `requirements.txt` exists
- old `data/README.md` described `data/active_warzones.txt` like a live input, but current code does not read it
- old `Expected_Return_Explanation.md` described only the expected-return formula and did not explain that `Minor Crystalline Token` participates in liquidity scoring or that ranking order is driven by `economic_score_raw` alone

## Documentation Classification

These classifications refer to the pre-audit documentation set that existed before this rewrite.

### Should be deleted

- `assets/README.md`
- `data/README.md`
- `docs/README.md`
- `docs/data-maintenance.md`
- `docs/modernization-plan.md`
- `scripts/README.md`
- `logs/2026-04-12-496ce10.md`
- `logs/2026-04-12-93e6443.md`

### Should be rewritten

- `README.md`
- `Expected_Return_Explanation.md`
- `docs/architecture.md`
- `docs/repository-audit.md`

### Accurate enough to keep unchanged

None.

No pre-audit file met the standard for an authoritative maintainer reference without replacement.

## Highest-Risk Areas

1. open-house source-of-truth mismatch between `admin.html` and `scripts/update_open_houses.py`
2. stale market data despite healthy Pages deploys
3. partial-success behavior in `scripts/update_data.py`
4. directory-driven market-world discovery
5. hardcoded TibiaMarket bearer token fallback
6. duplicated dataset fields and duplicated frontend logic

## Recommended Next Engineering Moves

1. Decide whether open-house editing should be issue-only or file-backed, then align `admin.html`, scripts, and workflows.
2. Remove or formally justify duplicated world fields.
3. Add explicit failure signaling for partial `update_data.py` world refreshes.
4. Replace directory-driven market-world discovery with an explicit source catalog.
5. Remove the hardcoded TibiaMarket token fallback.
6. Add tests for maintenance-issue behavior in `scripts/update_open_houses.py`.
