from __future__ import annotations

import csv
import json
import re
from pathlib import Path
from typing import Any

BASE_DIR = Path(__file__).resolve().parent.parent
LOGS_DIR = BASE_DIR / "logs"

RAW_WORLD_DIR = BASE_DIR / "data" / "market" / "world"
ITEMS_CSV = BASE_DIR / "data" / "market" / "items" / "items.csv"
TRACKED_ITEMS_JSON_CANDIDATES = [
    BASE_DIR / "data" / "market" / "items" / "tracked_items.json",
    BASE_DIR / "tracked_items.json",
]
KNOWN_TIME_PATTERN = re.compile(r"^\d{2}:\d{2}$")
UNKNOWN_SCHEDULE_PLACEHOLDER = "??:00"


def slugify(value: str) -> str:
    return value.strip().lower().replace(" ", "_")


def normalize_sort_text(value: Any) -> str:
    return " ".join(str(value or "").strip().split()).casefold()


def is_known_schedule_time(value: Any) -> bool:
    if not isinstance(value, str) or not KNOWN_TIME_PATTERN.fullmatch(value):
        return False

    hour = int(value[:2])
    minute = int(value[3:])
    return hour <= 23 and minute <= 59


def is_unknown_friendly_schedule_time(value: Any) -> bool:
    return isinstance(value, str) and value.strip() == UNKNOWN_SCHEDULE_PLACEHOLDER


def schedule_time_sort_key(value: Any) -> tuple[int, int, int, str]:
    if is_known_schedule_time(value):
        return (0, int(value[:2]), int(value[3:]), str(value))

    return (1, 99, 99, str(value or "").strip().casefold())


def normalize_schedule_executions(executions: Any) -> list[dict[str, Any]]:
    normalized: list[dict[str, Any]] = []

    if not isinstance(executions, list):
        return normalized

    for execution in executions:
        if not isinstance(execution, dict):
            continue

        row = dict(execution)
        row["schedule_time"] = str(execution.get("schedule_time", "")).strip()
        row["warzone_sequence"] = str(execution.get("warzone_sequence", "")).strip()
        normalized.append(row)

    normalized.sort(
        key=lambda entry: (
            schedule_time_sort_key(entry.get("schedule_time")),
            int(entry.get("execution_id") or 0),
        )
    )

    for index, execution in enumerate(normalized, start=1):
        execution["execution_id"] = index

    return normalized


def normalize_manual_schedule_payload(schedule_data: Any) -> dict[str, Any]:
    if not isinstance(schedule_data, dict):
        return {"timezone": None, "warzone_executions": []}

    normalized = dict(schedule_data)
    timezone_name = schedule_data.get("timezone")
    normalized["timezone"] = timezone_name if isinstance(timezone_name, str) else None
    normalized["warzone_executions"] = normalize_schedule_executions(
        schedule_data.get("warzone_executions")
    )
    return normalized


def normalize_manual_schedules_payload(payload: Any) -> dict[str, dict[str, Any]]:
    if not isinstance(payload, dict):
        return {}

    normalized: dict[str, dict[str, Any]] = {}
    for world_name, schedule_data in sorted(
        payload.items(), key=lambda item: normalize_sort_text(item[0])
    ):
        normalized[str(world_name).strip()] = normalize_manual_schedule_payload(schedule_data)
    return normalized


def normalize_world_record(world: Any) -> Any:
    if not isinstance(world, dict):
        return world

    normalized = dict(world)
    normalized["warzone_executions"] = normalize_schedule_executions(
        world.get("warzone_executions")
    )
    return normalized


def normalize_worlds_payload(payload: Any) -> list[Any]:
    if not isinstance(payload, list):
        return []

    normalized = [normalize_world_record(world) for world in payload]
    normalized.sort(
        key=lambda world: normalize_sort_text(world.get("name")) if isinstance(world, dict) else ""
    )
    return normalized


def normalize_open_house_record(record: Any) -> Any:
    return dict(record) if isinstance(record, dict) else record


def normalize_open_houses_payload(payload: Any) -> list[Any]:
    if not isinstance(payload, list):
        return []

    normalized = [normalize_open_house_record(record) for record in payload]
    normalized.sort(
        key=lambda record: (
            normalize_sort_text(record.get("world")) if isinstance(record, dict) else "",
            normalize_sort_text(record.get("town")) if isinstance(record, dict) else "",
            normalize_sort_text(record.get("houseName")) if isinstance(record, dict) else "",
        )
    )
    return normalized


def _first_existing_path(paths: list[Path]) -> Path | None:
    for path in paths:
        if path.exists():
            return path
    return None


def _normalize_tracked_item_names(payload: Any) -> set[str]:
    if isinstance(payload, list):
        names = set()
        for item in payload:
            if isinstance(item, str):
                value = item.strip()
                if value:
                    names.add(value)
            elif isinstance(item, dict):
                for key in ("name", "item_name", "title"):
                    value = item.get(key)
                    if isinstance(value, str) and value.strip():
                        names.add(value.strip())
                        break
        return names

    if isinstance(payload, dict):
        for key in ("items", "tracked_items", "names"):
            value = payload.get(key)
            if value is not None:
                return _normalize_tracked_item_names(value)

    return set()


def _load_tracked_item_names() -> set[str] | None:
    tracked_path = _first_existing_path(TRACKED_ITEMS_JSON_CANDIDATES)
    if tracked_path is None:
        return None

    payload = json.loads(tracked_path.read_text(encoding="utf-8"))
    normalized = _normalize_tracked_item_names(payload)
    return normalized or None


def _pick_first(row: dict[str, Any], keys: tuple[str, ...]) -> Any:
    for key in keys:
        value = row.get(key)
        if value not in (None, ""):
            return value
    return None


def discover_tracked_items() -> list[dict[str, Any]]:
    tracked_names = _load_tracked_item_names()

    with ITEMS_CSV.open(encoding="utf-8", newline="") as handle:
        sample = handle.read(4096)
        handle.seek(0)

        has_header = csv.Sniffer().has_header(sample)
        if has_header:
            reader = csv.DictReader(handle)
            rows = list(reader)

            items: list[dict[str, Any]] = []
            for row in rows:
                raw_name = _pick_first(row, ("name", "item_name", "title", "item"))
                if raw_name is None:
                    continue

                name = str(raw_name).strip()
                if not name:
                    continue
                if tracked_names is not None and name not in tracked_names:
                    continue

                raw_id = _pick_first(row, ("id", "item_id"))
                if raw_id in (None, ""):
                    continue

                items.append(
                    {
                        "id": int(raw_id),
                        "name": name,
                        "slug": slugify(name),
                    }
                )

            return items

        reader = csv.reader(handle)
        items: list[dict[str, Any]] = []
        for row in reader:
            if len(row) < 2:
                continue

            name = str(row[0]).strip()
            raw_id = str(row[1]).strip()

            if not name or not raw_id:
                continue
            if tracked_names is not None and name not in tracked_names:
                continue

            items.append(
                {
                    "id": int(raw_id),
                    "name": name,
                    "slug": slugify(name),
                }
            )

        return items


def get_tracked_worlds() -> list[str]:
    if not RAW_WORLD_DIR.exists():
        return []

    return sorted(path.name for path in RAW_WORLD_DIR.iterdir() if path.is_dir())
