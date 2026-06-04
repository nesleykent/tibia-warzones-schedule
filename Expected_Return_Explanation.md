# Ranking Methodology

This document describes the ranking logic proven in `scripts/economic_ranking.py`.

## Inputs

The ranking code loads five market models per world:

- Tibia Coins
- Minor Crystalline Token
- Gill Necklace
- Prismatic Necklace
- Prismatic Ring

It also loads the last five history rows for the world from `data/history/<world>.json` and current kill counters from the world record in `data/worlds.json`.

## Market Price Normalization

For each market snapshot row:

1. Take the positive values from `day_average_sell` and `day_average_buy`.
2. Average those values for the row.
3. Sort rows by `time` descending.
4. Average the most recent 7 valid rows.

That 7-row mean is the preferred price input for the ranking formulas.

The code also computes supply, demand, midpoint, spread, spread ratio, liquidity factor, and adjusted effective price for every tracked ranking item. Those values are stored in the embedded ranking block, but the main ranking order still uses expected return only.

## Expected Value Formulas

Constants:

- rolling window size: `7`
- green crystal shard probability: `0.5`
- warzone 1 fixed gold: `30000`
- warzone 1 green shard value: `10500`
- warzone 2 fixed gold: `40000`
- warzone 2 blue shard value: `15000`
- warzone 3 fixed gold: `50000`
- warzone 3 violet shard value: `18000`

Formulas:

```text
WZ1 = 30000 + (10500 * 0.5) + GillNecklacePrice
WZ2 = 40000 + 15000 + PrismaticNecklacePrice
WZ3 = 50000 + 18000 + PrismaticRingPrice
ServiceExpectedValue = WZ1 + WZ2 + WZ3
EconomicScoreRaw = ServiceExpectedValue / TibiaCoinPrice
```

`TibiaCoinPrice`, `GillNecklacePrice`, `PrismaticNecklacePrice`, and `PrismaticRingPrice` are taken from the first positive value in this fallback order:

1. `rolling_window_price`
2. `adjusted_effective_price`
3. `mid_price`
4. `supply_price`
5. `demand_price`

## Health And Liquidity Metrics

The ranking block also stores:

- `history_health_score`: average of the last five history marks
- `current_operational_score`: ratio of current boss kills and detected services
- `warzone_health_score`: `history_health_score * 0.7 + current_operational_score * 0.3`
- `market_liquidity_score`: average liquidity factor across all five ranking market items, including Minor Crystalline Token

These metrics are informative, but they do not currently change rank order.

## Rank Order

The code sets:

```text
final_score = economic_score_raw
```

Then it sorts ranked worlds by:

1. `economic_score_raw` descending
2. world name ascending

`ranking_position` is assigned after that sort.

## Exclusion Rules

A world is not ranked when any of these conditions are true:

- the world name is empty
- `economic_score_raw` could not be computed
- the current world mark is `na`

When a world is excluded because its mark is `na`, the code may still keep computed market and expected-value fields in the ranking block. The world simply does not receive a rank position.

## Stored Output

The ranking data is embedded in each world record under `warzone_economic_ranking` inside `data/worlds.json`.
