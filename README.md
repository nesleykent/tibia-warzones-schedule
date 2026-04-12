# Tibia Warzones Schedule

Static GitHub Pages site for tracking Tibia Bigfoot's Burden warzone activity by world.

The repository contains:

- the public site pages
- generated world and history datasets
- market-history files used for expected-return ranking
- Python scripts that refresh data
- GitHub Actions workflows that validate and publish the site

## What The Site Shows

The site is centered on three views:

- `index.html`: world overview, filters, search, and manual warzone planner
- `world.html`: per-world summary, manual schedule, market data, and history
- `ranking.html`: expected-return ranking based on local market prices

There is also a reference page:

- `bigfoot.html`: outbound spoiler/reference links for the Bigfoot's Burden quest

## Core Data Model

The tracker infers completed services from the three Bigfoot's Burden bosses:

- Deathstrike
- Gnomevil
- Abyssador

Completed services are derived from the lowest boss count in the latest kill snapshot:

```text
services_completed = min(Deathstrike, Gnomevil, Abyssador)
```

Each world is then marked as one of:

- `healthy`
- `trolls`
- `inconclusive`
- `na`

Manual execution schedules are stored separately and merged into the generated world dataset during refresh.

## Expected Return Ranking

The ranking view estimates the value of one full warzone service per world and normalizes it by the local Tibia Coin price.

At a high level:

```text
service_expected_value = wz1 + wz2 + wz3
expected_return = service_expected_value / tibia_coin_price
```

The price inputs come from per-world market-history files under `data/market/world/` using a 7-day rolling window.

Detailed methodology lives in:

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

## Main Scripts

- `scripts/update_data.py`: fetches world metadata and kill statistics from TibiaData, updates `data/history/*.json`, merges manual schedules, attaches ranking metrics, and writes `data/worlds.json`
- `scripts/fetch_item_history.py`: fetches or backfills per-world item market history from TibiaMarket
- `scripts/enrich_worlds_with_rankings.py`: recomputes ranking fields from existing local data only
- `scripts/remove_outliers.py`: cleans suspicious market-history rows
- `scripts/common.py`: shared helpers used by the data scripts
- `scripts/economic_ranking.py`: expected-return and ranking calculations

## Data Sources

The project uses data or reference material from:

- TibiaData
- TibiaMarket.top
- Tibia.com
- Warzoneiros Tibia

## Local Development

Requirements:

- Python 3
- any static file server for local preview

Refresh worlds and history:

```bash
python scripts/update_data.py
```

Refresh market history:

```bash
python scripts/fetch_item_history.py
```

Rebuild ranking fields from existing local files:

```bash
python scripts/enrich_worlds_with_rankings.py
```

Serve the site locally:

```bash
python3 -m http.server 4173
```

Then open `http://127.0.0.1:4173/`.

## Automation

The repository has two GitHub Actions workflows:

- `.github/workflows/update-worlds.yml`: refreshes generated world/history data and commits changes when needed
- `.github/workflows/deploy-pages.yml`: validates the static site and deploys it to GitHub Pages

## Notes

- The frontend is fully static; there is no backend service or frontend framework.
- The site includes English, Portuguese (Brazil), Spanish (LATAM), and Polish UI strings.
- This project is independent and is not affiliated with or endorsed by CipSoft GmbH, Tibia.com, TibiaData, or TibiaMarket.top.

## License And Credits

Tibia is a registered trademark of CipSoft GmbH. All related assets belong to their respective owners.

Many known server schedule hours were gathered from the Warzoneiros Tibia community channel:

- https://www.youtube.com/@WarzoneirosTibia
