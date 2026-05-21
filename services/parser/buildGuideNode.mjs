/**
 * buildGuideNode.mjs
 * Constructs a Guide Node from a parsed section.
 *
 * Guide Nodes are the primary content node type in EFAA.
 * They present a sequence of steps to the responder, with optional
 * voice read-aloud and auto-advance timing.
 */

import { generateNodeId } from "../../utils/generateId.mjs";
import { extractSteps } from "./extractSteps.mjs";
import { isWarningSection } from "./extractWarnings.mjs";

/**
 * Builds a Guide Node from a parsed section object.
 *
 * @param {{ heading: string, lines: string[], raw: string }} section
 * @returns {{
 *   id: string,
 *   type: "guide",
 *   title: string,
 *   isWarning: boolean,
 *   steps: Array<{ text: string, voice: string, autoNext: number }>
 * } | null} - Returns null if the section has no extractable steps
 */
export function buildGuideNode(section) {
  const steps = extractSteps(section.lines);

  // Don't create empty nodes — skip sections with no parseable steps
  if (steps.length === 0) return null;

  return {
    id: generateNodeId(),
    type: "guide",
    title: section.heading || "Instructions",
    // Flag warning sections for frontend styling
    isWarning: isWarningSection(section.heading),
    steps,
  };
}
