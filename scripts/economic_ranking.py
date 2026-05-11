from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any

RANKING_MARKET_ITEMS = [
    ("Tibia Coins", "tibia_coin"),
    ("Minor Crystalline Token", "minor_crystalline_token"),
    ("Gill Necklace", "gill_necklace"),
    ("Prismatic Necklace", "prismatic_necklace"),
    ("Prismatic Ring", "prismatic_ring"),
]

ROLLING_WINDOW_ENTRIES = 7
GREEN_CRYSTAL_SHARD_REWARD_PROBABILITY = 0.5
WZ1_FIXED_GOLD = 30000
WZ1_GREEN_CRYSTAL_SHARD_VALUE = 10500
WZ2_FIXED_GOLD = 40000
WZ2_BLUE_CRYSTAL_SHARDS_VALUE = 15000
WZ3_FIXED_GOLD = 50000
WZ3_VIOLET_CRYSTAL_SHARDS_VALUE = 18000

MARK_VALUE_MAP = {
    "healthy": 1.0,
    "inconclusive": 0.5,
    "troll": 0.0,
    "trolls": 0.0,
    "na": 0.0,
}


def slugify_name(value: str, separator: str = "-") -> str:
    slug = re.sub(r"[^a-z0-9]+", separator, str(value).strip().lower()).strip(
        separator
    )
    return slug or "unknown"


def load_json_file(path: Path) -> Any:
    with path.open("r", encoding="utf-8") as file:
        return json.load(file)


def get_history_path(data_dir: Path, world_name: str) -> Path:
    return data_dir / "history" / f"{slugify_name(world_name)}.json"


def get_market_path(data_dir: Path, world_name: str, item_name: str) -> Path:
    world_slug = slugify_name(world_name)
    item_slug = slugify_name(item_name, separator="_")
    return (
        data_dir
        / "market"
        / "world"
        / world_slug
        / f"{world_slug}_{item_slug}.json"
    )


def to_float(value: Any) -> float | None:
    try:
        numeric = float(value)
    except (TypeError, ValueError):
        return None

    if not numeric == numeric:
        return None

    return numeric


def normalize_price(value: Any) -> float | None:
    numeric = to_float(value)
    if numeric is None or numeric < 0:
        return None
    return numeric


def first_positive_number(*values: Any) -> float | None:
    for value in values:
        numeric = to_float(value)
        if numeric is not None and numeric > 0:
            return numeric
    return None


def map_mark_value(mark: Any) -> float:
    return MARK_VALUE_MAP.get(str(mark or "").strip().lower(), 0.0)


def extract_market_entries(payload: Any) -> list[dict[str, Any]]:
    if isinstance(payload, dict):
        snapshots = payload.get("snapshots")
        if isinstance(snapshots, list) and snapshots:
            if isinstance(snapshots[0], list):
                return [item for item in snapshots[0] if isinstance(item, dict)]
            return [item for item in snapshots if isinstance(item, dict)]

    if isinstance(payload, list):
        if payload and isinstance(payload[0], list):
            return [item for item in payload[0] if isinstance(item, dict)]
        return [item for item in payload if isinstance(item, dict)]

    return []


def get_latest_market_entry(entries: list[dict[str, Any]]) -> dict[str, Any] | None:
    if not entries:
        return None

    return max(entries, key=lambda entry: to_float(entry.get("time")) or 0.0)


def positive_number(value: Any) -> float | None:
    numeric = to_float(value)
    if numeric is None or numeric <= 0:
        return None
    return numeric


def timestamp_value(row: dict[str, Any]) -> float | None:
    value = to_float(row.get("time"))
    if value is None or value <= 0:
        return None
    return value


def daily_market_price_from_row(row: dict[str, Any]) -> float | None:
    day_average_sell = positive_number(row.get("day_average_sell"))
    day_average_buy = positive_number(row.get("day_average_buy"))
    values = [value for value in (day_average_sell, day_average_buy) if value is not None]
    if not values:
        return None
    return sum(values) / len(values)


def rolling_window_market_price(rows: list[dict[str, Any]]) -> tuple[float | None, int]:
    normalized_rows: list[tuple[float, float]] = []

    for row in rows:
        if not isinstance(row, dict):
            continue

        row_timestamp = timestamp_value(row)
        if row_timestamp is None:
            continue

        daily_price = daily_market_price_from_row(row)
        if daily_price is None:
            continue

        normalized_rows.append((row_timestamp, daily_price))

    if not normalized_rows:
        return None, 0

    normalized_rows.sort(key=lambda item: item[0], reverse=True)
    selected_rows = normalized_rows[:ROLLING_WINDOW_ENTRIES]
    daily_prices = [price for _, price in selected_rows]

    if not daily_prices:
        return None, 0

    return sum(daily_prices) / len(daily_prices), len(daily_prices)


