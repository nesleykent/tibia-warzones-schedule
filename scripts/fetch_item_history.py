"""
Fetch and backfill per-item, per-world market history from the TibiaMarket API.

This writes directly into the project market layout:
  data/market/world/<World>/<world>_<item_slug>.json

When an existing file is present, the script fetches only the recent overlap
window, merges snapshots by (id, time), and keeps the canonical nested list
shape already used in the repository.
"""

from __future__ import annotations

import argparse
import json
import math
import os
import time
from pathlib import Path
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from common import RAW_WORLD_DIR, discover_tracked_items, get_tracked_worlds, slugify

BASE_URL = "https://api.tibiamarket.top/item_history"
DEFAULT_RATE_LIMIT_DELAY = 12.0
DEFAULT_RETRIES = 3
DEFAULT_START_DAYS_AGO = 9998
DEFAULT_END_DAYS_AGO = -1
DEFAULT_BEARER_TOKEN = (
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9."
    "eyJzdWIiOiJ3ZWJzaXRlIiwiaWF0IjoxNzA2Mzc2MTM1LCJleHAiOjI0ODM5NzYxMzV9."
    "MrRgQJyNb5rlNmdsD3oyzG3ZugVeeeF8uFNElfWUOyI"
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Fetch or backfill raw item history from TibiaMarket into data/raw/world/."
    )
    parser.add_argument(
        "--server",
        dest="servers",
        action="append",
        help="World/server to fetch. Repeat for multiple values. Defaults to all tracked worlds.",
    )
    parser.add_argument(
        "--item",
        dest="items",
        action="append",
        help="Tracked item name to fetch. Repeat for multiple values. Defaults to tracked project items.",
    )
    parser.add_argument(
        "--start-days-ago",
        type=int,
        default=DEFAULT_START_DAYS_AGO,
        help=f"Days ago to start the history window. Default: {DEFAULT_START_DAYS_AGO}.",
    )
    parser.add_argument(
        "--end-days-ago",
        type=int,
        default=DEFAULT_END_DAYS_AGO,
        help=f"Days ago to end the history window. Default: {DEFAULT_END_DAYS_AGO}.",
    )
    parser.add_argument(
        "--rate-limit-delay",
        type=float,
        default=DEFAULT_RATE_LIMIT_DELAY,
        help=f"Delay between requests in seconds. Default: {DEFAULT_RATE_LIMIT_DELAY}.",
    )
    parser.add_argument(
        "--retries",
        type=int,
        default=DEFAULT_RETRIES,
        help=f"Retry count for failed requests. Default: {DEFAULT_RETRIES}.",
    )
    parser.add_argument(
        "--token",
        default=os.environ.get("TIBIA_MARKET_TOKEN", DEFAULT_BEARER_TOKEN),
        help="Optional bearer token. Defaults to TIBIA_MARKET_TOKEN or the bundled fallback token.",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Replace existing raw files instead of merging in newly fetched snapshots.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Show the files that would be refreshed without making requests.",
    )
    return parser.parse_args()


def request_headers(token: str) -> dict[str, str]:
    headers = {
        "Accept": "application/json",
        "Accept-Language": "en-GB,en-US;q=0.9,en;q=0.8",
        "Origin": "https://www.tibiamarket.top",
        "Referer": "https://www.tibiamarket.top/",
        "Sec-Fetch-Dest": "empty",
        "Sec-Fetch-Mode": "cors",
        "Sec-Fetch-Site": "same-site",
        "User-Agent": (
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
            "AppleWebKit/605.1.15 (KHTML, like Gecko) "
            "Version/26.4 Safari/605.1.15"
        ),
    }
    if token:
        headers["Authorization"] = f"Bearer {token}"
    return headers


def build_url(server: str, item_id: int, start_days_ago: int, end_days_ago: int) -> str:
    query = urlencode(
        {
            "server": server,
            "item_id": item_id,
            "start_days_ago": start_days_ago,
            "end_days_ago": end_days_ago,
        }
    )
    return f"{BASE_URL}?{query}"


def retry_delay(error: HTTPError) -> int:
    retry_after = error.headers.get("retry-after")
    if retry_after:
        try:
            return max(int(retry_after), 1)
        except ValueError:
            pass

    reset_at = error.headers.get("x-ratelimit-reset")
    if reset_at:
        try:
            return max(int(float(reset_at) - time.time()), 1)
        except ValueError:
            pass

    return 60


