from __future__ import annotations

import argparse
import json
import os
import re
import sys
from dataclasses import dataclass
from datetime import datetime, timezone
from difflib import SequenceMatcher
from pathlib import Path
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import quote
from urllib.request import Request, urlopen

ROOT_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT_DIR / "data"
OPEN_HOUSES_PATH = DATA_DIR / "open-houses.json"
HOUSES_INDEX_PATH = DATA_DIR / "houses-index.json"

TIBIADATA_BASE_URL = os.environ.get("TIBIADATA_BASE_URL", "https://api.tibiadata.com").rstrip("/")
GITHUB_API_BASE_URL = os.environ.get("GITHUB_API_BASE_URL", "https://api.github.com").rstrip("/")
GITHUB_REPOSITORY = os.environ.get(
    "OPEN_HOUSE_GITHUB_REPOSITORY",
    os.environ.get("GITHUB_REPOSITORY", "nesleykent/tibia-warzones-schedule"),
)
GITHUB_TOKEN = os.environ.get("OPEN_HOUSE_GITHUB_TOKEN") or os.environ.get("GITHUB_TOKEN")

OPEN_DOOR_REGEX = re.compile(
    r"^You see an open door\. It belongs to house '([^']+)'\. (.+?) owns this house\.$"
)

HIRELING_ABILITIES = {
    "Apprentice": ["Sells basic furniture"],
    "Banker": ["Deposit", "Withdraw", "Transfer"],
    "Cook": ["Cook random buff food for a fee"],
    "Steward": ["Provides access to Your Supply Stash"],
    "Trader": [
        "Trader",
        "Post clerk",
        "Buys and sells standard goods such as runes, potions, and tools",
    ],
}

ISSUE_FIELD_LABELS = {
    "door inspection log": "door_inspection_log",
    "exercise dummies": "exercise_dummies",
    "mailbox": "mailbox",
    "reward shrine": "reward_shrine",
    "imbuing shrine": "imbuing_shrine",
    "hirelings": "hirelings",
    "notes": "notes",
    "screenshot url": "screenshot_url",
}


class OpenHouseBuildError(RuntimeError):
    pass


@dataclass
class ParsedDoorLog:
    is_open_door: bool
    house_name: str
    owner_name: str


@dataclass
class IssueBuildResult:
    issue_number: int
    status: str
    reason: str
    world: str | None = None
    town: str | None = None
    house_name: str | None = None
    owner_name: str | None = None


def fetch_json(url: str, headers: dict[str, str] | None = None) -> dict[str, Any] | list[Any]:
    request = Request(url, headers=headers or {})
    try:
      with urlopen(request, timeout=30) as response:
        return json.load(response)
    except HTTPError as exc:
        raise OpenHouseBuildError(f"HTTP {exc.code} for {url}") from exc
    except URLError as exc:
        raise OpenHouseBuildError(f"Network error for {url}: {exc.reason}") from exc


def save_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def normalize_text(value: Any) -> str:
    return " ".join(str(value or "").strip().lower().split())


def slugify(value: Any) -> str:
    normalized = normalize_text(value)
    return re.sub(r"[^a-z0-9]+", "-", normalized).strip("-")


def parse_bool(value: Any) -> bool:
    return normalize_text(value) == "true"


def parse_iso_date(value: str | None) -> datetime:
    if not value:
        return datetime.now(timezone.utc)
    return datetime.fromisoformat(value.replace("Z", "+00:00")).astimezone(timezone.utc)


def parse_door_log(log: str) -> ParsedDoorLog:
    source = str(log or "").strip()
    match = OPEN_DOOR_REGEX.match(source)
    if not match:
        raise OpenHouseBuildError("Door inspection log does not match the supported open door pattern.")

    house_name = match.group(1).strip()
    owner_name = match.group(2).strip()
    if not house_name:
        raise OpenHouseBuildError("House name cannot be empty.")
    if not owner_name:
        raise OpenHouseBuildError("Owner name cannot be empty.")

    return ParsedDoorLog(is_open_door=True, house_name=house_name, owner_name=owner_name)


