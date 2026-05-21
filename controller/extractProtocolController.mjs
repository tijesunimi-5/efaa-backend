/**
 * extractProtocolController.mjs
 * Handles POST /extract requests.
 *
 * Flow:
 * 1. Validate that a file was uploaded
 * 2. Extract raw text from the file (PDF / DOCX / TXT)
 * 3. Parse raw text into structured protocol nodes
 * 4. Delete the temporary upload
 * 5. Return structured JSON response
 */

import fs from "fs";
import path from "path";
import { extractPdfText } from "../services/pdf/extractPdfText.mjs";
import { parseProtocol } from "../services/parser/parseProtocol.mjs";
import { createRequire } from "module";

// mammoth is CJS — use createRequire for clean ESM consumption
const require = createRequire(import.meta.url);
const mammoth = require("mammoth");

/**
 * Extracts raw text from the uploaded file based on its extension.
 *
 * @param {string} filePath - Absolute path to the temp uploaded file
 * @param {string} originalName - Original filename (used for extension detection)
 * @returns {Promise<string>} - Raw text content
 */
async function extractRawText(filePath, originalName) {
  const ext = path.extname(originalName).toLowerCase();

  switch (ext) {
    case ".pdf":
      return extractPdfText(filePath);

    case ".docx": {
      // mammoth.extractRawText returns { value: string, messages: [] }
      const result = await mammoth.extractRawText({ path: filePath });
      return result.value;
    }

    case ".txt":
      return fs.readFileSync(filePath, "utf-8");

    default:
      throw new Error(`Unsupported file extension: ${ext}`);
  }
}

/**
 * Deletes the temporary uploaded file from disk.
 * Failures here are logged but not thrown — the response has already been prepared.
 *
 * @param {string} filePath
 */
function cleanupFile(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (err) {
    console.error(`[Cleanup] Failed to delete temp file ${filePath}:`, err.message);
  }
}

/**
 * POST /extract
 * Main controller function.
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @param {Function} next
 */
export async function extractProtocolController(req, res, next) {
  // ── 1. Validate file presence ─────────────────────────────────────────────
  if (!req.file) {
    return res.status(400).json({
      success: false,
      error: "No file uploaded. Please attach a PDF, DOCX, or TXT file using the 'protocol' field.",
    });
  }

  const { path: filePath, originalname } = req.file;

  try {
    // ── 2. Extract raw text ──────────────────────────────────────────────────
    console.log(`[Extract] Processing: ${originalname}`);
    const rawText = await extractRawText(filePath, originalname);

    if (!rawText || rawText.trim().length < 20) {
      throw new Error(
        "Extracted text is too short or empty. The file may be image-based, corrupted, or contain no readable text."
      );
    }

    // ── 3. Parse into structured protocol nodes ──────────────────────────────
    console.log(`[Parse] Running parser on ${rawText.length} characters`);
    const protocol = parseProtocol(rawText);

    if (!protocol.nodes || protocol.nodes.length === 0) {
      throw new Error(
        "No protocol nodes could be extracted. Please check that the document follows a structured format with numbered steps or clear headings."
      );
    }

    console.log(
      `[Parse] Success — ${protocol.nodes.length} nodes extracted. Category: ${protocol.category}`
    );

    // ── 4. Clean up temp file ────────────────────────────────────────────────
    cleanupFile(filePath);

    // ── 5. Return structured response ────────────────────────────────────────
    return res.status(200).json({
      success: true,
      data: {
        title: protocol.title,
        category: protocol.category,
        nodes: protocol.nodes,
      },
    });
  } catch (err) {
    // Always clean up on error — don't leave temp files on disk
    cleanupFile(filePath);

    console.error(`[Extract Error] ${err.message}`);

    // Pass to global error handler
    next(err);
  }
}
