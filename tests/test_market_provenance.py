from __future__ import annotations

import json
import sys
import tempfile
import unittest
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
SCRIPTS_DIR = REPO_ROOT / "scripts"
if str(SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPTS_DIR))

import common
import economic_ranking
import update_data
import validate_content


class MarketProvenanceTest(unittest.TestCase):
    def test_persisted_price_models_are_tibiamarket(self) -> None:
        model = economic_ranking.build_price_model("Tibia Coins", "tibia_coin", 43000, 41000)
        self.assertEqual(model["source"], "tibiamarket")
        worlds = json.loads((REPO_ROOT / "data" / "worlds.json").read_text(encoding="utf-8"))
        for world in worlds:
            for item_key, item in world["warzone_economic_ranking"]["market"].items():
                self.assertEqual(item["source"], "tibiamarket", f"{world['name']} {item_key}")

    def test_guard_rejects_tibinance_anywhere_in_payload(self) -> None:
        for payload in (
            {"market": {"tibia_coin": {"source": "tibinance"}}},
            [{"note": "via Tibinance"}],
            {"Tibinance": 1},
        ):
            with self.assertRaises(common.TransientMarketDataError):
                common.assert_persistable_market_payload(payload, "test")
        common.assert_persistable_market_payload({"source": "tibiamarket"}, "test")

    def test_update_data_save_json_never_writes_tibinance_values(self) -> None:
        with tempfile.TemporaryDirectory() as tmpdir:
            target = Path(tmpdir) / "worlds.json"
            with self.assertRaises(common.TransientMarketDataError):
                update_data.save_json(target, [{"tibia_coin": {"source": "tibinance", "price": 1}}])
            self.assertFalse(target.exists())

    def test_validator_rejects_persisted_tibinance_data(self) -> None:
        with tempfile.TemporaryDirectory() as tmpdir:
            data_dir = Path(tmpdir) / "data"
            (data_dir / "market").mkdir(parents=True)
            (data_dir / "worlds.json").write_text('[{"source": "tibiamarket"}]', encoding="utf-8")
            self.assertEqual(validate_content.validate_no_transient_market_data(data_dir).errors, [])
            (data_dir / "market" / "coin.json").write_text('{"source": "tibinance"}', encoding="utf-8")
            errors = validate_content.validate_no_transient_market_data(data_dir).errors
            self.assertEqual(len(errors), 1)
            self.assertIn("coin.json", errors[0])

    def test_validator_rejects_non_tibiamarket_model_source(self) -> None:
        model = economic_ranking.build_price_model("Tibia Coins", "tibia_coin", 43000, 41000)
        model.update({"rolling_window_price": 42000.0, "rolling_window_entries_used": 7, "source": "tibinance"})
        report = validate_content.ValidationReport()
        validate_content.validate_ranking_market_model(report, "Antica", "tibia_coin", model)
        self.assertTrue(any("only 'tibiamarket'" in e for e in report.errors))

    def test_python_pipelines_never_fetch_tibinance(self) -> None:
        # Tibinance is a browser-only fallback; no pipeline may reference its URL.
        for script in SCRIPTS_DIR.glob("*.py"):
            source = script.read_text(encoding="utf-8").lower()
            self.assertNotIn("github.io/tibinance", source, script.name)
            self.assertNotIn("nesleykent/tibinance", source, script.name)


if __name__ == "__main__":
    unittest.main()
