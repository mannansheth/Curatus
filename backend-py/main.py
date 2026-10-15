"""HTTP boundary for journal mood analysis. Model weights are loaded lazily."""
import os
from flask import Flask, request, jsonify
from flask_cors import CORS
from werkzeug.exceptions import HTTPException
from helpers import sentiment_analysis as s

MAX_TEXT_LENGTH = 20000


def analyze_text(text: str) -> dict:
    emotion_label, emoji = s.get_emotion_emoji(text)
    result = s.sentiment_pipeline(text, truncation=True, max_length=512)[0]
    if result["label"] not in s.SENTIMENT_LABEL_MAP:
        raise ValueError("Unsupported sentiment label")
    raw = s.apply_boosts(text, s.SENTIMENT_LABEL_MAP[result["label"]], emotion_label)
    return {"emoji": emoji, "score": s.convert_score_to_10_scale(raw, result["score"]),
            "mood": s.MOOD_MAP[raw]}


def create_app(analyzer=None):
    app = Flask(__name__)
    app.config["MAX_CONTENT_LENGTH"] = 128 * 1024
    CORS(app, origins=os.getenv("CORS_ORIGINS", "http://localhost:3000").split(","))
    analyze_fn = analyzer or analyze_text

    @app.get("/health")
    def health():
        # Liveness only: no model download or inference.
        return jsonify({"success": True, "service": "journal-analysis"})

    @app.post("/journal/entry/analyze")
    def analyze():
        if not request.is_json:
            return jsonify({"error": "Content-Type must be application/json"}), 415
        data = request.get_json(silent=True)
        if not isinstance(data, dict) or "text" not in data:
            return jsonify({"error": "Missing 'text' field"}), 400
        text = data["text"]
        if not isinstance(text, str) or not text.strip():
            return jsonify({"error": "'text' must be a non-empty string"}), 400
        if len(text) > MAX_TEXT_LENGTH:
            return jsonify({"error": f"'text' must be at most {MAX_TEXT_LENGTH} characters"}), 400
        try:
            result = analyze_fn(text.strip())
            if (not isinstance(result, dict)
                    or result.get("mood") not in s.SENTIMENT_LABEL_MAP
                    or not isinstance(result.get("emoji"), str) or not result["emoji"].strip()
                    or type(result.get("score")) is not int or not 1 <= result["score"] <= 10):
                raise ValueError("Invalid analyzer result")
            return jsonify({"success": True, "result": result})
        except Exception:
            app.logger.exception("Journal analysis failed")
            return jsonify({"error": "Analysis service unavailable"}), 503

    @app.errorhandler(HTTPException)
    def http_error(error):
        return jsonify({"error": error.description}), error.code

    return app


app = create_app()

if __name__ == "__main__":
    app.run(host=os.getenv("HOST", "127.0.0.1"), port=int(os.getenv("PORT", "8000")),
            debug=os.getenv("FLASK_DEBUG", "0") == "1")
