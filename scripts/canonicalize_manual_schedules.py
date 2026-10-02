"""Store manual Warzone schedules in each world's canonical regional timezone.

data/manual-schedules.json is the authoritative manual schedule source. This
script converts any schedule whose timezone differs from its world's canonical
timezone (see ``CANONICAL_TIMEZONE_BY_LOCATION`` in common.py), preserving the
real-world instant on ``--reference-date``, then mirrors the timezone and
executions into data/worlds.json so generated data stays consistent.

The conversion is idempotent: already-canonical schedules are left unchanged.

Usage:
    python3 scripts/canonicalize_manual_schedules.py --reference-date 2026-10-02
"""
from __future__ import annotations

import argparse
import json
from datetime import date
from pathlib import Path
from typing import Any

from common import BASE_DIR, canonicalize_manual_schedule, normalize_manual_schedules_payload

MANUAL_SCHEDULES_PATH = BASE_DIR / "data" / "manual-schedules.json"
WORLDS_PATH = BASE_DIR / "data" / "worlds.json"


def canonicalize_manual_schedules(
    manual: dict[str, Any], locations: dict[str, Any], reference_date: date
) -> dict[str, dict[str, Any]]:
    return normalize_manual_schedules_payload(
        {
            name: canonicalize_manual_schedule(schedule, locations.get(name), reference_date)
            for name, schedule in manual.items()
        }
    )


def sync_worlds_with_manual(worlds: list[Any], manual: dict[str, dict[str, Any]]) -> None:
    for world in worlds:
        schedule = manual.get(world.get("name")) if isinstance(world, dict) else None
        if schedule is None:
            continue
        world["timezone"] = schedule["timezone"]
        world["warzone_executions"] = schedule["warzone_executions"]


def stringify_manual_schedules(payload: dict[str, dict[str, Any]]) -> str:
    """Match the one-execution-per-line layout written by assets/admin.js."""
    lines = ["{"]
    names = list(payload)
    for world_index, name in enumerate(names):
        schedule = payload[name]
        executions = schedule["warzone_executions"]
        lines.append(f"  {json.dumps(name, ensure_ascii=False)}: {{")
        lines.append(f'    "timezone": {json.dumps(schedule["timezone"])},')
        lines.append('    "warzone_executions": [')
        for entry_index, entry in enumerate(executions):
            suffix = "" if entry_index == len(executions) - 1 else ","
            lines.append(
                f'      {{ "execution_id": {entry["execution_id"]}, '
                f'"schedule_time": {json.dumps(entry["schedule_time"])}, '
                f'"warzone_sequence": {json.dumps(entry["warzone_sequence"])} }}{suffix}'
            )
        lines.append("    ]")
        lines.append("  }" + ("" if world_index == len(names) - 1 else ","))
    lines.append("}")
    return "\n".join(lines) + "\n"


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument(
        "--reference-date",
        type=date.fromisoformat,
        required=True,
        help="Date (YYYY-MM-DD) whose UTC offsets define the preserved instant.",
    )
    args = parser.parse_args()

    manual = json.loads(MANUAL_SCHEDULES_PATH.read_text(encoding="utf-8"))
    worlds = json.loads(WORLDS_PATH.read_text(encoding="utf-8"))
    locations = {w.get("name"): w.get("location") for w in worlds if isinstance(w, dict)}

    canonical = canonicalize_manual_schedules(manual, locations, args.reference_date)
    MANUAL_SCHEDULES_PATH.write_text(stringify_manual_schedules(canonical), encoding="utf-8")

    sync_worlds_with_manual(worlds, canonical)
    with WORLDS_PATH.open("w", encoding="utf-8") as file:
        json.dump(worlds, file, ensure_ascii=False, indent=2)
        file.write("\n")


if __name__ == "__main__":
    main()
