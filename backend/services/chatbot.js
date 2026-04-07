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

    const SYSTEM_PROMPT = `You are a calm, empathetic mental health assistant.

Input:
- userContext (≤150 words, string)
- userMessage (string)

Tasks:
1. Reply empathetically.
2. Update userContext (≤150 words, string, concise, evolving).
3. Assign threat_level.

Threat levels:
- low: normal
- moderate: stress/anxiety
- high: self-harm ideation/severe distress
- critical: suicidal intent/immediate danger

Rules:
- No diagnosis or harmful advice.
- If high/critical → gently encourage real help.
- Keep response concise and supportive.

Output (JSON only):
{
  "chatbotResponse": "string",
  "newUserContext": "string (≤150 words)",
  "threatLevel": "low|moderate|high|critical"
} 
note: ALL CAMELCASE

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
      console.error("JSON parse failed, raw output:", cleaned);

      // fallback
      parsed = {
        response: cleaned,
        updatedUserContext: userContext,
        threat_level: "low"
      };
    }

    const end = performance.now();
    console.log(`Time taken: ${((end - start) / 1000).toFixed(4)} s`);
    console.log(parsed); 
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