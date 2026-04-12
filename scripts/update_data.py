from __future__ import annotations

import json
import re
import sys
from datetime import datetime
from pathlib import Path
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import urlopen

from economic_ranking import attach_ranking_metrics

BASE_URL = "https://api.tibiadata.com/v4"
BOSSES = ("Deathstrike", "Gnomevil", "Abyssador")

ROOT_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT_DIR / "data"
OUTPUT_FILE = DATA_DIR / "worlds.json"
MANUAL_SCHEDULE_FILE = DATA_DIR / "manual-schedules.json"
HISTORY_DIR = DATA_DIR / "history"


def fetch_json(url: str) -> dict[str, Any]:
    try:
        with urlopen(url, timeout=30) as response:
            return json.load(response)
    except HTTPError as exc:
        raise RuntimeError(f"HTTP {exc.code} for {url}") from exc
    except URLError as exc:
        raise RuntimeError(f"Network error for {url}: {exc.reason}") from exc


def save_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as file:
        json.dump(payload, file, ensure_ascii=False, indent=2)


def get_worlds() -> list[dict[str, Any]]:
    payload = fetch_json(f"{BASE_URL}/worlds")
    worlds_section = payload.get("worlds", {})
    regular_worlds = worlds_section.get("regular_worlds", [])

    if isinstance(regular_worlds, list):
        return regular_worlds

    raise RuntimeError("Falha ao buscar lista de servidores.")


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


def extract_boss_kills(payload: dict[str, Any]) -> dict[str, int]:
    killstatistics = payload.get("killstatistics", {})
    entries = killstatistics.get("entries", [])
    kills = {boss: 0 for boss in BOSSES}

    if not isinstance(entries, list):
        return kills

    for entry in entries:
        if not isinstance(entry, dict):
            continue

        race = str(entry.get("race", "")).strip()
        if race in kills:
            kills[race] = to_int(entry.get("last_day_killed", 0))

    return kills


def compute_services_and_mark(
    deathstrike: int, gnomevil: int, abyssador: int
) -> dict[str, Any]:
    services_completed = min(deathstrike, gnomevil, abyssador)

    if deathstrike == 0 and gnomevil == 0 and abyssador == 0:
        mark = "na"
    elif deathstrike == gnomevil == abyssador:
        mark = "healthy"
    elif (
        (deathstrike == gnomevil and abyssador < deathstrike)
        or (deathstrike == abyssador and gnomevil < deathstrike)
        or (gnomevil == abyssador and deathstrike < gnomevil)
    ):
        mark = "trolls"
    else:
        mark = "inconclusive"

    return {
        "services_completed": services_completed,
        "mark": mark,
    }


