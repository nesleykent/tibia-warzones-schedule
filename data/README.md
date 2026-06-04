# Data Directory Guide

This directory mixes manually maintained source inputs with generated JSON outputs consumed by the static site.

## High-Level Layout

```text
data/
├─ worlds.json                generated world summary dataset
├─ open-houses.json           generated open-house registry
├─ manual-schedules.json      manually maintained source schedules
├─ active_warzones.txt        compatibility/input-style file
├─ history/                   generated per-world history files
├─ market/
│  ├─ items/
│  │  ├─ items.csv            source item catalog
│  │  └─ tracked_items.json   manually maintained tracked-item list
│  ├─ sync_state.json         generated fetch checkpoint
│  └─ world/                  generated per-world market history files
```

## Source Files

These files are edited directly or through `admin.html`:

- `manual-schedules.json`
- `market/items/items.csv`
- `market/items/tracked_items.json`
- `open-houses.json` when using the browser maintainer workflow

## Generated Files

These files are produced by scripts and workflows:

- `worlds.json`
- `history/*.json`
- `market/world/**/*.json`
- `market/sync_state.json`
- `open-houses.json` when rebuilt from GitHub issues

## Which Script Writes What

- `scripts/update_data.py`
  - writes `worlds.json`
  - writes `history/*.json`

- `scripts/fetch_item_history.py`
  - writes `market/world/**/*.json`
  - writes `market/sync_state.json`

- `scripts/enrich_worlds_with_rankings.py`
  - rewrites ranking fields inside `worlds.json`

- `scripts/update_open_houses.py`
  - writes `open-houses.json`

## Safe Editing Guidance

- treat `manual-schedules.json` and `tracked_items.json` as source-of-truth inputs
- rerun validation after manual edits
- do not hand-edit generated market history unless you are intentionally repairing data
- review `docs/data-maintenance.md` before large data refreshes

## Validation

Run:

```bash
python3 scripts/validate_content.py
```

This checks:

- schedule shape and ordering
- world dataset fields
- tracked-market definitions
- open-house payload shape
- market coverage expectations