def fetch_bytes(url: str, headers: dict[str, str], retries: int) -> bytes:
    last_error: Exception | None = None

    for attempt in range(1, retries + 1):
        request = Request(url, headers=headers)
        try:
            with urlopen(request) as response:
                status_code = getattr(response, "status", response.getcode())
                if status_code != 200:
                    raise RuntimeError(f"Unexpected HTTP status: {status_code}")
                return response.read()
        except HTTPError as error:
            last_error = error
            if error.code == 429 and attempt < retries:
                time.sleep(retry_delay(error))
                continue
            raise
        except URLError as error:
            last_error = error
            if attempt < retries:
                time.sleep(2)
                continue
            raise

    if last_error is not None:
        raise last_error
    raise RuntimeError("Request failed without an explicit error.")


def parse_json_payload(payload: bytes) -> Any:
    return json.loads(payload)


def extract_rows(payload: Any) -> list[dict[str, Any]]:
    if isinstance(payload, list):
        if payload and all(isinstance(row, dict) for row in payload):
            return payload
        rows: list[dict[str, Any]] = []
        for nested in payload:
            nested_rows = extract_rows(nested)
            if nested_rows:
                rows.extend(nested_rows)
        return rows

    if isinstance(payload, dict):
        for key in ("data", "results", "history", "items", "snapshots"):
            if key not in payload:
                continue
            rows = extract_rows(payload[key])
            if rows:
                return rows

    return []


def load_existing_rows(path: Path) -> list[dict[str, Any]]:
    payload = parse_json_payload(path.read_bytes())
    rows = extract_rows(payload)
    if not rows:
        raise RuntimeError(f"Existing file {path} does not contain market snapshots.")
    return rows


def snapshot_sort_key(row: dict[str, Any]) -> tuple[float, float]:
    snapshot_id = row.get("id")
    snapshot_time = row.get("time")

    try:
        normalized_id = float(snapshot_id)
    except (TypeError, ValueError):
        normalized_id = -1.0

    try:
        normalized_time = float(snapshot_time)
    except (TypeError, ValueError):
        normalized_time = -1.0

    return normalized_time, normalized_id


