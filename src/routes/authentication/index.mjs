import { request, response, Router } from "express";
import pool from "../../../utils/dbConnect.mjs";
import jwt from "jsonwebtoken";
import "dotenv/config";
import authenticateToken from "../../../utils/middlewares/authenticateToken.mjs";

const router = Router();

router.get("/users", async (request, response) => {
  const query = "SELECT * from users";

  try {
    const result = await pool.query(query);
    const users = result.rows[0];

    response.status(200).send({ message: "Users fetch", data: users });
  } catch (error) {
    console.log("Error exists");
    res.status(500).json({ error: "Server error during user fetch" });
  }
});

router.post("/users", async (request, response) => {
  const { fullName, email, phone, country } = request.body;

  try {
    const userQuery = `
      INSERT INTO users (full_name, email, phone, country, onboarding_completed)
      VALUES ($1, $2, $3, $4, TRUE)
      ON CONFLICT (email) 
      DO UPDATE SET 
        full_name = EXCLUDED.full_name,
        phone = EXCLUDED.phone,
        country = EXCLUDED.country,
        onboarding_completed = TRUE
      RETURNING *;
    `;

    const result = await pool.query(userQuery, [
      fullName,
      email,
      phone,
      country,
    ]);
    const user = result.rows[0];

    // Issued for 10 years for one-time registration
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "3650d" },
    );

    response.status(200).json({
      token,
      user: {
        fullName: user.full_name,
        state: user.state,
        onboardingCompleted: user.onboarding_completed,
      },
    });
  } catch (error) {
    console.error("Onboarding error:", error);
    response.status(500).json({ error: "Failed to complete onboarding" });
  }
});

router.patch("/users/profile", authenticateToken, async (request, response) => {
  const { fullName, phone, state } = request.body;
  const userId = request.user.userId; // Extracted from the token

  try {
    // Dynamically update only the fields provided in the request body
    const updateQuery = `
      UPDATE users 
      SET 
        full_name = COALESCE($1, full_name),
        phone = COALESCE($2, phone),
        state = COALESCE($3, state)
      WHERE id = $4
      RETURNING id, full_name, email, phone, state;
    `;

    const result = await pool.query(updateQuery, [
      fullName,
      phone,
      state,
      userId,
    ]);

    if (result.rows.length === 0) {
      return response.status(404).json({ error: "User not found" });
    }

    const updatedUser = result.rows[0];

    response.status(200).json({
      message: "Profile updated successfully",
      user: {
        fullName: updatedUser.full_name,
        phone: updatedUser.phone,
        state: updatedUser.state,
        email: updatedUser.email,
      },
    });
  } catch (error) {
    console.error("Profile update error:", error);
    response.status(500).json({ error: "Server error during profile update" });
  }
});

// Patch route to update location during an emergency
router.patch(
  "/users/location",
  authenticateToken,
  async (request, response) => {
    const { latitude, longitude } = request.body;
    const userId = request.user.userId;

    try {
      const query = `
      UPDATE users 
      SET 
        last_lat = $1, 
        last_long = $2, 
        location_updated_at = NOW() 
      WHERE id = $3
      RETURNING id, state;
    `;

      await pool.query(query, [latitude, longitude, userId]);

      // Logic here to find "nearest help" or "hospitals" based on $1 and $2
      response
        .status(200)
        .json({ message: "Location updated. Help is being signaled." });
    } catch (error) {
      console.error("Location update error:", error);
      response.status(500).json({ error: "Failed to process location" });
    }
  },
);

export default router;
