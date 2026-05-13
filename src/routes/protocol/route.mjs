import { Router } from "express";
import { handleProtocolExtraction } from "../../../controller/protocol.controller.mjs";
import { upload } from "../../../middlewares/upload.middleware.mjs";
import { extractionLimiter } from "../../../middlewares/rateLimit.middleware.mjs";

const router = Router();

/**
 * POST /protocols/extract
 * logic: Rate Limit -> Multer Upload -> Controller
 */
router.post(
  "/extract",
  extractionLimiter,
  upload.single("protocol"), // 'protocol' is the field name for the file
  handleProtocolExtraction,
);

export default router;
