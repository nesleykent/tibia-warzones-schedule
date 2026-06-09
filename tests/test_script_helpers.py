from __future__ import annotations

import importlib
import json
import sys
import tempfile
import types
import unittest
from datetime import UTC, datetime, timedelta, timezone
from pathlib import Path
from unittest.mock import patch

SCRIPTS_DIR = Path(__file__).resolve().parent.parent / "scripts"
if str(SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPTS_DIR))

import common
import build_market_workflow_matrix
import fetch_item_history
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
            "last_detected_services": 1,
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
                    "last_detected_services": 1,
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

    def test_build_world_summary_uses_single_service_fields(self) -> None:
        summary = update_data.build_world_summary(
            {
                "name": "Antica",
                "location": "EU",
                "pvp_type": "Open PvP",
                "transfer_type": "regular",
                "battleye_protected": True,
                "battleye_date": "2024-01-01",
            },
            {"timezone": "America/Sao_Paulo", "warzone_executions": []},
            {"Deathstrike": 3, "Gnomevil": 3, "Abyssador": 3},
            {"services_completed": 3, "mark": "healthy"},
            True,
        )

        self.assertEqual(summary["last_detected_services"], 3)
        self.assertNotIn("warzone_services_per_day", summary)
        self.assertNotIn("performs_warzone", summary)
        self.assertNotIn("warzonesperday", summary)

    def test_main_aborts_without_saving_when_any_world_refresh_fails(self) -> None:
        worlds = [
            {
                "name": "Antica",
                "location": "EU",
                "pvp_type": "Open PvP",
                "transfer_type": "regular",
                "battleye_protected": True,
                "battleye_date": "2024-01-01",
            },
            {
                "name": "Zuna",
                "location": "EU",
                "pvp_type": "Optional PvP",
                "transfer_type": "locked",
                "battleye_protected": True,
                "battleye_date": "2024-01-01",
            },
        ]

        with (
            patch.object(update_data, "get_worlds", return_value=worlds),
            patch.object(update_data, "load_manual_schedules", return_value={}),
            patch.object(
                update_data,
                "get_kill_statistics",
                side_effect=[
                    {
                        "killstatistics": {
                            "entries": [
                                {"race": "Deathstrike", "last_day_killed": 1},
                                {"race": "Gnomevil", "last_day_killed": 1},
                                {"race": "Abyssador", "last_day_killed": 1},
                            ]
                        }
                    },
                    RuntimeError("boom"),
                ],
            ),
            patch.object(update_data, "today_iso_date", return_value="2026-06-04"),
            patch.object(update_data, "update_world_history", return_value={"history": []}),
            patch.object(update_data, "save_world_history"),
            patch.object(update_data, "normalize_worlds_payload", side_effect=lambda payload: payload),
            patch.object(update_data, "attach_ranking_metrics", side_effect=lambda payload, _: payload),
            patch.object(update_data, "save_json") as save_json,
        ):
            self.assertEqual(update_data.main(), 1)

        save_json.assert_not_called()

    def test_today_iso_date_normalizes_to_utc_calendar_day(self) -> None:
        local_now = datetime(2026, 6, 7, 21, 30, tzinfo=timezone(timedelta(hours=-3)))

        self.assertEqual(update_data.today_iso_date(local_now), "2026-06-08")

    def test_get_scheduled_refresh_gate_uses_berlin_dst_rules(self) -> None:
        before_summer_cutoff = datetime(2026, 6, 8, 1, 59, tzinfo=UTC)
        after_summer_cutoff = datetime(2026, 6, 8, 2, 5, tzinfo=UTC)
        before_winter_cutoff = datetime(2026, 1, 8, 3, 4, tzinfo=UTC)
        after_winter_cutoff = datetime(2026, 1, 8, 3, 5, tzinfo=UTC)

        self.assertFalse(update_data.get_scheduled_refresh_gate(before_summer_cutoff)[0])
        self.assertTrue(update_data.get_scheduled_refresh_gate(after_summer_cutoff)[0])
        self.assertFalse(update_data.get_scheduled_refresh_gate(before_winter_cutoff)[0])
        self.assertTrue(update_data.get_scheduled_refresh_gate(after_winter_cutoff)[0])

    def test_main_skips_scheduled_runs_before_refresh_window(self) -> None:
        with (
            patch.object(
                update_data,
                "utc_now",
                return_value=datetime(2026, 6, 8, 1, 59, tzinfo=UTC),
            ),
            patch.object(update_data, "get_worlds") as get_worlds,
        ):
            self.assertEqual(update_data.main(["--scheduled"]), 0)
            get_worlds.assert_not_called()