def parse_issue_form(body: str) -> dict[str, Any]:
    values: dict[str, Any] = {}
    pattern = re.compile(r"^###\s+(.+?)\n+([\s\S]*?)(?=^###\s+|\Z)", re.MULTILINE)

    for match in pattern.finditer(body or ""):
        raw_label = normalize_text(match.group(1))
        field_name = ISSUE_FIELD_LABELS.get(raw_label)
        if not field_name:
            continue
        raw_value = match.group(2).strip()
        values[field_name] = raw_value

    if "hirelings" in values:
        hirelings: list[str] = []
        for line in values["hirelings"].splitlines():
            line = line.strip()
            match = re.match(r"- \[(x|X)\] (.+)", line)
            if match:
                hirelings.append(match.group(2).strip())
        values["hirelings"] = hirelings

    return values


def github_headers() -> dict[str, str]:
    headers = {
        "Accept": "application/vnd.github+json",
        "User-Agent": "tibia-warzones-open-house-builder",
    }
    if GITHUB_TOKEN:
        headers["Authorization"] = f"Bearer {GITHUB_TOKEN}"
    return headers


def get_open_house_issues() -> list[dict[str, Any]]:
    issues: list[dict[str, Any]] = []
    page = 1

    while True:
        url = (
            f"{GITHUB_API_BASE_URL}/repos/{GITHUB_REPOSITORY}/issues"
            f"?state=all&labels=open-house&per_page=100&page={page}"
        )
        payload = fetch_json(url, headers=github_headers())
        if not isinstance(payload, list):
            raise OpenHouseBuildError("GitHub issues response is not a list.")
        if not payload:
            break

        for item in payload:
            if not isinstance(item, dict):
                continue
            if "pull_request" in item:
                continue

            labels = item.get("labels") or []
            label_names = {
                normalize_text(label.get("name"))
                for label in labels
                if isinstance(label, dict) and label.get("name")
            }
            if {"invalid", "duplicate", "wontfix"}.intersection(label_names):
                continue

            issues.append(item)

        page += 1

    return issues


def get_character_by_name(name: str) -> dict[str, Any]:
    encoded_name = quote(name, safe="")
    payload = fetch_json(f"{TIBIADATA_BASE_URL}/v4/character/{encoded_name}")
    if not isinstance(payload, dict):
        raise OpenHouseBuildError(f"Unexpected character payload for {name}.")
    return payload


def resolve_character_world_from_payload(payload: dict[str, Any], name: str) -> str:
    character = ((payload.get("character") or {}).get("character") or {})
    world = character.get("world") or ""
    world_name = str(world).strip()
    if not world_name:
        raise OpenHouseBuildError(f"Failed to resolve world for character {name}.")
    return world_name


def get_houses_for_town(world: str, town: str) -> dict[str, Any]:
    return fetch_json(
        f"{TIBIADATA_BASE_URL}/v4/houses/{quote(world, safe='')}/{quote(town, safe='')}"
    )


def get_house_by_id(world: str, house_id: int) -> dict[str, Any]:
    return fetch_json(f"{TIBIADATA_BASE_URL}/v4/house/{quote(world, safe='')}/{house_id}")


def extract_character_houses(payload: dict[str, Any]) -> list[dict[str, Any]]:
    character = ((payload.get("character") or {}).get("character") or {})
    houses = character.get("houses")
    if not isinstance(houses, list):
        return []
    return [house for house in houses if isinstance(house, dict)]


def match_house_from_character(character_houses: list[dict[str, Any]], house_name: str) -> dict[str, Any]:
    target = normalize_text(house_name)
    exact_matches = [
        house
        for house in character_houses
        if normalize_text(house.get("name")) == target
    ]
    if exact_matches:
        return exact_matches[0]

    scored = [
        (
            SequenceMatcher(None, target, normalize_text(house.get("name"))).ratio(),
            house,
        )
        for house in character_houses
    ]
    scored.sort(key=lambda item: item[0], reverse=True)
    if scored and scored[0][0] >= 0.92:
        return scored[0][1]

    raise OpenHouseBuildError(f"Owner does not currently list house {house_name!r}.")


