/**
 * COST OPTIMIZATION SERVICE:
 * Cleaning text locally reduces the token count sent to Gemini.
 * Flash pricing is per-token, so every character removed is money saved.
 */
// export const cleanText = (rawText) => {
//   return rawText
//     .replace(/\s+/g, " ") // Remove duplicate spaces/tabs
//     .replace(/\n{2,}/g, "\n") // Remove repeated newlines
//     .replace(/[^\x20-\x7E\n]/g, "") // Remove non-standard ASCII/Symbols
//     .replace(/Page \d+ of \d+/gi, "") // Remove common PDF footers
//     .trim();
// };

export const truncateText = (text, limit = 10000) => {
  // Max characters limit to prevent "Infinite Context" cost spikes.
  return text.substring(0, limit);
};

export const cleanText = (rawText) => {
  // Defensive check: If rawText is null or undefined, return an empty string
  if (!rawText || typeof rawText !== "string") {
    console.error("cleanText received invalid input:", typeof rawText);
    return "";
  }

  return rawText
    .replace(/\s+/g, " ")
    .replace(/\n{2,}/g, "\n")
    .replace(/[^\x20-\x7E\n]/g, "")
    .replace(/Page \d+ of \d+/gi, "")
    .trim();
};