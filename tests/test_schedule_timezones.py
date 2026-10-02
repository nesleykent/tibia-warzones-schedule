from __future__ import annotations

import json
import sys
import unittest
from datetime import UTC, date, datetime
from pathlib import Path
from zoneinfo import ZoneInfo

SCRIPTS_DIR = Path(__file__).resolve().parent.parent / "scripts"
if str(SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPTS_DIR))

import canonicalize_manual_schedules
import common
import validate_content

SUMMER = date(2026, 10, 2)  # CEST (UTC+2); Sao Paulo is UTC-3 year-round
WINTER = date(2026, 12, 1)  # CET (UTC+1)


def instant(day: date, hhmm: str, tz: str) -> datetime:
    zone = ZoneInfo(common.resolve_timezone_name(tz))
    return datetime(day.year, day.month, day.day, int(hhmm[:2]), int(hhmm[3:]), tzinfo=zone).astimezone(UTC)


def schedule(tz: str, *times: str) -> dict:
    return {
        "timezone": tz,
        "warzone_executions": [
            {"execution_id": i, "schedule_time": t, "warzone_sequence": ""}
            for i, t in enumerate(times, start=1)
        ],
    }


DST_CASES = json.loads(
    (Path(__file__).resolve().parent / "fixtures" / "dst_cases.json").read_text(encoding="utf-8")
)["cases"]


