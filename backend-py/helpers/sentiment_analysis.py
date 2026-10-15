SENTIMENT_LABEL_MAP = {
    "Very Negative": -2,
    "Negative": -1,
    "Neutral": 0,
    "Positive": 1,
    "Very Positive": 2,
}

MOOD_MAP = {
    -2: "Very Negative",
    -1: "Negative",
     0: "Neutral",
     1: "Positive",
     2: "Very Positive",
}

# --- Emotion → emoji (from the 7-class model) ---
EMOTION_EMOJI_MAP = {
    "anger":   "😡",
    "disgust": "🤢",
    "fear":    "😨",
    "joy":     "😄",
    "neutral": "😐",
    "sadness": "😢",
    "surprise": "😲",
}

# --- Physical/contextual keyword overrides (things the emotion model can't catch) ---
# Ordered from most specific to least; first match wins.
# --- EXPANDED KEYWORD EMOJI MAP ---
KEYWORD_EMOJI_MAP = [
    # 🏆 ACHIEVEMENTS / STUDY / SUCCESS (NEW - IMPORTANT FOR YOU)
    (["full marks", "100%", "aced", "nailed it", "perfect score", "topper"], "🏆"),
    (["exam went well", "test went well", "did well", "performed well"], "😄"),
    (["studying", "revision", "preparing", "exam prep"], "📚"),
    (["results", "marks", "grades", "score"], "📊"),
    (["passed", "cleared", "qualified"], "✅"),
    (["failed", "flunked", "backlog"], "❌"),

    # 💪 ACHIEVEMENT EMOTIONS
    (["proud", "accomplished", "achievement", "did it", "finally did it"], "💪"),
    (["confident", "feeling confident", "sure i will", "i will get"], "😎"),

    # --- Physical states ---
    (["sick", "ill", "fever", "nausea", "nauseous", "vomit", "puke", "flu", "cold", "cough", "sneeze"], "🤒"),
    (["headache", "migraine", "head hurts", "head is pounding"], "🤕"),
    (["injured", "hurt", "pain", "ache", "sore"], "🤕"),
    (["sleepy", "drowsy", "yawning"], "🥱"),
    (["tired", "exhausted", "drained", "fatigued"], "😴"),
    (["sleep", "nap", "bed", "insomnia", "can't sleep", "slept"], "😴"),
    (["hungry", "starving", "famished"], "😋"),
    (["thirsty", "dehydrated"], "😮‍💨"),
    (["full", "stuffed", "overate"], "🤤"),
    (["drunk", "hangover", "hungover"], "🥴"),
    (["high", "stoned", "blazed"], "😵"),
    (["dizzy", "lightheaded", "faint"], "😵‍💫"),

    # --- Mental / emotional ---
    (["bored", "boring"], "🥱"),
    (["lonely", "alone"], "🥺"),
    (["nostalgic"], "🥹"),
    (["nervous", "anxious", "panic", "stressed", "overwhelmed", "worried"], "😰"),
    (["embarrassed", "awkward", "cringe"], "😳"),
    (["ashamed", "guilty", "regret"], "😔"),
    (["confused", "lost", "clueless"], "😕"),
    (["jealous", "envious"], "😒"),
    (["hopeful", "optimistic"], "🤩"),
    (["grateful", "thankful", "blessed"], "🥹"),
    (["motivated", "inspired", "pumped"], "🔥"),
    (["calm", "relaxed", "peaceful"], "😌"),
    (["content", "okay", "fine"], "🙂"),

    # --- Love / heartbreak ---
    (["heartbroken", "breakup", "dumped"], "💔"),
    (["in love", "love you", "crush"], "❤️"),

    # --- Reactions ---
    (["excited", "thrilled", "hyped", "stoked"], "🤩"),
    (["laughing", "lol", "lmao", "funny"], "😂"),
    (["crying", "tears", "sobbing"], "😭"),
    (["mad", "furious", "rage", "pissed"], "😤"),
    (["hate", "despise"], "😠"),
    (["disgusted", "gross", "ew"], "🤢"),
    (["scared", "terrified"], "😱"),
    (["surprised", "shocked"], "😲"),
    (["numb", "empty"], "😶"),

    # --- Lifestyle ---
    (["cozy", "comfortable"], "🏡"),
    (["productive", "focused", "grinding"], "💻"),
    (["procrastinating", "avoiding"], "😬"),

    # --- Situational ---
    (["birthday", "party"], "🎉"),
    (["monday"], "😩"),
    (["friday", "weekend"], "🥳"),
    (["vacation", "trip", "travel"], "✈️"),
    (["work", "office", "deadline"], "💼"),
    (["gym", "workout"], "💪"),
    (["money", "broke"], "😬"),
    (["rain", "storm", "gloomy"], "🌧️"),
    (["sunny", "beautiful day"], "☀️"),
]


