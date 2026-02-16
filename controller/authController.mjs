
import { OAuth2Client } from "google-auth-library";
import jwt from "jsonwebtoken";
import pool from "../db.js";

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export const googleAuth = async (req, res) => {
  try {
    const { id_token } = req.body;

    const ticket = await client.verifyIdToken({
      idToken: id_token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();

    const { sub, email, name, picture } = payload;

    // Check if user exists
    const existingUser = await pool.query(
      "SELECT * FROM users WHERE google_id = $1",
      [sub],
    );

    let user;

    if (existingUser.rows.length === 0) {
      const newUser = await pool.query(
        "INSERT INTO users (google_id, email, full_name, profile_picture) VALUES ($1, $2, $3, $4) RETURNING *",
        [sub, email, name, picture],
      );
      user = newUser.rows[0];
    } else {
      user = existingUser.rows[0];
    }

    // Generate JWT
    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "30d" },
    );

    // Send as httpOnly cookie
    res.cookie("efaa_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    res.status(200).json({ message: "Authentication successful" });
  } catch (error) {
    console.error(error);
    res.status(401).json({ message: "Invalid Google token" });
  }
};
