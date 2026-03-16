import { request, response, Router } from "express";
import pool from "../../../utils/dbConnect.mjs";
import jwt from "jsonwebtoken";
import "dotenv/config";
import authenticateToken from "../../../utils/middlewares/authenticateToken.mjs";
import { quickLogin, verifyToken } from "../../../controller/authController.mjs";
import bcrypt from "bcrypt";
const saltRounds = 10;

const router = Router();

router.get("/users", async (request, response) => {
  const query = "SELECT * from users";

  try {
    const result = await pool.query(query);
    const users = result.rows;
    console.log("Users fetched successfully", users);
    response.status(200).send({ message: "Users fetch", data: users });
  } catch (error) {
    console.log("Error exists");
    response.status(500).json({ error: "Server error during user fetch" });
  }
});


router.post("/authentication/users", async (request, response) => {
  const {
    fullName,
    email,
    password,
    phone,
    country,
    state,
    latitude,
    longitude,
  } = request.body;

  try {
    // 1. Hash the password
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // 2. Update or Create the User
    const userQuery = `
      INSERT INTO users (full_name, email, password_hash, phone, country, state, latitude, longitude, onboarding_completed)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, TRUE)
      ON CONFLICT (email) 
      DO UPDATE SET 
        full_name = EXCLUDED.full_name,
        password_hash = EXCLUDED.password_hash,
        phone = EXCLUDED.phone,
        country = EXCLUDED.country,
        state = EXCLUDED.state,
        latitude = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude,
        onboarding_completed = TRUE
      RETURNING *;
    `;

    const result = await pool.query(userQuery, [
      fullName,
      email,
      hashedPassword,
      phone,
      country,
      state,
      latitude,
      longitude,
    ]);
    const user = result.rows[0];

    // 3. Log location history
    if (latitude && longitude) {
      await pool.query(
        "INSERT INTO user_locations (user_id, latitude, longitude) VALUES ($1, $2, $3)",
        [user.id, latitude, longitude],
      );
    }

    // 4. Issue the token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "3650d" },
    );

    response.status(200).json({
      success: true,
      token,
      user: {
        fullName: user.full_name,
        email: user.email,
        state: user.state,
        onboardingCompleted: user.onboarding_completed,
      },
    });
  } catch (error) {
    console.error("Onboarding error:", error);
    response
      .status(500)
      .json({ success: false, error: "Failed to complete onboarding" });
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


router.get("/authentication/me", authenticateToken, async (request, response) => {
  const userId = request.user.userId; // Provided by your authenticateToken middleware

  try {
    const query = "SELECT full_name, email, state, onboarding_completed FROM users WHERE id = $1";
    const result = await pool.query(query, [userId]);

    if (result.rows.length === 0) {
      return response.status(404).json({ error: true, message: "User not found" });
    }

    const user = result.rows[0];

    response.status(200).json({
      user: {
        fullName: user.full_name,
        email: user.email,
        state: user.state,
        onboardingCompleted: user.onboarding_completed
      }
    });
  } catch (error) {
    console.error("Fetch me error:", error);
    response.status(500).json({ error: true, message: "Server error" });
  }
});

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
        latitude = $1, 
        longitude = $2, 
        location_updated_at = NOW() 
      WHERE id = $3
      RETURNING id, full_name;
    `;

      await pool.query(query, [latitude, longitude, userId]);

      response
        .status(200)
        .json({ message: "Position updated on EFAA safety mesh." });
    } catch (error) {
      console.error("Background sync error:", error);
      response.status(500).json({ error: "Failed to update location" });
    }
  },
);

// Route to request a login code
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const userResult = await pool.query(
      "SELECT * FROM users WHERE email = $1",
      [email],
    );

    if (userResult.rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Account not found." });
    }

    const user = userResult.rows[0];

    // Compare the provided password with the hashed version in DB
    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (isMatch) {
      const token = jwt.sign(
        { userId: user.id, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: "3650d" },
      );

      res.status(200).json({
        success: true,
        token,
        user: {
          fullName: user.full_name,
          email: user.email,
          state: user.state,
        },
      });
    } else {
      res
        .status(401)
        .json({ success: false, message: "Invalid email or password." });
    }
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

// Route to verify the code and login
router.post("/verify-otp", async (req, res) => {
  const { email, otp } = req.body;
  try {
    const result = await pool.query(
      "SELECT * FROM users WHERE email = $1 AND login_otp = $2 AND otp_expires_at > NOW()",
      [email, otp]
    );

    if (result.rows.length > 0) {
      const user = result.rows[0];
      // Clear OTP after use
      await pool.query("UPDATE users SET login_otp = NULL WHERE id = $1", [user.id]);
      
      const token = jwt.sign({ userId: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: "3650d" });
      res.status(200).json({ success: true, token, user: { fullName: user.full_name, email: user.email, state: user.state } });
    } else {
      res.status(401).json({ success: false, message: "Invalid or expired code." });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});






export default router;
