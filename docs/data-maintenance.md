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
- `admin.html`

## Browser Data Editor

Preferred maintainer workflow for source-data edits:

1. Open `http://127.0.0.1:4173/admin.html` locally, or the deployed `/admin.html` route on GitHub Pages.
2. Paste a GitHub fine-grained personal access token into the authentication panel.
3. Use `Test connection` to verify the token can reach `nesleykent/tibia-warzones-schedule`.
4. Edit schedules, tracked market items, or open houses directly in the browser.
5. Use `Review pending file changes` to validate and preview the exact files that will change.
6. Use `Create branch, commit files, and open PR` to create a maintainer branch and open a pull request against `main`.
7. Clear the token when finished.

Important limits:

- token usage stays in the browser only
- the token is never committed
- token persistence is opt-in and uses `sessionStorage`, not `localStorage`
- the editor only writes:
  - `data/manual-schedules.json`
  - `data/market/items/tracked_items.json`
  - `data/open-houses.json`
- generated files such as `data/worlds.json`, `data/history/*.json`, and `data/market/world/**/*.json` are intentionally untouched by the editor

### Fine-grained token requirements

Create a fine-grained personal access token with:

- repository access limited to `nesleykent/tibia-warzones-schedule`
- `Contents: Read and write`
- `Pull requests: Read and write`

GitHub also exposes repository metadata automatically for the connection test.

### PR creation behavior

The browser editor:

- loads source data from the current static site
- validates edits in JavaScript before submit
- creates a branch named `maintainer-update-YYYYMMDD-HHMMSS`
- commits changed source files through the GitHub REST API
- opens a pull request against `main`

The editor does not bypass existing refresh automation. After merge, the current GitHub Actions workflow still owns generated-file updates.

## Add A Warzone Schedule

Source file:

- [`data/manual-schedules.json`](/Users/nesleykent/Code/tibia-warzones-schedule/data/manual-schedules.json)

Preferred browser workflow:

1. Open `admin.html`
2. Go to `Warzone schedule editor`
3. Add a world schedule or select an existing world
4. Edit `time`, `order`, and `timezone`
5. Use `source` and `notes` for PR context
6. Review pending file changes
7. Create the PR

`source` and `notes` help reviewers but are not persisted into `manual-schedules.json`, because the existing JSON contract only stores timezone plus execution rows.

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

Preferred browser workflow:

1. Open `admin.html`
2. Go to `Tracked market item editor`
3. Add or edit a row using item id or exact item name from `items.csv`
4. Toggle `enabled` to keep or drop the item from `tracked_items.json`
5. Use `category` and `notes` for PR context
6. Review pending changes
7. Create the PR

Contract note:

- the repository contract still stores tracked items as names only in `tracked_items.json`
- `category` and `notes` are PR metadata only
- `enabled` controls whether the item name is written into `tracked_items.json`

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

## Add Or Edit An Open House

Preferred browser workflow:

1. Open `admin.html`
2. Go to `Open house editor`
3. Add a new record or select an existing record
4. Edit required fields:
   - `id`
   - `houseName`
   - `ownerName`
   - `world`
   - `town`
   - `status`
   - `utilities`
   - `source`
5. Review pending changes
6. Create the PR

Validation rules enforced in-browser:

- world must exist in `data/worlds.json`
- required fields must be present
- `houseId` must be numeric or blank
- duplicate `houseId` values for the same world are rejected

Manual-entry source guidance:

- use `source.type = "manual"` for direct maintainer edits
- use `issueNumber = 0` when there is no GitHub issue
- keep `issueTitle` descriptive, such as `Manual maintainer update`

The older GitHub issue flow still exists for community submissions, but it is no longer the primary maintainer workflow.

## Clear The Token

When the editing session ends:

1. Click `Clear token` in `admin.html`
2. If session persistence was enabled, confirm the token input is blank
3. Close the tab if you want to drop the remaining session state immediately

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
