/**
 * uploadProtocol.mjs
 * Multer middleware configured for protocol file uploads.
 *
 * Accepted types: PDF, DOCX, TXT
 * Max size: 20MB
 * Storage: disk (uploads/ directory)
 *
 * Files are stored with a timestamp-prefixed name to avoid collisions.
 * The original filename is preserved in the extension.
 */

import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

// Resolve __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Uploads directory — relative to project root (two levels up from middlewares/)
const UPLOADS_DIR = path.resolve(__dirname, "../../uploads");

// Ensure the uploads directory exists at startup
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// ─────────────────────────────────────────────
// Multer disk storage configuration
// ─────────────────────────────────────────────

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOADS_DIR);
  },

  filename: (_req, file, cb) => {
    // Prefix with timestamp to guarantee uniqueness even under concurrent uploads
    const timestamp = Date.now();
    const ext = path.extname(file.originalname).toLowerCase();
    const baseName = path
      .basename(file.originalname, ext)
      .replace(/[^a-zA-Z0-9_\-]/g, "_"); // Sanitize — remove unsafe chars

    cb(null, `${timestamp}_${baseName}${ext}`);
  },
});

// ─────────────────────────────────────────────
// File type validation
// ─────────────────────────────────────────────

const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
  "text/plain", // .txt
]);

const ALLOWED_EXTENSIONS = new Set([".pdf", ".docx", ".txt"]);

/**
 * Multer file filter — rejects files that are not PDF, DOCX, or TXT.
 * Checks both MIME type and file extension for maximum safety.
 */
function fileFilter(_req, file, cb) {
  const ext = path.extname(file.originalname).toLowerCase();

  const mimeOk = ALLOWED_MIME_TYPES.has(file.mimetype);
  const extOk = ALLOWED_EXTENSIONS.has(ext);

  if (mimeOk && extOk) {
    cb(null, true); // Accept
  } else {
    cb(
      new multer.MulterError(
        "LIMIT_UNEXPECTED_FILE",
        `Unsupported file type: ${ext}. Only PDF, DOCX, and TXT are accepted.`
      ),
      false
    );
  }
}

// ─────────────────────────────────────────────
// Multer instance
// ─────────────────────────────────────────────

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 20 * 1024 * 1024, // 20MB in bytes
  },
});

/**
 * Single-file upload middleware.
 * Expects the file field to be named "protocol" in the multipart form.
 *
 * Usage:
 *   router.post("/extract", uploadProtocol, extractProtocolController);
 */
export const uploadProtocol = upload.single("protocol");

/**
 * Error handler specifically for Multer errors.
 * Must be used as Express error middleware (4 args) AFTER uploadProtocol.
 *
 * Usage:
 *   router.post("/extract", uploadProtocol, handleUploadError, extractProtocolController);
 *
 * @param {Error} err
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @param {Function} next
 */
export function handleUploadError(err, req, res, next) {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({
        success: false,
        error: "File too large. Maximum allowed size is 20MB.",
      });
    }

    if (err.code === "LIMIT_UNEXPECTED_FILE") {
      return res.status(415).json({
        success: false,
        error: err.field || "Unsupported file type. Please upload a PDF, DOCX, or TXT file.",
      });
    }

    return res.status(400).json({
      success: false,
      error: `Upload error: ${err.message}`,
    });
  }

  // Not a multer error — pass to global error handler
  next(err);
}
