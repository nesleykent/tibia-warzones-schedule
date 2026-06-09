# Operational Runbook

This runbook documents the procedures that are supported by the current code.

## Baseline Checks

Run these before and after any material change:

```bash
python3 -m py_compile scripts/*.py
python3 -m unittest discover -s tests -v
python3 scripts/validate_content.py
node --check assets/*.js
node --test tests/test_admin_editor.mjs
node --test tests/test_frontend_dates.mjs
```

Expected result:

- Python compilation succeeds
- unit tests pass
- `validate_content.py` exits `0`
- JavaScript syntax check succeeds
- frontend Node tests pass

Known non-blocking warnings:

- `validate_content.py` currently warns about missing market coverage for `Floribra`, `Junera`, and `Maligna`

## Local Preview

Serve the repository root directly:

```bash
python3 -m http.server 4173
```

Check at least these pages:

- `/index.html`
- `/world.html?name=Antica`
- `/ranking.html`
- `/open-houses.html`
- `/admin.html`

## Refresh Procedures

### Refresh worlds and history

Command:

```bash
python3 scripts/update_data.py
```

Scheduled-safe mode used by GitHub Actions:

```bash
python3 scripts/update_data.py --scheduled
```

Requires:

- network access to TibiaData

Writes:

- `data/worlds.json`
- `data/history/*.json`

Notes:

- the script aborts the run if any world refresh fails
- scheduled-safe mode exits `0` before TibiaData's `04:05` Berlin refresh window so retry workflows can no-op without writing stale rows
- history rows are stamped with the UTC collection day; `world.html` intentionally renders them one day earlier to show the observed kill day

Safe follow-up:

```bash
python3 scripts/validate_content.py
```

### Refresh market data

Command:

```bash
python3 scripts/fetch_item_history.py
python3 scripts/enrich_worlds_with_rankings.py
```

Requires:

- network access to TibiaMarket

Writes:

- `data/market/world/**/*.json`
- `data/market/sync_state.json`
- ranking fields in `data/worlds.json`

Important behavior:

- default world discovery comes from directories already present under `data/market/world/`
- `scripts/fetch_item_history.py --world <name>` also resolves names against those existing directories
- adding a brand-new market world is therefore not a normal first-class workflow in the current code

Checkpoint behavior:

- progress is persisted in `data/market/sync_state.json`
- `--reset-progress` clears that checkpoint before the run
- `--force` bypasses checkpoint reuse and rewrites files instead of merging

GitHub Actions behavior:

- `.github/workflows/update-worlds.yml` schedules an hourly retry window from `23:17` through `06:17` UTC because GitHub scheduled runs can drift by hours
- scheduled workflow runs call `python3 scripts/update_data.py --scheduled`, which skips until the TibiaData refresh window has opened in Berlin
- `.github/workflows/update-market.yml` now shards the market refresh by tracked item, downloads shard artifacts directly back into `data/market/world/`, and queues an hourly retry window from `08:30` through `15:30` UTC because GitHub scheduled runs can drift by hours there as well
- the workflow rebuilds rankings only after all market shards finish successfully
- the workflow commits `data/market/world/**/*.json` and `data/worlds.json`; it does not rely on `data/market/sync_state.json` as a committed artifact

### Rebuild rankings only

Command:

```bash
python3 scripts/enrich_worlds_with_rankings.py
```

Use this when:

- market files changed
- history files changed
- ranking logic changed

### Rebuild open houses

Command:

```bash
GITHUB_TOKEN=... GITHUB_REPOSITORY=owner/repo python3 scripts/update_open_houses.py
```

Requires:

- `GITHUB_TOKEN`
- `GITHUB_REPOSITORY`
- network access to GitHub and TibiaData

Writes:

- `data/open-houses.json`

Important behavior:

- the script fetches issues with `state=all`
- it does not use the current contents of `data/open-houses.json` as input
- malformed matching issues are skipped silently because per-issue exceptions are caught and ignored
- maintenance edits with a replacement door log rebuild the record with all utility flags reset to `false` and no hirelings, because the maintenance template does not carry utility fields

## Source Data Edits

### Manual schedules

Editable source:

- `data/manual-schedules.json`

Durable edit paths:

- direct file edit
- `admin.html`

After editing:

```bash
python3 scripts/validate_content.py
```

Live-site note:

- schedule-only edits publish through `Deploy Pages`
- `Update Worlds` is no longer required for the site to display the new schedule
- run `python3 scripts/update_data.py` only when you also want to refresh the generated `data/worlds.json` fallback locally

### Tracked market items

Editable source:

- `data/market/items/tracked_items.json`

Durable edit paths:

- direct file edit
- `admin.html`

After editing:

```bash
python3 scripts/validate_content.py
python3 scripts/fetch_item_history.py
python3 scripts/enrich_worlds_with_rankings.py
python3 scripts/validate_content.py
```

### Open-house records

Durable source:

- GitHub issues matching `.github/ISSUE_TEMPLATE/open-house.yml`
- GitHub issues matching `.github/ISSUE_TEMPLATE/open-house-maintenance.yml`

Non-durable path:

- direct edits to `data/open-houses.json`
- open-house edits made through `admin.html`

Reason:

- `scripts/update_open_houses.py` reconstructs the registry from GitHub issues and overwrites `data/open-houses.json`

## Admin Page Procedure

`admin.html` uses the GitHub REST API directly from the browser.

Verified durable uses:

- schedules
- tracked items

Not supported:

- open-house editing, because the next issue-driven rebuild would replace it

Observed workflow:

1. load source files from the static site
2. validate edits in browser JavaScript
3. preview only the changed durable source files
4. write one atomic commit directly to `main` through the GitHub Git Data API
5. wait for `Deploy Pages`, plus `Update Market` when tracked items changed; schedule-only edits do not require `Update Worlds`

Token handling:

- token storage is `sessionStorage`
- persistence is opt-in
- clearing the token removes it from the page and session storage

## Deployment

Deployment is handled by `.github/workflows/deploy-pages.yml`.

What deploy actually does:

1. validate the repository
2. copy static files into `_site`
3. deploy `_site` to GitHub Pages

What deploy does not do:

- it does not refresh world data
- it does not refresh market data
- it does not rebuild open houses

Those refreshes are owned by the separate scheduled workflows.

## Troubleshooting

### `update_data.py` returns success but some worlds look empty

Check:

- script output for `ERRO <world>`
- the generated world record for an `error` field

Why:

- the script converts per-world failures into fallback records instead of failing the run

### `fetch_item_history.py` refuses a world name

Check:

- whether the world already exists as a directory under `data/market/world/`

Why:

- world resolution is directory-driven in `scripts/common.py:get_tracked_worlds()` and `scripts/fetch_item_history.py:resolve_worlds()`

### Open-house edits disappear

Check:

- whether the change exists as an open-house issue or maintenance issue

Why:

- `scripts/update_open_houses.py` ignores manual file edits and rebuilds from GitHub issues only

### Open-house correction lost utility data

Check:

- whether the record came from a maintenance issue with `Updated door inspection log`

Why:

- `apply_maintenance_issue()` recreates the record with all utility flags set to `false`

### Market data looks old even though Pages deployed

Check:

- `data/market/sync_state.json`
- `last_run_at` inside market files

Why:

- Pages deploy publishes committed data only; it does not run refresh scripts

### `remove_outliers.py` fails on import

Check:

- whether `numpy` is installed from `requirements.txt`

Why:

- `scripts/remove_outliers.py` is the only script with an external Python dependency