def match_house_in_official_town_list(
    world: str, town: str, house_name: str, owner_name: str
) -> tuple[dict[str, Any], dict[str, Any], float]:
    town_payload = get_houses_for_town(world, town)
    houses_section = town_payload.get("houses") or {}
    official_entries: list[dict[str, Any]] = []

    for key in ("house_list", "guildhall_list"):
        items = houses_section.get(key)
        if isinstance(items, list):
            official_entries.extend([item for item in items if isinstance(item, dict)])

    target = normalize_text(house_name)
    exact_matches = [
        item for item in official_entries if normalize_text(item.get("name")) == target
    ]

    chosen: dict[str, Any] | None = exact_matches[0] if exact_matches else None
    confidence = 0.96

    if chosen is None and official_entries:
        scored = [
            (
                SequenceMatcher(None, target, normalize_text(item.get("name"))).ratio(),
                item,
            )
            for item in official_entries
        ]
        scored.sort(key=lambda item: item[0], reverse=True)
        if scored and scored[0][0] >= 0.92:
            chosen = scored[0][1]
            confidence = 0.84

    if chosen is None:
        raise OpenHouseBuildError(
            f"Could not match house {house_name!r} in official list for {world} / {town}."
        )

    house_id = chosen.get("house_id")
    if not isinstance(house_id, int):
        raise OpenHouseBuildError(f"Official house {house_name!r} is missing house_id.")

    detail_payload = get_house_by_id(world, house_id)
    house_detail = detail_payload.get("house") or {}
    detail_name = house_detail.get("name") or chosen.get("name") or house_name
    if normalize_text(detail_name) != normalize_text(chosen.get("name")):
        raise OpenHouseBuildError(f"House detail mismatch for {house_name!r}.")

    rental = ((house_detail.get("status") or {}).get("rental") or {})
    detail_owner = str(rental.get("owner") or "").strip()
    if detail_owner and normalize_text(detail_owner) == normalize_text(owner_name):
        confidence = 1.0

    return chosen, house_detail, confidence


def build_houses_index_record(
    official_house: dict[str, Any], house_detail: dict[str, Any]
) -> dict[str, Any]:
    status_payload = house_detail.get("status") or {}
    rental = status_payload.get("rental") or {}
    is_rented = bool(status_payload.get("is_rented"))
    is_auctioned = bool(status_payload.get("is_auctioned"))
    owner_name = str(rental.get("owner") or "").strip()

    if is_rented:
        status = "rented"
    elif is_auctioned:
        status = "auctioned"
    else:
        status = "available"

    return {
        "houseId": house_detail.get("houseid") or official_house.get("house_id"),
        "name": house_detail.get("name") or official_house.get("name") or "",
        "world": house_detail.get("world") or "",
        "town": house_detail.get("town") or "",
        "type": house_detail.get("type") or "house",
        "status": status,
        "owner": owner_name,
        "raw": house_detail,
    }


def build_open_house_record(issue: dict[str, Any]) -> tuple[dict[str, Any], dict[str, Any]]:
    fields = parse_issue_form(str(issue.get("body") or ""))
    log = str(fields.get("door_inspection_log") or "").strip()
    parsed_log = parse_door_log(log)

    character_payload = get_character_by_name(parsed_log.owner_name)
    owner_world = resolve_character_world_from_payload(character_payload, parsed_log.owner_name)
    character_houses = extract_character_houses(character_payload)
    matched_character_house = match_house_from_character(character_houses, parsed_log.house_name)

    town = str(matched_character_house.get("town") or "").strip()
    if not town:
        raise OpenHouseBuildError(f"Character house data for {parsed_log.house_name!r} has no town.")

    official_house, house_detail, confidence = match_house_in_official_town_list(
        owner_world,
        town,
        parsed_log.house_name,
        parsed_log.owner_name,
    )

    hirelings = [
        {
            "type": hireling,
            "abilities": HIRELING_ABILITIES.get(hireling, []),
        }
        for hireling in fields.get("hirelings", [])
        if hireling in HIRELING_ABILITIES
    ]

    last_seen_open = parse_iso_date(issue.get("updated_at") or issue.get("created_at")).isoformat().replace(
        "+00:00", "Z"
    )

    record = {
        "id": "-".join(
            filter(
                None,
                [
                    slugify(owner_world),
                    slugify(parsed_log.house_name),
                    slugify(parsed_log.owner_name),
                ],
            )
        ),
        "houseName": house_detail.get("name") or parsed_log.house_name,
        "ownerName": parsed_log.owner_name,
        "world": owner_world,
        "town": house_detail.get("town") or town,
        "status": "open",
        "utilities": {
            "exerciseDummies": parse_bool(fields.get("exercise_dummies")),
            "mailbox": parse_bool(fields.get("mailbox")),
            "rewardShrine": parse_bool(fields.get("reward_shrine")),
            "imbuingShrine": parse_bool(fields.get("imbuing_shrine")),
            "hirelings": hirelings,
        },
        "lastSeenOpen": last_seen_open,
        "confidence": confidence,
        "source": {
            "type": "github",
            "url": str(issue.get("html_url") or ""),
            "submitter": str((issue.get("user") or {}).get("login") or ""),
            "log": log,
            "notes": str(fields.get("notes") or "").strip(),
            "screenshotUrl": str(fields.get("screenshot_url") or "").strip(),
            "issueNumber": issue.get("number"),
            "issueTitle": str(issue.get("title") or ""),
        },
    }

    return record, build_houses_index_record(official_house, house_detail)


