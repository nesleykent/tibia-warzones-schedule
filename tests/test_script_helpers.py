from __future__ import annotations

import sys
import unittest
from pathlib import Path

SCRIPTS_DIR = Path(__file__).resolve().parent.parent / "scripts"
if str(SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPTS_DIR))

import common
import update_data
import update_open_houses


class UpdateDataHelpersTest(unittest.TestCase):
    def test_extract_boss_kills_ignores_unknown_entries(self) -> None:
        payload = {
            "killstatistics": {
                "entries": [
                    {"race": "Deathstrike", "last_day_killed": "12 kills"},
                    {"race": "Gnomevil", "last_day_killed": 8},
                    {"race": "Abyssador", "last_day_killed": None},
                    {"race": "Unknown", "last_day_killed": 99},
                    "invalid",
                ]
            }
        }

        self.assertEqual(
            update_data.extract_boss_kills(payload),
            {
                "Deathstrike": 12,
                "Gnomevil": 8,
                "Abyssador": 0,
            },
        )

    def test_compute_services_and_mark_preserves_current_rules(self) -> None:
        self.assertEqual(
            update_data.compute_services_and_mark(3, 3, 3),
            {"services_completed": 3, "mark": "healthy"},
        )
        self.assertEqual(
            update_data.compute_services_and_mark(4, 4, 1),
            {"services_completed": 1, "mark": "trolls"},
        )
        self.assertEqual(
            update_data.compute_services_and_mark(0, 0, 0),
            {"services_completed": 0, "mark": "na"},
        )
        self.assertEqual(
            update_data.compute_services_and_mark(3, 2, 1),
            {"services_completed": 1, "mark": "inconclusive"},
        )

    def test_normalize_manual_schedule_sorts_and_reindexes_entries(self) -> None:
        schedule = {
            "timezone": "America/Sao_Paulo",
            "warzone_executions": [
                {"schedule_time": "10:00", "warzone_sequence": "1 > 2 > 3"},
                "invalid",
                {"schedule_time": " ??:00 ", "warzone_sequence": " 1 > 1 > 1 "},
                {"schedule_time": " 09:00 ", "warzone_sequence": " 1 > 3 > 2 "},
            ],
        }

        self.assertEqual(
            update_data.normalize_manual_schedule(schedule),
            {
                "timezone": "America/Sao_Paulo",
                "warzone_executions": [
                    {
                        "execution_id": 1,
                        "schedule_time": "09:00",
                        "warzone_sequence": "1 > 3 > 2",
                    },
                    {
                        "execution_id": 2,
                        "schedule_time": "10:00",
                        "warzone_sequence": "1 > 2 > 3",
                    },
                    {
                        "execution_id": 3,
                        "schedule_time": "??:00",
                        "warzone_sequence": "1 > 1 > 1",
                    },
                ],
            },
        )

    def test_normalize_worlds_payload_sorts_worlds_and_schedule_times(self) -> None:
        payload = [
            {
                "name": "Zuna",
                "warzone_executions": [
                    {"execution_id": 7, "schedule_time": "22:00", "warzone_sequence": ""},
                    {"execution_id": 2, "schedule_time": "18:00", "warzone_sequence": ""},
                ],
            },
            {
                "name": "Antica",
                "warzone_executions": [
                    {"execution_id": 5, "schedule_time": "??:00", "warzone_sequence": ""},
                    {"execution_id": 1, "schedule_time": "19:00", "warzone_sequence": ""},
                ],
            },
        ]

        normalized = common.normalize_worlds_payload(payload)

        self.assertEqual([world["name"] for world in normalized], ["Antica", "Zuna"])
        self.assertEqual(
            [entry["schedule_time"] for entry in normalized[0]["warzone_executions"]],
            ["19:00", "??:00"],
        )
        self.assertEqual(
            [entry["schedule_time"] for entry in normalized[1]["warzone_executions"]],
            ["18:00", "22:00"],
        )

    def test_validate_world_record_allows_exact_unknown_placeholder(self) -> None:
        record = {
            "name": "Antica",
            "tracks_warzone_service": True,
            "warzone_services_per_day": 1,
            "mark": "healthy",
            "has_service_history": True,
            "last_detected_kills": {"Deathstrike": 1, "Gnomevil": 1, "Abyssador": 1},
            "warzone_executions": [
                {
                    "execution_id": 1,
                    "schedule_time": "??:00",
                    "warzone_sequence": "1-2-3",
                }
            ],
        }

        self.assertEqual(update_data.validate_world_record(record), [])

    def test_validate_world_record_rejects_malformed_placeholder_times(self) -> None:
        invalid_times = ["24:00", "29:59", "20:?0", "2?:59", "??:30", "ab:cd"]

        for invalid_time in invalid_times:
            with self.subTest(invalid_time=invalid_time):
                record = {
                    "name": "Antica",
                    "tracks_warzone_service": True,
                    "warzone_services_per_day": 1,
                    "mark": "healthy",
                    "has_service_history": True,
                    "last_detected_kills": {
                        "Deathstrike": 1,
                        "Gnomevil": 1,
                        "Abyssador": 1,
                    },
                    "warzone_executions": [
                        {
                            "execution_id": 1,
                            "schedule_time": invalid_time,
                            "warzone_sequence": "1-2-3",
                        }
                    ],
                }

                self.assertTrue(
                    any(
                        "schedule_time inválido" in message
                        for message in update_data.validate_world_record(record)
                    )
                )


class UpdateOpenHousesHelpersTest(unittest.TestCase):
    def test_parse_sections_normalizes_escaped_newlines(self) -> None:
        body = "### Notes\\n\\nFirst line\\nSecond line\\n\\n### Screenshot URL\\n\\nhttps://example.com"

        self.assertEqual(
            update_open_houses.parse_sections(body),
            {
                "Notes": "First line\nSecond line",
                "Screenshot URL": "https://example.com",
            },
        )

    def test_parse_hirelings_preserves_project_order(self) -> None:
        value = "- [x] Trader\n- [x] Apprentice\n- [x] Cook\n- [ ] Banker"

        self.assertEqual(
            update_open_houses.parse_hirelings(value),
            ["Apprentice", "Trader", "Cook"],
        )

    def test_parse_open_door_log_extracts_house_and_owner(self) -> None:
        log = (
            "You see an open door. It belongs to house 'The Market 4'. "
            "Qdox owns this house."
        )

        self.assertEqual(
            update_open_houses.parse_open_door_log(log),
            ("The Market 4", "Qdox"),
        )

    def test_normalize_open_houses_payload_sorts_by_world_town_house(self) -> None:
        payload = [
            {"world": "Zuna", "town": "Venore", "houseName": "Beta"},
            {"world": "Antica", "town": "Thais", "houseName": "Omega"},
            {"world": "Antica", "town": "Carlin", "houseName": "Alpha"},
        ]

        normalized = common.normalize_open_houses_payload(payload)

        self.assertEqual(
            [(record["world"], record["town"], record["houseName"]) for record in normalized],
            [
                ("Antica", "Carlin", "Alpha"),
                ("Antica", "Thais", "Omega"),
                ("Zuna", "Venore", "Beta"),
            ],
        )


if __name__ == "__main__":
    unittest.main()
