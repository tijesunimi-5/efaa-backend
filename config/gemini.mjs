import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config();

if (!process.env.GEMINI_API_KEY) {
  throw new Error(
    "CRITICAL: GEMINI_API_KEY is missing in environment variables.",
  );
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// We use gemini-2.0-flash for high speed, low cost, and strong JSON following.
export const model = genAI.getGenerativeModel({
  model: "gemini-2.0-flash",
  generationConfig: {
    responseMimeType: "application/json",
  },
});
