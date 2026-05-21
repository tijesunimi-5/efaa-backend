/**
 * buildQuestionNode.mjs
 * Detects conditional logic in section text and builds Question Nodes.
 *
 * Question Nodes represent decision points in the protocol flow.
 * The frontend renders them as a question prompt with Yes/No (or
 * other) option buttons that branch to different subsequent nodes.
 *
 * Detection strategy:
 * A section (or individual line) becomes a Question Node when it
 * contains conditional language that implies a branching decision.
 */

import { generateNodeId } from "../../utils/generateId.mjs";

/**
 * Phrases that trigger question node extraction.
 * These patterns indicate that the responder must make a decision.
 */
const QUESTION_TRIGGER_PATTERNS = [
  /\bif\s+the\s+(patient|person|victim|casualty)\b/i,
  /\bis\s+the\s+(patient|person|victim|casualty)\b/i,
  /\bdoes\s+the\s+(patient|person|victim|casualty)\b/i,
  /\bcheck\s+(if|whether)\b/i,
  /\bseek\s+help\s+if\b/i,
  /\bcall\s+(for\s+help|emergency|ambulance)\s+if\b/i,
  /\bunless\b/i,
  /\bwhen\s+(the\s+)?(patient|person|bleeding|breathing)\b/i,
  /\bhas\s+the\s+(patient|person|victim)\b/i,
  /\bcan\s+the\s+(patient|person|victim)\b/i,
  /\bask\s+(the\s+)?(patient|person|victim)\b/i,
  /\bconfirm\s+(that|if|whether)\b/i,
];

/**
 * Default Yes/No option set for binary question nodes.
 * The `next` field is left empty — the frontend or a downstream
 * link-building step should connect nodes together.
 */
const DEFAULT_OPTIONS = [
  { label: "Yes", next: "" },
  { label: "No", next: "" },
];

/**
 * Tests whether a line of text should trigger a question node.
 *
 * @param {string} text
 * @returns {boolean}
 */
export function isQuestionTrigger(text) {
  return QUESTION_TRIGGER_PATTERNS.some((p) => p.test(text));
}

/**
 * Builds a Question Node from a section or a single conditional line.
 *
 * @param {string} questionText - The question to present to the responder
 * @param {string} [sectionTitle] - Title of the enclosing section (for context)
 * @param {Array<{ label: string, next: string }>} [options] - Custom options (defaults to Yes/No)
 * @returns {{
 *   id: string,
 *   type: "question",
 *   title: string,
 *   text: string,
 *   options: Array<{ label: string, next: string }>
 * }}
 */
export function buildQuestionNode(
  questionText,
  sectionTitle = "Assessment",
  options = DEFAULT_OPTIONS
) {
  return {
    id: generateNodeId(),
    type: "question",
    title: sectionTitle,
    text: normalizeQuestionText(questionText),
    options,
  };
}

/**
 * Converts a statement containing conditional language into a
 * proper question string.
 *
 * Examples:
 * "If the patient is unconscious" → "Is the patient unconscious?"
 * "Check if the patient is breathing" → "Is the patient breathing?"
 *
 * @param {string} text
 * @returns {string}
 */
function normalizeQuestionText(text) {
  let q = text.trim();

  // Strip leading "if", "check if", "check whether"
  q = q.replace(/^(check\s+)?(if|whether)\s+/i, "");

  // Capitalize first letter
  q = q.charAt(0).toUpperCase() + q.slice(1);

  // Ensure it ends with a question mark
  if (!q.endsWith("?")) q += "?";

  return q;
}
