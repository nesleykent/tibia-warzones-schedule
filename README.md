# Tibia Warzones Schedule

Tibia Warzones Schedule is a static GitHub Pages site for tracking Bigfoot's Burden Warzone activity across Tibia worlds.

The project combines:

- inferred activity from Deathstrike, Gnomevil, and Abyssador kill statistics
- manually curated world schedules
- per-world historical records
- a world-level market view with item history and modal charts

## What The Site Does

### Home Page

The home page shows all worlds from `data/worlds.json`.

Current behavior:

- worlds are listed alphabetically
- search filters by world name
- filters are available for region, PvP, BattlEye, and transfer type
- a planner lets users select manual executions from multiple worlds
- selected executions are converted to the chosen timezone
- notification controls support alert offsets, sound choice, and volume
- the summary line shows:
  - total worlds in the dataset
  - worlds with Warzone activity detected in the latest kill statistics
  - worlds with known manual schedules

### World Page

Each world page includes four blocks:

1. `Summary`
2. `Manual Schedule`
3. `Market Prices`
4. `History`

The world page also uses the shared footer and the same timezone selection rules as the home page.

### Languages

The UI currently supports:

- English
- Portuguese (Brazil)
- Spanish (LATAM)
- Polish

## Warzone Rules

The project tracks three bosses:

- Deathstrike
- Gnomevil
- Abyssador

A completed service is:

```text
services_completed = min(Deathstrike, Gnomevil, Abyssador)
```

World marks are derived from the latest daily kill snapshot:

- `na`: all three boss kill counts are `0`
- `healthy`: all three boss kill counts are equal and greater than `0`
- `trolls`: exactly two boss kill counts match and the third is lower
- `inconclusive`: any other case

Important display rules:

- `N/A` only applies when all three boss kill counts are `0`
- worlds marked `N/A` do not show the homepage status bubble
- worlds marked `N/A` and without service history show `NO SERVICES` on the home page
- worlds marked `N/A` but with service history keep the `SERVICES` label

## Market Features

The market block reads local JSON history files in `data/market/world/`.

Current tracked item order:

1. Tibia Coins
2. Gold Token
3. Silver Token
4. Minor Crystalline Token
5. Gill Necklace
6. Prismatic Necklace
7. Prismatic Ring

The world-level table shows:

- item
- supply price
- demand price
- spread
- updated timestamp

Each row opens a modal with:

- range tabs: `7D`, `28D`, `90D`, `180D`, `360D`, `ALL`
- supply vs demand chart
- equilibrium chart
- aggregate metrics
- CSV and JSON export buttons

## Timezones

The timezone selector is grouped with `<optgroup>` blocks in this HTML order:

1. `Americas`
2. `Europe`
3. `Asia / Pacific`

Within each group, entries are sorted by GMT offset and then alphabetically.

Default timezone:

- `Curitiba (BRT, GMT-3)`

The selector includes explicit aliases where needed, such as:

- `Curitiba`
- `São Paulo`
- `Xique-Xique, Bahia`

## Data Files

### Worlds Dataset

Generated world summaries are stored in:

`data/worlds.json`

Important fields include:

- `name`
- `location`
- `pvp_type`
- `transfer_type`
- `battleye_protected`
- `battleye_date`
- `tracks_warzone_service`
- `warzone_services_per_day`
- `timezone`
- `last_detected_kills`
- `last_detected_services`
- `mark`
- `has_service_history`
- `warzone_executions`

### History Dataset

Per-world history is stored in:

`data/history/{world}.json`

Each entry contains:

- `date`
- `deathstrike_kills`
- `gnomevil_kills`
- `abyssador_kills`
- `services_completed`
- `mark`

### Market Dataset

Per-world item history is stored in:

`data/market/world/<world>/<world>_<item>.json`

Tracked item metadata lives in:

- `data/market/items/tracked_items.json`
- `data/market/items/items.csv`

## Update Pipeline

The main data refresh script is:

`scripts/update_data.py`

It currently:

1. fetches world metadata from TibiaData
2. fetches kill statistics for each world
3. extracts Deathstrike, Gnomevil, and Abyssador counts
4. computes services and mark
5. updates per-world history files
6. merges manual schedules
7. writes `data/worlds.json`

Other relevant scripts:

- `scripts/fetch_item_history.py`
- `scripts/remove_outliers.py`
- `scripts/common.py`

## GitHub Actions

The repository currently has two main workflows.

### Deploy Pages

`.github/workflows/deploy-pages.yml`

Behavior:

- runs on push to `main`
- runs on manual dispatch
- runs on cron
- validates JavaScript files with `node --check`
- validates required static files
- uploads a prepared Pages artifact
- deploys that artifact to GitHub Pages

### Update Worlds

`.github/workflows/update-worlds.yml`

Behavior:

- runs on schedule
- runs on manual dispatch
- runs on pushes that affect refresh inputs
- regenerates world data
- validates the generated `data/worlds.json`
- commits updated data back to `main` only when files changed

Automated refresh commits are configured to use the repository owner identity instead of `github-actions[bot]`, unless repository variables override that behavior:

- `COMMIT_AUTHOR_NAME`
- `COMMIT_AUTHOR_EMAIL`

## Local Development

Refresh world data:

```bash
python scripts/update_data.py
```

Run a local static server:

```bash
python3 -m http.server 4173
```

Then open:

```text
http://127.0.0.1:4173/
```

## Project Structure

```text
assets/
  app.js
  shared.js
  styles.css
  world.js
  logo/
  background/
  sounds/

data/
  history/
  market/
  worlds.json
  manual-schedules.json
  active_warzones.txt

scripts/
  common.py
  fetch_item_history.py
  remove_outliers.py
  update_data.py

.github/workflows/
  deploy-pages.yml
  update-worlds.yml

index.html
world.html
```

## Future Update: Expected Return Scoring

Future updates will score each Warzone world by its return value in Tibia Coins.

For each world:

1. load market history for:
   - `Tibia_coins`
   - `gill_necklace`
   - `prismatic_necklace`
   - `prismatic_ring`
2. extract rows recursively from arrays or from keys:
   - `data`
   - `results`
   - `history`
   - `items`
   - `snapshots`
3. for each item, keep only rows with:
   - a positive numeric timestamp
   - at least one positive numeric value among `day_average_sell` and `day_average_buy`
4. convert each timestamp to a UTC date
5. for each UTC date, keep only the latest row by timestamp
6. sort dates descending and keep at most the most recent `7` dates
7. for each selected row, compute:

```text
daily_price = mean(positive values among day_average_sell and day_average_buy)
```

8. the item expected price is the arithmetic mean of those selected daily prices

If any required item expected price is missing:

```text
expected_return = null
```

Otherwise compute:

```text
wz1 = 30000 + 10500 * 0.5 + gill_necklace_price
wz2 = 40000 + 15000 + prismatic_necklace_price
wz3 = 50000 + 18000 + prismatic_ring_price
service_expected_value = wz1 + wz2 + wz3
expected_return = service_expected_value / Tibia_coin_price
```

## Credits

This project references data and game resources from:

- TibiaData
- TibiaMarket.top
- Tibia.com
- CipSoft GmbH

Tibia is a registered trademark of CipSoft GmbH. All related assets belong to CipSoft GmbH. This project is independent and has no affiliation, support, or endorsement from CipSoft GmbH, Tibia.com, TibiaData, or TibiaMarket.top.