def build_price_model(
    item_name: str, item_key: str, supply_price: Any, demand_price: Any
) -> dict[str, Any]:
    supply_numeric = normalize_price(supply_price)
    demand_numeric = normalize_price(demand_price)

    model: dict[str, Any] = {
        "item_name": item_name,
        "item_key": item_key,
        "supply_price": supply_numeric,
        "demand_price": demand_numeric,
        "mid_price": None,
        "spread": None,
        "spread_ratio": None,
        "liquidity_factor": None,
        "adjusted_effective_price": None,
        "has_required_data": supply_numeric is not None and demand_numeric is not None,
    }

    if not model["has_required_data"]:
        return model

    mid_price = (supply_numeric + demand_numeric) / 2
    spread = supply_numeric - demand_numeric
    spread_ratio = spread / mid_price if mid_price > 0 else 0.0
    liquidity_factor = 1 / (1 + spread_ratio)
    adjusted_effective_price = mid_price * liquidity_factor

    model.update(
        {
            "mid_price": mid_price,
            "spread": spread,
            "spread_ratio": spread_ratio,
            "liquidity_factor": liquidity_factor,
            "adjusted_effective_price": adjusted_effective_price,
        }
    )
    return model


def load_market_models(data_dir: Path, world_name: str) -> tuple[dict[str, Any], list[str]]:
    models: dict[str, Any] = {}
    reasons: list[str] = []

    for item_name, item_key in RANKING_MARKET_ITEMS:
        path = get_market_path(data_dir, world_name, item_name)
        if not path.exists():
            reasons.append(f"missing_market_file:{item_key}")
            models[item_key] = build_price_model(item_name, item_key, None, None)
            models[item_key]["rolling_window_price"] = None
            models[item_key]["rolling_window_entries_used"] = 0
            continue

        payload = load_json_file(path)
        entries = extract_market_entries(payload)
        latest_entry = get_latest_market_entry(entries)
        if latest_entry is None:
            reasons.append(f"missing_market_snapshot:{item_key}")
            models[item_key] = build_price_model(item_name, item_key, None, None)
            models[item_key]["rolling_window_price"] = None
            models[item_key]["rolling_window_entries_used"] = 0
            continue

        models[item_key] = build_price_model(
            item_name,
            item_key,
            latest_entry.get("day_average_sell"),
            latest_entry.get("day_average_buy"),
        )
        rolling_window_price, rolling_window_entries_used = rolling_window_market_price(entries)
        models[item_key]["rolling_window_price"] = rolling_window_price
        models[item_key]["rolling_window_entries_used"] = rolling_window_entries_used

        if not models[item_key]["has_required_data"]:
            reasons.append(f"missing_market_prices:{item_key}")

    return models, reasons


def load_recent_history_marks(data_dir: Path, world_name: str) -> tuple[list[dict[str, Any]], list[str]]:
    path = get_history_path(data_dir, world_name)
    if not path.exists():
        return [], ["missing_history_file"]

    payload = load_json_file(path)
    history = payload.get("history", []) if isinstance(payload, dict) else []
    if not isinstance(history, list):
        return [], ["invalid_history_payload"]

    normalized = [item for item in history if isinstance(item, dict)]
    normalized.sort(key=lambda item: str(item.get("date", "")), reverse=True)
    last_five = normalized[:5]

    if len(last_five) < 5:
        return last_five, ["missing_history_days"]

    return last_five, []


def round_score(value: float | None) -> float | None:
    if value is None:
        return None
    return round(value, 6)


def raw_score(value: float | None) -> float | None:
    if value is None:
        return None
    return float(value)


