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

def get_keyword_emoji(text: str) -> str | None:
    lower = text.lower()
    words = re.findall(r'\b\w+\b', lower)

    for keywords, emoji in KEYWORD_EMOJI_MAP:
        for kw in keywords:
            if " " in kw:
                if kw in lower:   # phrase match
                    return emoji
            else:
                if kw in words:   # word match (FIXES YOUR BUG)
                    return emoji
    return None

from transformers import pipeline
import torch

EMOTION_MODEL = "j-hartmann/emotion-english-distilroberta-base"

SENTIMENT_MODEL = "tabularisai/multilingual-sentiment-analysis"

device = 0 if torch.cuda.is_available() else -1

emotion_pipeline = pipeline(
    "text-classification",
    model=EMOTION_MODEL,
    top_k=None,          # returns ALL emotion scores
    device=device
)

sentiment_pipeline = pipeline(
    "text-classification",
    model=SENTIMENT_MODEL,
    device=device
)

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
    """
    Improved scoring:
    - Uses sentiment class
    - Uses confidence
    - Expands range naturally
    """

    # Base score from sentiment
    base = ((raw + 2) / 4) * 9 + 1   # maps -2..2 → 1..10

    confidence_adjustment = (confidence - 0.5) * 4 

    final = base + confidence_adjustment

    return max(1, min(10, int(round(final))))

def apply_boosts(text: str, raw_score: int, emotion_label: str) -> int:
    lower = text.lower()

    # 🔥 Strong achievement boost
    if any(p in lower for p in ["full marks", "100%", "aced", "nailed", "perfect"]):
        raw_score = min(raw_score + 1, 2)

    # 💪 confidence/self-belief boost
    if any(p in lower for p in ["confident", "i will", "sure i will"]):
        raw_score = min(raw_score + 1, 2)

    # 😄 emotion-based boost
    if emotion_label == "joy" and raw_score == 1:
        raw_score = 2

    # 😢 negative emotion correction
    if emotion_label == "sadness" and raw_score > 0:
        raw_score = 0

    return raw_score