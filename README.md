# Tibia Warzones Schedule

Tibia Warzones Schedule is a static GitHub Pages project for tracking Bigfoot's Burden warzone activity across Tibia worlds. It combines inferred boss-kill activity, manually curated execution schedules, per-world history, and market-based expected-return ranking into a single browseable site.

## Key Features

- World overview with search and filtering
- Per-world pages with summary, manual schedule, market data, and history
- Expected-return ranking based on local Tibia Coins market prices
- Timezone-aware planner for manual execution schedules
- Static deployment and validation through GitHub Actions

## Installation

### Requirements

- Python 3
- A local static file server

### Setup

Clone the repository and move into the project directory:

```bash
git clone <repository-url>
cd tibia-warzones-schedule
```

Refresh the generated world and history dataset:

```bash
python scripts/update_data.py
```

Optional: refresh market history files used by the ranking model:

```bash
python scripts/fetch_item_history.py
```

Optional: rebuild ranking fields from the existing local dataset without refetching world data:

```bash
python scripts/enrich_worlds_with_rankings.py
```

## Usage

Serve the site locally:

```bash
python3 -m http.server 4173
```

Then open:

```text
http://127.0.0.1:4173/
```

Main pages:

- `index.html`: world overview, filters, and planner
- `world.html`: world-specific details, schedule, market data, and history
- `ranking.html`: expected-return ranking across worlds
- `bigfoot.html`: Bigfoot's Burden reference links

## Contributing

Contributions should preserve the project's current model: a static site backed by generated data files and lightweight maintenance scripts.

Before submitting changes:

- verify that the site still serves locally
- keep generated data and the scripts that produce it consistent
- update documentation when user-facing behavior changes
- avoid adding unnecessary framework or backend complexity

Useful maintenance scripts:

- `scripts/update_data.py`
- `scripts/fetch_item_history.py`
- `scripts/enrich_worlds_with_rankings.py`
- `scripts/remove_outliers.py`
- `scripts/economic_ranking.py`

Project automation lives in:

- `.github/workflows/update-worlds.yml`
- `.github/workflows/deploy-pages.yml`

## License

This repository is distributed under the terms in [LICENSE](./LICENSE).

The project uses data or reference material from:

- CipSoft GmbH
- Tibia.com
- TibiaData
- TibiaMarket.top
- Exevo Pan
- Warzoneiros Tibia

Tibia is a registered trademark of CipSoft GmbH. This project is independent and is not affiliated with or endorsed by CipSoft GmbH, Tibia.com, TibiaData, TibiaMarket.top, or Exevo Pan.
