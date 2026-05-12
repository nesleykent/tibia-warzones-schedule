from __future__ import annotations

import json
import os
import re
import sys
from pathlib import Path
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import quote
from urllib.request import Request, urlopen

ROOT_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT_DIR / "data"
OPEN_HOUSES_FILE = DATA_DIR / "open-houses.json"
TIBIADATA_BASE_URL = os.environ.get("TIBIADATA_BASE_URL", "https://api.tibiadata.com")
GITHUB_API_URL = os.environ.get("GITHUB_API_URL", "https://api.github.com")
GITHUB_REPOSITORY = os.environ.get("GITHUB_REPOSITORY", "")
GITHUB_TOKEN = os.environ.get("GITHUB_TOKEN", "")

OPEN_HOUSE_TITLE_PREFIX = "[Open House]:"
MAINTENANCE_TITLE_PREFIX = "[Open House Maintenance]:"
OPEN_DOOR_PATTERN = re.compile(
    r"You see (?:an open|a closed) door\. It belongs to house '([^']+)'\. (.+?) owns this house\."
)
SECTION_PATTERN = re.compile(r"^###\s+(.+?)\n\n(.*?)(?=^###\s+|\Z)", re.MULTILINE | re.DOTALL)
KNOWN_TOWNS = [
    "Ab'Dendriel",
    "Ankrahmun",
    "Carlin",
    "Cormaya",
    "Darashia",
    "Edron",
    "Farmine",
    "Fibula",
    "Gray Beach",
    "Issavi",
    "Kazordoon",
    "Krailos",
    "Liberty Bay",
    "Marapur",
    "Port Hope",
    "Rathleton",
    "Roshamuul",
    "Svargrond",
    "Thais",
    "Venore",
    "Yalahar",
]
HIRELING_ABILITIES = {
    "Apprentice": ["Sells basic furniture"],
    "Banker": ["Deposit", "Withdraw", "Transfer"],
    "Trader": ["Trader", "Post clerk", "Buys and sells standard goods such as runes, potions, and tools"],
    "Steward": ["Provides access to Your Supply Stash"],
    "Cook": ["Cook random buff food for a fee"],
}
HIRELING_ORDER = ["Apprentice", "Banker", "Trader", "Steward", "Cook"]


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


def get_houses(world: str, town: str) -> list[dict[str, Any]]:
    payload = fetch_json(f"{TIBIADATA_BASE_URL.rstrip('/')}/v4/houses/{quote(world)}/{quote(town)}")
    houses_root = payload.get("houses", {}) if isinstance(payload, dict) else {}
    house_list = houses_root.get("house_list", []) if isinstance(houses_root, dict) else []
    return house_list if isinstance(house_list, list) else []


def resolve_house(owner_name: str, house_name: str) -> dict[str, Any]:
    character = get_character(owner_name)
    world = str(character.get("world", "")).strip()
    if not world:
        raise RuntimeError(f"Could not resolve world for character {owner_name}.")

    exact_houses = character.get("houses", [])
    if isinstance(exact_houses, list):
        for house in exact_houses:
            if normalize_text(house.get("name")) == normalize_text(house_name):
                return {
                    "world": world,
                    "town": str(house.get("town", "")).strip(),
                    "houseId": int(house.get("houseid") or 0) or None,
                }

    for town in KNOWN_TOWNS:
        for house in get_houses(world, town):
            if normalize_text(house.get("name")) == normalize_text(house_name):
                return {
                    "world": world,
                    "town": town,
                    "houseId": int(house.get("house_id") or 0) or None,
                }

    raise RuntimeError(f"Could not match house '{house_name}' for owner {owner_name}.")


def build_record_from_issue(issue: dict[str, Any]) -> dict[str, Any]:
    sections = parse_sections(str(issue.get("body", "")))
    door_log = sections.get("Door inspection log", "")
    house_name, owner_name = parse_open_door_log(door_log)
    resolved = resolve_house(owner_name, house_name)
    hirelings = parse_hirelings(sections.get("Hirelings", ""))
    issue_number = int(issue.get("number") or 0)
    return {
        "id": "-".join(
            filter(
                None,
                [
                    slugify(resolved["world"]),
                    slugify(house_name),
                    slugify(owner_name),
                ],
            )
        ),
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


def apply_maintenance_issue(records: dict[str, dict[str, Any]], issue: dict[str, Any]) -> None:
    sections = parse_sections(str(issue.get("body", "")))
    action = sections.get("Request type", "").strip()
    world = sections.get("World", "").strip()
    house_name = sections.get("House name", "").strip()
    if not world or not house_name:
        return

    for record_id, record in list(records.items()):
        if (
            normalize_text(record.get("world")) == normalize_text(world)
            and normalize_text(record.get("houseName")) == normalize_text(house_name)
        ):
            del records[record_id]

    if action != "Edit existing open house":
        return

    replacement_log = sections.get("Updated door inspection log", "").strip()
    if not replacement_log:
        return

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
    record = build_record_from_issue(synthetic_issue)
    records[record["id"]] = record


def fetch_all_issues() -> list[dict[str, Any]]:
    if not GITHUB_REPOSITORY or not GITHUB_TOKEN:
        raise RuntimeError("GITHUB_REPOSITORY and GITHUB_TOKEN are required.")
    issues = github_get(f"repos/{GITHUB_REPOSITORY}/issues?state=all&per_page=100")
    return issues if isinstance(issues, list) else []


def build_registry() -> list[dict[str, Any]]:
    records: dict[str, dict[str, Any]] = {}
    issues = fetch_all_issues()

    for issue in issues:
        if "pull_request" in issue:
            continue
        title = str(issue.get("title", "")).strip()
        if title.startswith(OPEN_HOUSE_TITLE_PREFIX):
            try:
                record = build_record_from_issue(issue)
            except Exception:
                continue
            records[record["id"]] = record

    for issue in issues:
        if "pull_request" in issue:
            continue
        title = str(issue.get("title", "")).strip()
        if title.startswith(MAINTENANCE_TITLE_PREFIX):
            try:
                apply_maintenance_issue(records, issue)
            except Exception:
                continue

    return sorted(
        records.values(),
        key=lambda record: (
            normalize_text(record.get("world")),
            normalize_text(record.get("town")),
            normalize_text(record.get("houseName")),
        ),
    )


def main() -> int:
    try:
        save_json(OPEN_HOUSES_FILE, build_registry())
        return 0
    except Exception as exc:  # noqa: BLE001
        print(str(exc), file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