class WorkflowContractsTest(unittest.TestCase):
    def test_update_market_workflow_downloads_shards_into_market_tree(self) -> None:
        workflow_text = (
            Path(__file__).resolve().parent.parent / ".github" / "workflows" / "update-market.yml"
        ).read_text()

        self.assertIn('path: data/market/world/*/*_${{ matrix.item_slug }}.json', workflow_text)
        self.assertIn("path: data/market/world", workflow_text)


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

    def test_apply_maintenance_issue_preserves_existing_utilities(self) -> None:
        records = {
            "antica-castle-shop-1-alphaheart": {
                "id": "antica-castle-shop-1-alphaheart",
                "houseName": "Castle Shop 1",
                "ownerName": "Alphaheart",
                "world": "Antica",
                "town": "Edron",
                "houseId": 42,
                "status": "open",
                "utilities": {
                    "exerciseDummies": True,
                    "rewardShrine": True,
                    "imbuingShrine": False,
                    "mailbox": True,
                    "hirelings": [{"type": "Trader", "abilities": ["Trader"]}],
                },
                "source": {
                    "type": "github",
                    "url": "https://example.com/1",
                    "submitter": "tester",
                    "log": "old log",
                    "notes": "",
                    "screenshotUrl": "",
                    "issueNumber": 1,
                    "issueTitle": "old issue",
                },
                "lastSeenOpen": "2026-06-01",
                "createdAt": "2026-05-01",
                "updatedAt": "2026-06-02",
            }
        }
        issue = {
            "number": 7,
            "title": "[Open House Maintenance]: Castle Shop 1",
            "body": "\n\n".join(
                [
                    "### Request type",
                    "Edit existing open house",
                    "",
                    "### World",
                    "Antica",
                    "",
                    "### House name",
                    "Castle Shop 1",
                    "",
                    "### Reason",
                    "Correct the owner lookup.",
                    "",
                    "### Updated door inspection log",
                    "You see an open door. It belongs to house 'Castle Shop 1'. Betaheart owns this house.",
                    "",
                    "### Supporting link",
                    "https://example.com/supporting",
                ]
            ),
        }

        with patch.object(
            update_open_houses,
            "build_record_from_issue",
            return_value={
                "id": "antica-castle-shop-1-betaheart",
                "houseName": "Castle Shop 1",
                "ownerName": "Betaheart",
                "world": "Antica",
                "town": "Edron",
                "houseId": 42,
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
                    "url": "https://example.com/7",
                    "submitter": "tester",
                    "log": "new log",
                    "notes": "Correct the owner lookup.",
                    "screenshotUrl": "https://example.com/supporting",
                    "issueNumber": 7,
                    "issueTitle": "[Open House Maintenance]: Castle Shop 1",
                },
            },
        ):
            update_open_houses.apply_maintenance_issue(records, issue)

        updated = records["antica-castle-shop-1-betaheart"]
        self.assertTrue(updated["utilities"]["exerciseDummies"])
        self.assertTrue(updated["utilities"]["rewardShrine"])
        self.assertTrue(updated["utilities"]["mailbox"])
        self.assertEqual(updated["utilities"]["hirelings"][0]["type"], "Trader")
        self.assertEqual(updated["lastSeenOpen"], "2026-06-01")
        self.assertEqual(updated["createdAt"], "2026-05-01")
        self.assertEqual(updated["updatedAt"], "2026-06-02")

    def test_fetch_all_issues_paginates(self) -> None:
        first_page = [{"number": index} for index in range(1, 101)]
        second_page = [{"number": 101}]

        with (
            patch.object(update_open_houses, "GITHUB_REPOSITORY", "owner/repo"),
            patch.object(update_open_houses, "GITHUB_TOKEN", "token"),
            patch.object(
                update_open_houses,
                "github_get",
                side_effect=[first_page, second_page],
            ) as github_get,
        ):
            issues = update_open_houses.fetch_all_issues()

        self.assertEqual(len(issues), 101)
        self.assertEqual(github_get.call_count, 2)
        self.assertIn("page=1", github_get.call_args_list[0].args[0])
        self.assertIn("page=2", github_get.call_args_list[1].args[0])

    def test_build_registry_raises_with_issue_context_when_processing_fails(self) -> None:
        issues = [{"number": 9, "title": "[Open House]: broken payload", "body": "bad body"}]

        with (
            patch.object(update_open_houses, "fetch_all_issues", return_value=issues),
            patch.object(
                update_open_houses,
                "build_record_from_issue",
                side_effect=ValueError("door log mismatch"),
            ),
        ):
            with self.assertRaisesRegex(RuntimeError, r"issue #9 .*door log mismatch"):
                update_open_houses.build_registry()


