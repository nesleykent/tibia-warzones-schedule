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
        payload = {
            "Antica": {
                "timezone": "America/Sao_Paulo",
                "warzone_executions": [
                    {
                        "execution_id": 1,
                        "schedule_time": "25:61",
                        "warzone_sequence": "1-2-3",
                    }
                ],
            }
        }

        report = validate_content.validate_manual_schedules_payload(
            payload, self.valid_worlds
        )

        self.assertTrue(any("invalid time" in message for message in report.errors))

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


class ValidateWorldsTest(unittest.TestCase):
    def test_missing_required_world_field(self) -> None:
        payload = [
            {
                "name": "Antica",
            }
        ]

        report = validate_content.validate_worlds_payload(payload)

        self.assertTrue(any("missing fields" in message for message in report.errors))


if __name__ == "__main__":
    unittest.main()
