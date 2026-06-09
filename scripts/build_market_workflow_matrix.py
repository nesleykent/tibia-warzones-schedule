from __future__ import annotations

import json
from typing import Any

from common import discover_tracked_items


def build_market_workflow_matrix(items: list[dict[str, Any]]) -> dict[str, list[dict[str, str]]]:
    include: list[dict[str, str]] = []

    for item in items:
        item_name = str(item.get("name", "")).strip()
        item_slug = str(item.get("slug", "")).strip()
        if not item_name or not item_slug:
            continue
        include.append(
            {
                "item_name": item_name,
                "item_slug": item_slug,
            }
        )

    return {"include": include}


def main() -> int:
    matrix = build_market_workflow_matrix(discover_tracked_items())
    print(json.dumps(matrix, separators=(",", ":"), ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