def compute_world_ranking_metrics(world: dict[str, Any], data_dir: Path) -> dict[str, Any]:
    world_name = str(world.get("name", "")).strip()
    market_models, reasons = load_market_models(data_dir, world_name)
    recent_history, history_reasons = load_recent_history_marks(data_dir, world_name)
    reasons.extend(history_reasons)

    current_kills = world.get("last_detected_kills", {})
    current_mark = str(world.get("mark", "")).strip().lower()
    deathstrike = int(current_kills.get("Deathstrike", 0) or 0)
    gnomevil = int(current_kills.get("Gnomevil", 0) or 0)
    abyssador = int(current_kills.get("Abyssador", 0) or 0)
    services_completed = int(
        world.get("last_detected_services", world.get("warzone_services_per_day", 0))
        or 0
    )
    expected_services = max(
        deathstrike,
        gnomevil,
        abyssador,
        services_completed,
        1,
    )

    history_values = [map_mark_value(item.get("mark")) for item in recent_history]
    history_health_score = (
        sum(history_values) / len(history_values) if len(history_values) == 5 else None
    )

    current_operational_score = (
        (
            deathstrike / expected_services
            + gnomevil / expected_services
            + abyssador / expected_services
            + services_completed / expected_services
        )
        / 4
    )

    warzone_health_score = (
        (history_health_score * 0.7) + (current_operational_score * 0.3)
        if history_health_score is not None
        else None
    )

    liquidity_required_keys = {
        "tibia_coin",
        "minor_crystalline_token",
        "gill_necklace",
        "prismatic_necklace",
        "prismatic_ring",
    }

    if any(
        market_models[item_key]["adjusted_effective_price"] is None
        for item_key in liquidity_required_keys
    ):
        reasons.append("missing_adjusted_effective_prices")

    economic_score_raw = None
    wz1_expected_value = None
    wz2_expected_value = None
    wz3_expected_value = None
    service_expected_value = None

    tibia_coin_price = first_positive_number(
        market_models["tibia_coin"]["rolling_window_price"],
        market_models["tibia_coin"]["adjusted_effective_price"],
        market_models["tibia_coin"]["mid_price"],
        market_models["tibia_coin"]["supply_price"],
        market_models["tibia_coin"]["demand_price"],
    )
    gill_necklace_price = first_positive_number(
        market_models["gill_necklace"]["rolling_window_price"],
        market_models["gill_necklace"]["adjusted_effective_price"],
        market_models["gill_necklace"]["mid_price"],
        market_models["gill_necklace"]["supply_price"],
        market_models["gill_necklace"]["demand_price"],
    )
    prismatic_necklace_price = first_positive_number(
        market_models["prismatic_necklace"]["rolling_window_price"],
        market_models["prismatic_necklace"]["adjusted_effective_price"],
        market_models["prismatic_necklace"]["mid_price"],
        market_models["prismatic_necklace"]["supply_price"],
        market_models["prismatic_necklace"]["demand_price"],
    )
    prismatic_ring_price = first_positive_number(
        market_models["prismatic_ring"]["rolling_window_price"],
        market_models["prismatic_ring"]["adjusted_effective_price"],
        market_models["prismatic_ring"]["mid_price"],
        market_models["prismatic_ring"]["supply_price"],
        market_models["prismatic_ring"]["demand_price"],
    )

    if (
        tibia_coin_price is None
        or gill_necklace_price is None
        or prismatic_necklace_price is None
        or prismatic_ring_price is None
    ):
        reasons.append("missing_economic_inputs")
    elif tibia_coin_price <= 0:
        reasons.append("non_positive_economic_denominator")
    else:
        wz1_expected_value = (
            WZ1_FIXED_GOLD
            + (WZ1_GREEN_CRYSTAL_SHARD_VALUE * GREEN_CRYSTAL_SHARD_REWARD_PROBABILITY)
            + gill_necklace_price
        )
        wz2_expected_value = (
            WZ2_FIXED_GOLD + WZ2_BLUE_CRYSTAL_SHARDS_VALUE + prismatic_necklace_price
        )
        wz3_expected_value = (
            WZ3_FIXED_GOLD + WZ3_VIOLET_CRYSTAL_SHARDS_VALUE + prismatic_ring_price
        )
        service_expected_value = (
            wz1_expected_value + wz2_expected_value + wz3_expected_value
        )
        economic_score_raw = service_expected_value / tibia_coin_price

    liquidity_values = [
        market_models[item_key]["liquidity_factor"] for _, item_key in RANKING_MARKET_ITEMS
    ]
    market_liquidity_score = (
        sum(liquidity_values) / len(liquidity_values)
        if all(value is not None for value in liquidity_values)
        else None
    )

    final_score = None
    if economic_score_raw is not None:
        final_score = economic_score_raw

    insufficient_data = any(
        [
            not world_name,
            economic_score_raw is None,
            current_mark == "na",
        ]
    )

    if current_mark == "na":
        reasons.append("excluded_na_world")

    unique_reasons = sorted(set(reasons))

    return {
        "is_ranked": not insufficient_data,
        "insufficient_data": insufficient_data,
        "insufficient_data_reasons": unique_reasons,
        "ranking_position": None,
        "economic_score_raw": raw_score(economic_score_raw),
        "market_liquidity_score": round_score(market_liquidity_score),
        "warzone_health_score": round_score(warzone_health_score),
        "final_score": round_score(final_score),
        "history_health_score": round_score(history_health_score),
        "current_operational_score": round_score(current_operational_score),
        "expected_services": expected_services,
        "rolling_window_entries_target": ROLLING_WINDOW_ENTRIES,
        "wz1_expected_value": raw_score(wz1_expected_value),
        "wz2_expected_value": raw_score(wz2_expected_value),
        "wz3_expected_value": raw_score(wz3_expected_value),
        "service_expected_value": raw_score(service_expected_value),
        "current_mark_value": map_mark_value(world.get("mark")),
        "history_last_five_days": [
            {
                "date": str(item.get("date", "")),
                "mark": item.get("mark"),
                "mark_value": map_mark_value(item.get("mark")),
            }
            for item in recent_history
        ],
        "market": market_models,
    }