import re
import math
from numbers import Real

def get_keyword_emoji(text: str) -> str | None:
    lower = text.lower()

    for keywords, emoji in KEYWORD_EMOJI_MAP:
        for kw in keywords:
            if re.search(r"(?<!\w)" + re.escape(kw) + r"(?!\w)", lower):
                return emoji
    return None

from functools import lru_cache
from threading import Lock

EMOTION_MODEL = "j-hartmann/emotion-english-distilroberta-base"
SENTIMENT_MODEL = "tabularisai/multilingual-sentiment-analysis"
_MODEL_LOCK = Lock()

@lru_cache(maxsize=2)
def _load_pipeline(model: str):
    # Import and download only when analysis needs a model.
    from transformers import pipeline
    import torch
    options = {"top_k": None} if model == EMOTION_MODEL else {}
    return pipeline("text-classification", model=model,
                    device=0 if torch.cuda.is_available() else -1, **options)

def emotion_pipeline(text, **kwargs):
    with _MODEL_LOCK:
        return _load_pipeline(EMOTION_MODEL)(text, **kwargs)

def sentiment_pipeline(text, **kwargs):
    with _MODEL_LOCK:
        return _load_pipeline(SENTIMENT_MODEL)(text, **kwargs)

def get_emotion_emoji(text: str) -> tuple[str, str]:
    """
    Run the emotion model and return (dominant_emotion_label, emoji).
    Falls back to keyword map first for physical/contextual states.
    """
    # Keyword layer takes priority for physical states the emotion model can't reliably detect
    kw_emoji = get_keyword_emoji(text)
    if kw_emoji:
        return ("keyword_match", kw_emoji)

    results = emotion_pipeline(text, truncation=True, max_length=512)[0]
    # results is a list of {label, score} dicts sorted by score desc
    top = max(results, key=lambda x: x["score"])
    label = top["label"]
    return (label, EMOTION_EMOJI_MAP.get(label, "😐"))


def convert_score_to_10_scale(raw: int, confidence: float) -> int:
    """Map sentiment to 1..10; confidence increases distance from neutral."""
    if (type(raw) is not int or raw not in MOOD_MAP
            or isinstance(confidence, bool) or not isinstance(confidence, Real)
            or not math.isfinite(confidence) or not 0 <= confidence <= 1):
        raise ValueError("Invalid sentiment score or confidence")
    value = 5.5 + (raw / 2) * 4.5 * (0.5 + confidence / 2)
    return max(1, min(10, int(round(value))))


def apply_boosts(text: str, raw_score: int, emotion_label: str) -> int:
    lower = text.lower()
    # Avoid reversing an explicitly negative model classification or negated claim.
    negated = bool(re.search(r"\b(?:not|never|no|hardly|isn't|wasn't|don't|didn't|can't)\b", lower))
    if raw_score >= 0 and not negated:
        if any(re.search(r"(?<!\w)" + re.escape(p) + r"(?!\w)", lower)
               for p in ["full marks", "100%", "aced", "nailed it", "perfect score"]):
            raw_score = min(raw_score + 1, 2)
        if re.search(r"\bconfident\b", lower):
            raw_score = min(raw_score + 1, 2)
        if emotion_label == "joy" and raw_score == 1:
            raw_score = 2
    if emotion_label == "sadness" and raw_score > 0:
        raw_score = 0
    return raw_score
