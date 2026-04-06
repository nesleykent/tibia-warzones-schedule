# Tibia Warzones Schedule

Tibia Warzones Schedule is a static website for tracking Warzone activity across Tibia worlds.

It combines inferred Warzone service data, manually curated schedules, historical records, and a Phase 3 market layer for tracked items on each world.

## Current Status

The project is currently in Phase 3.

Compared with the older `main` branch README description, the app now includes:

- A dedicated `Market Prices` block on the world page
- A clickable per-item market table
- A market item modal with range tabs, charts, metrics, spread, and exports
- Dark-mode-only UI
- Updated branding and footer credits
- Better empty-state reporting links to GitHub Issues

## Overview

Warzones in Tibia are player-organized events. There is no official in-game schedule API for them, so this project infers activity by tracking the three Bigfoot's Burden bosses:

- Deathstrike
- Gnomevil
- Abyssador

A completed service is counted when all three bosses appear in the daily kill statistics. The project computes:

- `services_completed = min(Deathstrike, Gnomevil, Abyssador)`
- Automatic world marks: `healthy`, `trolls`, `inconclusive`
- Persistent daily history per world
- Manual execution schedules per world

## Phase 3

Phase 3 adds a market layer to the world page.

The world page layout is now:

1. `Summary`
2. `Manual Schedule`
3. `Market Prices`
4. `History`

### Market Prices

The market table shows the latest snapshot for tracked items in a fixed order:

1. Tibia Coins
2. Gold Token
3. Silver Token
4. Minor Crystalline Token
5. Gill Necklace
6. Prismatic Necklace
7. Prismatic Ring

Columns:

- Item
- Supply Price
- Demand Price
- Spread
- Updated

Each row is clickable and opens a modal.

### Market Item Modal

The modal includes:

- Range tabs: `7D`, `28D`, `90D`, `180D`, `360D`, `ALL`
- Supply vs Demand chart
- Equilibrium chart
- Metrics table
- CSV and JSON export buttons

Metrics include:

- Avg Supply Price
- Avg Supply Volume
- Avg Demand Price
- Avg Demand Volume
- Avg Spread
- Avg Transactions

Spread is calculated from supply and demand price data and is shown both in the modal metrics and in the world-level market table.

## Data Sources and Credits

This project references data and game resources from:

- TibiaData: https://api.tibiadata.com
- TibiaMarket.top: https://tibiamarket.top
- Tibia.com: https://www.tibia.com
- CipSoft GmbH

Important notes:

- Tibia is a registered trademark of CipSoft GmbH.
- All related game assets belong to CipSoft GmbH.
- This project is independent and has no affiliation, support, or endorsement from CipSoft GmbH, Tibia.com, TibiaData, or TibiaMarket.top.

## Data Model

### World Dataset

Generated worlds are stored in `data/worlds.json`.

Example:

```json
{
  "name": "Gentebra",
  "location": "South America",
  "pvp_type": "Optional PvP",
  "transfer_type": "regular",
  "battleye_protected": true,
  "battleye_date": "2017-12-12",
  "tracks_warzone_service": true,
  "warzone_services_per_day": 2,
  "timezone": "America/Sao_Paulo",
  "last_detected_kills": {
    "Deathstrike": 2,
    "Gnomevil": 2,
    "Abyssador": 2
  },
  "last_detected_services": 2,
  "mark": "healthy",
  "warzone_executions": [
    {
      "execution_id": 1,
      "schedule_time": "17:00",
      "warzone_sequence": "1-3-2"
    }
  ]
}
```

Key fields:

- `tracks_warzone_service`: whether Warzone activity was detected
- `warzone_services_per_day`: completed services detected in the last day
- `last_detected_kills`: per-boss kill counts
- `last_detected_services`: minimum of the three tracked bosses
- `mark`: automatic world classification
- `warzone_executions`: manual schedules
- `timezone`: schedule reference timezone

### History Dataset

Per-world history is stored in:

`data/history/{world}.json`

The updater:

- Reads existing history
- Replaces the current date entry if it already exists
- Appends a new record when needed
- Sorts history newest first

### Market Dataset

Phase 3 market files are stored as:

`data/market/world/<World>/<world>_<item>.json`

Each file contains time-series snapshots with fields such as:

- `time`
- `day_average_sell`
- `day_average_buy`
- `day_sold`
- `day_bought`

Tracked item metadata is stored in:

- `data/market/items/tracked_items.json`
- `data/market/items/items.csv`

## How It Works

### Warzone Data

1. Fetch all worlds from TibiaData
2. Fetch kill statistics for each world
3. Extract Deathstrike, Gnomevil, and Abyssador kills
4. Compute completed services and automatic mark
5. Merge manual schedules
6. Persist `data/worlds.json`
7. Update `data/history/{world}.json`

### Market Data

1. Read tracked item definitions
2. Load per-world market history files
3. Extract latest values for the world table
4. Filter historical entries by range in the browser
5. Render modal charts, spread, equilibrium, and metrics

## Frontend Features

- Dark-mode-only UI
- Search by world name
- Filters for region, PvP, BattlEye, and transfer type
- Warzone planner for selected worlds
- Timezone conversion in the browser
- Multiple languages:
  - English
  - Portuguese (Brazil)
  - Spanish (LATAM)
  - Polish
- Dedicated world page
- World history table
- Market Prices table with spread
- Interactive market modal
- GitHub Issues shortcuts in empty states
- Updated logo-based branding

## Scripts

Core scripts in `scripts/`:

- `update_data.py`: updates world data and history
- `fetch_item_history.py`: fetches and backfills market history from TibiaMarket.top
- `remove_outliers.py`: cleans suspicious market data points

## Project Structure

```text
assets/
  app.js
  styles.css
  world.js
  logo/

data/
  history/
  market/
  worlds.json
  manual-schedules.json

scripts/
  remove_outliers.py
  update_data.py

index.html
world.html
```

## Local Development

Update generated data:

```bash
python scripts/update_data.py
```

Run a local server:

```bash
python -m http.server 8000
```

Open:

[http://localhost:8000](http://localhost:8000)

## Deployment

The site is deployed as a static project.

Primary flow:

1. Push changes to `main`
2. GitHub Pages serves the site from `main`

If GitHub Pages settings need to be configured manually:

1. Open repository Settings
2. Go to Pages
3. Select branch `main`
4. Select folder `/ (root)`

## Purpose

This project reduces uncertainty around Warzone participation by turning fragmented signals, manual reports, and market context into a single accessible reference for players across worlds and timezones.
