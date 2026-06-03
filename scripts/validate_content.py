from __future__ import annotations

import csv
import json
import re
import sys
from dataclasses import dataclass, field
from datetime import date
from pathlib import Path
from typing import Any

REPO_ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = REPO_ROOT / "data"
WORLDS_PATH = DATA_DIR / "worlds.json"
MANUAL_SCHEDULES_PATH = DATA_DIR / "manual-schedules.json"
OPEN_HOUSES_PATH = DATA_DIR / "open-houses.json"
ITEMS_CSV_PATH = DATA_DIR / "market" / "items" / "items.csv"
TRACKED_ITEMS_PATH = DATA_DIR / "market" / "items" / "tracked_items.json"
HISTORY_DIR = DATA_DIR / "history"
MARKET_WORLD_DIR = DATA_DIR / "market" / "world"

ALLOWED_MARKS = {"healthy", "inconclusive", "trolls", "na"}
VALID_WARZONE_ORDERS = {"", "1-2-3", "1-3-2", "2-1-3"}
TIME_PATTERN = re.compile(r"^\d{2}:\d{2}$")
KNOWN_MISSING_MARKET_WORLDS = {"Floribra", "Junera", "Maligna"}
RANKING_MARKET_KEYS = {
    "tibia_coin",
    "minor_crystalline_token",
    "gill_necklace",
    "prismatic_necklace",
    "prismatic_ring",
}
REQUIRED_WORLD_FIELDS = {
    "name",
    "location",
    "pvp_type",
    "transfer_type",
    "battleye_protected",
    "battleye_date",
    "tracks_warzone_service",
    "warzone_services_per_day",
    "timezone",
    "last_detected_kills",
    "last_detected_services",
    "mark",
    "has_service_history",
    "warzone_executions",
    "performs_warzone",
    "warzonesperday",
    "warzone_economic_ranking",
}
REQUIRED_RANKING_FIELDS = {
    "is_ranked",
    "insufficient_data",
    "insufficient_data_reasons",
    "ranking_position",
    "economic_score_raw",
    "market_liquidity_score",
    "warzone_health_score",
    "final_score",
    "history_health_score",
    "current_operational_score",
    "expected_services",
    "rolling_window_entries_target",
    "wz1_expected_value",
    "wz2_expected_value",
    "wz3_expected_value",
    "service_expected_value",
    "current_mark_value",
    "history_last_five_days",
    "market",
}
REQUIRED_PRICE_MODEL_FIELDS = {
    "item_name",
    "item_key",
    "supply_price",
    "demand_price",
    "mid_price",
    "spread",
    "spread_ratio",
    "liquidity_factor",
    "adjusted_effective_price",
    "has_required_data",
    "rolling_window_price",
    "rolling_window_entries_used",
}
REQUIRED_SCHEDULE_FIELDS = {"execution_id", "schedule_time", "warzone_sequence"}
REQUIRED_HISTORY_FIELDS = {
    "date",
    "deathstrike_kills",
    "gnomevil_kills",
    "abyssador_kills",
    "services_completed",
    "mark",
}
REQUIRED_OPEN_HOUSE_FIELDS = {
    "id",
    "houseName",
    "ownerName",
    "world",
    "town",
    "status",
    "utilities",
    "source",
}
REQUIRED_OPEN_HOUSE_UTILITY_FIELDS = {
    "exerciseDummies",
    "rewardShrine",
    "imbuingShrine",
    "mailbox",
    "hirelings",
}
REQUIRED_OPEN_HOUSE_SOURCE_FIELDS = {
    "type",
    "url",
    "submitter",
    "log",
    "notes",
    "screenshotUrl",
    "issueNumber",
    "issueTitle",
}
MARKET_ROW_FIELDS = {
    "id",
    "time",
    "is_full_data",
    "buy_offer",
    "sell_offer",
    "month_average_sell",
    "month_average_buy",
    "month_sold",
    "month_bought",
    "active_traders",
    "month_highest_sell",
    "month_lowest_buy",
    "month_lowest_sell",
    "month_highest_buy",
    "buy_offers",
    "sell_offers",
    "day_average_sell",
    "day_average_buy",
    "day_sold",
    "day_bought",
    "day_highest_sell",
    "day_lowest_sell",
    "day_highest_buy",
    "day_lowest_buy",
    "total_immediate_profit",
    "total_immediate_profit_info",
}


