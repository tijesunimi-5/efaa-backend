/**
 * splitSections.mjs
 * Splits normalized protocol text into discrete sections.
 *
 * A "section" is a named block of content identified by a heading line.
 * This module detects headings using multiple heuristics so it works
 * across a wide variety of PDF formatting styles.
 */

import { toTitleCase } from "./normalizeText.mjs";

/**
 * Patterns that identify a line as a section heading.
 * Order matters — more specific patterns come first.
 */
const HEADING_PATTERNS = [
  // All-caps line (at least 3 chars, allows spaces and hyphens)
  /^[A-Z][A-Z\s\-–—\/]{2,}[A-Z]$/,

  // Line ending with a colon (e.g. "Nosebleed:")
  /^.{3,}:\s*$/,

  // Markdown-style heading (## Heading)
  /^#{1,4}\s+\S/,

  // Numbered section header (e.g. "1. BLEEDING CONTROL" or "Section 2:")
  /^\d+[\.\)]\s+[A-Z][A-Z\s]{2,}/,

  // Emoji-led heading (e.g. "🩸 Severe Bleeding")
  /^\p{Emoji_Presentation}\s+\S/u,
];

/**
 * Lines that look like headings but are actually just steps or labels —
 * skip these so they don't create spurious empty sections.
 */
const HEADING_BLACKLIST = [
  /^(note|tip|example|see also|references?)[:.]?\s*$/i,
];

/**
 * Determines whether a given line is a section heading.
 *
 * @param {string} line - A single line of normalized text
 * @returns {boolean}
 */
export function isHeading(line) {
  const trimmed = line.trim();

  // Too short to be a meaningful heading
  if (trimmed.length < 3) return false;

  // Too long — real headings are rarely more than 80 chars
  if (trimmed.length > 80) return false;

  // Blacklisted patterns
  if (HEADING_BLACKLIST.some((p) => p.test(trimmed))) return false;

  // Must not start with a step number/bullet (those are content, not headings)
  // unless they match the numbered section pattern
  if (/^[\-•*+➤►▶→✓✔✅⚠️⛔🔴]\s/u.test(trimmed)) return false;
  if (/^\d+[\.\)]\s+[a-z]/.test(trimmed)) return false; // lowercase after number = step

  return HEADING_PATTERNS.some((pattern) => pattern.test(trimmed));
}

/**
 * Splits normalized protocol text into an array of section objects.
 * Each section contains its heading and all content lines beneath it.
 *
 * @param {string} normalizedText - Output from normalizeText()
 * @returns {Array<{ heading: string, raw: string, lines: string[] }>}
 */
export function splitSections(normalizedText) {
  const lines = normalizedText.split("\n");
  const sections = [];

  // Track whether we've seen any content before the first heading —
  // this becomes the "preamble" section containing the document title.
  let currentHeading = null;
  let currentLines = [];

  for (const line of lines) {
    const trimmed = line.trim();

    if (isHeading(trimmed)) {
      // Save the previous section before starting a new one
      if (currentHeading !== null || currentLines.some((l) => l.trim())) {
        sections.push(buildSection(currentHeading, currentLines));
      }

      // Start a new section with this heading
      currentHeading = cleanHeading(trimmed);
      currentLines = [];
    } else {
      // Accumulate content lines for the current section
      currentLines.push(line);
    }
  }

  // Don't forget the last section
  if (currentHeading !== null || currentLines.some((l) => l.trim())) {
    sections.push(buildSection(currentHeading, currentLines));
  }

  // Filter out completely empty sections
  return sections.filter(
    (s) => s.heading || s.lines.some((l) => l.trim())
  );
}

/**
 * Constructs a section object from accumulated heading + lines.
 *
 * @param {string|null} heading
 * @param {string[]} lines
 * @returns {{ heading: string, raw: string, lines: string[] }}
 */
function buildSection(heading, lines) {
  // Remove leading/trailing blank lines from the content
  const trimmedLines = trimBlankLines(lines);

  return {
    // heading is null for preamble content; fall back to empty string
    heading: heading ?? "",
    // raw joined text — useful for regex passes in downstream parsers
    raw: trimmedLines.join("\n"),
    // individual lines for step-by-step parsing
    lines: trimmedLines,
  };
}

/**
 * Cleans a raw heading string:
 * - Strips markdown #
 * - Strips trailing colons
 * - Strips leading emoji
 * - Converts to Title Case
 *
 * @param {string} raw
 * @returns {string}
 */
function cleanHeading(raw) {
  let heading = raw;

  // Strip markdown hashes
  heading = heading.replace(/^#+\s*/, "");

  // Strip leading emoji
  heading = heading.replace(/^\p{Emoji_Presentation}\s*/u, "");

  // Strip trailing colon
  heading = heading.replace(/:\s*$/, "");

  // Trim
  heading = heading.trim();

  // Convert ALL CAPS headings to Title Case for cleaner display
  if (heading === heading.toUpperCase()) {
    heading = toTitleCase(heading);
  }

  return heading;
}

/**
 * Removes leading and trailing blank lines from an array of strings.
 *
 * @param {string[]} lines
 * @returns {string[]}
 */
function trimBlankLines(lines) {
  let start = 0;
  let end = lines.length - 1;

  while (start <= end && !lines[start].trim()) start++;
  while (end >= start && !lines[end].trim()) end--;

  return lines.slice(start, end + 1);
}
