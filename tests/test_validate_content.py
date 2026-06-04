from __future__ import annotations

import sys
import tempfile
import unittest
from pathlib import Path

SCRIPTS_DIR = Path(__file__).resolve().parent.parent / "scripts"
if str(SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPTS_DIR))

import validate_content


class ValidateManualSchedulesTest(unittest.TestCase):
    def setUp(self) -> None:
        self.valid_worlds = {"Antica", "Gentebra"}

    def test_valid_schedule_entry(self) -> None:
        payload = {
            "Antica": {
                "timezone": "America/Sao_Paulo",
                "warzone_executions": [
                    {
                        "execution_id": 1,
                        "schedule_time": "19:00",
                        "warzone_sequence": "1-2-3",
                    }
                ],
            }
        }

        report = validate_content.validate_manual_schedules_payload(
            payload, self.valid_worlds
        )

        self.assertEqual(report.errors, [])
        self.assertEqual(report.warnings, [])

    def test_unknown_time_is_allowed_but_sorted_after_known_times(self) -> None:
        payload = {
            "Antica": {
                "timezone": "America/Sao_Paulo",
                "warzone_executions": [
                    {
                        "execution_id": 1,
                        "schedule_time": "19:00",
                        "warzone_sequence": "1-2-3",
                    },
                    {
                        "execution_id": 2,
                        "schedule_time": "??:00",
                        "warzone_sequence": "1-3-2",
                    },
                ],
            }
        }

        report = validate_content.validate_manual_schedules_payload(
            payload, self.valid_worlds
        )

        self.assertEqual(report.errors, [])
        self.assertEqual(report.warnings, [])

    def test_invalid_world_name(self) -> None:
        payload = {
            "UnknownWorld": {
                "timezone": "America/Sao_Paulo",
                "warzone_executions": [],
            }
        }

        report = validate_content.validate_manual_schedules_payload(
            payload, self.valid_worlds
        )

        self.assertTrue(any("unknown world" in message for message in report.errors))

    def test_invalid_time(self) -> None:
        invalid_times = ["24:00", "29:59", "20:?0", "2?:59", "??:30", "ab:cd"]

        for invalid_time in invalid_times:
            with self.subTest(invalid_time=invalid_time):
                payload = {
                    "Antica": {
                        "timezone": "America/Sao_Paulo",
                        "warzone_executions": [
                            {
                                "execution_id": 1,
                                "schedule_time": invalid_time,
                                "warzone_sequence": "1-2-3",
                            }
                        ],
                    }
                }

                report = validate_content.validate_manual_schedules_payload(
                    payload, self.valid_worlds
                )

                self.assertTrue(
                    any(
                        "invalid time" in message and repr(invalid_time) in message
                        for message in report.errors
                    )
                )

    def test_duplicate_schedule_time(self) -> None:
        payload = {
            "Antica": {
                "timezone": "America/Sao_Paulo",
                "warzone_executions": [
                    {
                        "execution_id": 1,
                        "schedule_time": "19:00",
                        "warzone_sequence": "1-2-3",
                    },
                    {
                        "execution_id": 2,
                        "schedule_time": "19:00",
                        "warzone_sequence": "1-3-2",
                    },
                ],
            }
        }

        report = validate_content.validate_manual_schedules_payload(
            payload, self.valid_worlds
        )

        self.assertTrue(any("duplicate schedule_time" in message for message in report.errors))

    def test_invalid_order(self) -> None:
        payload = {
            "Antica": {
                "timezone": "America/Sao_Paulo",
                "warzone_executions": [
                    {
                        "execution_id": 1,
                        "schedule_time": "19:00",
                        "warzone_sequence": "3-2-1",
                    }
                ],
            }
        }

        report = validate_content.validate_manual_schedules_payload(
            payload, self.valid_worlds
        )

        self.assertTrue(any("invalid warzone_sequence" in message for message in report.errors))

    def test_world_sorting_warning(self) -> None:
        payload = {
            "Gentebra": {
                "timezone": "America/Sao_Paulo",
                "warzone_executions": [],
            },
            "Antica": {
                "timezone": "America/Sao_Paulo",
                "warzone_executions": [],
            },
        }

        report = validate_content.validate_manual_schedules_payload(
            payload, self.valid_worlds
        )

        self.assertTrue(any("world keys are out of order" in message for message in report.warnings))

    def test_schedule_sorting_warning(self) -> None:
        payload = {
            "Antica": {
                "timezone": "America/Sao_Paulo",
                "warzone_executions": [
                    {
                        "execution_id": 1,
                        "schedule_time": "22:00",
                        "warzone_sequence": "1-2-3",
                    },
                    {
                        "execution_id": 2,
                        "schedule_time": "18:00",
                        "warzone_sequence": "1-3-2",
                    },
                ],
            }
        }

        report = validate_content.validate_manual_schedules_payload(
            payload, self.valid_worlds
        )

        self.assertTrue(any("schedule times are out of order" in message for message in report.warnings))