class MarketHelpersTest(unittest.TestCase):
    def test_build_market_workflow_matrix_uses_name_and_slug_pairs(self) -> None:
        matrix = build_market_workflow_matrix.build_market_workflow_matrix(
            [
                {"name": "Tibia Coins", "slug": "tibia_coins", "id": 22118},
                {"name": "Gold Token", "slug": "gold_token", "id": 22721},
                {"name": "", "slug": "skip-me"},
                {"name": "Missing Slug", "slug": ""},
            ]
        )

        self.assertEqual(
            matrix,
            {
                "include": [
                    {"item_name": "Tibia Coins", "item_slug": "tibia_coins"},
                    {"item_name": "Gold Token", "item_slug": "gold_token"},
                ]
            },
        )

    def test_get_tracked_worlds_prefers_world_catalog(self) -> None:
        with tempfile.TemporaryDirectory() as tmpdir:
            tmp_path = Path(tmpdir)
            worlds_path = tmp_path / "worlds.json"
            raw_world_dir = tmp_path / "market-world"
            raw_world_dir.mkdir()
            (raw_world_dir / "Antica").mkdir()
            worlds_path.write_text(
                json.dumps(
                    [
                        {"name": "Floribra"},
                        {"name": "Antica"},
                    ]
                ),
                encoding="utf-8",
            )

            with (
                patch.object(common, "WORLDS_JSON", worlds_path),
                patch.object(common, "RAW_WORLD_DIR", raw_world_dir),
            ):
                self.assertEqual(common.get_tracked_worlds(), ["Antica", "Floribra"])

    def test_resolve_worlds_accepts_catalog_worlds(self) -> None:
        with patch.object(fetch_item_history, "get_tracked_worlds", return_value=["Antica", "Floribra"]):
            self.assertEqual(fetch_item_history.resolve_worlds(["floribra"]), ["Floribra"])


class RemoveOutliersTest(unittest.TestCase):
    def test_parse_args_defaults_to_dry_run(self) -> None:
        sys.modules.pop("remove_outliers", None)
        fake_numpy = types.SimpleNamespace(percentile=lambda values, q: 0.0)

        with patch.dict(sys.modules, {"numpy": fake_numpy}):
            module = importlib.import_module("remove_outliers")
            module = importlib.reload(module)

        self.assertFalse(module.parse_args([]).write)
        self.assertTrue(module.parse_args(["--write"]).write)


if __name__ == "__main__":
    unittest.main()
