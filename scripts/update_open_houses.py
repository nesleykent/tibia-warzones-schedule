from __future__ import annotations

import argparse
import json
import os
import re
import sys
from copy import deepcopy
from pathlib import Path
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import quote
from urllib.request import Request, urlopen

from common import normalize_open_houses_payload

ROOT_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT_DIR / "data"
OPEN_HOUSES_FILE = DATA_DIR / "open-houses.json"
TIBIADATA_BASE_URL = os.environ.get("TIBIADATA_BASE_URL", "https://api.tibiadata.com")
GITHUB_API_URL = os.environ.get("GITHUB_API_URL", "https://api.github.com")
GITHUB_REPOSITORY = os.environ.get("GITHUB_REPOSITORY", "")
GITHUB_TOKEN = os.environ.get("GITHUB_TOKEN", "")
GITHUB_PER_PAGE = 100

OPEN_HOUSE_TITLE_PREFIX = "[Open House]:"
MAINTENANCE_TITLE_PREFIX = "[Open House Maintenance]:"
OPEN_DOOR_PATTERN = re.compile(
    r"You see (?:an open|a closed) door\. It belongs to house '([^']+)'\. (.+?) owns this house\."
)
SECTION_PATTERN = re.compile(r"^###\s+(.+?)\n\n(.*?)(?=^###\s+|\Z)", re.MULTILINE | re.DOTALL)
HIRELING_ABILITIES = {
    "Apprentice": ["Sells basic furniture"],
    "Banker": ["Deposit", "Withdraw", "Transfer"],
    "Trader": ["Trader", "Post clerk", "Buys and sells standard goods such as runes, potions, and tools"],
    "Steward": ["Provides access to Your Supply Stash"],
    "Cook": ["Cook random buff food for a fee"],
}
HIRELING_ORDER = ["Apprentice", "Banker", "Trader", "Steward", "Cook"]
# A single run should see almost no ownership lapses, so an unusually large batch is treated as
# suspect upstream data rather than truth. Overridable, so it can never wedge the pipeline.
BULK_LAPSE_MINIMUM = 3
BULK_LAPSE_RATIO = 0.25


class HouseNotOwnedError(RuntimeError):
    """The reported owner no longer holds the reported house, so the report is stale."""


def fetch_json(url: str, headers: dict[str, str] | None = None) -> dict[str, Any] | list[Any]:
    request = Request(url, headers=headers or {})
    try:
        with urlopen(request, timeout=30) as response:
            return json.load(response)
    except HTTPError as exc:
        raise RuntimeError(f"HTTP {exc.code} for {url}") from exc
    except URLError as exc:
        raise RuntimeError(f"Network error for {url}: {exc.reason}") from exc


def save_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def normalize_text(value: Any) -> str:
    return " ".join(str(value or "").strip().lower().split())


def slugify(value: Any) -> str:
    return re.sub(r"[^a-z0-9]+", "-", normalize_text(value)).strip("-")


def build_record_id(world: Any, house_name: Any, owner_name: Any) -> str:
    return "-".join(filter(None, [slugify(world), slugify(house_name), slugify(owner_name)]))


def record_issue_number(record: Any) -> int:
    source = record.get("source") if isinstance(record, dict) else None
    if not isinstance(source, dict):
        return 0
    try:
        return int(source.get("issueNumber") or 0)
    except (TypeError, ValueError):
        return 0


def load_existing_records() -> dict[str, dict[str, Any]]:
    """Seed from the durable registry: issues are requests, this file is the database."""
    if not OPEN_HOUSES_FILE.exists():
        return {}

    payload = json.loads(OPEN_HOUSES_FILE.read_text(encoding="utf-8"))
    if not isinstance(payload, list):
        raise RuntimeError(f"{OPEN_HOUSES_FILE} must contain a list of open house records.")

    records: dict[str, dict[str, Any]] = {}
    for record in payload:
        if not isinstance(record, dict):
            raise RuntimeError(f"{OPEN_HOUSES_FILE} contains a record that is not an object.")
        record_id = str(record.get("id", "")).strip()
        if not record_id:
            raise RuntimeError(f"{OPEN_HOUSES_FILE} contains a record without an id.")
        records[record_id] = record
    return records