class ValidateMarketDefinitionsTest(unittest.TestCase):
    def test_duplicate_market_item_id(self) -> None:
        rows = [
            {"name": "Tibia Coins", "id": 22118},
            {"name": "Gill Necklace", "id": 22118},
        ]

        report = validate_content.validate_market_catalog_payload(rows)

        self.assertTrue(any("duplicate item id" in message for message in report.errors))

    def test_tracked_item_missing_from_catalog(self) -> None:
        rows = [{"name": "Tibia Coins", "id": 22118}]

        report = validate_content.validate_tracked_items_payload(
            ["Missing Item"],
            rows,
            validate_content.MARKET_WORLD_DIR,
        )

        self.assertTrue(any("missing from data/market/items/items.csv" in message for message in report.errors))

    def test_missing_market_coverage_is_warning_only(self) -> None:
        rows = [{"name": "Tibia Coins", "id": 22118}]

        with tempfile.TemporaryDirectory() as tmpdir:
            market_world_dir = Path(tmpdir)
            (market_world_dir / "antica").mkdir()

            report = validate_content.validate_tracked_items_payload(
                ["Tibia Coins"],
                rows,
                market_world_dir,
            )

        self.assertEqual(report.errors, [])
        self.assertTrue(any("market coverage: missing market file" in message for message in report.warnings))


class ValidateOpenHousesTest(unittest.TestCase):
    def test_duplicate_open_house(self) -> None:
        payload = [
            {
                "id": "one",
                "houseId": 100,
                "houseName": "House A",
                "ownerName": "Owner A",
                "world": "Antica",
                "town": "Thais",
                "status": "open",
                "utilities": {
                    "exerciseDummies": False,
                    "rewardShrine": False,
                    "imbuingShrine": False,
                    "mailbox": False,
                    "hirelings": [],
                },
                "source": {
                    "type": "github",
                    "url": "https://example.com/1",
                    "submitter": "tester",
                    "log": "log",
                    "notes": "",
                    "screenshotUrl": "",
                    "issueNumber": 1,
                    "issueTitle": "issue 1",
                },
            },
            {
                "id": "two",
                "houseId": 100,
                "houseName": "House B",
                "ownerName": "Owner B",
                "world": "Antica",
                "town": "Thais",
                "status": "open",
                "utilities": {
                    "exerciseDummies": False,
                    "rewardShrine": False,
                    "imbuingShrine": False,
                    "mailbox": False,
                    "hirelings": [],
                },
                "source": {
                    "type": "github",
                    "url": "https://example.com/2",
                    "submitter": "tester",
                    "log": "log",
                    "notes": "",
                    "screenshotUrl": "",
                    "issueNumber": 2,
                    "issueTitle": "issue 2",
                },
            },
        ]

        report = validate_content.validate_open_houses_payload(payload, {"Antica"})

        self.assertTrue(any("duplicate houseId" in message for message in report.errors))

    def test_open_house_sorting_warning(self) -> None:
        payload = [
            {
                "id": "zeta",
                "houseId": 101,
                "houseName": "Zulu",
                "ownerName": "Owner A",
                "world": "Zuna",
                "town": "Venore",
                "status": "open",
                "utilities": {
                    "exerciseDummies": False,
                    "rewardShrine": False,
                    "imbuingShrine": False,
                    "mailbox": False,
                    "hirelings": [],
                },
                "source": {
                    "type": "github",
                    "url": "https://example.com/1",
                    "submitter": "tester",
                    "log": "log",
                    "notes": "",
                    "screenshotUrl": "",
                    "issueNumber": 1,
                    "issueTitle": "issue 1",
                },
            },
            {
                "id": "alpha",
                "houseId": 102,
                "houseName": "Alpha",
                "ownerName": "Owner B",
                "world": "Antica",
                "town": "Carlin",
                "status": "open",
                "utilities": {
                    "exerciseDummies": False,
                    "rewardShrine": False,
                    "imbuingShrine": False,
                    "mailbox": False,
                    "hirelings": [],
                },
                "source": {
                    "type": "github",
                    "url": "https://example.com/2",
                    "submitter": "tester",
                    "log": "log",
                    "notes": "",
                    "screenshotUrl": "",
                    "issueNumber": 2,
                    "issueTitle": "issue 2",
                },
            },
        ]

        report = validate_content.validate_open_houses_payload(payload, {"Antica", "Zuna"})

        self.assertTrue(any("records are out of order" in message for message in report.warnings))


