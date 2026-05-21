/**
 * extractWarnings.mjs
 * Detects warning/danger/contraindication sections and flags them.
 *
 * Warning sections are converted into Guide Nodes just like regular steps,
 * but they carry a `isWarning: true` metadata flag so the frontend
 * can render them with a different visual style (e.g. red background).
 */

/**
 * Heading keywords that identify a section as a warning/danger block.
 * Matched case-insensitively against the section heading.
 */
const WARNING_HEADING_KEYWORDS = [
  "what not to do",
  "do not",
  "don't",
  "warning",
  "warnings",
  "danger",
  "dangers",
  "contraindication",
  "contraindications",
  "caution",
  "cautions",
  "avoid",
  "never",
  "important",
  "critical",
  "alert",
  "do not attempt",
  "risks",
  "risk",
];

/**
 * Inline line keywords — if a line inside any section contains these,
 * the step is flagged as a warning step even in a non-warning section.
 */
const WARNING_LINE_KEYWORDS = [
  /\bdo not\b/i,
  /\bdon't\b/i,
  /\bnever\b/i,
  /\bavoid\b/i,
  /\bwarning\b/i,
  /\bdanger\b/i,
  /\bcaution\b/i,
  /\bcontraindicated\b/i,
];

/**
 * Determines whether a section heading indicates a warning block.
 *
 * @param {string} heading - Section heading string
 * @returns {boolean}
 */
export function isWarningSection(heading) {
  const lower = heading.toLowerCase().trim();
  return WARNING_HEADING_KEYWORDS.some((kw) => lower.includes(kw));
}

/**
 * Determines whether a single step/line text is a warning instruction.
 * Used to tag individual steps inside non-warning sections.
 *
 * @param {string} text - Step text
 * @returns {boolean}
 */
export function isWarningLine(text) {
  return WARNING_LINE_KEYWORDS.some((pattern) => pattern.test(text));
}
