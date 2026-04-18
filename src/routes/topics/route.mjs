import pool from "../../../utils/dbConnect.mjs";
import { Router } from "express";
// Import your auth middleware (update the path to where your auth middleware lives)
import authenticateToken from "../../../utils/middlewares/authenticateToken.mjs";

const router = Router();

// Add 'authenticateToken' here to populate req.user
router.post("/suggest", authenticateToken, async (req, res) => {
  const { title, description, urgency } = req.body;

  // Now req.user will exist because authenticateToken verified the JWT
  const userId = req.user.id;

  try {
    await pool.query(
      "INSERT INTO suggested_topics (user_id, title, description, urgency) VALUES ($1, $2, $3, $4)",
      [userId, title, description, urgency],
    );
    res.json({ success: true, message: "Suggestion saved" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Database error" });
  }
});

// Add 'authenticateToken' here as well
router.post("/volunteer/apply", authenticateToken, async (req, res) => {
  const { role, bio, availability } = req.body;
  // In your route.mjs
  const userId = req.user.id || req.user.userId || req.user._id;

  console.log("Verified User ID:", userId); // This MUST not be undefined
  // DEBUG LOGS
  console.log("--- New Application Received ---");
  console.log("User ID:", userId);
  console.log("Data:", { role, bio, availability });

  try {
    const result = await pool.query(
      "INSERT INTO volunteer_applications (user_id, role, bio, availability) VALUES ($1, $2, $3, $4) RETURNING *",
      [userId, role, bio, availability],
    );

    console.log("Saved to DB:", result.rows[0]); // Check if this logs
    res.json({ success: true, message: "Application submitted!" });
  } catch (err) {
    console.error("DB INSERT ERROR:", err); // This will catch foreign key violations
    res.status(500).json({ success: false, message: "Database error" });
  }
});

router.post("/feedback", authenticateToken, async (req, res) => {
  const { rating, category, message } = req.body;
  const userId = req.user.id || req.user.userId || req.user._id;

  if (!rating || !message) {
    return res
      .status(400)
      .json({ success: false, message: "Rating and message are required." });
  }

  try {
    await pool.query(
      "INSERT INTO app_feedback (user_id, rating, category, message) VALUES ($1, $2, $3, $4)",
      [userId, rating, category, message],
    );
    res.json({
      success: true,
      message: "Thank you! Your feedback helps us save lives.",
    });
  } catch (err) {
    console.error("Feedback Error:", err);
    res.status(500).json({ success: false, message: "Database error" });
  }
});

export default router;