class ValidateWorldsTest(unittest.TestCase):
    def test_missing_required_world_field(self) -> None:
        payload = [
            {
                "name": "Antica",
            }
        ]

        report = validate_content.validate_worlds_payload(payload)

        self.assertTrue(any("missing fields" in message for message in report.errors))

    def test_world_sorting_warning(self) -> None:
        payload = [
            {
                "name": "Zuna",
                "location": "EU",
                "pvp_type": "Open PvP",
                "transfer_type": "regular",
                "battleye_protected": True,
                "battleye_date": "2024-01-01",
                "tracks_warzone_service": False,
                "timezone": None,
                "last_detected_kills": {"Deathstrike": 0, "Gnomevil": 0, "Abyssador": 0},
                "last_detected_services": 0,
                "mark": "na",
                "has_service_history": False,
                "warzone_executions": [],
                "warzone_economic_ranking": {
                    "is_ranked": False,
                    "insufficient_data": True,
                    "insufficient_data_reasons": [],
                    "ranking_position": None,
                    "economic_score_raw": None,
                    "market_liquidity_score": None,
                    "warzone_health_score": None,
                    "final_score": None,
                    "history_health_score": None,
                    "current_operational_score": None,
                    "expected_services": 0,
                    "rolling_window_entries_target": 0,
                    "wz1_expected_value": None,
                    "wz2_expected_value": None,
                    "wz3_expected_value": None,
                    "service_expected_value": None,
                    "current_mark_value": None,
                    "history_last_five_days": [],
                    "market": {
                        "tibia_coin": self._price_model("tibia_coin"),
                        "minor_crystalline_token": self._price_model("minor_crystalline_token"),
                        "gill_necklace": self._price_model("gill_necklace"),
                        "prismatic_necklace": self._price_model("prismatic_necklace"),
                        "prismatic_ring": self._price_model("prismatic_ring"),
                    },
                },
            },
            {
                "name": "Antica",
                "location": "EU",
                "pvp_type": "Open PvP",
                "transfer_type": "regular",
                "battleye_protected": True,
                "battleye_date": "2024-01-01",
                "tracks_warzone_service": True,
                "timezone": "America/Sao_Paulo",
                "last_detected_kills": {"Deathstrike": 1, "Gnomevil": 1, "Abyssador": 1},
                "last_detected_services": 1,
                "mark": "healthy",
                "has_service_history": True,
                "warzone_executions": [
                    {"execution_id": 1, "schedule_time": "22:00", "warzone_sequence": "1-2-3"},
                    {"execution_id": 2, "schedule_time": "18:00", "warzone_sequence": "1-3-2"},
                ],
                "warzone_economic_ranking": {
                    "is_ranked": True,
                    "insufficient_data": False,
                    "insufficient_data_reasons": [],
                    "ranking_position": 1,
                    "economic_score_raw": 1.0,
                    "market_liquidity_score": 1.0,
                    "warzone_health_score": 1.0,
                    "final_score": 1.0,
                    "history_health_score": 1.0,
                    "current_operational_score": 1.0,
                    "expected_services": 1,
                    "rolling_window_entries_target": 1,
                    "wz1_expected_value": 1.0,
                    "wz2_expected_value": 1.0,
                    "wz3_expected_value": 1.0,
                    "service_expected_value": 1.0,
                    "current_mark_value": 1.0,
                    "history_last_five_days": [],
                    "market": {
                        "tibia_coin": self._price_model("tibia_coin"),
                        "minor_crystalline_token": self._price_model("minor_crystalline_token"),
                        "gill_necklace": self._price_model("gill_necklace"),
                        "prismatic_necklace": self._price_model("prismatic_necklace"),
                        "prismatic_ring": self._price_model("prismatic_ring"),
                    },
                },
            },
        ]

        report = validate_content.validate_worlds_payload(payload)

        self.assertTrue(any("world list is out of order" in message for message in report.warnings))
        self.assertTrue(any("schedule times are out of order" in message for message in report.warnings))

    @staticmethod
    def _price_model(item_key: str) -> dict[str, object]:
        return {
            "item_name": item_key,
            "item_key": item_key,
            "supply_price": 1.0,
            "demand_price": 1.0,
            "mid_price": 1.0,
            "spread": 0.0,
            "spread_ratio": 0.0,
            "liquidity_factor": 1.0,
            "adjusted_effective_price": 1.0,
            "has_required_data": True,
            "rolling_window_price": 1.0,
            "rolling_window_entries_used": 1,
        }


if __name__ == "__main__":
    unittest.main()
