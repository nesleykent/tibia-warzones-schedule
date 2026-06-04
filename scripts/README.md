# Scripts Directory Guide

This directory contains the repository's Python maintenance and data-refresh utilities.

## Script Inventory

### `update_data.py`

Purpose:

- fetch TibiaData world metadata and kill statistics
- merge manual schedules
- update per-world history
- rebuild `data/worlds.json`
- attach ranking metrics

Primary outputs:

- `data/worlds.json`
- `data/history/*.json`

### `economic_ranking.py`

Purpose:

- compute expected-return and related ranking metrics from history and market data

Used by:

- `update_data.py`
- `enrich_worlds_with_rankings.py`

### `enrich_worlds_with_rankings.py`

Purpose:

- rebuild only the ranking portion of `data/worlds.json` from existing market and history data

### `fetch_item_history.py`

Purpose:

- fetch tracked market history from TibiaMarket
- merge or replace existing per-world item files
- persist fetch progress in `data/market/sync_state.json`

Notable options:

- `--world`
- `--item`
- `--force`
- `--dry-run`
- `--max-requests`
- `--max-runtime-seconds`
- `--reset-progress`

### `update_open_houses.py`

Purpose:

- read GitHub issues that follow the open-house templates
- resolve house and owner metadata through TibiaData
- rebuild `data/open-houses.json`

Environment commonly required:

- `GITHUB_TOKEN`
- `GITHUB_REPOSITORY`

Optional:

- `TIBIADATA_BASE_URL`
- `GITHUB_API_URL`

### `validate_content.py`

Purpose:

- validate source and generated repository content
- report blocking errors and non-blocking warnings

Use this before pushing documentation or data changes that affect repository content contracts.

### `remove_outliers.py`

Purpose:

- clean market-history files using percentile-based filtering

Dependency:

- `numpy`

### `common.py`

Purpose:

- shared helpers for path handling, normalization, HTTP fetches, and tracked-item discovery

## Recommended Local Workflow

1. Edit source data or scripts.
2. Run:

```bash
python3 -m py_compile scripts/*.py
python3 -m unittest discover -s tests -v
python3 scripts/validate_content.py
```

3. If data inputs changed, run the specific refresh script that owns the affected outputs.

## Notes

- The repository intentionally keeps the script layer small and dependency-light.
- There is no package build step and no CLI wrapper; scripts are run directly with Python.
- Review [../docs/data-maintenance.md](../docs/data-maintenance.md) for full maintenance procedures.
