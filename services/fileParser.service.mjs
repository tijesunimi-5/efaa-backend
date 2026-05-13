import fs from "fs";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const pdf = require("pdf-parse");

import mammoth from "mammoth";

/**
 * LOCAL EXTRACTION PHILOSOPHY:
 * Parse files locally to minimize token usage and protect patient data.
 */
// export const parseFile = async (file) => {
//   const { path, mimetype } = file;

//   try {
//     if (mimetype === "text/plain") {
//       return fs.readFileSync(path, "utf8");
//     }

//     if (mimetype === "application/pdf") {
//       const dataBuffer = fs.readFileSync(path);
//       // pdf-parse is a bit old-school, but efficient for text extraction
//       const data = await pdf(dataBuffer);
//       return data.text;
//     }

//     if (
//       mimetype ===
//       "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
//     ) {
//       const result = await mammoth.extractRawText({ path });
//       return result.value;
//     }

//     throw new Error("Unsupported file type");
//   } finally {
//     // Cleanup: Essential to keep the server disk clean
//     if (fs.existsSync(path)) fs.unlinkSync(path);
//   }
// };

export const parseFile = async (file) => {
  const { path, mimetype } = file;

  // Check if file actually exists before doing anything
  if (!fs.existsSync(path)) {
    throw new Error(`File upload failed: ${path} not found.`);
  }

  try {
    if (mimetype === "application/pdf") {
      const dataBuffer = fs.readFileSync(path);
      const data = await pdf(dataBuffer);

      // Log this to your terminal to see what the library is actually producing
      console.log("PDF Metadata extracted:", !!data.text);

      return data.text || ""; // Ensure we return a string, even if empty
    }
    if (mimetype === "text/plain") {
      return fs.readFileSync(path, "utf8");
    }

    if (mimetype === "application/pdf") {
      const dataBuffer = fs.readFileSync(path);
      // pdf-parse is a bit old-school, but efficient for text extraction
      const data = await pdf(dataBuffer);
      return data.text;
    }

    if (
      mimetype ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) {
      const result = await mammoth.extractRawText({ path });
      return result.value;
    }

    throw new Error("Unsupported file type");
  } catch (error) {
    console.error("Parsing logic failed:", error);
    throw error;
  } finally {
    // ONLY attempt delete if the file exists
    if (fs.existsSync(path)) {
      try {
        fs.unlinkSync(path);
      } catch (e) {
        console.error("Cleanup failed:", e);
      }
    }
  }
};