def merge_rows(existing_rows: list[dict[str, Any]], incoming_rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    merged: dict[tuple[Any, Any], dict[str, Any]] = {}

    for row in existing_rows:
        merged[(row.get("id"), row.get("time"))] = row

    for row in incoming_rows:
        merged[(row.get("id"), row.get("time"))] = row

    return sorted(merged.values(), key=snapshot_sort_key)


def serialize_rows(rows: list[dict[str, Any]]) -> bytes:
    return json.dumps([rows], separators=(",", ":"), ensure_ascii=False).encode("utf-8")


def resolve_update_window_days(existing_rows: list[dict[str, Any]], requested_start_days_ago: int) -> int:
    latest_timestamp = max(
        (
            float(row["time"])
            for row in existing_rows
            if isinstance(row, dict) and row.get("time") is not None
        ),
        default=0.0,
    )
    if latest_timestamp <= 0:
        return requested_start_days_ago

    age_seconds = max(time.time() - latest_timestamp, 0)
    days_ago = max(1, math.ceil(age_seconds / 86400) + 2)
    return min(requested_start_days_ago, days_ago)


def is_ignorable_market_error(error: Exception) -> bool:
    if isinstance(error, HTTPError) and error.code == 404:
        return True

    message = str(error).lower()
    ignorable_fragments = (
        "no usable data",
        "not found",
        "unexpected http status: 404",
    )
    return any(fragment in message for fragment in ignorable_fragments)


def resolve_worlds(values: list[str] | None) -> list[str]:
    tracked_worlds = get_tracked_worlds()
    if not values:
        return tracked_worlds

    lookup = {world.casefold(): world for world in tracked_worlds}
    resolved = []
    missing = []

    for value in values:
        key = value.strip().casefold()
        world = lookup.get(key)
        if world is None:
            missing.append(value)
            continue
        resolved.append(world)

    if missing:
        raise ValueError(f"Requested worlds not found in tracked catalog: {', '.join(missing)}")
    return resolved


def resolve_items(values: list[str] | None) -> list[dict[str, Any]]:
    tracked_items = discover_tracked_items()
    if not values:
        return tracked_items

    lookup = {item["name"].casefold(): item for item in tracked_items}
    resolved = []
    missing = []

    for value in values:
        key = value.strip().casefold()
        item = lookup.get(key)
        if item is None:
            missing.append(value)
            continue
        resolved.append(item)

    if missing:
        raise ValueError(f"Requested items are not tracked by this project: {', '.join(missing)}")
    return resolved


def destination_path(world: str, item_slug: str) -> Path:
    return RAW_WORLD_DIR / world / f"{slugify(world)}_{item_slug}.json"


def run(
    *,
    worlds: list[str] | None = None,
    items: list[dict[str, Any]] | None = None,
    start_days_ago: int = DEFAULT_START_DAYS_AGO,
    end_days_ago: int = DEFAULT_END_DAYS_AGO,
    rate_limit_delay: float = DEFAULT_RATE_LIMIT_DELAY,
    retries: int = DEFAULT_RETRIES,
    token: str | None = None,
    force: bool = False,
    dry_run: bool = False,
) -> int:
    selected_worlds = worlds or get_tracked_worlds()
    selected_items = items or discover_tracked_items()
    headers = request_headers(token or os.environ.get("TIBIA_MARKET_TOKEN", DEFAULT_BEARER_TOKEN))

    RAW_WORLD_DIR.mkdir(parents=True, exist_ok=True)
    last_request_at = 0.0
    failures = 0

    for world in selected_worlds:
        world_dir = RAW_WORLD_DIR / world
        world_dir.mkdir(parents=True, exist_ok=True)

        for item in selected_items:
            path = destination_path(world, item["slug"])
            existing_rows: list[dict[str, Any]] = []
            resolved_start_days_ago = start_days_ago

            if path.exists() and not force:
                try:
                    existing_rows = load_existing_rows(path)
                    resolved_start_days_ago = resolve_update_window_days(existing_rows, start_days_ago)
                except Exception:
                    existing_rows = []
                    resolved_start_days_ago = start_days_ago

            if dry_run:
                mode = "update" if path.exists() and not force else "fetch"
                print(f"[dry-run] {mode} {world} :: {item['name']} ({resolved_start_days_ago}d) -> {path}")
                continue

            url = build_url(world, item["id"], resolved_start_days_ago, end_days_ago)

            elapsed = time.time() - last_request_at
            if elapsed < rate_limit_delay:
                time.sleep(rate_limit_delay - elapsed)

            action = "Updating" if path.exists() and not force and existing_rows else "Fetching"
            print(f"{action} {world} :: {item['name']}")

            try:
                payload = fetch_bytes(url, headers, retries)
                incoming_rows = extract_rows(parse_json_payload(payload))
                if not incoming_rows:
                    raise RuntimeError("Fetched payload did not contain market snapshots.")

                if path.exists() and not force and existing_rows:
                    merged_rows = merge_rows(existing_rows, incoming_rows)
                    path.write_bytes(serialize_rows(merged_rows))
                    added_rows = len(merged_rows) - len(existing_rows)
                    if added_rows > 0:
                        print(f"Updated {path} with {added_rows} new snapshots.")
                    else:
                        print(f"No new snapshots for {path.name}; file kept current.")
                else:
                    path.write_bytes(serialize_rows(sorted(incoming_rows, key=snapshot_sort_key)))
                    print(f"Saved {path}")
            except Exception as error:  # noqa: BLE001
                if is_ignorable_market_error(error):
                    print(f"Skipping {world} :: {item['name']} because TibiaMarket has no usable data for it.")
                else:
                    failures += 1
                    print(f"Failed {world} :: {item['name']}: {error}")
            finally:
                last_request_at = time.time()

    return failures


def main() -> int:
    args = parse_args()
    try:
        worlds = resolve_worlds(args.servers)
        items = resolve_items(args.items)
    except ValueError as error:
        print(error)
        return 1

    failures = run(
        worlds=worlds,
        items=items,
        start_days_ago=args.start_days_ago,
        end_days_ago=args.end_days_ago,
        rate_limit_delay=args.rate_limit_delay,
        retries=args.retries,
        token=args.token,
        force=args.force,
        dry_run=args.dry_run,
    )
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
