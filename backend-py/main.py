from flask import Flask, request, jsonify

from flask_cors import CORS
from helpers import sentiment_analysis as s
app = Flask(__name__)
CORS(app)



def analyze_text(text: str) -> dict:
    # 1. Get emotion + emoji
    emotion_label, emoji = s.get_emotion_emoji(text)

    sentiment_result = s.sentiment_pipeline(text, truncation=True, max_length=512)[0]
    raw_score = s.SENTIMENT_LABEL_MAP.get(sentiment_result["label"], 0)
    raw_score = s.apply_boosts(text, raw_score, emotion_label)
    confidence = sentiment_result["score"]
    score_10 = s.convert_score_to_10_scale(raw_score, confidence)
    mood = s.MOOD_MAP[raw_score]

    return {
        "emoji": emoji,
        "score": score_10,
        "mood": mood,
    }

@app.route("/journal/entry/analyze", methods=["POST"])
def analyze():
    try:
        data = request.json
        print(data)
        if not data or "text" not in data:
            return jsonify({"error": "Missing 'text' field"}), 400

        result = analyze_text(data["text"])
        return jsonify({"success": True, "result": result})

    except Exception as e:
        print(e)
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    app.run(port=8000, debug=True)