def issue_url(number: int) -> str:
    owner_repo = GITHUB_REPOSITORY.strip()
    return f"https://github.com/{owner_repo}/issues/{number}" if owner_repo else ""


def github_headers() -> dict[str, str]:
    headers = {
        "Accept": "application/vnd.github+json",
        "User-Agent": "tibia-warzones-schedule-open-houses",
    }
    if GITHUB_TOKEN:
        headers["Authorization"] = f"Bearer {GITHUB_TOKEN}"
    return headers


def github_get(path: str) -> Any:
    url = f"{GITHUB_API_URL.rstrip('/')}/{path.lstrip('/')}"
    return fetch_json(url, github_headers())


def format_issue_reference(issue: dict[str, Any]) -> str:
    number = int(issue.get("number") or 0)
    title = str(issue.get("title", "")).strip()
    if number and title:
        return f"issue #{number} ({title})"
    if number:
        return f"issue #{number}"
    if title:
        return f"issue ({title})"
    return "issue"


def normalize_issue_body(body: str) -> str:
    value = str(body or "")
    if "\\n" in value and "\n" not in value:
        value = value.replace("\\r\\n", "\n").replace("\\n", "\n")
    return value


def parse_sections(body: str) -> dict[str, str]:
    sections: dict[str, str] = {}
    for label, value in SECTION_PATTERN.findall(normalize_issue_body(body)):
        sections[label.strip()] = value.strip()
    return sections


def parse_open_door_log(log: str) -> tuple[str, str]:
    match = OPEN_DOOR_PATTERN.search(str(log or ""))
    if not match:
        raise ValueError("Door inspection log does not match the supported door inspection pattern.")
    house_name = match.group(1).strip()
    owner_name = match.group(2).strip()
    if not house_name:
        raise ValueError("House name cannot be empty.")
    if not owner_name:
        raise ValueError("Owner name cannot be empty.")
    return house_name, owner_name


def parse_boolean(value: str) -> bool:
    return normalize_text(value) == "true"


def parse_hirelings(value: str) -> list[str]:
    lines = [line.strip() for line in str(value or "").splitlines()]
    selected: list[str] = []
    for line in lines:
        match = re.match(r"-\s+\[x\]\s+(.+)$", line, re.IGNORECASE)
        if match:
            selected.append(match.group(1).strip())
    order_map = {name: index for index, name in enumerate(HIRELING_ORDER)}
    return sorted(selected, key=lambda name: order_map.get(name, len(order_map)))


def build_hireling_payload(names: list[str]) -> list[dict[str, Any]]:
    payload: list[dict[str, Any]] = []
    for name in names:
        payload.append({"type": name, "abilities": HIRELING_ABILITIES.get(name, [])})
    return payload


def get_character(name: str) -> dict[str, Any]:
    payload = fetch_json(f"{TIBIADATA_BASE_URL.rstrip('/')}/v4/character/{quote(name)}")
    character_root = payload.get("character", {}) if isinstance(payload, dict) else {}
    if isinstance(character_root, dict) and isinstance(character_root.get("character"), dict):
        return character_root["character"]
    if isinstance(character_root, dict):
        return character_root
    raise RuntimeError(f"Unexpected TibiaData character payload for {name}.")


