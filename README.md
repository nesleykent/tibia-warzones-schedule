# Tibia Warzones Schedule

Tibia Warzones Schedule is a static GitHub Pages project that tracks Bigfoot's Burden warzone activity across Tibia worlds. It combines inferred service activity, manually curated schedules, per-world history, and local market data into a single site.

## Key Features

- World overview with search and filters
- Per-world detail pages with summary, schedule, market data, and history
- Expected-return ranking normalized by local Tibia Coin price
- Manual execution planner with timezone-aware schedule display
- Static deployment through GitHub Pages with automated validation

## Installation

### Requirements

- Python 3
- A local static file server for previewing the site

### Clone The Repository

```bash
git clone <repository-url>
cd tibia-warzones-schedule
```

### Refresh Generated Data

Refresh world and history data:

```bash
python scripts/update_data.py
```

Optional: refresh market history files:

```bash
python scripts/fetch_item_history.py
```

Optional: rebuild ranking fields from existing local files only:

```bash
python scripts/enrich_worlds_with_rankings.py
```

## Usage

Serve the site locally:

```bash
python3 -m http.server 4173
```

Open:

```text
http://127.0.0.1:4173/
```

Main pages:

- `index.html`: world overview, filters, search, and planner
- `world.html`: per-world summary, schedule, market data, and history
- `ranking.html`: expected-return ranking
- `bigfoot.html`: Bigfoot's Burden reference links

## How It Works

The tracker follows three Bigfoot's Burden bosses:

- Deathstrike
- Gnomevil
- Abyssador

Completed services are inferred from the lowest boss count in the latest kill snapshot:

```text
services_completed = min(Deathstrike, Gnomevil, Abyssador)
```

Worlds are marked as:

- `healthy`
- `trolls`
- `inconclusive`
- `na`

The ranking view estimates the value of one full warzone service and normalizes it by Tibia Coin price:

```text
service_expected_value = wz1 + wz2 + wz3
expected_return = service_expected_value / tibia_coin_price
```

Price inputs come from per-world market-history files under `data/market/world/` using a 7-day rolling window.

Detailed methodology:

- [Expected_Return_Explanation.md](./Expected_Return_Explanation.md)

## Repository Layout

```text
assets/                 Frontend JavaScript, CSS, images, and sounds
data/
  history/              Generated per-world daily history files
  market/               Per-world item market history
  manual-schedules.json Manually curated execution times
  worlds.json           Main generated dataset consumed by the site
scripts/                Data refresh and ranking scripts
.github/workflows/      GitHub Actions for refresh and deployment

index.html              Home page
world.html              World detail page
ranking.html            Expected-return ranking page
bigfoot.html            Bigfoot's Burden reference page
README.md
LICENSE
```

## Contributing

Contributions should keep the project aligned with the existing static-site and generated-data workflow.

Before opening changes:

- keep generated data and source scripts consistent
- verify that the site still serves locally
- keep README and supporting docs in sync with behavior changes
- avoid adding framework or backend complexity unless it is clearly necessary

The main maintenance scripts are:

- `scripts/update_data.py`
- `scripts/fetch_item_history.py`
- `scripts/enrich_worlds_with_rankings.py`
- `scripts/remove_outliers.py`
- `scripts/economic_ranking.py`

Automation lives in:

- `.github/workflows/update-worlds.yml`
- `.github/workflows/deploy-pages.yml`

## License

This repository is distributed under the terms in [LICENSE](./LICENSE).

## Credits

The project uses data or reference material from:

- TibiaData
- TibiaMarket.top
- Tibia.com
- Warzoneiros Tibia

Many known server schedule hours were gathered from the Warzoneiros Tibia community channel:

- https://www.youtube.com/@WarzoneirosTibia

Tibia is a registered trademark of CipSoft GmbH. This project is independent and is not affiliated with or endorsed by CipSoft GmbH, Tibia.com, TibiaData, or TibiaMarket.top.
