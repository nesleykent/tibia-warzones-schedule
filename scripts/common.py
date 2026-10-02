from __future__ import annotations

import csv
import json
import re
from datetime import date, datetime
from pathlib import Path
from typing import Any
from zoneinfo import ZoneInfo

BASE_DIR = Path(__file__).resolve().parent.parent
LOGS_DIR = BASE_DIR / "logs"

RAW_WORLD_DIR = BASE_DIR / "data" / "market" / "world"
WORLDS_JSON = BASE_DIR / "data" / "worlds.json"
ITEMS_CSV = BASE_DIR / "data" / "market" / "items" / "items.csv"
TRACKED_ITEMS_JSON_CANDIDATES = [
    BASE_DIR / "data" / "market" / "items" / "tracked_items.json",
    BASE_DIR / "tracked_items.json",
]
KNOWN_TIME_PATTERN = re.compile(r"^\d{2}:\d{2}$")
UNKNOWN_SCHEDULE_PLACEHOLDER = "??:00"

# Canonical schedule timezone per world location. data/schedule-timezones.json
# is the single source of truth, read here and by assets/admin.js. schedule_time
# values are wall-clock times in the schedule's timezone, so a European world
# stored in Europe/Berlin keeps a fixed local time while CET/CEST shifts other
# displays. Locations without an entry keep whatever timezone was entered.
SCHEDULE_TIMEZONES_JSON = BASE_DIR / "data" / "schedule-timezones.json"


def load_canonical_timezones(path: Path = SCHEDULE_TIMEZONES_JSON) -> dict[str, str]:
    payload = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(payload, dict) or not all(
        isinstance(k, str) and isinstance(v, str) for k, v in payload.items()
    ):
        raise ValueError(f"{path.name} must map location names to IANA timezone names")
    return payload


CANONICAL_TIMEZONE_BY_LOCATION = load_canonical_timezones()


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


# Market data provenance. TibiaMarket is the only source persisted to
# repository data. Tibinance is a transient, browser-only Tibia Coin fallback
# (assets/shared.js) and must never be written here: Tibinance consumes
# Warzones data, so persisting its values would create circular provenance.
PERSISTED_MARKET_SOURCE = "tibiamarket"
# "effective_tibia_coin" marks runtime-ranking records built in the browser
# (assets/shared.js buildRuntimeRanking); they must never be persisted either.
TRANSIENT_MARKET_SOURCE_MARKERS = ("tibinance", "effective_tibia_coin")


class TransientMarketDataError(ValueError):
    """Raised when a payload about to be persisted carries transient provenance."""


def find_transient_market_marker(payload: Any, path: str = "$") -> str | None:
    """Return the JSON path of the first transient (Tibinance) marker, if any."""
    if isinstance(payload, str):
        lowered = payload.casefold()
        return path if any(m in lowered for m in TRANSIENT_MARKET_SOURCE_MARKERS) else None
    if isinstance(payload, dict):
        for key, value in payload.items():
            found = find_transient_market_marker(str(key), f"{path}.{key}") or (
                find_transient_market_marker(value, f"{path}.{key}")
            )
            if found:
                return found
    elif isinstance(payload, (list, tuple)):
        for index, value in enumerate(payload):
            found = find_transient_market_marker(value, f"{path}[{index}]")
            if found:
                return found
    return None


def assert_persistable_market_payload(payload: Any, label: str) -> None:
    """Guard every repository data write against transient fallback values."""
    found = find_transient_market_marker(payload)
    if found:
        raise TransientMarketDataError(
            f"Refusing to persist {label}: transient Tibinance market data at {found}"
        )


def resolve_timezone_name(timezone_name: str) -> str:
    """Strip display variants such as ``America/Sao_Paulo#Curitiba`` to an IANA name."""
    return str(timezone_name).split("#", 1)[0].strip()


def canonical_timezone_for_location(location: Any) -> str | None:
    return CANONICAL_TIMEZONE_BY_LOCATION.get(str(location or "").strip())


def convert_schedule_time(
    schedule_time: str, source_timezone: str, target_timezone: str, reference_date: date
) -> str:
    """Convert an HH:MM wall-clock time between timezones on ``reference_date``.

    The reference date is required because UTC offsets depend on DST. Unknown
    placeholders such as ``??:00`` are returned unchanged.
    """
    if not is_known_schedule_time(schedule_time):
        return schedule_time
    source = ZoneInfo(resolve_timezone_name(source_timezone))
    target = ZoneInfo(resolve_timezone_name(target_timezone))
    if source.key == target.key:
        return schedule_time
    local = datetime(
        reference_date.year,
        reference_date.month,
        reference_date.day,
        int(schedule_time[:2]),
        int(schedule_time[3:]),
        tzinfo=source,
    )
    # Round-trip through UTC so nonexistent wall times (spring-forward gaps)
    # resolve to the real instant instead of an impossible local time.
    instant = local.astimezone(ZoneInfo("UTC"))
    return instant.astimezone(target).strftime("%H:%M")


def canonicalize_manual_schedule(
    schedule_data: dict[str, Any], location: Any, reference_date: date
) -> dict[str, Any]:
    """Return the schedule stored in its world's canonical timezone.

    Idempotent: schedules already in the canonical timezone (or in a location
    with no canonical timezone) are returned unchanged, so conversion is never
    applied twice.
    """
    normalized = normalize_manual_schedule_payload(schedule_data)
    canonical = canonical_timezone_for_location(location)
    current = normalized.get("timezone")
    if canonical is None or current == canonical:
        return normalized
    if current:
        normalized["warzone_executions"] = normalize_schedule_executions(
            [
                {
                    **execution,
                    "schedule_time": convert_schedule_time(
                        execution["schedule_time"], current, canonical, reference_date
                    ),
                }
                for execution in normalized["warzone_executions"]
            ]
        )
    normalized["timezone"] = canonical
    return normalized


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
    try:
        payload = json.loads(WORLDS_JSON.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        payload = None

    if isinstance(payload, list):
        names: list[str] = []
        seen: set[str] = set()
        for world in payload:
            if not isinstance(world, dict):
                continue
            name = str(world.get("name", "")).strip()
            if not name:
                continue
            key = normalize_sort_text(name)
            if key in seen:
                continue
            seen.add(key)
            names.append(name)

        if names:
            return sorted(names, key=normalize_sort_text)

    if not RAW_WORLD_DIR.exists():
        return []

    return sorted(
        (path.name for path in RAW_WORLD_DIR.iterdir() if path.is_dir()),
        key=normalize_sort_text,
    )
