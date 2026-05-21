/**
 * normalizeText.mjs
 * Cleans and normalizes raw extracted text from PDFs/DOCX/TXT files.
 *
 * PDF extraction often produces:
 * - Extra whitespace and blank lines
 * - Hyphenated word-breaks across lines
 * - Unicode control characters
 * - Inconsistent line endings (CRLF vs LF)
 * - Ligatures (ﬁ, ﬂ, etc.) that confuse pattern matching
 */

/**
 * Normalizes raw extracted text for reliable downstream parsing.
 *
 * @param {string} rawText - Raw text string from PDF/DOCX extractor
 * @returns {string} - Cleaned, normalized text
 */
export function normalizeText(rawText) {
  let text = rawText;

  // 1. Normalize line endings to LF
  text = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  // 2. Replace common ligatures with ASCII equivalents
  text = text
    .replace(/ﬁ/g, "fi")
    .replace(/ﬂ/g, "fl")
    .replace(/ﬀ/g, "ff")
    .replace(/ﬃ/g, "ffi")
    .replace(/ﬄ/g, "ffl");

  // 3. Remove non-printable control characters (except newlines and tabs)
  text = text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");

  // 4. Replace tab characters with a single space
  text = text.replace(/\t/g, " ");

  // 5. Collapse runs of more than 2 consecutive blank lines into exactly 2
  // This preserves section separations while removing excessive whitespace
  text = text.replace(/\n{3,}/g, "\n\n");

  // 6. Trim trailing whitespace from each line
  text = text
    .split("\n")
    .map((line) => line.trimEnd())
    .join("\n");

  // 7. Remove lines that are purely decorative (all dashes, underscores, =, etc.)
  text = text
    .split("\n")
    .filter((line) => !/^[-_=*#~]{3,}$/.test(line.trim()))
    .join("\n");

  // 8. Final trim
  return text.trim();
}

/**
 * Converts a raw heading string to a clean, title-cased label.
 * e.g. "WHAT NOT TO DO" → "What Not To Do"
 *
 * @param {string} heading - Raw heading string (usually ALL CAPS)
 * @returns {string}
 */
export function toTitleCase(heading) {
  const lowercase = new Set([
    "a", "an", "the", "and", "but", "or", "for", "nor",
    "on", "at", "to", "by", "in", "of", "up", "as", "is",
  ]);

  return heading
    .toLowerCase()
    .split(" ")
    .map((word, index) => {
      // Always capitalize the first word and words not in the lowercase set
      if (index === 0 || !lowercase.has(word)) {
        return word.charAt(0).toUpperCase() + word.slice(1);
      }
      return word;
    })
    .join(" ");
}

/**
 * Strips common step prefixes from a line:
 * "1. Do this" → "Do this"
 * "- Do this"  → "Do this"
 * "• Do this"  → "Do this"
 * "✅ Do this" → "Do this"
 *
 * @param {string} line
 * @returns {string}
 */
export function stripStepPrefix(line) {
  return line
    // Numbered: "1.", "1)", "Step 1:"
    .replace(/^(step\s*)?\d+[\.\):\-]\s*/i, "")
    // Bullet/dash/asterisk/plus
    .replace(/^[-•*+➤►▶→✓✔✅⚠️⛔🔴]\s*/u, "")
    // Emoji followed by text (catch-all for other emoji bullets)
    .replace(/^\p{Emoji_Presentation}\s*/u, "")
    .trim();
}
