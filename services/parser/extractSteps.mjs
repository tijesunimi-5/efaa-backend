/**
 * extractSteps.mjs
 * Extracts individual actionable steps from a section's content lines.
 *
 * Handles:
 * - Numbered lists:    "1. Apply pressure"
 * - Bullet lists:      "- Apply pressure" / "• Apply pressure"
 * - Emoji steps:       "✅ Apply pressure"
 * - Continuation text: multi-line steps that wrap across lines
 */

import { stripStepPrefix } from "./normalizeText.mjs";

/**
 * Regex patterns that identify a line as the start of a new step.
 */
const STEP_START_PATTERNS = [
  // Numbered: "1.", "2)", "Step 3:"
  /^(step\s*)?\d+[\.\):\-]\s+\S/i,
  // Dash / bullet / arrow bullet
  /^[-–—•*+➤►▶→]\s+\S/u,
  // Emoji bullet (common in modern medical PDFs)
  /^\p{Emoji_Presentation}\s+\S/u,
  // Check/warning marks
  /^[✓✔✅⚠️⛔🔴]\s*/u,
];

/**
 * Default autoNext delay in seconds.
 * The frontend auto-advances to the next step after this many seconds
 * when in voice-guided mode.
 */
const DEFAULT_AUTO_NEXT = 30;

/**
 * Determines whether a line starts a new step.
 *
 * @param {string} line
 * @returns {boolean}
 */
function isStepLine(line) {
  const trimmed = line.trim();
  if (!trimmed) return false;
  return STEP_START_PATTERNS.some((p) => p.test(trimmed));
}

/**
 * Extracts steps from an array of content lines.
 * Handles multi-line steps by merging continuation lines (non-step lines
 * that follow a step line) into the preceding step's text.
 *
 * @param {string[]} lines - Content lines from a section
 * @returns {Array<{ text: string, voice: string, autoNext: number }>}
 */
export function extractSteps(lines) {
  const steps = [];
  let currentStepParts = null;

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip blank lines
    if (!trimmed) {
      // A blank line signals end of a multi-line step
      if (currentStepParts) {
        steps.push(buildStep(currentStepParts.join(" ")));
        currentStepParts = null;
      }
      continue;
    }

    if (isStepLine(trimmed)) {
      // Flush any previous step
      if (currentStepParts) {
        steps.push(buildStep(currentStepParts.join(" ")));
      }
      // Start a new step, stripping the bullet/number prefix
      currentStepParts = [stripStepPrefix(trimmed)];
    } else if (currentStepParts) {
      // Continuation line — append to current step
      currentStepParts.push(trimmed);
    } else {
      // Orphan line with no bullet/number — treat as a standalone step
      // only if it's a complete sentence (ends with punctuation or is long enough)
      if (trimmed.length > 10 || /[.!?]$/.test(trimmed)) {
        steps.push(buildStep(trimmed));
      }
    }
  }

  // Flush the last in-progress step
  if (currentStepParts) {
    steps.push(buildStep(currentStepParts.join(" ")));
  }

  return steps;
}

/**
 * Builds a normalized step object.
 * voice defaults to text (for TTS read-aloud in the frontend).
 * autoNext defaults to DEFAULT_AUTO_NEXT seconds.
 *
 * @param {string} text - Cleaned step text
 * @returns {{ text: string, voice: string, autoNext: number }}
 */
function buildStep(text) {
  const cleaned = text.trim();
  return {
    text: cleaned,
    voice: cleaned,         // TTS text — same as display text by default
    autoNext: DEFAULT_AUTO_NEXT,
  };
}
