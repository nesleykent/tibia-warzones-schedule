# Tibia Warzones Schedule

Tibia Warzones Schedule is a static GitHub Pages project that tracks Bigfoot's Burden Warzone activity across Tibia worlds.

The repository contains the public website, generated datasets, data-refresh scripts, and GitHub Actions workflows used to publish and maintain the site.

## Purpose

Warzone services in Tibia are organized by players, and there is no official public schedule API for them.

This project brings together:

- inferred Warzone activity from kill statistics
- manually curated schedule data
- per-world historical records
- per-world market history for tracked items

The goal is to make that information available in a single static site that is easy to browse, easy to maintain, and easy to deploy through GitHub Pages.

## Documentation

- [README.md](./README.md): project overview, repository structure, and maintenance notes
- [Expected_Return_Explanation.md](./Expected_Return_Explanation.md): expected-return methodology, formulas, and market-price logic

## Project Stack

- HTML
- CSS
- JavaScript
- JSON
- Python
- GitHub Actions

The frontend is fully static. No application server or frontend framework is required.

## Site Overview

### Home Page

The home page is the world overview.

It includes:

- world cards
- search by world name
- filters for region, PvP, transfer type, and BattlEye
- a planner built from manual Warzone execution schedules
- timezone conversion for planned executions
- sound and alert controls for the planner

### World Page

Each world has a dedicated detail page with four major sections:

1. Summary
2. Manual Schedule
3. Market Prices
4. History

### Ranking Page

The ranking page compares worlds by normalized expected return.

Its main columns are:

- rank
- world
- ER (xTC)
- PvP type
- Tibia Coin price
- ER (xGold)

## Core Warzone Model

The project tracks these three bosses:

- Deathstrike
- Gnomevil
- Abyssador

The inferred completed service count is:

```text
services_completed = min(Deathstrike, Gnomevil, Abyssador)
```

Worlds are classified from the latest available kill snapshot with one of these marks:

- `healthy`
- `trolls`
- `inconclusive`
- `na`

## Expected Return Model

The economic ranking uses two closely related outputs:

- `ER (xGold)`: the expected value of one full warzone service in gold coins
- `ER (xTC)`: the same expected value normalized by the local Tibia Coin price

At a high level:

```text
Service_EV = WZ1_EV + WZ2_EV + WZ3_EV
Expected_Return = Service_EV / Tibia_Coin_Price
```

Where:

- `WZ1_EV = 30000 + (10500 * 0.5) + Gill_Necklace_Price`
- `WZ2_EV = 40000 + 15000 + Prismatic_Necklace_Price`
- `WZ3_EV = 50000 + 18000 + Prismatic_Ring_Price`

The item prices are derived from a 7-day rolling market window.

For the full formula explanation, assumptions, and variable definitions, see:

- [Expected_Return_Explanation.md](./Expected_Return_Explanation.md)

## Data Sources

The project references data and game resources from:

- TibiaData
- TibiaMarket.top
- Tibia.com
- Warzoneiros Tibia: https://www.youtube.com/@WarzoneirosTibia
- CipSoft GmbH

## Repository Structure

```text
assets/
  app.js
  shared.js
  styles.css
  world.js
  background/
  logo/
  sounds/

data/
  active_warzones.txt
  history/
  manual-schedules.json
  market/
  worlds.json

scripts/
  common.py
  economic_ranking.py
  enrich_worlds_with_rankings.py
  fetch_item_history.py
  remove_outliers.py
  update_data.py

logs/

.github/workflows/
  deploy-pages.yml
  update-worlds.yml

index.html
world.html
README.md
LICENSE
```

## Main Data Files

### `data/worlds.json`

This is the generated dataset used by the home page and parts of the world page.

It contains world-level summary fields such as:

- world metadata
- inferred Warzone activity
- latest detected boss kills
- latest detected service count
- automatic mark
- whether the world has historical service records
- merged manual executions

### `data/history/*.json`

These files store per-world daily history records.

Each record contains:

- date
- Deathstrike kills
- Gnomevil kills
- Abyssador kills
- inferred services completed
- mark

### `data/manual-schedules.json`

This file stores manually curated Warzone execution schedules per world.

### `data/market/world/*`

These files store per-world item market history used by the world-page market block and modal.