def build_open_house_registry(
    report_issue_number: int | None = None,
) -> tuple[list[dict[str, Any]], list[dict[str, Any]], IssueBuildResult | None]:
    issues = get_open_house_issues()
    records: list[dict[str, Any]] = []
    index_by_house_id: dict[int, dict[str, Any]] = {}
    issue_report: IssueBuildResult | None = None

    skipped: list[str] = []
    for issue in issues:
        issue_number = int(issue.get("number") or 0)
        try:
            record, house_index_record = build_open_house_record(issue)
        except OpenHouseBuildError as exc:
            skipped.append(f"issue #{issue_number}: {exc}")
            if report_issue_number == issue_number:
                issue_report = IssueBuildResult(
                    issue_number=issue_number,
                    status="rejected",
                    reason=str(exc),
                )
            continue

        records.append(record)
        if report_issue_number == issue_number:
            issue_report = IssueBuildResult(
                issue_number=issue_number,
                status="accepted",
                reason="Open house added to the registry.",
                world=record.get("world"),
                town=record.get("town"),
                house_name=record.get("houseName"),
                owner_name=record.get("ownerName"),
            )

        house_id = house_index_record.get("houseId")
        if isinstance(house_id, int):
            index_by_house_id[house_id] = house_index_record

    records.sort(key=lambda item: item.get("lastSeenOpen", ""), reverse=True)
    houses_index = sorted(
        index_by_house_id.values(),
        key=lambda item: (
            normalize_text(item.get("world")),
            normalize_text(item.get("town")),
            normalize_text(item.get("name")),
        ),
    )

    if skipped:
        for message in skipped:
            print(f"[skip] {message}", file=sys.stderr)

    if report_issue_number is not None and issue_report is None:
        issue_report = IssueBuildResult(
            issue_number=report_issue_number,
            status="rejected",
            reason="Issue was not processed. It may be missing the open-house label or was excluded by repository rules.",
        )

    return records, houses_index, issue_report


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--report-issue-number", type=int, default=None)
    parser.add_argument("--report-path", type=str, default=None)
    return parser.parse_args()


def save_issue_report(path: Path, issue_report: IssueBuildResult | None) -> None:
    payload = None
    if issue_report is not None:
        payload = {
            "issue_number": issue_report.issue_number,
            "status": issue_report.status,
            "reason": issue_report.reason,
            "world": issue_report.world,
            "town": issue_report.town,
            "house_name": issue_report.house_name,
            "owner_name": issue_report.owner_name,
        }
    save_json(path, payload)


def main() -> int:
    args = parse_args()
    records, houses_index, issue_report = build_open_house_registry(
        report_issue_number=args.report_issue_number
    )
    save_json(OPEN_HOUSES_PATH, records)
    save_json(HOUSES_INDEX_PATH, houses_index)
    if args.report_path:
        save_issue_report(Path(args.report_path), issue_report)
    print(
        f"Built {len(records)} open house records and {len(houses_index)} house index entries."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