def resolve_house(owner_name: str, house_name: str) -> dict[str, Any]:
    character = get_character(owner_name)
    if not isinstance(character, dict):
        raise RuntimeError(f"Unexpected TibiaData character payload for {owner_name}.")

    if not str(character.get("name", "")).strip():
        raise RuntimeError(f"TibiaData character payload for {owner_name} has no name.")

    world = str(character.get("world", "")).strip()
    if not world:
        raise RuntimeError(f"Could not resolve world for character {owner_name}.")

    # TibiaData omits "houses" entirely for characters that own none, so an absent key is an
    # authoritative "owns nothing". An unreadable payload is not, and must never be mistaken for
    # one: the registry is rebuilt from scratch, so it would silently drop every valid record.
    owned_houses = character.get("houses", [])
    if not isinstance(owned_houses, list):
        raise RuntimeError(f"TibiaData returned an unexpected houses payload for {owner_name}.")

    for house in owned_houses:
        if not isinstance(house, dict) or not str(house.get("name", "")).strip():
            raise RuntimeError(f"TibiaData returned an unexpected house entry for {owner_name}.")
        if normalize_text(house.get("name")) == normalize_text(house_name):
            return {
                "world": world,
                "town": str(house.get("town", "")).strip(),
                "houseId": int(house.get("houseid") or 0) or None,
            }

    raise HouseNotOwnedError(f"{owner_name} no longer owns house '{house_name}'.")


def build_record_from_issue(issue: dict[str, Any]) -> dict[str, Any]:
    sections = parse_sections(str(issue.get("body", "")))
    door_log = sections.get("Door inspection log", "")
    house_name, owner_name = parse_open_door_log(door_log)
    resolved = resolve_house(owner_name, house_name)
    hirelings = parse_hirelings(sections.get("Hirelings", ""))
    issue_number = int(issue.get("number") or 0)
    return {
        "id": build_record_id(resolved["world"], house_name, owner_name),
        "houseName": house_name,
        "ownerName": owner_name,
        "world": resolved["world"],
        "town": resolved["town"],
        "houseId": resolved["houseId"],
        "status": "open",
        "utilities": {
            "exerciseDummies": parse_boolean(sections.get("Exercise dummies", "")),
            "rewardShrine": parse_boolean(sections.get("Reward shrine", "")),
            "imbuingShrine": parse_boolean(sections.get("Imbuing shrine", "")),
            "mailbox": parse_boolean(sections.get("Mailbox", "")),
            "hirelings": build_hireling_payload(hirelings),
        },
        "source": {
            "type": "github",
            "url": issue_url(issue_number),
            "submitter": str(issue.get("user", {}).get("login", "")).strip(),
            "log": door_log,
            "notes": sections.get("Notes", ""),
            "screenshotUrl": sections.get("Screenshot URL", ""),
            "issueNumber": issue_number,
            "issueTitle": str(issue.get("title", "")).strip(),
        },
    }


