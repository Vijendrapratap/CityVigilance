import unittest

from cityvigilance.analyze import build_event
from cityvigilance.sample import check_event


class AnalyzeTests(unittest.TestCase):
    def test_crowd_uses_the_peak_people_count(self) -> None:
        event = build_event("crowd", [{"person": 2}, {"person": 5, "car": 1}, {"person": 3}], "t")
        check_event(event)
        self.assertEqual(event["finding"]["count"], 5)
        self.assertEqual(event["source"], "local")
        self.assertEqual(event["cameraId"], "cam-crowd")

    def test_weapon_clip_does_not_invent_a_blade(self) -> None:
        event = build_event("weapon", [{"person": 8}], "t")
        self.assertEqual(event["finding"]["kind"], "none")
        self.assertIn("weapon model", event["note"])

    def test_accident_clip_is_left_for_the_officer(self) -> None:
        event = build_event("accident", [{"car": 2}], "t")
        self.assertIsNone(event["finding"]["crash"])
        self.assertIn("112", event["note"])

    def test_traffic_scale_uses_vehicles_in_the_frame(self) -> None:
        frames = [{"car": 4, "motorcycle": 2}, {"car": 9, "bus": 1, "motorcycle": 3}]
        event = build_event("traffic", frames, "t")
        arm = event["finding"]["arms"][0]
        self.assertEqual(event["finding"]["basis"], "vehicles")
        self.assertEqual(arm["name"], "In view")
        self.assertEqual(arm["vehicles"], 13)
        self.assertEqual(arm["greenSeconds"], 26)
        self.assertEqual(arm["queueMetres"], 0)

    def test_movement_is_sudden_only_when_the_count_jumps(self) -> None:
        sudden = build_event("movement", [{"person": 2}, {"person": 10}], "t")
        steady = build_event("movement", [{"person": 8}, {"person": 9}], "t")
        quiet = build_event("movement", [{"person": 1}, {"person": 4}], "t")
        self.assertEqual(sudden["finding"]["level"], "sudden")
        self.assertEqual(sudden["strength"], "review")
        self.assertEqual(steady["finding"]["level"], "steady")
        self.assertEqual(quiet["finding"]["level"], "steady")

    def test_a_clip_does_not_invent_a_plate(self) -> None:
        event = build_event("plate", [{"car": 4}], "t")
        self.assertEqual(event["finding"]["text"], "")
        self.assertFalse(event["finding"]["listed"])
        self.assertIn("plate reader", event["note"])

    def test_a_quiet_road_does_not_propose_a_new_green(self) -> None:
        event = build_event("traffic", [{"car": 1}], "t")
        arm = event["finding"]["arms"][0]
        self.assertEqual(arm["vehicles"], 1)
        self.assertEqual(arm["greenSeconds"], arm["currentGreenSeconds"])


if __name__ == "__main__":
    unittest.main()