def attach_ranking_metrics(
    worlds: list[dict[str, Any]], data_dir: Path
) -> list[dict[str, Any]]:
    enriched_worlds: list[dict[str, Any]] = []

    for world in worlds:
        record = dict(world)
        ranking_metrics = compute_world_ranking_metrics(record, data_dir)
        record["warzone_economic_ranking"] = ranking_metrics
        enriched_worlds.append(record)

    ranked_worlds = [
        world
        for world in enriched_worlds
        if world["warzone_economic_ranking"]["is_ranked"]
    ]

    ranked_worlds.sort(
        key=lambda world: (
            -float(world["warzone_economic_ranking"]["economic_score_raw"]),
            str(world.get("name", "")).lower(),
        )
    )

    for index, world in enumerate(ranked_worlds, start=1):
        world["warzone_economic_ranking"]["ranking_position"] = index

    validate_ranking_metrics(enriched_worlds)
    return enriched_worlds


def validate_ranking_metrics(worlds: list[dict[str, Any]]) -> None:
    ranked_worlds = [
        world
        for world in worlds
        if world.get("warzone_economic_ranking", {}).get("is_ranked")
    ]

    for world in ranked_worlds:
        ranking_metrics = world["warzone_economic_ranking"]
        if ranking_metrics.get("insufficient_data"):
            raise ValueError(f"{world.get('name')}: ranked world marked insufficient")

        market = ranking_metrics["market"]
        recalculated_wz1 = (
            WZ1_FIXED_GOLD
            + (WZ1_GREEN_CRYSTAL_SHARD_VALUE * GREEN_CRYSTAL_SHARD_REWARD_PROBABILITY)
            + float(market["gill_necklace"]["rolling_window_price"])
        )
        recalculated_wz2 = (
            WZ2_FIXED_GOLD
            + WZ2_BLUE_CRYSTAL_SHARDS_VALUE
            + float(market["prismatic_necklace"]["rolling_window_price"])
        )
        recalculated_wz3 = (
            WZ3_FIXED_GOLD
            + WZ3_VIOLET_CRYSTAL_SHARDS_VALUE
            + float(market["prismatic_ring"]["rolling_window_price"])
        )
        recalculated_service_expected_value = (
            recalculated_wz1 + recalculated_wz2 + recalculated_wz3
        )
        recalculated_economic = (
            recalculated_service_expected_value
            / float(market["tibia_coin"]["rolling_window_price"])
        )
        recalculated_liquidity = (
            sum(
                float(market[item_key]["liquidity_factor"])
                for _, item_key in RANKING_MARKET_ITEMS
            )
            / len(RANKING_MARKET_ITEMS)
            if all(market[item_key]["liquidity_factor"] is not None for _, item_key in RANKING_MARKET_ITEMS)
            else None
        )
        recalculated_history = sum(
            float(item["mark_value"]) for item in ranking_metrics["history_last_five_days"]
        ) / 5
        recalculated_health = (
            recalculated_history * 0.7
            + float(ranking_metrics["current_operational_score"]) * 0.3
        )
        recalculated_final = recalculated_economic

        checks = {
            "wz1_expected_value": recalculated_wz1,
            "wz2_expected_value": recalculated_wz2,
            "wz3_expected_value": recalculated_wz3,
            "service_expected_value": recalculated_service_expected_value,
            "economic_score_raw": recalculated_economic,
            "market_liquidity_score": recalculated_liquidity,
            "history_health_score": recalculated_history,
            "warzone_health_score": recalculated_health,
            "final_score": recalculated_final,
        }

        for field, recalculated in checks.items():
            stored = ranking_metrics.get(field)
            if recalculated is None:
                if stored is not None:
                    raise ValueError(f"{world.get('name')}: invalid {field}")
                continue
            tolerance = 1e-9 if field in {
                "wz1_expected_value",
                "wz2_expected_value",
                "wz3_expected_value",
                "service_expected_value",
                "economic_score_raw",
            } else 1e-6
            target = recalculated if tolerance == 1e-9 else round(recalculated, 6)
            if stored is None or abs(float(stored) - target) > tolerance:
                raise ValueError(f"{world.get('name')}: invalid {field}")

    expected_order = sorted(
        ranked_worlds,
        key=lambda world: (
            -float(world["warzone_economic_ranking"]["economic_score_raw"]),
            str(world.get("name", "")).lower(),
        ),
    )

    for index, world in enumerate(expected_order, start=1):
        position = world["warzone_economic_ranking"].get("ranking_position")
        if position != index:
            raise ValueError(f"{world.get('name')}: invalid ranking position {position}")
