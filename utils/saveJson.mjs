export const parseSafeJson = (text) => {
  try {
    // Remove potential Markdown code fences
    const cleanJson = text
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();
    return JSON.parse(cleanJson);
  } catch (error) {
    throw new Error("AI returned malformed JSON structure.");
  }
};
