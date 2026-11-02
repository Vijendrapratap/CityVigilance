import unittest

from cityvigilance.sample import (
    DEMO_PLATE,
    accident_event,
    crowd_event,
    movement_event,
    plate_event,
    run_model,
    traffic_event,
    weapon_event,
)


class SampleModelTests(unittest.TestCase):
    def test_crowd_count_follows_the_shared_list(self) -> None:
        self.assertEqual(crowd_event(0, "t")["finding"]["count"], 46)
        self.assertEqual(crowd_event(1, "t")["finding"]["count"], 48)
        self.assertEqual(run_model("crowd", 4)["finding"]["count"], 53)

    def test_weapon_is_a_possible_blade_on_the_sample_counts(self) -> None:
        event = weapon_event(0, "t")
        self.assertEqual(event["finding"]["kind"], "blade")
        self.assertEqual(event["strength"], "review")
        self.assertEqual(event["source"], "sample")

    def test_accident_marks_a_crash_for_review(self) -> None:
        event = accident_event(3, "t")
        self.assertTrue(event["finding"]["crash"])
        self.assertEqual(event["cameraId"], "cam-road")

    def test_traffic_plan_differs_from_the_current_greens(self) -> None:
        arms = traffic_event(0, "t")["finding"]["arms"]
        self.assertEqual([arm["name"] for arm in arms], ["North", "East", "South", "West"])
        self.assertEqual(arms[0]["queueMetres"], 62)
        self.assertEqual(arms[0]["greenSeconds"], 31)
        self.assertNotEqual(arms[0]["greenSeconds"], arms[0]["currentGreenSeconds"])

    def test_sample_movement_is_marked_for_review(self) -> None:
        event = movement_event(0, "t")
        self.assertEqual(event["finding"]["level"], "sudden")
        self.assertEqual(event["finding"]["people"], 46)
        self.assertEqual(event["strength"], "review")

    def test_sample_plate_is_labeled_as_demo_data(self) -> None:
        event = plate_event(0, "t")
        self.assertEqual(event["finding"]["text"], DEMO_PLATE)
        self.assertTrue(event["finding"]["listed"])
        self.assertIn("not a real registration", event["finding"]["complaint"])


if __name__ == "__main__":
    unittest.main()
