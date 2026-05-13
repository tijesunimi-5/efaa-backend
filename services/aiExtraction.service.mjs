import { model } from "../config/gemini.mjs";
import { PROTOCOL_EXTRACTION_PROMPT } from "../prompts/extraction.prompt.mjs";
import { parseSafeJson } from "../utils/saveJson.mjs";

/**
 * AI EXTRACTION SERVICE
 * Uses Gemini Flash to map raw text to our decision-tree JSON structure.
 */
export const extractProtocolWithAI = async (text) => {
  const fullPrompt = `${PROTOCOL_EXTRACTION_PROMPT}\n\n${text}`;

  try {
    const result = await model.generateContent(fullPrompt);
    const response = await result.response;
    const responseText = response.text();

    // AI output is never trusted; we strip markdown and parse manually
    return parseSafeJson(responseText);
  } catch (error) {
    console.error("Gemini API Failure:", error.message);
    throw new Error(
      "AI Service is currently unavailable. Please try manual entry.",
    );
  }
};