class ScheduleTimezoneTest(unittest.TestCase):
    def test_shared_dst_cases_match_javascript_contract(self) -> None:
        for case in DST_CASES:
            with self.subTest(case["label"]):
                day = date.fromisoformat(case["date"])
                self.assertEqual(
                    instant(day, case["time"], case["timezone"]).strftime("%Y-%m-%dT%H:%M"),
                    case["utc"],
                )
                self.assertEqual(
                    common.convert_schedule_time(case["time"], case["timezone"], "UTC", day),
                    case["utc"][11:],
                )

    def test_canonical_timezones_come_from_data_file(self) -> None:
        on_disk = json.loads(common.SCHEDULE_TIMEZONES_JSON.read_text(encoding="utf-8"))
        self.assertEqual(common.CANONICAL_TIMEZONE_BY_LOCATION, on_disk)
        self.assertEqual(on_disk["Europe"], "Europe/Berlin")

    def test_validator_warns_on_unclassified_world(self) -> None:
        repo_root = Path(__file__).resolve().parent.parent
        report = validate_content.validate_world_economy_coverage(
            repo_root, [{"name": "Antica"}, {"name": "Brandnewia"}]
        )
        self.assertEqual(report.errors, [])
        self.assertEqual(len(report.warnings), 1)
        self.assertIn("Brandnewia", report.warnings[0])

    def test_validator_rejects_bad_schedule_timezones(self) -> None:
        worlds = [{"name": "Antica", "location": "Europe"}]
        ok = validate_content.validate_schedule_timezones_payload({"Europe": "Europe/Berlin"}, worlds)
        self.assertEqual(ok.errors, [])
        bad = validate_content.validate_schedule_timezones_payload(
            {"Europe": "Mars/Olympus", "Atlantis": "UTC"}, worlds
        )
        self.assertEqual(len(bad.errors), 2)

    def test_european_migration_preserves_instant(self) -> None:
        source = schedule("America/Sao_Paulo", "12:55", "13:20", "13:55")
        migrated = common.canonicalize_manual_schedule(source, "Europe", SUMMER)
        self.assertEqual(migrated["timezone"], "Europe/Berlin")
        times = [e["schedule_time"] for e in migrated["warzone_executions"]]
        self.assertEqual(times, ["17:55", "18:20", "18:55"])
        for before, after in zip(["12:55", "13:20", "13:55"], times):
            self.assertEqual(
                instant(SUMMER, before, "America/Sao_Paulo"),
                instant(SUMMER, after, "Europe/Berlin"),
            )

    def test_input_timezone_normalized_to_canonical(self) -> None:
        # Entered in Sao Paulo time (including the #Curitiba display variant).
        for tz in ("America/Sao_Paulo", "America/Sao_Paulo#Curitiba"):
            result = common.canonicalize_manual_schedule(schedule(tz, "15:00"), "Europe", WINTER)
            self.assertEqual(result["timezone"], "Europe/Berlin")
            self.assertEqual(result["warzone_executions"][0]["schedule_time"], "19:00")

    def test_cet_cest_transitions(self) -> None:
        # Same Sao Paulo input maps to different Berlin wall times across DST.
        self.assertEqual(common.convert_schedule_time("15:00", "America/Sao_Paulo", "Europe/Berlin", date(2026, 10, 24)), "20:00")
        self.assertEqual(common.convert_schedule_time("15:00", "America/Sao_Paulo", "Europe/Berlin", date(2026, 10, 26)), "19:00")
        self.assertEqual(common.convert_schedule_time("15:00", "America/Sao_Paulo", "Europe/Berlin", date(2027, 3, 27)), "19:00")
        self.assertEqual(common.convert_schedule_time("15:00", "America/Sao_Paulo", "Europe/Berlin", date(2027, 3, 29)), "20:00")
        # A wall time in the spring-forward gap shifts forward (02:30 -> 03:30 CEST).
        self.assertEqual(common.convert_schedule_time("02:30", "Europe/Berlin", "UTC", date(2027, 3, 28)), "01:30")

    def test_brazil_display_follows_european_dst(self) -> None:
        # Stored European time stays fixed; Brazilian display shifts with CET/CEST.
        stored = "18:00"
        self.assertEqual(common.convert_schedule_time(stored, "Europe/Berlin", "America/Sao_Paulo", SUMMER), "13:00")
        self.assertEqual(common.convert_schedule_time(stored, "Europe/Berlin", "America/Sao_Paulo", WINTER), "14:00")

    def test_canonical_schedules_unchanged(self) -> None:
        canonical = common.canonicalize_manual_schedule(schedule("Europe/Berlin", "18:00", "??:00"), "Europe", SUMMER)
        self.assertEqual([e["schedule_time"] for e in canonical["warzone_executions"]], ["18:00", "??:00"])
        again = common.canonicalize_manual_schedule(canonical, "Europe", WINTER)
        self.assertEqual(again, canonical)

    def test_non_european_and_empty_schedules_untouched(self) -> None:
        for tz in ("America/Sao_Paulo", "America/Sao_Paulo#Curitiba"):
            original = schedule(tz, "20:00")
            self.assertEqual(common.canonicalize_manual_schedule(original, "South America", SUMMER), common.normalize_manual_schedule_payload(original))
        empty = common.canonicalize_manual_schedule(schedule("America/Sao_Paulo"), "Europe", SUMMER)
        self.assertEqual(empty["warzone_executions"], [])

    def test_migration_syncs_worlds(self) -> None:
        manual = {"Antica": schedule("America/Sao_Paulo", "12:55"), "Lobera": schedule("America/Sao_Paulo#Curitiba", "20:30")}
        worlds = [
            {"name": "Antica", "location": "Europe", "timezone": "America/Sao_Paulo", "warzone_executions": []},
            {"name": "Lobera", "location": "South America", "timezone": "America/Sao_Paulo#Curitiba", "warzone_executions": []},
        ]
        locations = {w["name"]: w["location"] for w in worlds}
        result = canonicalize_manual_schedules.canonicalize_manual_schedules(manual, locations, SUMMER)
        canonicalize_manual_schedules.sync_worlds_with_manual(worlds, result)
        self.assertEqual(worlds[0]["timezone"], "Europe/Berlin")
        self.assertEqual(worlds[0]["warzone_executions"][0]["schedule_time"], "17:55")
        self.assertEqual(worlds[1]["timezone"], "America/Sao_Paulo#Curitiba")
        self.assertEqual(validate_content.validate_manual_schedule_consistency(result, worlds).errors, [])

    def test_validator_rejects_non_canonical_european_schedule(self) -> None:
        manual = {"Antica": schedule("America/Sao_Paulo", "12:55")}
        worlds = [{"name": "Antica", "location": "Europe", "timezone": "America/Sao_Paulo", "warzone_executions": manual["Antica"]["warzone_executions"]}]
        errors = validate_content.validate_manual_schedule_consistency(manual, worlds).errors
        self.assertTrue(any("Europe/Berlin" in e for e in errors))


if __name__ == "__main__":
    unittest.main()
