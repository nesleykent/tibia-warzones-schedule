# Architecture Overview

This repository is a static GitHub Pages site backed by committed generated JSON files. The site has no backend, no SSR, and no database. The browser loads JSON directly from the repository output.

Use [`docs/repository-audit.md`](/Users/nesleykent/Code/tibia-warzones-schedule/docs/repository-audit.md) for the full audit; this document is the operational architecture reference.

## Frontend Entry Points

- [`index.html`](/Users/nesleykent/Code/tibia-warzones-schedule/index.html)
  - `assets/shared.js`
  - `assets/app.js`
  - world list, planner, filters, notifications

- [`world.html`](/Users/nesleykent/Code/tibia-warzones-schedule/world.html)
  - `assets/shared.js`
  - `assets/world.js`
  - per-world summary, schedules, ranking summary, market, history

- [`ranking.html`](/Users/nesleykent/Code/tibia-warzones-schedule/ranking.html)
  - `assets/shared.js`
  - `assets/ranking.js`
  - ranking table from `data/worlds.json`

- [`open-houses.html`](/Users/nesleykent/Code/tibia-warzones-schedule/open-houses.html)
  - `assets/shared.js`
  - `assets/open-houses.js`
  - open-house overview and world detail

- [`bigfoot.html`](/Users/nesleykent/Code/tibia-warzones-schedule/bigfoot.html)
  - `assets/shared.js`
  - `assets/bigfoot.js`
  - static reference page

## Source vs Generated Files

### Source

- HTML in repository root
- JavaScript and CSS in `assets/`
- Python scripts in `scripts/`
- issue templates and workflows in `.github/`
- `data/manual-schedules.json`
- `data/market/items/items.csv`
- `data/market/items/tracked_items.json`

### Generated

- `data/worlds.json`
- `data/history/*.json`
- `data/open-houses.json`
- `data/market/world/**/*.json`
- `data/market/sync_state.json`

### Local Artifacts

- `.DS_Store`
- `__pycache__/`
- `.venv/`

## Data Flow

```text
TibiaData APIs
  + manual schedule source
    -> scripts/update_data.py
      -> data/worlds.json
      -> data/history/*.json
        -> frontend pages

TibiaMarket API
  + tracked item catalog
    -> scripts/fetch_item_history.py
      -> data/market/world/**/*.json
        -> scripts/economic_ranking.py
          -> ranking block in data/worlds.json
            -> ranking.html + world.html

GitHub Issues
  + TibiaData house/character lookups
    -> scripts/update_open_houses.py
      -> data/open-houses.json
        -> open-houses.html
```

## Python Pipeline

### `scripts/update_data.py`

- fetches world list from TibiaData
- fetches kill statistics per world
- merges `data/manual-schedules.json`
- updates `data/history/*.json`
- rebuilds `data/worlds.json`
- attaches economic ranking metrics

### `scripts/economic_ranking.py`

- reads `data/history/*.json`
- reads `data/market/world/**/*.json`
- computes expected return and ranking fields
- writes data indirectly through `update_data.py` or `enrich_worlds_with_rankings.py`

### `scripts/enrich_worlds_with_rankings.py`

- rebuilds only ranking fields into `data/worlds.json`

### `scripts/fetch_item_history.py`

- resolves tracked items from `items.csv` and `tracked_items.json`
- fetches market history from TibiaMarket
- writes per-world item files
- persists sync checkpoint

### `scripts/update_open_houses.py`

- reads GitHub issues
- resolves world/town/house data using TibiaData
- rebuilds `data/open-houses.json`

### `scripts/remove_outliers.py`

- cleans market history files using percentile-based filtering
- requires `numpy`

## Ranking Flow

Ranking does not have its own top-level dataset. It is embedded into each world record inside `data/worlds.json` under `warzone_economic_ranking`.

Inputs:

- world metadata and observed service state
- last five history marks
- market rolling window prices
- fixed formula constants in `scripts/economic_ranking.py`

Outputs:

- ranking position
- service expected value
- expected return in Tibia Coins terms
- liquidity and health scores

## Market Flow

Source inputs:

- `data/market/items/items.csv`
- `data/market/items/tracked_items.json`

Generated outputs:

- `data/market/world/<world>/<world>_<item>.json`
- ranking fields in `data/worlds.json`

Frontend consumers:

- `assets/world.js`
- `assets/ranking.js` through embedded ranking data

## Open Houses Flow

Source inputs:

- GitHub issues using the open-house templates

Generated output:

- `data/open-houses.json`

Frontend consumer:

- `assets/open-houses.js`

## Deployment Flow

### Data-refresh workflows

- `update-worlds.yml`
  - rebuilds `data/worlds.json` and `data/history`
- `update-market.yml`
  - refreshes tracked market files
  - rebuilds ranking fields in `data/worlds.json`
- `update-open-houses.yml`
  - rebuilds `data/open-houses.json`

These workflows commit generated data back to `main`.

### Pages deployment workflow

- `deploy-pages.yml`
  - syntax-checks frontend JS
  - validates required files
  - packages the site into `_site`
  - deploys to GitHub Pages

### Hosting model

- static GitHub Pages
- no runtime server owned by this repository
- frontend reads committed JSON assets directly
