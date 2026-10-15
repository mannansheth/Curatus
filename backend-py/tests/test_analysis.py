import sys
import unittest
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import main
from helpers import sentiment_analysis as s


class ApiTests(unittest.TestCase):
    def setUp(self):
        self.calls = []
        def fake(text):
            self.calls.append(text)
            return {"emoji": "ok", "score": 8, "mood": "Positive"}
        self.client = main.create_app(fake).test_client()

    def test_health_does_not_analyze(self):
        response = self.client.get("/health")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json["service"], "journal-analysis")
        self.assertEqual(self.calls, [])

    def test_success_contract_and_trimming(self):
        response = self.client.post("/journal/entry/analyze", json={"text": "  hello  "})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json, {"success": True, "result": {"emoji": "ok", "score": 8, "mood": "Positive"}})
        self.assertEqual(self.calls, ["hello"])

    def test_invalid_payloads_do_not_analyze(self):
        for value in [None, [], "hello", {}, {"text": None}, {"text": 12}, {"text": True}, {"text": []}, {"text": {}}, {"text": ""}, {"text": " \n\t"}, {"text": "a" * 20001}]:
            with self.subTest(value=str(value)[:30]):
                response = self.client.post("/journal/entry/analyze", data=__import__('json').dumps(value), content_type="application/json")
                self.assertEqual(response.status_code, 400)
        self.assertEqual(self.calls, [])

    def test_non_json(self):
        self.assertEqual(self.client.post("/journal/entry/analyze", data="text=hello").status_code, 415)

    def test_malformed_json(self):
        self.assertEqual(self.client.post("/journal/entry/analyze", data="{", content_type="application/json").status_code, 400)

    def test_length_boundary(self):
        self.assertEqual(self.client.post("/journal/entry/analyze", json={"text": "a" * 20000}).status_code, 200)

    def test_request_size_limit(self):
        response = self.client.post("/journal/entry/analyze", data="a" * (128 * 1024 + 1), content_type="application/json")
        self.assertEqual(response.status_code, 413)
        self.assertIn("error", response.json)

    def test_failure_is_generic(self):
        def failing(text):
            raise RuntimeError("secret model path")
        app = main.create_app(failing)
        with patch.object(app.logger, "exception") as logger:
            response = app.test_client().post("/journal/entry/analyze", json={"text": "hi"})
        self.assertEqual(response.status_code, 503)
        self.assertNotIn("secret", response.get_data(as_text=True))
        logger.assert_called_once()

    def test_invalid_analyzer_results(self):
        for invalid in [None, [], {}, {"emoji": "ok", "mood": "Positive", "score": True},
                        {"emoji": "ok", "mood": "Positive", "score": float("nan")},
                        {"emoji": "ok", "mood": "Positive", "score": None},
                        {"emoji": "ok", "mood": "Positive", "score": "8"},
                        {"emoji": "ok", "mood": "Positive", "score": 8.5},
                        {"emoji": "ok", "mood": "Positive", "score": 11},
                        {"emoji": "", "mood": "Positive", "score": 8},
                        {"emoji": "ok", "mood": "unknown", "score": 8}]:
            app = main.create_app(lambda text: invalid)
            with patch.object(app.logger, "exception"):
                response = app.test_client().post("/journal/entry/analyze", json={"text": "valid"})
            self.assertEqual(response.status_code, 503)

    def test_wrong_method_and_unknown_route(self):
        self.assertEqual(self.client.get("/journal/entry/analyze").status_code, 405)
        self.assertEqual(self.client.get("/missing").status_code, 404)

    def test_cors(self):
        for origin, allowed in [("http://localhost:3000", True), ("https://unexpected.example", False)]:
            response = self.client.get("/health", headers={"Origin": origin})
            self.assertEqual("Access-Control-Allow-Origin" in response.headers, allowed)


class KeywordTests(unittest.TestCase):
    def test_all_keyword_groups(self):
        for keywords, emoji in s.KEYWORD_EMOJI_MAP:
            for keyword in keywords:
                with self.subTest(keyword=keyword):
                    # Earlier specific rules intentionally take priority over later groups.
                    result = s.get_keyword_emoji(keyword.upper())
                    self.assertIsNotNone(result)
                    self.assertIsInstance(result, str)
        self.assertEqual(s.get_keyword_emoji("100%"), s.KEYWORD_EMOJI_MAP[0][1])

    def test_priority(self):
        self.assertEqual(s.get_keyword_emoji("full marks and sick"), s.KEYWORD_EMOJI_MAP[0][1])

    def test_word_and_phrase_boundaries(self):
        for text in ["skill", "highway", "worked", "overworked", "unqualified"]:
            with self.subTest(text=text):
                self.assertIsNone(s.get_keyword_emoji(text))
        self.assertIsNotNone(s.get_keyword_emoji("I feel sick!"))
        # "full" remains a valid later rule; the achievement phrase must not win.
        self.assertNotEqual(s.get_keyword_emoji("full marksmanship"), s.KEYWORD_EMOJI_MAP[0][1])

    def test_no_keyword(self):
        self.assertIsNone(s.get_keyword_emoji("A completely ordinary sentence."))

    def test_keyword_skips_emotion_model(self):
        with patch.object(s, "emotion_pipeline") as model:
            label, emoji = s.get_emotion_emoji("full marks")
        self.assertEqual(label, "keyword_match")
        self.assertEqual(emoji, s.KEYWORD_EMOJI_MAP[0][1])
        model.assert_not_called()

    def test_dominant_emotion_and_inference_options(self):
        with patch.object(s, "emotion_pipeline", return_value=[[{"label": "sadness", "score": .1}, {"label": "joy", "score": .9}]]) as model:
            self.assertEqual(s.get_emotion_emoji("ordinary sentence"), ("joy", s.EMOTION_EMOJI_MAP["joy"]))
        model.assert_called_once_with("ordinary sentence", truncation=True, max_length=512)

    def test_unknown_emotion(self):
        with patch.object(s, "emotion_pipeline", return_value=[[{"label": "unknown", "score": .9}]]):
            self.assertEqual(s.get_emotion_emoji("ordinary sentence")[1], s.EMOTION_EMOJI_MAP["neutral"])


