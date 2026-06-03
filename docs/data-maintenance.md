# Data Maintenance Guide

This repository stays intentionally simple:

- static GitHub Pages site
- committed generated JSON data
- Python scripts for refresh and validation

Use [`docs/repository-audit.md`](/Users/nesleykent/Code/tibia-warzones-schedule/docs/repository-audit.md) for the full inventory and architecture context. This guide focuses on common maintenance tasks and the safe order to perform them.

## Prerequisites

- Python 3 available locally
- project dependencies installed:

```bash
python3 -m pip install -r requirements.txt
```

## Local Validation

Run all repository checks before pushing changes:

```bash
python3 -m py_compile scripts/*.py
python3 -m unittest discover -s tests -v
python3 scripts/validate_content.py
node --check assets/*.js
```

What these checks protect:

- bad schedule edits
- bad tracked market item definitions
- malformed open-house output
- malformed history or market JSON
- broken Python syntax
- broken frontend JavaScript syntax

## Rebuild Generated Data

### Rebuild worlds and history

```bash
python3 scripts/update_data.py
```

Outputs:

- `data/worlds.json`
- `data/history/*.json`

### Rebuild rankings from existing market data

```bash
python3 scripts/enrich_worlds_with_rankings.py
```

Output:

- updated `data/worlds.json`

### Refresh tracked market history

```bash
python3 scripts/fetch_item_history.py
```

Outputs:

- `data/market/world/**/*.json`
- `data/market/sync_state.json`

### Rebuild open houses from GitHub Issues

```bash
python3 scripts/update_open_houses.py
```

Environment required for local open-house rebuilds:

- `GITHUB_TOKEN`
- `GITHUB_REPOSITORY`

Optional:

- `TIBIADATA_BASE_URL`
- `GITHUB_API_URL`

Output:

- `data/open-houses.json`

## Serve The Site Locally

```bash
python3 -m http.server 4173
```

Open:

- `http://127.0.0.1:4173/`

Main pages:

- `index.html`
- `world.html?name=Antica`
- `ranking.html`
- `open-houses.html`

## Add A Warzone Schedule

Source file:

- [`data/manual-schedules.json`](/Users/nesleykent/Code/tibia-warzones-schedule/data/manual-schedules.json)

Rules:

- world name must exactly match a world in `data/worlds.json`
- each execution needs:
  - `execution_id`
  - `schedule_time`
  - `warzone_sequence`
- `schedule_time` must be `HH:MM`
- `warzone_sequence` must be one of:
  - `""`
  - `"1-2-3"`
  - `"1-3-2"`
  - `"2-1-3"`
- duplicate times within the same world are invalid

Example:

```json
{
  "ExampleWorld": {
    "timezone": "America/Sao_Paulo",
    "warzone_executions": [
      {
        "execution_id": 1,
        "schedule_time": "19:00",
        "warzone_sequence": "1-2-3"
      }
    ]
  }
}
```

Safe workflow:

1. Edit `data/manual-schedules.json`
2. Run `python3 scripts/validate_content.py`
3. Run `python3 scripts/update_data.py`
4. Re-run `python3 scripts/validate_content.py`

## Edit A Warzone Schedule

Source file:

- `data/manual-schedules.json`

Safe changes:

- adjust `schedule_time`
- adjust `warzone_sequence`
- add or remove execution objects
- update `timezone`

Do not:

- rename world keys unless the upstream world name actually changed
- introduce duplicate times in the same world
- introduce unsupported order strings

Safe workflow:

1. Edit `data/manual-schedules.json`
2. Run `python3 scripts/validate_content.py`
3. Run `python3 scripts/update_data.py`
4. Re-run tests and validation

## Add A Market Tracked Item

Source files:

- [`data/market/items/items.csv`](/Users/nesleykent/Code/tibia-warzones-schedule/data/market/items/items.csv)
- [`data/market/items/tracked_items.json`](/Users/nesleykent/Code/tibia-warzones-schedule/data/market/items/tracked_items.json)

Workflow:

1. Confirm the item exists in `items.csv`
2. Add the exact item name to `tracked_items.json`
3. Validate:

```bash
python3 scripts/validate_content.py
```

4. Refresh market files:

```bash
python3 scripts/fetch_item_history.py --item "Exact Item Name"
```

5. Rebuild rankings:

```bash
python3 scripts/enrich_worlds_with_rankings.py
```

6. Re-run validation

Current caveat:

- `Floribra`, `Junera`, and `Maligna` do not currently have market directories
- validator reports those as warnings, not failures

## Add An Open House Through GitHub Issues

Preferred flow:

1. Open a GitHub issue using the `Submit Open House` issue template
2. Paste the door inspection log
3. Fill utility fields
4. Submit the issue

Automation behavior:

- `scripts/update_open_houses.py` reads matching issues
- owner and house are resolved through TibiaData
- `data/open-houses.json` is rebuilt
- the accepted issue is commented and closed by workflow automation

The canonical source of truth for open houses is the GitHub issue stream plus the generated `data/open-houses.json` registry.

## Correct World Metadata Safely

World metadata comes from TibiaData through `scripts/update_data.py`.

Because there is no local override layer yet, the safest correction workflow is:

1. Confirm the metadata problem in `data/worlds.json`
2. Confirm whether the upstream TibiaData response is wrong
3. If upstream is wrong, document the exception in the branch or issue before changing generator behavior
4. If you must make a one-off manual correction, note clearly that `data/worlds.json` is generated and the change can be overwritten by the next refresh

Current recommendation:

- prefer generator or override-layer changes over direct edits to generated output
- if the correction is temporary, keep it isolated and validate after every rebuild

## Correct History Safely

History files are generated:

- `data/history/<world>.json`

Risks:

- direct edits can be overwritten by `scripts/update_data.py`

Safe options:

1. If the bad record is due to current generator rules, fix the generator path first
2. If a one-time historical correction is required, edit the specific file carefully and immediately run:

```bash
python3 scripts/validate_content.py
```

3. Re-run `python3 scripts/update_data.py` only if you intend to refresh current-day data and are prepared for generated changes

Current best practice:

- prefer explicit correction logic over routine manual edits to generated history

## Validate Generated Data Before Deploy

Run:

```bash
python3 scripts/validate_content.py
```

This validates:

- `data/manual-schedules.json`
- `data/worlds.json`
- `data/open-houses.json`
- `data/market/items/items.csv`
- `data/market/items/tracked_items.json`
- `data/history/*.json`
- `data/market/world/**/*.json`

Failure behavior:

- actionable errors print under `ERRORS`
- warnings print under `WARNINGS`
- exit code `1` if errors exist
- exit code `0` if warnings only or no issues