def history_slug(world_name: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", world_name.strip().lower()).strip("-")
    return slug or "unknown-world"


def history_path(world_name: str) -> Path:
    return HISTORY_DIR / f"{history_slug(world_name)}.json"


def load_manual_schedules() -> dict[str, dict[str, Any]]:
    if not MANUAL_SCHEDULE_FILE.exists():
        return {}

    with MANUAL_SCHEDULE_FILE.open("r", encoding="utf-8") as file:
        payload = json.load(file)

    if not isinstance(payload, dict):
        return {}

    normalized: dict[str, dict[str, Any]] = {}

    for world_name, schedule_data in payload.items():
        if not isinstance(schedule_data, dict):
            continue

        executions = schedule_data.get("warzone_executions", [])
        fixed_executions: list[dict[str, Any]] = []

        if isinstance(executions, list):
            for index, execution in enumerate(executions, start=1):
                if not isinstance(execution, dict):
                    continue

                fixed_executions.append(
                    {
                        "execution_id": index,
                        "schedule_time": str(execution.get("schedule_time", "")).strip(),
                        "warzone_sequence": str(
                            execution.get("warzone_sequence", "")
                        ).strip(),
                    }
                )

        timezone_name = schedule_data.get("timezone")
        normalized[str(world_name).strip()] = {
            "timezone": timezone_name if isinstance(timezone_name, str) else None,
            "warzone_executions": fixed_executions,
        }

    return normalized


def load_world_history(world_name: str, timezone_name: str | None) -> dict[str, Any]:
    path = history_path(world_name)

    if path.exists():
        with path.open("r", encoding="utf-8") as file:
            payload = json.load(file)

        if isinstance(payload, dict):
            history_items = payload.get("history", [])
            return {
                "world": payload.get("world") or world_name,
                "timezone": payload.get("timezone") or timezone_name,
                "history": history_items if isinstance(history_items, list) else [],
            }

    return {
        "world": world_name,
        "timezone": timezone_name,
        "history": [],
    }


def update_world_history(
    world_name: str, timezone_name: str | None, daily_record: dict[str, Any]
) -> dict[str, Any]:
    history_data = load_world_history(world_name, timezone_name)
    history = [
        item
        for item in history_data["history"]
        if isinstance(item, dict) and item.get("date") != daily_record["date"]
    ]
    history.append(daily_record)
    history.sort(key=lambda item: str(item.get("date", "")), reverse=True)

    history_data["world"] = world_name
    history_data["timezone"] = timezone_name
    history_data["history"] = history
    return history_data


def save_world_history(world_name: str, history_data: dict[str, Any]) -> None:
    save_json(history_path(world_name), history_data)


def has_service_history(history_data: dict[str, Any]) -> bool:
    history_items = history_data.get("history", [])
    if not isinstance(history_items, list):
        return False

    return any(
        isinstance(item, dict) and int(item.get("services_completed", 0) or 0) > 0
        for item in history_items
    )


def build_daily_record(
    date_value: str, boss_kills: dict[str, int], computed_data: dict[str, Any]
) -> dict[str, Any]:
    return {
        "date": date_value,
        "deathstrike_kills": boss_kills["Deathstrike"],
        "gnomevil_kills": boss_kills["Gnomevil"],
        "abyssador_kills": boss_kills["Abyssador"],
        "services_completed": computed_data["services_completed"],
        "mark": computed_data["mark"],
    }


def build_world_summary(
    world: dict[str, Any],
    manual_schedule: dict[str, Any],
    boss_kills: dict[str, int],
    computed_data: dict[str, Any],
    has_service_history_value: bool,
) -> dict[str, Any]:
    services_completed = computed_data["services_completed"]
    tracks_warzone_service = any(count > 0 for count in boss_kills.values())

    return {
        "name": str(world.get("name", "")).strip(),
        "location": world.get("location"),
        "pvp_type": world.get("pvp_type"),
        "transfer_type": world.get("transfer_type"),
        "battleye_protected": world.get("battleye_protected"),
        "battleye_date": world.get("battleye_date"),
        "tracks_warzone_service": tracks_warzone_service,
        "warzone_services_per_day": services_completed,
        "timezone": manual_schedule.get("timezone"),
        "last_detected_kills": boss_kills,
        "last_detected_services": services_completed,
        "mark": computed_data["mark"],
        "has_service_history": has_service_history_value,
        "warzone_executions": manual_schedule.get("warzone_executions", []),
        "performs_warzone": tracks_warzone_service,
        "warzonesperday": services_completed,
    }


def validate_world_record(record: dict[str, Any]) -> list[str]:
    errors: list[str] = []

    if not isinstance(record.get("name"), str) or not record["name"].strip():
        errors.append("name inválido")

    if not isinstance(record.get("tracks_warzone_service"), bool):
        errors.append("tracks_warzone_service inválido")

    if not isinstance(record.get("warzone_services_per_day"), int):
        errors.append("warzone_services_per_day inválido")

    if record.get("mark") not in {"healthy", "inconclusive", "trolls", "na"}:
        errors.append("mark inválido")

    if not isinstance(record.get("has_service_history"), bool):
        errors.append("has_service_history inválido")

    last_detected_kills = record.get("last_detected_kills")
    if not isinstance(last_detected_kills, dict):
        errors.append("last_detected_kills inválido")
    else:
        for boss in BOSSES:
            if not isinstance(last_detected_kills.get(boss), int):
                errors.append(f"kill count inválido para {boss}")

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
        if (
            not isinstance(schedule_time, str)
            or len(schedule_time) != 5
            or schedule_time[2] != ":"
        ):
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


def today_iso_date() -> str:
    return datetime.now().date().isoformat()


def main() -> int:
    worlds = get_worlds()

    if not worlds:
        print("Nenhum servidor retornado pela API.")
        return 1

    manual_schedules = load_manual_schedules()
    output: list[dict[str, Any]] = []
    current_date = today_iso_date()

    for world in worlds:
        world_name = str(world.get("name", "")).strip()
        manual_schedule = manual_schedules.get(
            world_name, {"timezone": None, "warzone_executions": []}
        )

        try:
            kill_statistics = get_kill_statistics(world_name)
            boss_kills = extract_boss_kills(kill_statistics)
            computed_data = compute_services_and_mark(
                boss_kills["Deathstrike"],
                boss_kills["Gnomevil"],
                boss_kills["Abyssador"],
            )
            daily_record = build_daily_record(current_date, boss_kills, computed_data)
            history_data = update_world_history(
                world_name,
                manual_schedule.get("timezone"),
                daily_record,
            )
            save_world_history(world_name, history_data)
            record = build_world_summary(
                world,
                manual_schedule,
                boss_kills,
                computed_data,
                has_service_history(history_data),
            )
            output.append(record)
            print(
                "OK   "
                f"{world_name} "
                f"DS={boss_kills['Deathstrike']} "
                f"GV={boss_kills['Gnomevil']} "
                f"AB={boss_kills['Abyssador']} "
                f"SVC={computed_data['services_completed']} "
                f"MARK={computed_data['mark']}"
            )
        except Exception as exc:
            print(f"ERRO {world_name}: {exc}", file=sys.stderr)
            output.append(
                {
                    "name": world_name,
                    "location": world.get("location"),
                    "pvp_type": world.get("pvp_type"),
                    "transfer_type": world.get("transfer_type"),
                    "battleye_protected": world.get("battleye_protected"),
                    "battleye_date": world.get("battleye_date"),
                    "tracks_warzone_service": False,
                    "warzone_services_per_day": 0,
                    "timezone": manual_schedule.get("timezone"),
                    "last_detected_kills": {boss: 0 for boss in BOSSES},
                    "last_detected_services": 0,
                    "mark": "na",
                    "has_service_history": has_service_history(
                        load_world_history(world_name, manual_schedule.get("timezone"))
                    ),
                    "warzone_executions": manual_schedule.get(
                        "warzone_executions", []
                    ),
                    "performs_warzone": False,
                    "warzonesperday": 0,
                    "error": str(exc),
                }
            )

    output.sort(key=lambda item: str(item.get("name", "")).lower())
    output = attach_ranking_metrics(output, DATA_DIR)
    validate_worlds(output)
    save_json(OUTPUT_FILE, output)

    tracked_worlds = sum(1 for world in output if world["tracks_warzone_service"])

    print()
    print(f"Total de servidores processados: {len(output)}")
    print(f"Servidores com atividade detectada: {tracked_worlds}")
    print(f"Arquivo gerado: {OUTPUT_FILE}")
    print(f"Histórico salvo em: {HISTORY_DIR}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
