const NEGATIVE_ITEMS = [
  "anxiety",
  "sleep",
  "mood",
  "stress",
  "social",
  "energy",
  "focus",
];
// Informal application reflection only; this is not a validated clinical instrument.
function assessmentReflection(data) {
  const burden =
    NEGATIVE_ITEMS.reduce((sum, key) => sum + data[key], 0) + (4 - data.hope);
  const score = Math.round((1 - burden / 32) * 100);
  let feedback;
  if (score >= 75)
    feedback =
      "Your answers suggest fewer difficulties this week. Reflect on what has helped and keep making time for supportive routines.";
  else if (score >= 40)
    feedback =
      "Your answers suggest a mix of difficulties and strengths this week. Consider one manageable step that could make the coming week easier.";
  else
    feedback =
      "Your answers suggest several difficulties this week. Consider sharing how you are feeling with someone you trust or a qualified professional.";
  return { score, feedback };
}
module.exports = assessmentReflection;
