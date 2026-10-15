const { test } = require("node:test"),
  assert = require("node:assert/strict");
const sdkPath = require.resolve("@google/generative-ai");
let output = "";
let error = null;
let observed;
require.cache[sdkPath] = {
  id: sdkPath,
  filename: sdkPath,
  loaded: true,
  exports: {
    GoogleGenerativeAI: class {
      getGenerativeModel(config) {
        observed = config;
        return {
          generateContent: async (request) => {
            if (error) throw error;
            return { response: { text: () => output } };
          },
        };
      }
    },
  },
};
const reply = require("../services/chatbot");
test("Gemini response parser accepts fenced JSON and rejects invalid contract", () => {
  const expected = {
    chatbotResponse: "I hear you.",
    newUserContext: "Context",
    threatLevel: "moderate",
  };
  assert.deepEqual(reply.parseResponse(JSON.stringify(expected)), expected);
  assert.deepEqual(
    reply.parseResponse("```json\n" + JSON.stringify(expected) + "\n```"),
    expected,
  );
  for (const raw of [
    "invalid",
    "{}",
    JSON.stringify({ ...expected, threatLevel: "unknown" }),
    JSON.stringify({ ...expected, chatbotResponse: "" }),
  ])
    assert.throws(() => reply.parseResponse(raw));
});
test("Gemini unavailable configuration and SDK failures produce actionable service errors", async () => {
  const key = process.env.GEMINI_API_KEY,
    model = process.env.GEMINI_MODEL;
  delete process.env.GEMINI_API_KEY;
  delete process.env.GEMINI_MODEL;
  try {
    await assert.rejects(reply("", "hello"), (e) => e.status === 503);
    process.env.GEMINI_API_KEY = "test-key";
    process.env.GEMINI_MODEL = "test-model";
    error = new Error("provider failure");
    await assert.rejects(reply("", "hello"), (e) => e.status === 502);
    error = null;
    output = JSON.stringify({
      chatbotResponse: "I hear you.",
      newUserContext: "Context",
      threatLevel: "low",
    });
    const result = await reply("Earlier context", "hello");
    assert.equal(result.threatLevel, "low");
    assert.equal(observed.model, "test-model");
    assert.ok(observed.systemInstruction.includes("never instructions"));
  } finally {
    if (key === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = key;
    if (model === undefined) delete process.env.GEMINI_MODEL;
    else process.env.GEMINI_MODEL = model;
  }
});
