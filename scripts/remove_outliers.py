from __future__ import annotations

import hashlib
import json
from pathlib import Path
from typing import Any

import numpy as np

from common import RAW_WORLD_DIR

PRICE_KEYS = (
    "buy_offer",
    "sell_offer",
    "day_average_sell",
    "month_average_sell",
    "month_average_buy",
    "day_average_buy",
    "day_highest_sell",
    "day_lowest_sell",
    "day_highest_buy",
    "day_lowest_buy",
)

CANDIDATE_ROW_KEYS = ("data", "results", "history", "items", "snapshots")
META_KEY = "_outlier_cleanup"

LOWER_PERCENTILE = 1.5
UPPER_PERCENTILE = 98.5

# 0 uses all accepted history as reference.
# Set to a positive integer like 90 or 180 if you want a rolling window.
WINDOW_SIZE = 0

# True prints what would happen and writes nothing.
DRY_RUN = False

# 8 bytes gives a short compact fingerprint with very low collision risk here.
FINGERPRINT_SIZE_BYTES = 8


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
        for key in CANDIDATE_ROW_KEYS:
            if key not in payload:
                continue
            rows = extract_rows(payload[key])
            if rows:
                return rows

    return []


def _replace_rows_recursive(payload: Any, cleaned_rows: list[dict[str, Any]]) -> tuple[Any, bool]:
    if isinstance(payload, list):
        if payload and all(isinstance(row, dict) for row in payload):
            return cleaned_rows, True

        replaced_any = False
        new_list: list[Any] = []
        for item in payload:
            replaced_item, did_replace = _replace_rows_recursive(item, cleaned_rows)
            new_list.append(replaced_item)
            replaced_any = replaced_any or did_replace
        return new_list, replaced_any

    if isinstance(payload, dict):
        updated = dict(payload)
        for key in CANDIDATE_ROW_KEYS:
            if key not in updated:
                continue
            replaced_value, did_replace = _replace_rows_recursive(updated[key], cleaned_rows)
            if did_replace:
                updated[key] = replaced_value
                return updated, True
        return updated, False

    return payload, False


def replace_rows_in_payload(payload: Any, cleaned_rows: list[dict[str, Any]]) -> Any:
    replaced_payload, did_replace = _replace_rows_recursive(payload, cleaned_rows)
    if did_replace:
        return replaced_payload

    if isinstance(payload, dict):
        updated = dict(payload)
        updated["snapshots"] = [cleaned_rows]
        return updated

    return [cleaned_rows]


def row_fingerprint(row: dict[str, Any]) -> str:
    canonical = json.dumps(row, sort_keys=True, separators=(",", ":"), ensure_ascii=False)
    return hashlib.blake2b(
        canonical.encode("utf-8"),
        digest_size=FINGERPRINT_SIZE_BYTES,
    ).hexdigest()


def load_metadata(payload: Any) -> dict[str, Any]:
    if isinstance(payload, dict):
        meta = payload.get(META_KEY)
        if isinstance(meta, dict):
            return meta
    return {}


def store_metadata(
    payload: Any,
    *,
    accepted_fingerprints: set[str],
    rejected_fingerprints: set[str],
) -> Any:
    if isinstance(payload, dict):
        updated = dict(payload)
    else:
        updated = {"snapshots": payload if isinstance(payload, list) else []}

    updated[META_KEY] = {
        "version": 1,
        "lower_percentile": LOWER_PERCENTILE,
        "upper_percentile": UPPER_PERCENTILE,
        "window_size": WINDOW_SIZE,
        "accepted_fingerprints": sorted(accepted_fingerprints),
        "rejected_fingerprints": sorted(rejected_fingerprints),
    }
    return updated


def get_bounds(
    values: list[float],
    lower_percentile: float,
    upper_percentile: float,
) -> tuple[float | None, float | None]:
    clean_values = [value for value in values if value > 0]
    if not clean_values:
        return None, None

    lower_bound = float(np.percentile(clean_values, lower_percentile))
    upper_bound = float(np.percentile(clean_values, upper_percentile))
    return lower_bound, upper_bound


def collect_prices(rows: list[dict[str, Any]]) -> list[float]:
    prices: list[float] = []
    for observation in rows:
        if not isinstance(observation, dict):
            continue
        for key in PRICE_KEYS:
            value = observation.get(key, -1)
            if isinstance(value, (int, float)):
                prices.append(float(value))
    return prices