class ScoringTests(unittest.TestCase):
    def test_score_bounds_monotonicity_and_direction(self):
        for confidence in [0, .25, .5, .75, 1]:
            scores = [s.convert_score_to_10_scale(raw, confidence) for raw in range(-2, 3)]
            self.assertEqual(scores, sorted(scores))
            self.assertTrue(all(1 <= score <= 10 for score in scores))
        self.assertEqual(s.convert_score_to_10_scale(-2, 1), 1)
        self.assertEqual(s.convert_score_to_10_scale(2, 1), 10)
        self.assertLess(s.convert_score_to_10_scale(-1, 1), s.convert_score_to_10_scale(-1, 0))
        self.assertGreater(s.convert_score_to_10_scale(1, 1), s.convert_score_to_10_scale(1, 0))

    def test_neutral_does_not_move_with_confidence(self):
        self.assertEqual(len({s.convert_score_to_10_scale(0, c) for c in [0, .5, 1]}), 1)

    def test_invalid_score_inputs(self):
        for raw, confidence in [(3, .9), (-3, .5), (0, -1), (0, 2), (0, float("nan")), (True, .8), (1.0, .8), (0, True), (0, None), (0, "0.8"), (0, float("inf"))]:
            with self.subTest(raw=raw, confidence=confidence):
                with self.assertRaises(ValueError):
                    s.convert_score_to_10_scale(raw, confidence)

    def test_boosts_and_negative_correction(self):
        self.assertEqual(s.apply_boosts("full marks", 1, "keyword_match"), 2)
        self.assertEqual(s.apply_boosts("confident", 0, "keyword_match"), 1)
        self.assertEqual(s.apply_boosts("ordinary", 1, "joy"), 2)
        self.assertEqual(s.apply_boosts("ordinary", 2, "sadness"), 0)
        self.assertEqual(s.apply_boosts("full marks confident", 2, "joy"), 2)

    def test_boosts_preserve_negative_and_negated_claims(self):
        for text in ["not confident", "never confident", "didn't get full marks", "isn't confident"]:
            self.assertEqual(s.apply_boosts(text, 0, "keyword_match"), 0)
        self.assertEqual(s.apply_boosts("confident full marks", -1, "joy"), -1)
        self.assertEqual(s.apply_boosts("unconfident", 0, "neutral"), 0)

    def test_analyze_text_full_pipeline_contract(self):
        with patch.object(s, "get_emotion_emoji", return_value=("neutral", "ok")), patch.object(s, "sentiment_pipeline", return_value=[{"label": "Negative", "score": 1}]) as model:
            result = main.analyze_text("ordinary")
        self.assertEqual(result, {"emoji": "ok", "score": 3, "mood": "Negative"})
        model.assert_called_once_with("ordinary", truncation=True, max_length=512)

    def test_all_sentiment_labels(self):
        for label, raw in s.SENTIMENT_LABEL_MAP.items():
            with patch.object(s, "get_emotion_emoji", return_value=("neutral", "ok")), patch.object(s, "sentiment_pipeline", return_value=[{"label": label, "score": .8}]):
                result = main.analyze_text("ordinary")
                self.assertEqual(result["mood"], s.MOOD_MAP[raw])
                self.assertEqual(result["score"], s.convert_score_to_10_scale(raw, .8))

    def test_unknown_sentiment_rejected(self):
        with patch.object(s, "get_emotion_emoji", return_value=("neutral", "ok")), patch.object(s, "sentiment_pipeline", return_value=[{"label": "LABEL_9", "score": .8}]):
            with self.assertRaises(ValueError):
                main.analyze_text("ordinary")

    def test_lazy_wrappers(self):
        for wrapper, model in [(s.emotion_pipeline, s.EMOTION_MODEL), (s.sentiment_pipeline, s.SENTIMENT_MODEL)]:
            with patch.object(s, "_load_pipeline") as loader:
                loader.return_value.return_value = [{"label": "x"}]
                self.assertEqual(wrapper("text", truncation=True), [{"label": "x"}])
                loader.assert_called_once_with(model)
                loader.return_value.assert_called_once_with("text", truncation=True)

    def test_loader_cache_device_and_emotion_options(self):
        import types
        factory = __import__('unittest.mock', fromlist=['Mock']).Mock()
        fake_transformers = types.SimpleNamespace(pipeline=factory)
        fake_torch = types.SimpleNamespace(cuda=types.SimpleNamespace(is_available=lambda: False))
        s._load_pipeline.cache_clear()
        try:
            with patch.dict(sys.modules, {"transformers": fake_transformers, "torch": fake_torch}):
                s._load_pipeline(s.EMOTION_MODEL)
                s._load_pipeline(s.EMOTION_MODEL)
                factory.assert_called_once_with("text-classification", model=s.EMOTION_MODEL, device=-1, top_k=None)
                factory.reset_mock()
                fake_torch.cuda.is_available = lambda: True
                s._load_pipeline(s.SENTIMENT_MODEL)
                factory.assert_called_once_with("text-classification", model=s.SENTIMENT_MODEL, device=0)
        finally:
            s._load_pipeline.cache_clear()


if __name__ == "__main__":
    unittest.main()