They also provide the rolling prices used by the expected-return model.

## Frontend Files

### `index.html`

The home page entry point.

### `world.html`

The world page entry point.

### `assets/app.js`

Home page behavior, planner logic, filters, notifications, and rendering.

### `assets/world.js`

World page behavior, summary rendering, history rendering, market table logic, and modal interactions.

### `assets/ranking.js`

Ranking page behavior, ranking-table rendering, filters, and world navigation.

### `assets/shared.js`

Shared timezone logic, shared UI initialization, and common helpers.

### `assets/styles.css`

The shared site stylesheet.

## Logs

### `logs/`

Reserved for generated log output, including future Markdown log files.

## Scripts

### `scripts/update_data.py`

Primary world-data refresh script.

It:

1. fetches world metadata
2. fetches world kill statistics
3. extracts Deathstrike, Gnomevil, and Abyssador counts
4. computes services completed and mark
5. updates per-world history files
6. merges manual schedule data
7. writes `data/worlds.json`

### `scripts/fetch_item_history.py`

Fetches and backfills per-world item market history files.

### `scripts/remove_outliers.py`

Cleans suspicious market-history rows.

### `scripts/economic_ranking.py`

Builds the economic ranking fields attached to each world record, including service EV, normalized expected return, and ranking positions.

### `scripts/enrich_worlds_with_rankings.py`

Standalone helper script that reloads `data/worlds.json`, attaches ranking metrics, and writes the enriched output back to disk.

### `scripts/common.py`

Shared Python helpers used by the data scripts.

## Timezones

The site includes a curated timezone selector used by the planner and world page.

Timezone options are grouped into:

- Americas
- Europe
- Asia / Pacific

The selector defaults to Curitiba when no saved timezone preference is present.

## Internationalization

The site currently supports:

- English
- Portuguese (Brazil)
- Spanish (LATAM)
- Polish

## GitHub Actions

### Deploy Pages

`.github/workflows/deploy-pages.yml`

This workflow is responsible for validating the static site and deploying it to GitHub Pages.

It runs on:

- pushes to `main`
- manual dispatch
- scheduled cron runs

### Update Worlds

`.github/workflows/update-worlds.yml`

This workflow is responsible for refreshing generated world data.

It runs on:

- manual dispatch
- scheduled cron runs
- pushes that affect refresh inputs

It regenerates world data, validates the output, and commits updated generated files when needed.

## Local Development

Refresh world data:

```bash
python scripts/update_data.py
```

Serve the site locally:

```bash
python3 -m http.server 4173
```

Open:

```text
http://127.0.0.1:4173/
```

## Deployment

The site is deployed through GitHub Pages from this repository.

The deployment workflow prepares a static Pages artifact and publishes it through GitHub Actions.

## Roadmap

One planned extension is return scoring per Warzone world using recent market history.

The intended model is:

1. load market history for:
   - Tibia Coins
   - Gill Necklace
   - Prismatic Necklace
   - Prismatic Ring
2. recursively extract rows from arrays or from keys such as:
   - `data`
   - `results`
   - `history`
   - `items`
   - `snapshots`
3. keep only rows with:
   - a positive numeric timestamp
   - at least one positive numeric value among `day_average_sell` and `day_average_buy`
4. convert timestamps to UTC dates
5. keep only the latest row per UTC date
6. keep at most the most recent 7 dates
7. compute daily prices from the mean of positive sell/buy values
8. compute expected item prices as arithmetic means of those daily prices
9. compute:

```text
wz1 = 30000 + 10500 * 0.5 + gill_necklace_price
wz2 = 40000 + 15000 + prismatic_necklace_price
wz3 = 50000 + 18000 + prismatic_ring_price
service_expected_value = wz1 + wz2 + wz3
expected_return = service_expected_value / Tibia_coin_price
```

If any required expected item price is missing, `expected_return` remains `null`.

## Credits

Most known server schedule hours were gathered from the Warzoneiros Tibia YouTube channel:

- https://www.youtube.com/@WarzoneirosTibia

Tibia is a registered trademark of CipSoft GmbH. All related assets belong to CipSoft GmbH.

This project is independent and has no affiliation, support, or endorsement from CipSoft GmbH, Tibia.com, TibiaData, or TibiaMarket.top.
