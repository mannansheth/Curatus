
require("dotenv").config();

async function listModels() {
  const { GEMINI_API_KEY } = process.env;

  if (!GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not set in your .env file");
  }

  const response = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/models",
    {
      headers: {
        "x-goog-api-key": GEMINI_API_KEY,
      },
    }
  );

  if (!response.ok) {
    throw new Error(
      `API error ${response.status}: ${await response.text()}`
    );
  }

  const data = await response.json();

  const models = (data.models ?? [])
    .filter((model) =>
      model.supportedGenerationMethods?.includes("generateContent")
    )
    .map((model) => ({
      name: model.name,
      displayName: model.displayName,
      inputTokenLimit: model.inputTokenLimit,
      outputTokenLimit: model.outputTokenLimit,
    }));

  console.table(models);
}

listModels().catch(console.error);