@dataclass
class ValidationReport:
    errors: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)

    def error(self, message: str) -> None:
        self.errors.append(message)

    def warn(self, message: str) -> None:
        self.warnings.append(message)

    @property
    def ok(self) -> bool:
        return not self.errors


def load_json(path: Path) -> Any:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        raise ValueError(f"{path}: invalid JSON: {exc}") from exc


def slugify_world_name(name: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", name.strip().lower()).strip("-")


def is_int(value: Any) -> bool:
    return isinstance(value, int) and not isinstance(value, bool)


def is_number(value: Any) -> bool:
    return (isinstance(value, int) and not isinstance(value, bool)) or isinstance(
        value, float
    )


def is_optional_number(value: Any) -> bool:
    return value is None or is_number(value)


def parse_iso_date(value: str) -> bool:
    try:
        date.fromisoformat(value)
    except ValueError:
        return False
    return True


def validate_schedule_time(
    report: ValidationReport, world_name: str, execution_id: Any, schedule_time: Any
) -> None:
    if not isinstance(schedule_time, str):
        report.error(
            f"manual-schedules.json: {world_name} execution {execution_id} has non-string schedule_time"
        )
        return

    if TIME_PATTERN.fullmatch(schedule_time):
        hour = int(schedule_time[:2])
        minute = int(schedule_time[3:])
        if hour > 23 or minute > 59:
            report.error(
                f"manual-schedules.json: {world_name} execution {execution_id} has invalid time {schedule_time!r}"
            )
        return

    report.error(
        f"manual-schedules.json: {world_name} execution {execution_id} has invalid time {schedule_time!r}"
    )


def validate_schedule_list(
    report: ValidationReport,
    schedules: Any,
    *,
    source_name: str,
    world_name: str,
) -> None:
    if not isinstance(schedules, list):
        report.error(f"{source_name}: {world_name} warzone_executions must be a list")
        return

    seen_times: set[str] = set()

    for index, execution in enumerate(schedules, start=1):
        if not isinstance(execution, dict):
            report.error(f"{source_name}: {world_name} execution #{index} must be an object")
            continue

        missing = REQUIRED_SCHEDULE_FIELDS.difference(execution)
        if missing:
            report.error(
                f"{source_name}: {world_name} execution #{index} missing fields {sorted(missing)}"
            )
            continue

        execution_id = execution.get("execution_id")
        if not is_int(execution_id) or execution_id <= 0:
            report.error(
                f"{source_name}: {world_name} execution #{index} has invalid execution_id {execution_id!r}"
            )

        schedule_time = execution.get("schedule_time")
        validate_schedule_time(report, world_name, execution_id, schedule_time)

        if isinstance(schedule_time, str) and TIME_PATTERN.fullmatch(schedule_time):
            if schedule_time in seen_times:
                report.error(
                    f"{source_name}: {world_name} has duplicate schedule_time {schedule_time!r}"
                )
            seen_times.add(schedule_time)

        warzone_sequence = execution.get("warzone_sequence")
        if not isinstance(warzone_sequence, str):
            report.error(
                f"{source_name}: {world_name} execution {execution_id} has non-string warzone_sequence"
            )
            continue

        if warzone_sequence not in VALID_WARZONE_ORDERS:
            report.error(
                f"{source_name}: {world_name} execution {execution_id} has invalid warzone_sequence {warzone_sequence!r}"
            )
            continue

        if warzone_sequence:
            sequence_parts = warzone_sequence.split("-")
            if len(sequence_parts) != 3 or set(sequence_parts) != {"1", "2", "3"}:
                report.error(
                    f"{source_name}: {world_name} execution {execution_id} has impossible warzone count in {warzone_sequence!r}"
                )


def validate_manual_schedules_payload(
    payload: Any, valid_world_names: set[str]
) -> ValidationReport:
    report = ValidationReport()

    if not isinstance(payload, dict):
        report.error("manual-schedules.json: root value must be an object")
        return report

    for world_name, schedule_data in payload.items():
        if not isinstance(world_name, str) or not world_name.strip():
            report.error("manual-schedules.json: world keys must be non-empty strings")
            continue
        if world_name not in valid_world_names:
            report.error(
                f"manual-schedules.json: unknown world {world_name!r}; use a name from data/worlds.json"
            )
        if not isinstance(schedule_data, dict):
            report.error(f"manual-schedules.json: {world_name} must map to an object")
            continue

        timezone_name = schedule_data.get("timezone")
        if timezone_name is not None and not isinstance(timezone_name, str):
            report.error(f"manual-schedules.json: {world_name} timezone must be a string or null")

        validate_schedule_list(
            report,
            schedule_data.get("warzone_executions"),
            source_name="manual-schedules.json",
            world_name=world_name,
        )

    return report


def read_items_catalog(path: Path) -> tuple[list[dict[str, Any]], ValidationReport]:
    report = ValidationReport()
    rows: list[dict[str, Any]] = []

    try:
        with path.open(encoding="utf-8", newline="") as handle:
            reader = csv.reader(handle)
            for index, row in enumerate(reader, start=1):
                if len(row) < 2:
                    report.error(f"items.csv: row {index} must have at least name and id")
                    continue

                name = ",".join(part.strip() for part in row[:-1]).strip()
                raw_id = str(row[-1]).strip()
                if not name:
                    report.error(f"items.csv: row {index} has empty item name")
                    continue
                if not raw_id.isdigit():
                    report.error(f"items.csv: row {index} has invalid item id {raw_id!r}")
                    continue

                rows.append({"name": name, "id": int(raw_id)})
    except OSError as exc:
        report.error(f"items.csv: failed to read file: {exc}")

    return rows, report


def validate_market_catalog_payload(rows: list[dict[str, Any]]) -> ValidationReport:
    report = ValidationReport()
    seen_ids: dict[int, str] = {}
    seen_names: dict[str, int] = {}

    for row in rows:
        item_name = row["name"]
        item_id = row["id"]

        if item_id in seen_ids:
            report.error(
                f"items.csv: duplicate item id {item_id} used by {seen_ids[item_id]!r} and {item_name!r}"
            )
        else:
            seen_ids[item_id] = item_name

        normalized_name = item_name.casefold()
        if normalized_name in seen_names:
            report.error(f"items.csv: duplicate item name {item_name!r}")
        else:
            seen_names[normalized_name] = item_id

    return report


def extract_tracked_items(payload: Any) -> tuple[list[str] | None, ValidationReport]:
    report = ValidationReport()

    if isinstance(payload, list):
        values = payload
    elif isinstance(payload, dict) and isinstance(payload.get("items"), list):
        values = payload["items"]
    else:
        report.error("tracked_items.json: root must be a list or an object with an 'items' list")
        return None, report

    tracked_items: list[str] = []
    seen: set[str] = set()
    for index, item_name in enumerate(values, start=1):
        if not isinstance(item_name, str) or not item_name.strip():
            report.error(f"tracked_items.json: item #{index} must be a non-empty string")
            continue
        normalized_name = item_name.strip().casefold()
        if normalized_name in seen:
            report.error(f"tracked_items.json: duplicate tracked item {item_name!r}")
            continue
        seen.add(normalized_name)
        tracked_items.append(item_name.strip())

    return tracked_items, report


def validate_tracked_items_payload(
    tracked_items: list[str], catalog_rows: list[dict[str, Any]], market_world_dir: Path
) -> ValidationReport:
    report = ValidationReport()
    catalog_names = {row["name"].casefold(): row for row in catalog_rows}
    market_world_dirs = sorted(path for path in market_world_dir.iterdir() if path.is_dir())

    for item_name in tracked_items:
        if item_name.casefold() not in catalog_names:
            report.error(
                f"tracked_items.json: tracked item {item_name!r} is missing from data/market/items/items.csv"
            )
            continue

        item_slug = re.sub(r"[^a-z0-9]+", "_", item_name.strip().lower()).strip("_")
        for world_dir in market_world_dirs:
            expected_paths = (
                world_dir / f"{world_dir.name}_{item_slug}.json",
                world_dir / f"{world_dir.name.lower()}_{item_slug}.json",
            )
            if not any(path.exists() for path in expected_paths):
                report.warn(
                    f"market coverage: missing market file for item {item_name!r} in world directory {world_dir.name!r}"
                )

    for world_name in sorted(KNOWN_MISSING_MARKET_WORLDS):
        report.warn(
            f"market coverage: skipping expected tracked-item files for known missing market world {world_name!r}"
        )

    return report


def validate_open_houses_payload(payload: Any, valid_world_names: set[str]) -> ValidationReport:
    report = ValidationReport()

    if not isinstance(payload, list):
        report.error("open-houses.json: root value must be a list")
        return report

    seen_house_ids: set[tuple[str, int]] = set()

    for index, record in enumerate(payload, start=1):
        if not isinstance(record, dict):
            report.error(f"open-houses.json: record #{index} must be an object")
            continue

        missing = REQUIRED_OPEN_HOUSE_FIELDS.difference(record)
        if missing:
            report.error(
                f"open-houses.json: record #{index} missing fields {sorted(missing)}"
            )
            continue

        world_name = record.get("world")
        if not isinstance(world_name, str) or not world_name.strip():
            report.error(f"open-houses.json: record #{index} has invalid world")
        elif world_name not in valid_world_names:
            report.error(
                f"open-houses.json: record #{index} references unknown world {world_name!r}"
            )

        for key in ("id", "houseName", "ownerName", "town", "status"):
            if not isinstance(record.get(key), str) or not str(record.get(key)).strip():
                report.error(f"open-houses.json: record #{index} has invalid {key}")

        house_id = record.get("houseId")
        if house_id is not None and not is_int(house_id):
            report.error(f"open-houses.json: record #{index} has non-numeric houseId")
        if is_int(house_id) and isinstance(world_name, str):
            fingerprint = (world_name.casefold(), house_id)
            if fingerprint in seen_house_ids:
                report.error(
                    f"open-houses.json: duplicate houseId {house_id} found for world {world_name!r}"
                )
            else:
                seen_house_ids.add(fingerprint)

        utilities = record.get("utilities")
        if not isinstance(utilities, dict):
            report.error(f"open-houses.json: record #{index} utilities must be an object")
        else:
            missing_utilities = REQUIRED_OPEN_HOUSE_UTILITY_FIELDS.difference(utilities)
            if missing_utilities:
                report.error(
                    f"open-houses.json: record #{index} utilities missing fields {sorted(missing_utilities)}"
                )
            for key in ("exerciseDummies", "rewardShrine", "imbuingShrine", "mailbox"):
                if key in utilities and not isinstance(utilities.get(key), bool):
                    report.error(
                        f"open-houses.json: record #{index} utilities.{key} must be a boolean"
                    )
            hirelings = utilities.get("hirelings")
            if not isinstance(hirelings, list):
                report.error(
                    f"open-houses.json: record #{index} utilities.hirelings must be a list"
                )
            else:
                for hireling_index, hireling in enumerate(hirelings, start=1):
                    if not isinstance(hireling, dict):
                        report.error(
                            f"open-houses.json: record #{index} hireling #{hireling_index} must be an object"
                        )
                        continue
                    if not isinstance(hireling.get("type"), str) or not hireling["type"].strip():
                        report.error(
                            f"open-houses.json: record #{index} hireling #{hireling_index} has invalid type"
                        )
                    abilities = hireling.get("abilities")
                    if not isinstance(abilities, list) or any(
                        not isinstance(entry, str) for entry in abilities
                    ):
                        report.error(
                            f"open-houses.json: record #{index} hireling #{hireling_index} has invalid abilities list"
                        )

        source = record.get("source")
        if not isinstance(source, dict):
            report.error(f"open-houses.json: record #{index} source must be an object")
        else:
            missing_source = REQUIRED_OPEN_HOUSE_SOURCE_FIELDS.difference(source)
            if missing_source:
                report.error(
                    f"open-houses.json: record #{index} source missing fields {sorted(missing_source)}"
                )
            if "issueNumber" in source and not is_int(source.get("issueNumber")):
                report.error(
                    f"open-houses.json: record #{index} source.issueNumber must be numeric"
                )
            for key in ("type", "url", "submitter", "log", "notes", "screenshotUrl", "issueTitle"):
                if key in source and not isinstance(source.get(key), str):
                    report.error(
                        f"open-houses.json: record #{index} source.{key} must be a string"
                    )

        for maybe_date_key in ("lastSeenOpen", "createdAt", "updatedAt"):
            maybe_value = record.get(maybe_date_key)
            if maybe_value is None:
                continue
            if not isinstance(maybe_value, str):
                report.error(
                    f"open-houses.json: record #{index} {maybe_date_key} must be a string if present"
                )
            elif not re.fullmatch(r"\d{4}-\d{2}-\d{2}(?:[T ][^ ]+)?", maybe_value):
                report.error(
                    f"open-houses.json: record #{index} {maybe_date_key} is not in a recognized date format"
                )

    return report


def validate_ranking_market_model(
    report: ValidationReport, world_name: str, item_key: str, payload: Any
) -> None:
    if not isinstance(payload, dict):
        report.error(
            f"worlds.json: {world_name} ranking market {item_key!r} must be an object"
        )
        return

    missing = REQUIRED_PRICE_MODEL_FIELDS.difference(payload)
    if missing:
        report.error(
            f"worlds.json: {world_name} ranking market {item_key!r} missing fields {sorted(missing)}"
        )
        return

    if not isinstance(payload.get("item_name"), str) or not payload["item_name"].strip():
        report.error(
            f"worlds.json: {world_name} ranking market {item_key!r} has invalid item_name"
        )
    if payload.get("item_key") != item_key:
        report.error(
            f"worlds.json: {world_name} ranking market {item_key!r} has mismatched item_key {payload.get('item_key')!r}"
        )
    for field_name in (
        "supply_price",
        "demand_price",
        "mid_price",
        "spread",
        "spread_ratio",
        "liquidity_factor",
        "adjusted_effective_price",
        "rolling_window_price",
    ):
        if not is_optional_number(payload.get(field_name)):
            report.error(
                f"worlds.json: {world_name} ranking market {item_key!r} field {field_name} must be numeric or null"
            )
    if not isinstance(payload.get("has_required_data"), bool):
        report.error(
            f"worlds.json: {world_name} ranking market {item_key!r} has invalid has_required_data"
        )
    if not is_int(payload.get("rolling_window_entries_used")):
        report.error(
            f"worlds.json: {world_name} ranking market {item_key!r} has invalid rolling_window_entries_used"
        )


def validate_worlds_payload(payload: Any) -> ValidationReport:
    report = ValidationReport()

    if not isinstance(payload, list):
        report.error("worlds.json: root value must be a list")
        return report

    seen_names: set[str] = set()
    seen_slugs: set[str] = set()

    for index, world in enumerate(payload, start=1):
        if not isinstance(world, dict):
            report.error(f"worlds.json: record #{index} must be an object")
            continue

        missing = REQUIRED_WORLD_FIELDS.difference(world)
        if missing:
            report.error(f"worlds.json: record #{index} missing fields {sorted(missing)}")
            continue

        world_name = world.get("name")
        if not isinstance(world_name, str) or not world_name.strip():
            report.error(f"worlds.json: record #{index} has invalid name")
            continue

        if world_name in seen_names:
            report.error(f"worlds.json: duplicate world name {world_name!r}")
        else:
            seen_names.add(world_name)

        world_slug = slugify_world_name(world_name)
        if world_slug in seen_slugs:
            report.error(f"worlds.json: duplicate world slug {world_slug!r}")
        else:
            seen_slugs.add(world_slug)

        for field_name in ("location", "pvp_type", "transfer_type", "battleye_date", "mark"):
            if not isinstance(world.get(field_name), str):
                report.error(f"worlds.json: {world_name} field {field_name} must be a string")

        if world.get("mark") not in ALLOWED_MARKS:
            report.error(f"worlds.json: {world_name} has invalid mark {world.get('mark')!r}")

        for field_name in ("battleye_protected", "tracks_warzone_service", "has_service_history", "performs_warzone"):
            if not isinstance(world.get(field_name), bool):
                report.error(f"worlds.json: {world_name} field {field_name} must be a boolean")

        for field_name in ("warzone_services_per_day", "last_detected_services", "warzonesperday"):
            if not is_int(world.get(field_name)):
                report.error(f"worlds.json: {world_name} field {field_name} must be an integer")

        if world.get("timezone") is not None and not isinstance(world.get("timezone"), str):
            report.error(f"worlds.json: {world_name} timezone must be a string or null")

        last_detected_kills = world.get("last_detected_kills")
        if not isinstance(last_detected_kills, dict):
            report.error(f"worlds.json: {world_name} last_detected_kills must be an object")
        else:
            for boss_name in ("Deathstrike", "Gnomevil", "Abyssador"):
                if not is_int(last_detected_kills.get(boss_name)):
                    report.error(
                        f"worlds.json: {world_name} last_detected_kills.{boss_name} must be an integer"
                    )

        validate_schedule_list(
            report,
            world.get("warzone_executions"),
            source_name="worlds.json",
            world_name=world_name,
        )

        ranking = world.get("warzone_economic_ranking")
        if not isinstance(ranking, dict):
            report.error(
                f"worlds.json: {world_name} warzone_economic_ranking must be an object"
            )
            continue

        missing_ranking = REQUIRED_RANKING_FIELDS.difference(ranking)
        if missing_ranking:
            report.error(
                f"worlds.json: {world_name} ranking missing fields {sorted(missing_ranking)}"
            )
            continue

        for field_name in ("is_ranked", "insufficient_data"):
            if not isinstance(ranking.get(field_name), bool):
                report.error(
                    f"worlds.json: {world_name} ranking field {field_name} must be a boolean"
                )

        if ranking.get("ranking_position") is not None and not is_int(ranking.get("ranking_position")):
            report.error(
                f"worlds.json: {world_name} ranking_position must be an integer or null"
            )

        for field_name in (
            "economic_score_raw",
            "market_liquidity_score",
            "warzone_health_score",
            "final_score",
            "history_health_score",
            "current_operational_score",
            "wz1_expected_value",
            "wz2_expected_value",
            "wz3_expected_value",
            "service_expected_value",
            "current_mark_value",
        ):
            if not is_optional_number(ranking.get(field_name)):
                report.error(
                    f"worlds.json: {world_name} ranking field {field_name} must be numeric or null"
                )

        for field_name in ("expected_services", "rolling_window_entries_target"):
            if not is_int(ranking.get(field_name)):
                report.error(
                    f"worlds.json: {world_name} ranking field {field_name} must be an integer"
                )

        reasons = ranking.get("insufficient_data_reasons")
        if not isinstance(reasons, list) or any(not isinstance(item, str) for item in reasons):
            report.error(
                f"worlds.json: {world_name} insufficient_data_reasons must be a list of strings"
            )

        history_last_five_days = ranking.get("history_last_five_days")
        if not isinstance(history_last_five_days, list):
            report.error(
                f"worlds.json: {world_name} history_last_five_days must be a list"
            )
        else:
            for entry_index, entry in enumerate(history_last_five_days, start=1):
                if not isinstance(entry, dict):
                    report.error(
                        f"worlds.json: {world_name} history_last_five_days entry #{entry_index} must be an object"
                    )
                    continue
                for key in ("date", "mark", "mark_value"):
                    if key not in entry:
                        report.error(
                            f"worlds.json: {world_name} history_last_five_days entry #{entry_index} missing {key}"
                        )
                if isinstance(entry.get("date"), str) and not parse_iso_date(entry["date"]):
                    report.error(
                        f"worlds.json: {world_name} history_last_five_days entry #{entry_index} has invalid date {entry['date']!r}"
                    )

        market = ranking.get("market")
        if not isinstance(market, dict):
            report.error(f"worlds.json: {world_name} ranking market must be an object")
        else:
            if set(market) != RANKING_MARKET_KEYS:
                report.error(
                    f"worlds.json: {world_name} ranking market keys must equal {sorted(RANKING_MARKET_KEYS)}"
                )
            for item_key in sorted(RANKING_MARKET_KEYS):
                validate_ranking_market_model(report, world_name, item_key, market.get(item_key))

    return report


def validate_history_files(
    worlds_payload: list[dict[str, Any]], history_dir: Path
) -> ValidationReport:
    report = ValidationReport()
    expected_files = {
        slugify_world_name(world["name"]): world["name"]
        for world in worlds_payload
        if isinstance(world, dict) and isinstance(world.get("name"), str)
    }
    actual_files = {path.stem: path for path in history_dir.glob("*.json")}

    for slug, world_name in sorted(expected_files.items()):
        if slug not in actual_files:
            report.error(f"history: missing history file for world {world_name!r}")

    for slug in sorted(actual_files):
        if slug not in expected_files:
            report.error(f"history: unexpected extra history file {actual_files[slug].name!r}")

    for slug, path in sorted(actual_files.items()):
        try:
            payload = load_json(path)
        except ValueError as exc:
            report.error(str(exc))
            continue

        if not isinstance(payload, dict):
            report.error(f"{path.name}: history file root must be an object")
            continue

        history_items = payload.get("history")
        if not isinstance(history_items, list):
            report.error(f"{path.name}: history must be a list")
            continue

        world_name = expected_files.get(slug, payload.get("world", path.stem))
        previous_date: str | None = None
        for index, item in enumerate(history_items, start=1):
            if not isinstance(item, dict):
                report.error(f"{path.name}: history entry #{index} must be an object")
                continue

            missing = REQUIRED_HISTORY_FIELDS.difference(item)
            if missing:
                report.error(
                    f"{path.name}: history entry #{index} missing fields {sorted(missing)}"
                )
                continue

            item_date = item.get("date")
            if not isinstance(item_date, str) or not parse_iso_date(item_date):
                report.error(f"{path.name}: history entry #{index} has invalid date {item_date!r}")
            if previous_date is not None and isinstance(item_date, str) and item_date > previous_date:
                report.error(f"{path.name}: history entries are not sorted descending by date")
            if isinstance(item_date, str):
                previous_date = item_date

            for key in ("deathstrike_kills", "gnomevil_kills", "abyssador_kills", "services_completed"):
                if not is_int(item.get(key)):
                    report.error(
                        f"{path.name}: history entry #{index} field {key} must be an integer"
                    )
            if item.get("mark") not in ALLOWED_MARKS:
                report.error(
                    f"{path.name}: history entry #{index} has invalid mark {item.get('mark')!r}"
                )

        if payload.get("world") != world_name:
            report.error(
                f"{path.name}: world field {payload.get('world')!r} does not match expected world {world_name!r}"
            )

    return report


def extract_market_rows(payload: Any) -> list[dict[str, Any]] | None:
    if not isinstance(payload, dict):
        return None

    snapshots = payload.get("snapshots")
    if isinstance(snapshots, list):
        if snapshots and isinstance(snapshots[0], list):
            nested_rows = snapshots[0]
            if all(isinstance(row, dict) for row in nested_rows):
                return nested_rows
        if all(isinstance(row, dict) for row in snapshots):
            return snapshots
    return None


def validate_market_history_files(market_world_dir: Path) -> ValidationReport:
    report = ValidationReport()

    if not market_world_dir.exists():
        report.error("market: data/market/world directory is missing")
        return report

    for path in sorted(market_world_dir.glob("*/*.json")):
        try:
            payload = load_json(path)
        except ValueError as exc:
            report.error(str(exc))
            continue

        if not isinstance(payload, dict):
            report.error(f"{path}: market file root must be an object")
            continue

        for key in ("last_run_at", "status", "snapshots"):
            if key not in payload:
                report.error(f"{path}: market file missing field {key!r}")

        if "last_run_at" in payload and not isinstance(payload.get("last_run_at"), str):
            report.error(f"{path}: last_run_at must be a string")
        if "status" in payload and not isinstance(payload.get("status"), str):
            report.error(f"{path}: status must be a string")

        rows = extract_market_rows(payload)
        if rows is None:
            report.error(f"{path}: snapshots must be a list of market row objects")
            continue

        for index, row in enumerate(rows, start=1):
            missing = MARKET_ROW_FIELDS.difference(row)
            if missing:
                report.error(
                    f"{path}: market row #{index} missing fields {sorted(missing)}"
                )
                continue

            if not is_int(row.get("id")):
                report.error(f"{path}: market row #{index} field 'id' must be an integer")
            if not is_number(row.get("time")):
                report.error(f"{path}: market row #{index} field 'time' must be numeric")
            if not isinstance(row.get("is_full_data"), bool):
                report.error(
                    f"{path}: market row #{index} field 'is_full_data' must be a boolean"
                )
            if not isinstance(row.get("total_immediate_profit_info"), str):
                report.error(
                    f"{path}: market row #{index} field 'total_immediate_profit_info' must be a string"
                )

            numeric_fields = MARKET_ROW_FIELDS - {"is_full_data", "total_immediate_profit_info"}
            numeric_fields -= {"id"}
            for field_name in numeric_fields:
                if field_name == "time":
                    continue
                if not is_number(row.get(field_name)):
                    report.error(
                        f"{path}: market row #{index} field {field_name!r} must be numeric"
                    )

    return report


def merge_reports(*reports: ValidationReport) -> ValidationReport:
    merged = ValidationReport()
    for report in reports:
        merged.errors.extend(report.errors)
        merged.warnings.extend(report.warnings)
    merged.errors = list(dict.fromkeys(merged.errors))
    merged.warnings = list(dict.fromkeys(merged.warnings))
    return merged


def print_report(report: ValidationReport) -> None:
    if report.errors:
        print("ERRORS:")
        for message in report.errors:
            print(f"- {message}")
    if report.warnings:
        if report.errors:
            print()
        print("WARNINGS:")
        for message in report.warnings:
            print(f"- {message}")
    if not report.errors and not report.warnings:
        print("Validation passed with no errors or warnings.")


def validate_repository(repo_root: Path = REPO_ROOT) -> ValidationReport:
    initial_report = ValidationReport()

    try:
        worlds_payload = load_json(repo_root / "data" / "worlds.json")
    except ValueError as exc:
        initial_report.error(str(exc))
        return initial_report

    worlds_report = validate_worlds_payload(worlds_payload)
    valid_world_names = {
        world["name"]
        for world in worlds_payload
        if isinstance(world, dict) and isinstance(world.get("name"), str)
    }

    try:
        manual_payload = load_json(repo_root / "data" / "manual-schedules.json")
    except ValueError as exc:
        initial_report.error(str(exc))
        manual_payload = None
    if manual_payload is None:
        manual_report = ValidationReport()
    else:
        manual_report = validate_manual_schedules_payload(manual_payload, valid_world_names)

    try:
        open_houses_payload = load_json(repo_root / "data" / "open-houses.json")
    except ValueError as exc:
        initial_report.error(str(exc))
        open_houses_payload = None
    if open_houses_payload is None:
        open_houses_report = ValidationReport()
    else:
        open_houses_report = validate_open_houses_payload(
            open_houses_payload, valid_world_names
        )

    catalog_rows, catalog_read_report = read_items_catalog(
        repo_root / "data" / "market" / "items" / "items.csv"
    )
    market_catalog_report = validate_market_catalog_payload(catalog_rows)

    try:
        tracked_items_payload = load_json(
            repo_root / "data" / "market" / "items" / "tracked_items.json"
        )
    except ValueError as exc:
        initial_report.error(str(exc))
        tracked_items_payload = None
    if tracked_items_payload is None:
        tracked_items = None
        tracked_read_report = ValidationReport()
    else:
        tracked_items, tracked_read_report = extract_tracked_items(tracked_items_payload)
    if tracked_items is None:
        tracked_items_report = ValidationReport()
    else:
        tracked_items_report = validate_tracked_items_payload(
            tracked_items,
            catalog_rows,
            repo_root / "data" / "market" / "world",
        )

    history_report = validate_history_files(
        worlds_payload, repo_root / "data" / "history"
    )
    market_history_report = validate_market_history_files(
        repo_root / "data" / "market" / "world"
    )

    return merge_reports(
        initial_report,
        worlds_report,
        manual_report,
        open_houses_report,
        catalog_read_report,
        market_catalog_report,
        tracked_read_report,
        tracked_items_report,
        history_report,
        market_history_report,
    )


def main() -> int:
    report = validate_repository()
    print_report(report)
    return 0 if report.ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