def is_valid_observation(
    observation: dict[str, Any],
    lower_limit: float | None,
    upper_limit: float | None,
) -> bool:
    for key in PRICE_KEYS:
        value = observation.get(key)

        if not isinstance(value, (int, float)):
            continue

        if value == 0 or value < -1:
            return False

        if value != -1 and lower_limit is not None and upper_limit is not None:
            if value < lower_limit or value > upper_limit:
                return False

    return True


def iter_json_files() -> list[Path]:
    return sorted(RAW_WORLD_DIR.rglob("*.json"))


def split_rows(
    rows: list[dict[str, Any]],
    accepted_fingerprints: set[str],
    rejected_fingerprints: set[str],
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    accepted_rows: list[dict[str, Any]] = []
    unseen_rows: list[dict[str, Any]] = []

    for row in rows:
        fp = row_fingerprint(row)
        if fp in accepted_fingerprints:
            accepted_rows.append(row)
            continue
        if fp in rejected_fingerprints:
            continue
        unseen_rows.append(row)

    return accepted_rows, unseen_rows


def process_file(path: Path) -> tuple[int, int]:
    payload = json.loads(path.read_text(encoding="utf-8"))
    rows = extract_rows(payload)
    if not rows:
        return 0, 0

    metadata = load_metadata(payload)
    accepted_fingerprints = set(metadata.get("accepted_fingerprints", []))
    rejected_fingerprints = set(metadata.get("rejected_fingerprints", []))

    accepted_rows, unseen_rows = split_rows(
        rows,
        accepted_fingerprints=accepted_fingerprints,
        rejected_fingerprints=rejected_fingerprints,
    )

    first_run = not accepted_fingerprints and not rejected_fingerprints
    if first_run:
        accepted_rows = []
        unseen_rows = rows

    reference_rows = accepted_rows
    if WINDOW_SIZE > 0 and len(reference_rows) > WINDOW_SIZE:
        reference_rows = reference_rows[-WINDOW_SIZE:]

    if reference_rows:
        lower_limit, upper_limit = get_bounds(
            collect_prices(reference_rows),
            lower_percentile=LOWER_PERCENTILE,
            upper_percentile=UPPER_PERCENTILE,
        )
    else:
        lower_limit, upper_limit = get_bounds(
            collect_prices(unseen_rows),
            lower_percentile=LOWER_PERCENTILE,
            upper_percentile=UPPER_PERCENTILE,
        )

    accepted_new_rows: list[dict[str, Any]] = []
    rejected_new_count = 0

    for row in unseen_rows:
        fp = row_fingerprint(row)
        if is_valid_observation(row, lower_limit, upper_limit):
            accepted_new_rows.append(row)
            accepted_fingerprints.add(fp)
        else:
            rejected_fingerprints.add(fp)
            rejected_new_count += 1

    if not unseen_rows:
        print(f"{path}: no new rows")
        return len(rows), 0

    final_rows = accepted_rows + accepted_new_rows

    if DRY_RUN:
        print(
            f"[dry-run] {path}: new_rows={len(unseen_rows)}, "
            f"accepted={len(accepted_new_rows)}, rejected={rejected_new_count}"
        )
        return len(rows), rejected_new_count

    updated_payload = replace_rows_in_payload(payload, final_rows)
    updated_payload = store_metadata(
        updated_payload,
        accepted_fingerprints=accepted_fingerprints,
        rejected_fingerprints=rejected_fingerprints,
    )

    path.write_text(
        json.dumps(updated_payload, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )

    print(
        f"{path}: new_rows={len(unseen_rows)}, "
        f"accepted={len(accepted_new_rows)}, rejected={rejected_new_count}"
    )
    return len(rows), rejected_new_count


def main() -> int:
    files = iter_json_files()
    if not files:
        print(f"No JSON files found under {RAW_WORLD_DIR}")
        return 1

    processed_files = 0
    total_rejected = 0

    for path in files:
        try:
            original_count, rejected_count = process_file(path)
        except Exception as error:
            print(f"Failed {path}: {error}")
            continue

        if original_count <= 0:
            continue

        processed_files += 1
        total_rejected += rejected_count

    print(
        f"Done. Processed {processed_files} files. "
        f"Rejected {total_rejected} new outliers."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())