def apply_maintenance_issue(
    records: dict[str, dict[str, Any]],
    issue: dict[str, Any],
    departures: dict[str, str],
    warnings: list[str],
) -> None:
    sections = parse_sections(str(issue.get("body", "")))
    action = sections.get("Request type", "").strip()
    world = sections.get("World", "").strip()
    house_name = sections.get("House name", "").strip()
    if not world or not house_name:
        raise ValueError("Maintenance issue must include both World and House name.")

    if action not in {"Edit existing open house", "Remove existing open house"}:
        raise ValueError(f"Unsupported maintenance request type: {action or '<blank>'}.")

    issue_number = int(issue.get("number") or 0)

    # Scope to reports that predate this request. Issue numbers are monotonic, so a later
    # re-submission of the same house falls outside the scope and survives the replay.
    matched_ids = [
        record_id
        for record_id, record in records.items()
        if record_issue_number(record) < issue_number
        and normalize_text(record.get("world")) == normalize_text(world)
        and normalize_text(record.get("houseName")) == normalize_text(house_name)
    ]

    # Maintenance issues are re-read every run, so an already-applied request matching nothing
    # is the normal steady state, not an error.
    if not matched_ids:
        warnings.append(
            f"{format_issue_reference(issue)}: nothing in scope matched {world} / {house_name}."
        )
        return

    if action == "Remove existing open house":
        for record_id in matched_ids:
            del records[record_id]
            departures[record_id] = f"removed by {format_issue_reference(issue)}"
        return

    replacement_log = sections.get("Updated door inspection log", "").strip()
    if not replacement_log:
        raise ValueError("Edit requests must include Updated door inspection log.")

    synthetic_issue = {
        **issue,
        "title": f"{OPEN_HOUSE_TITLE_PREFIX} {replacement_log}",
        "body": "\n\n".join(
            [
                "### Door inspection log",
                replacement_log,
                "",
                "### Exercise dummies",
                "false",
                "",
                "### Reward shrine",
                "false",
                "",
                "### Imbuing shrine",
                "false",
                "",
                "### Mailbox",
                "false",
                "",
                "### Hirelings",
                "",
                "### Notes",
                sections.get("Reason", ""),
                "",
                "### Screenshot URL",
                sections.get("Supporting link", ""),
            ]
        ),
    }
    # Build the replacement before removing anything, so a failed edit never loses the original.
    try:
        record = build_record_from_issue(synthetic_issue)
    except HouseNotOwnedError as exc:
        warnings.append(f"{format_issue_reference(issue)}: {exc} Existing record kept.")
        return

    existing_record = deepcopy(records[matched_ids[-1]])
    for record_id in matched_ids:
        del records[record_id]
        departures[record_id] = f"replaced by {format_issue_reference(issue)}"

    utilities = existing_record.get("utilities")
    if isinstance(utilities, dict):
        record["utilities"] = deepcopy(utilities)

    status = str(existing_record.get("status", "")).strip()
    if status:
        record["status"] = status

    for field_name in ("lastSeenOpen", "createdAt", "updatedAt"):
        value = str(existing_record.get(field_name, "")).strip()
        if value:
            record[field_name] = value

    records[record["id"]] = record


def fetch_all_issues() -> list[dict[str, Any]]:
    if not GITHUB_REPOSITORY or not GITHUB_TOKEN:
        raise RuntimeError("GITHUB_REPOSITORY and GITHUB_TOKEN are required.")

    issues: list[dict[str, Any]] = []
    page = 1

    while True:
        payload = github_get(
            f"repos/{GITHUB_REPOSITORY}/issues?state=all&per_page={GITHUB_PER_PAGE}&page={page}"
        )
        if not isinstance(payload, list):
            raise RuntimeError(f"GitHub issues API returned an invalid payload for page {page}.")

        issues.extend(issue for issue in payload if isinstance(issue, dict))
        if len(payload) < GITHUB_PER_PAGE:
            break
        page += 1

    return issues


def iter_matching_issues(
    issues: list[dict[str, Any]], title_prefix: str
) -> list[dict[str, Any]]:
    return [
        issue
        for issue in issues
        if "pull_request" not in issue
        and str(issue.get("title", "")).strip().startswith(title_prefix)
    ]


