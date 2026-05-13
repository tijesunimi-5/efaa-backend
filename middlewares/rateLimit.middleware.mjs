import rateLimit from "express-rate-limit";

export const extractionLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // Limit each IP to 5 requests per window
  message: {
    success: false,
    message:
      "AI extraction limit reached. Please review existing protocols or create manually to ensure patient safety.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});
