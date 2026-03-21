from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any

import requests

BASE_URL = "https://api.tibiadata.com/v4"
ROOT_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT_DIR / "data"
MANUAL_SCHEDULES_FILE = DATA_DIR / "manual-schedules.json"
OUTPUT_FILE = DATA_DIR / "worlds.json"


def fetch_json(url: str) -> dict[str, Any]:
    response = requests.get(url, timeout=30)
    response.raise_for_status()
    return response.json()


def load_manual_schedules() -> dict[str, Any]:
    if MANUAL_SCHEDULES_FILE.exists():
        with MANUAL_SCHEDULES_FILE.open("r", encoding="utf-8") as file:
            return json.load(file)
    return {}


def save_worlds(worlds: list[dict[str, Any]]) -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    with OUTPUT_FILE.open("w", encoding="utf-8") as file:
        json.dump(worlds, file, ensure_ascii=False, indent=2)


def get_worlds() -> list[dict[str, Any]]:
    errors: list[str] = []

    for endpoint in ("worlds", "world"):
        try:
            payload = fetch_json(f"{BASE_URL}/{endpoint}")
            worlds_section = payload.get("worlds", {})
            regular_worlds = worlds_section.get("regular_worlds", [])

            if isinstance(regular_worlds, list):
                return regular_worlds
        except Exception as exc:
            errors.append(f"{endpoint}: {exc}")

    raise RuntimeError("Falha ao buscar lista de servidores. " + " | ".join(errors))


def get_kill_statistics(world_name: str) -> dict[str, Any]:
    return fetch_json(f"{BASE_URL}/killstatistics/{world_name}")


def to_int(value: Any) -> int:
    if isinstance(value, int):
        return value
    if isinstance(value, str):
        digits = "".join(ch for ch in value if ch.isdigit())
        if digits:
            return int(digits)
    return 0


def extract_abyssador_kills(payload: dict[str, Any]) -> int:
    killstatistics = payload.get("killstatistics", {})
    entries = killstatistics.get("entries", [])

    if not isinstance(entries, list):
        return 0

    for entry in entries:
        if not isinstance(entry, dict):
            continue

        if entry.get("race") == "Abyssador":
            return to_int(entry.get("last_day_killed", 0))

    return 0


def build_world_record(
    world: dict[str, Any],
    manual_schedules: dict[str, Any],
) -> dict[str, Any]:
    world_name = str(world.get("name", "")).strip()

    kill_statistics = get_kill_statistics(world_name)
    abyssador_kills = extract_abyssador_kills(kill_statistics)

    manual_entry = manual_schedules.get(world_name, {})
    timezone = manual_entry.get("timezone")
    warzone_executions = manual_entry.get("warzone_executions", [])

    return {
        "name": world_name,
        "status": world.get("status"),
        "location": world.get("location"),
        "pvp_type": world.get("pvp_type"),
        "performs_warzone": abyssador_kills > 0,
        "warzonesperday": abyssador_kills,
        "warzone_executions": warzone_executions,
        "timezone": timezone,
    }


def validate_world_record(record: dict[str, Any]) -> list[str]:
    errors: list[str] = []

    if not isinstance(record.get("name"), str) or not record["name"].strip():
        errors.append("name inválido")

    if not isinstance(record.get("performs_warzone"), bool):
        errors.append("performs_warzone inválido")

    if not isinstance(record.get("warzonesperday"), int):
        errors.append("warzonesperday inválido")

    executions = record.get("warzone_executions")
    if not isinstance(executions, list):
        errors.append("warzone_executions inválido")
        return errors

    for index, execution in enumerate(executions, start=1):
        if not isinstance(execution, dict):
            errors.append(f"warzone_executions[{index}] inválido")
            continue

        if not isinstance(execution.get("execution_id"), int):
            errors.append(f"execution_id inválido em warzone_executions[{index}]")

        schedule_time = execution.get("schedule_time")
        if not isinstance(schedule_time, str) or len(schedule_time) != 5 or schedule_time[2] != ":":
            errors.append(f"schedule_time inválido em warzone_executions[{index}]")

        if not isinstance(execution.get("warzone_sequence"), str):
            errors.append(f"warzone_sequence inválido em warzone_executions[{index}]")

    return errors


def validate_worlds(worlds: list[dict[str, Any]]) -> None:
    all_errors: list[str] = []

    for world in worlds:
        errors = validate_world_record(world)
        if errors:
            all_errors.append(f"Servidor {world.get('name', '<sem nome>')}:")
            all_errors.extend(f"  - {error}" for error in errors)

    if all_errors:
        raise ValueError("\n".join(all_errors))


def main() -> int:
    manual_schedules = load_manual_schedules()
    worlds = get_worlds()

    if not worlds:
        print("Nenhum servidor retornado pela API.")
        return 1

    output: list[dict[str, Any]] = []

    for world in worlds:
        world_name = str(world.get("name", "")).strip()

        try:
            record = build_world_record(world, manual_schedules)
            output.append(record)
            print(f"OK   {world_name}")
        except Exception as exc:
            print(f"ERRO {world_name}: {exc}", file=sys.stderr)
            output.append({
                "name": world_name,
                "status": world.get("status"),
                "location": world.get("location"),
                "pvp_type": world.get("pvp_type"),
                "performs_warzone": False,
                "warzonesperday": 0,
                "warzone_executions": [],
                "timezone": None,
                "error": str(exc),
            })

    output.sort(key=lambda item: str(item.get("name", "")).lower())

    validate_worlds(output)
    save_worlds(output)

    active_worlds = sum(1 for world in output if world["performs_warzone"])

    print()
    print(f"Total de servidores processados: {len(output)}")
    print(f"Servidores com Warzone detectada: {active_worlds}")
    print(f"Arquivo gerado: {OUTPUT_FILE}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())