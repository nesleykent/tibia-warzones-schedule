from __future__ import annotations

import json
from pathlib import Path

from economic_ranking import attach_ranking_metrics

ROOT_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT_DIR / "data"
WORLDS_PATH = DATA_DIR / "worlds.json"


def main() -> int:
    with WORLDS_PATH.open("r", encoding="utf-8") as file:
        worlds = json.load(file)

    if not isinstance(worlds, list):
        raise ValueError("data/worlds.json must contain a list of worlds")

    enriched = attach_ranking_metrics(worlds, DATA_DIR)

    with WORLDS_PATH.open("w", encoding="utf-8") as file:
        json.dump(enriched, file, ensure_ascii=False, indent=2)
        file.write("\n")

    ranked_count = sum(
        1 for world in enriched if world["warzone_economic_ranking"]["is_ranked"]
    )
    print(f"Updated {len(enriched)} worlds")
    print(f"Ranked worlds: {ranked_count}")
    print(f"Output: {WORLDS_PATH}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
