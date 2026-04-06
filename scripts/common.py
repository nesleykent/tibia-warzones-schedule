from __future__ import annotations

import csv
import json
from pathlib import Path
from typing import Any

BASE_DIR = Path(__file__).resolve().parent.parent

RAW_WORLD_DIR = BASE_DIR / "data" / "market" / "world"
ITEMS_CSV = BASE_DIR / "data" / "market" / "items" / "items.csv"
TRACKED_ITEMS_JSON_CANDIDATES = [
    BASE_DIR / "data" / "market" / "items" / "tracked_items.json",
    BASE_DIR / "tracked_items.json",
]


def slugify(value: str) -> str:
    return value.strip().lower().replace(" ", "_")


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