def build_registry(allow_bulk_lapse: bool = False) -> list[dict[str, Any]]:
    records = load_existing_records()
    seed_ids = set(records)
    issues = fetch_all_issues()

    errors: list[str] = []
    warnings: list[str] = []
    lapses: list[str] = []
    # Every record that leaves the registry must land here with a reason. Departures without one
    # mean the run lost data it cannot account for, and the write is refused.
    departures: dict[str, str] = {}

    seeded_by_issue = {
        number: record_id
        for record_id, record in records.items()
        if (number := record_issue_number(record))
    }

    surviving_numbers: set[int] = set()
    for issue in iter_matching_issues(issues, OPEN_HOUSE_TITLE_PREFIX):
        issue_number = int(issue.get("number") or 0)
        surviving_numbers.add(issue_number)
        # Link by issue number, never by id: id encodes world/owner and changes on transfer.
        seeded_id = seeded_by_issue.get(issue_number)

        try:
            record = build_record_from_issue(issue)
        except HouseNotOwnedError as exc:
            if seeded_id in records:
                del records[seeded_id]
                departures[seeded_id] = "ownership lapsed"
                lapses.append(f"{format_issue_reference(issue)}: {exc}")
            continue
        except Exception as exc:
            errors.append(f"{format_issue_reference(issue)}: {exc}")
            continue

        if seeded_id is not None and seeded_id != record["id"] and seeded_id in records:
            del records[seeded_id]
            departures[seeded_id] = f"superseded by {format_issue_reference(issue)}"
        records[record["id"]] = record

    # Orphans are what this model exists to protect: the source issue is gone, but the house is
    # still theirs until TibiaData says otherwise.
    for record_id in list(records):
        record = records[record_id]
        if record_issue_number(record) in surviving_numbers:
            continue

        owner_name = str(record.get("ownerName", "")).strip()
        house_name = str(record.get("houseName", "")).strip()
        if not owner_name or not house_name:
            errors.append(f"record {record_id}: stored record is missing ownerName or houseName.")
            continue

        try:
            resolved = resolve_house(owner_name, house_name)
        except HouseNotOwnedError as exc:
            del records[record_id]
            departures[record_id] = "ownership lapsed"
            lapses.append(f"record {record_id}: {exc}")
            continue
        except Exception as exc:
            errors.append(f"record {record_id}: {exc}")
            continue

        refreshed = dict(record)
        refreshed["world"] = resolved["world"]
        refreshed["town"] = resolved["town"]
        refreshed["houseId"] = resolved["houseId"]
        refreshed["id"] = build_record_id(resolved["world"], house_name, owner_name)
        if refreshed["id"] != record_id:
            del records[record_id]
            departures[record_id] = "refreshed after a world transfer"
        records[refreshed["id"]] = refreshed

    # Ascending, so a later request observes the effect of an earlier one.
    for issue in sorted(
        iter_matching_issues(issues, MAINTENANCE_TITLE_PREFIX),
        key=lambda issue: int(issue.get("number") or 0),
    ):
        try:
            apply_maintenance_issue(records, issue, departures, warnings)
        except Exception as exc:
            errors.append(f"{format_issue_reference(issue)}: {exc}")

    if errors:
        details = "\n".join(f"- {message}" for message in errors)
        raise RuntimeError(f"Open house rebuild failed:\n{details}")

    for message in warnings:
        print(f"warning: {message}", file=sys.stderr)

    unexplained = seed_ids - set(records) - set(departures)
    if unexplained:
        details = "\n".join(f"- {record_id}" for record_id in sorted(unexplained))
        raise RuntimeError(
            f"Refusing to write: {len(unexplained)} record(s) disappeared without an "
            f"attributed reason:\n{details}"
        )

    lapse_limit = max(BULK_LAPSE_MINIMUM, int(len(seed_ids) * BULK_LAPSE_RATIO))
    if len(lapses) > lapse_limit and not allow_bulk_lapse:
        details = "\n".join(f"- {message}" for message in lapses)
        raise RuntimeError(
            f"Refusing to write: {len(lapses)} ownership lapses in a single run exceeds the "
            f"safety limit of {lapse_limit}. If TibiaData is correct, re-run with "
            f"--allow-bulk-lapse to confirm.\n{details}"
        )

    payload = normalize_open_houses_payload(list(records.values()))
    if len(payload) != len(records):
        raise RuntimeError(
            f"Refusing to write: normalization returned {len(payload)} of {len(records)} records."
        )
    return payload


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--allow-bulk-lapse",
        action="store_true",
        help="Confirm an unusually large batch of ownership lapses in a single run.",
    )
    args = parser.parse_args(argv)

    try:
        save_json(OPEN_HOUSES_FILE, build_registry(allow_bulk_lapse=args.allow_bulk_lapse))
        return 0
    except Exception as exc:  # noqa: BLE001
        print(str(exc), file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
