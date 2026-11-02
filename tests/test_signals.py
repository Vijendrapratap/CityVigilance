import unittest

from cityvigilance.signals import build_timeline, summarize


class SignalTests(unittest.TestCase):
    def test_ai_holds_a_smaller_queue_than_equal_rotation(self) -> None:
        fixed = summarize(build_timeline("fixed", 180))
        ai = summarize(build_timeline("ai", 180))
        self.assertLess(ai["mean_queue"], fixed["mean_queue"])
        self.assertLess(ai["peak_queue"], fixed["peak_queue"])
        self.assertGreater(ai["departed"], fixed["departed"])
        fixed_north = build_timeline("fixed", 180)[-1]["queues"]["N"]
        ai_north = build_timeline("ai", 180)[-1]["queues"]["N"]
        self.assertLess(ai_north, fixed_north)


if __name__ == "__main__":
    unittest.main()
