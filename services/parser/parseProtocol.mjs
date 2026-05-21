/**
 * parseProtocol.mjs
 * Main parsing orchestrator.
 *
 * Takes raw extracted text from a medical emergency PDF and produces
 * a structured array of protocol nodes (Guide Nodes and Question Nodes)
 * ready for the frontend protocol builder.
 *
 * Pipeline:
 *   rawText
 *     → normalizeText()       — clean whitespace, encoding artifacts
 *     → detectTitle()         — extract document title
 *     → detectCategory()      — classify emergency type
 *     → splitSections()       — divide into heading+content blocks
 *     → classifySection()     — per section: guide or question?
 *     → buildGuideNode()      — convert guide sections to nodes
 *     → buildQuestionNode()   — convert conditional lines to nodes
 *     → [ nodes ]             — final structured output
 */

import { normalizeText } from "./normalizeText.mjs";
import { splitSections } from "./splitSections.mjs";
import { buildGuideNode } from "./buildGuideNode.mjs";
import { buildQuestionNode, isQuestionTrigger } from "./buildQuestionNode.mjs";
import { extractSteps } from "./extractSteps.mjs";
import { resetIdCounter } from "../../utils/generateId.mjs";

// ─────────────────────────────────────────────
// Category detection keyword map
// ─────────────────────────────────────────────

const CATEGORY_MAP = [
  { keywords: ["bleeding", "hemorrhage", "blood loss", "haemorrhage", "wound"], category: "Trauma" },
  { keywords: ["cpr", "cardiac arrest", "chest compression", "defibrillat", "resuscitat"], category: "Cardiac Emergency" },
  { keywords: ["stroke", "facial droop", "slurred speech", "fast test", "brain attack"], category: "Neurological Emergency" },
  { keywords: ["burn", "scald", "thermal injury", "chemical burn", "flame"], category: "Burns" },
  { keywords: ["poison", "toxic", "ingestion", "overdose", "chemical exposure", "venom"], category: "Toxicology" },
  { keywords: ["chok", "airway obstruction", "heimlich", "foreign body airway"], category: "Airway Emergency" },
  { keywords: ["fracture", "broken bone", "spinal", "dislocation", "orthopaedic"], category: "Musculoskeletal Trauma" },
  { keywords: ["obstetric", "labour", "delivery", "pregnant", "miscarriage", "postpartum"], category: "Obstetric Emergency" },
  { keywords: ["anaphylax", "allergic reaction", "epipen", "epinephrine", "hives", "swelling throat"], category: "Anaphylaxis" },
  { keywords: ["diabetic", "hypoglycaemia", "hypoglycemia", "insulin", "blood sugar"], category: "Diabetic Emergency" },
  { keywords: ["seizure", "epilepsy", "convulsion", "fitting"], category: "Neurological Emergency" },
  { keywords: ["asthma", "inhaler", "bronchospasm", "wheezing", "respiratory"], category: "Respiratory Emergency" },
  { keywords: ["internal bleeding", "abdominal", "blunt trauma"], category: "Internal Trauma" },
  { keywords: ["drowning", "submersion", "near drowning"], category: "Drowning" },
  { keywords: ["heat stroke", "hyperthermia", "heat exhaustion", "sunstroke"], category: "Environmental Emergency" },
  { keywords: ["hypothermia", "frostbite", "cold exposure"], category: "Environmental Emergency" },
];

/**
 * Detects the emergency category from the document text.
 *
 * @param {string} text - Full normalized document text (lowercased)
 * @returns {string} - Detected category label or "General Emergency"
 */
function detectCategory(text) {
  const lower = text.toLowerCase();

  for (const entry of CATEGORY_MAP) {
    if (entry.keywords.some((kw) => lower.includes(kw))) {
      return entry.category;
    }
  }

  return "General Emergency";
}

/**
 * Extracts the document title from the first non-blank line of normalized text.
 * Falls back to "Emergency Protocol" if nothing suitable is found.
 *
 * @param {string} normalizedText
 * @returns {string}
 */
function detectTitle(normalizedText) {
  const lines = normalizedText.split("\n");

  for (const line of lines) {
    const trimmed = line.trim();
    // Title is typically the first non-empty line that isn't a bullet/step
    if (trimmed.length > 3 && !/^[-•*\d]/.test(trimmed)) {
      // Clean common formatting from titles
      return trimmed
        .replace(/^#+\s*/, "")       // Markdown hash
        .replace(/:\s*$/, "")        // Trailing colon
        .replace(/[-–—]+$/, "")      // Trailing dashes
        .trim();
    }
  }

  return "Emergency Protocol";
}

/**
 * Processes a single section and returns zero or more nodes.
 *
 * Decision logic:
 * 1. Scan ALL lines in the section for question triggers
 * 2. If the entire section heading is a question trigger → build Question Node
 * 3. Otherwise → build a Guide Node (which may contain inline warning steps)
 * 4. Any line within a Guide section that is a question trigger is extracted
 *    as a separate Question Node before the remaining steps continue.
 *
 * @param {{ heading: string, lines: string[], raw: string }} section
 * @returns {Array<object>} - 0 or more node objects
 */
function processSection(section) {
  const nodes = [];

  // Case 1: The entire section heading is a conditional question
  if (isQuestionTrigger(section.heading)) {
    const qNode = buildQuestionNode(section.heading, section.heading);
    nodes.push(qNode);

    // Any steps inside the section become a guide node for the "Yes" answer context
    const guideNode = buildGuideNode(section);
    if (guideNode) nodes.push(guideNode);

    return nodes;
  }

  // Case 2: Scan individual lines for embedded question triggers
  const questionLines = [];
  const stepLines = [];

  for (const line of section.lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      stepLines.push(line);
      continue;
    }

    if (isQuestionTrigger(trimmed)) {
      // Flush accumulated steps into a guide node before this question
      if (stepLines.filter((l) => l.trim()).length > 0) {
        const partial = buildGuideNode({ ...section, lines: [...stepLines] });
        if (partial) nodes.push(partial);
        stepLines.length = 0;
      }
      // Build a question node for this conditional line
      nodes.push(buildQuestionNode(trimmed, section.heading));
    } else {
      stepLines.push(line);
    }
  }

  // Flush any remaining step lines into a guide node
  if (stepLines.filter((l) => l.trim()).length > 0) {
    const guide = buildGuideNode({ ...section, lines: stepLines });
    if (guide) nodes.push(guide);
  }

  return nodes;
}

/**
 * Main entry point.
 * Parses raw extracted text into a fully structured protocol object.
 *
 * @param {string} rawText - Raw text output from PDF/DOCX/TXT extractor
 * @returns {{
 *   title: string,
 *   category: string,
 *   nodes: Array<object>
 * }}
 */
export function parseProtocol(rawText) {
  // Reset node ID counter so every parse run starts from node_1
  resetIdCounter();

  // Step 1: Normalize whitespace, encoding, and decorative characters
  const normalized = normalizeText(rawText);

  // Step 2: Extract document-level metadata
  const title = detectTitle(normalized);
  const category = detectCategory(normalized);

  // Step 3: Split into sections by heading detection
  const sections = splitSections(normalized);

  // Step 4: Process each section into nodes
  const nodes = [];

  for (const section of sections) {
    // Skip preamble sections (before the first heading) that contain no
    // actionable steps — these are usually just the document title block
    if (!section.heading && !section.lines.some((l) => l.trim())) {
      continue;
    }

    const sectionNodes = processSection(section);
    nodes.push(...sectionNodes);
  }

  return {
    title,
    category,
    nodes,
  };
}
