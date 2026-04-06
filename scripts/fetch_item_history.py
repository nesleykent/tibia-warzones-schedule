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
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from common import RAW_WORLD_DIR, discover_tracked_items, get_tracked_worlds, slugify

BASE_URL = "https://api.tibiamarket.top/item_history"
DEFAULT_RATE_LIMIT_DELAY = 6.0
DEFAULT_RETRIES = 3
DEFAULT_START_DAYS_AGO = 9998
DEFAULT_END_DAYS_AGO = -1
REFRESH_INTERVAL_SECONDS = 24 * 60 * 60
DEFAULT_BEARER_TOKEN = (
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9."
    "eyJzdWIiOiJ3ZWJzaXRlIiwiaWF0IjoxNzA2Mzc2MTM1LCJleHAiOjI0ODM5NzYxMzV9."
    "MrRgQJyNb5rlNmdsD3oyzG3ZugVeeeF8uFNElfWUOyI"
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Fetch or backfill item history from TibiaMarket into data/market/world/."
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
        help="Replace existing market files instead of merging in newly fetched snapshots.",
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


def format_run_marker(timestamp: float | None = None) -> str:
    moment = datetime.fromtimestamp(timestamp or time.time(), tz=timezone.utc)
    return moment.isoformat().replace("+00:00", "Z")


def parse_run_marker(value: Any) -> float | None:
    if not isinstance(value, str) or not value.strip():
        return None

    normalized = value.strip().replace("Z", "+00:00")
    try:
        return datetime.fromisoformat(normalized).timestamp()
    except ValueError:
        return None


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


def extract_last_run_at(payload: Any) -> str | None:
    if isinstance(payload, dict):
        marker = payload.get("last_run_at")
        return marker if isinstance(marker, str) and marker.strip() else None
    return None


def load_existing_state(path: Path) -> tuple[list[dict[str, Any]], str | None]:
    payload = parse_json_payload(path.read_bytes())
    rows = extract_rows(payload)
    if not rows:
        raise RuntimeError(f"Existing file {path} does not contain market snapshots.")
    return rows, extract_last_run_at(payload)


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


def serialize_rows(rows: list[dict[str, Any]], last_run_at: str) -> bytes:
    payload = {
        "last_run_at": last_run_at,
        "snapshots": [rows],
    }
    return json.dumps(payload, separators=(",", ":"), ensure_ascii=False).encode("utf-8")


def should_refresh(last_run_at: str | None, now: float | None = None) -> bool:
    last_run_timestamp = parse_run_marker(last_run_at)
    if last_run_timestamp is None:
        return True
    current_time = time.time() if now is None else now
    return current_time - last_run_timestamp >= REFRESH_INTERVAL_SECONDS


def describe_refresh_status(last_run_at: str | None, now: float | None = None) -> tuple[bool, str]:
    current_time = time.time() if now is None else now
    last_run_timestamp = parse_run_marker(last_run_at)
    if last_run_timestamp is None:
        if last_run_at:
            return True, f"invalid last_run_at: {last_run_at}"
        return True, "missing last_run_at"

    age_seconds = max(current_time - last_run_timestamp, 0.0)
    if age_seconds >= REFRESH_INTERVAL_SECONDS:
        return True, f"stale last_run_at: {last_run_at}"
    return False, f"fresh last_run_at: {last_run_at}"


def sleep_with_interrupt(seconds: float, *, world: str, item_name: str) -> None:
    wait_seconds = max(seconds, 0.0)
    if wait_seconds <= 0:
        return

    print(f"[wait] {wait_seconds:.1f}s before next request for {world} :: {item_name}")
    try:
        time.sleep(wait_seconds)
    except KeyboardInterrupt:
        print(f"Interrupted during rate-limit wait before {world} :: {item_name}")
        raise SystemExit(130) from None


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

    try:
        for world in selected_worlds:
            world_dir = RAW_WORLD_DIR / world
            world_dir.mkdir(parents=True, exist_ok=True)

            for item in selected_items:
                item_name = item["name"]
                path = destination_path(world, item["slug"])
                existing_rows: list[dict[str, Any]] = []
                last_run_at: str | None = None
                resolved_start_days_ago = start_days_ago

                if path.exists() and not force:
                    try:
                        existing_rows, last_run_at = load_existing_state(path)
                        resolved_start_days_ago = resolve_update_window_days(existing_rows, start_days_ago)
                    except Exception:
                        existing_rows = []
                        last_run_at = None
                        resolved_start_days_ago = start_days_ago

                if dry_run:
                    should_fetch, refresh_reason = describe_refresh_status(last_run_at)
                    if path.exists() and not force and existing_rows and not should_fetch:
                        print(f"[skip] {world} :: {item_name} ({refresh_reason}, dry-run)")
                        continue
                    mode = "update" if path.exists() and not force and existing_rows else "fetch"
                    print(f"[{mode}] {world} :: {item_name} ({refresh_reason}, dry-run)")
                    print(f"[done] {path}")
                    continue

                should_fetch, refresh_reason = describe_refresh_status(last_run_at)
                if path.exists() and not force and existing_rows and not should_fetch:
                    print(f"[skip] {world} :: {item_name} ({refresh_reason})")
                    continue

                url = build_url(world, item["id"], resolved_start_days_ago, end_days_ago)

                elapsed = time.time() - last_request_at
                if elapsed < rate_limit_delay:
                    sleep_with_interrupt(rate_limit_delay - elapsed, world=world, item_name=item_name)

                is_update = path.exists() and not force and bool(existing_rows)
                print(f"[{'update' if is_update else 'fetch'}] {world} :: {item_name} ({refresh_reason})")

                try:
                    payload = fetch_bytes(url, headers, retries)
                    incoming_rows = extract_rows(parse_json_payload(payload))
                    if not incoming_rows:
                        raise RuntimeError("Fetched payload did not contain market snapshots.")

                    run_marker = format_run_marker()
                    if is_update:
                        merged_rows = merge_rows(existing_rows, incoming_rows)
                        path.write_bytes(serialize_rows(merged_rows, run_marker))
                    else:
                        path.write_bytes(
                            serialize_rows(sorted(incoming_rows, key=snapshot_sort_key), run_marker)
                        )
                    print(f"[done] {path}")
                except Exception as error:  # noqa: BLE001
                    if is_ignorable_market_error(error):
                        print(f"[skip] {world} :: {item_name}")
                    else:
                        failures += 1
                        print(f"[fail] {world} :: {item_name}: {error}")
                finally:
                    last_request_at = time.time()
    except KeyboardInterrupt:
        print("Interrupted. Stopping cleanly.")
        return 130

    return failures


def main() -> int:
    args = parse_args()
    try:
        worlds = resolve_worlds(args.servers)
        items = resolve_items(args.items)
    except ValueError as error:
        print(error)
        return 1

    status = run(
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
    if status == 130:
        return 130
    return 1 if status else 0


if __name__ == "__main__":
    raise SystemExit(main())
