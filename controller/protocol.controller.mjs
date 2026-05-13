import { parseFile } from "../services/fileParser.service.mjs";
import { cleanText, truncateText } from "../services/textCleaner.service.mjs";
import { extractProtocolWithAI } from "../services/aiExtraction.service.mjs";
import { ProtocolSchema } from "../schemas/protocol.schema.mjs";
import { calculateConfidence } from "../services/confindence.service.mjs";

export const handleProtocolExtraction = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: "No file uploaded." });

    // 1. Extract text locally
    const rawText = await parseFile(req.file);

    // CRITICAL FIX: Verify we actually got text before cleaning
    if (!rawText) {
      return res.status(422).json({ 
        success: false, 
        message: "Could not extract text from this file. It might be an image-based PDF or encrypted." 
      });
    }

    // 2. Clean and Truncate
    const optimizedText = truncateText(cleanText(rawText));

    // 3. AI Extraction (Gemini Flash - Low Cost)
    const aiResponse = await extractProtocolWithAI(optimizedText);

    // 4. Strict Validation (Safety Filter)
    const validatedData = ProtocolSchema.parse(aiResponse);

    // 5. Confidence Scoring
    const confidence = calculateConfidence(validatedData);

    return res.json({
      success: true,
      data: {
        ...validatedData,
        confidence,
      },
    });
  } catch (error) {
    if (error.message.includes("429") || error.message.includes("quota")) {
      return res.status(429).json({
        success: false,
        message:
          "EFAA AI is at capacity for the moment. Please try again in a few minutes or create the protocol manually for now.",
      });
    }
    next(error);
  }
};
