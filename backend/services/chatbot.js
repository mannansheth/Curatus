const { GoogleGenerativeAI } = require("@google/generative-ai");
const dotenv = require("dotenv");
const { performance } = require("perf_hooks");

dotenv.config();

const { GEMINI_API_KEY, GEMINI_MODEL } = process.env;

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

const getChatbotResponse = async (userContext, userMessage) => {
  const start = performance.now();
  console.log("Gemini response initiated");

  try {
    const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });

    const SYSTEM_PROMPT = `You are an empathetic mental health assistant.

Respond specifically to the userMessage. Avoid generic replies.

Tasks:
- Give a natural, empathetic response
- Include ONE of: observation, question, or suggestion
- Update userContext (≤150 words, concise)
- Assign threatLevel
 
Threat levels:
low=normal, moderate=stress/anxiety, high=self-harm ideation, critical=suicidal intent

STRICT RULES:
- Output MUST be VALID JSON
- Do NOT wrap JSON in a string
- Do NOT add extra fields
- Do NOT rename fields
- Do NOT include explanations
- ONLY return this exact structure:

{
  "chatbotResponse": "...",
  "newUserContext": "...",
  "threatLevel": "low|moderate|high|critical"
}

If you output anything else, it is incorrect.

Input:
userContext: ${userContext}
userMessage: ${userMessage}`;

    const result = await model.generateContent({
      contents: [
        {
          role: "user",
          parts: [{ text: SYSTEM_PROMPT }]
        }
      ],
      generationConfig: {
        maxOutputTokens: 150, // VERY important for cost control
        temperature: 0.7
      }
    });

    const text = result.response.text();

    // safer cleaning
    const cleaned = text
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch (err) {
      console.error("JSON parse failed, raw output:");
      // fallback
      parsed = {
        response: cleaned,
        updatedUserContext: userContext,
        threat_level: "low"
      };
    }
    console.log(cleaned)

    const end = performance.now();
    console.log(`Time taken: ${((end - start) / 1000).toFixed(4)} s`);
    return parsed;

  } catch (error) {
    console.error("Chatbot failed:", error.message);

    return {
      chatbotResponse: "",
      newUserContext: userContext,
      threatLevel: "low"
    };
  }
};

module.exports = getChatbotResponse;