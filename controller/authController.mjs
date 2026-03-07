import pool from "../utils/dbConnect.mjs";
import jwt from "jsonwebtoken";


export const quickLogin = async (req, res) => {
  const { identifier } = req.body; // Can be email or phone number
  try {
    const result = await pool.query(
      "SELECT * FROM users WHERE email = $1 OR phone = $2",
      [identifier, identifier],
    );

    if (result.rows.length > 0) {
      const user = result.rows[0];
      const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
        expiresIn: "30d",
      });

      // Remove password from response
      const { password, ...userWithoutPassword } = user;
      res.status(200).json({ success: true, token, user: userWithoutPassword });
    } else {
      res
        .status(404)
        .json({
          success: false,
          message: "No account associated with this info.",
        });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const verifyToken = async (req, res) => {
  // req.user is populated by your authenticateToken middleware
  try {
    const result = await pool.query("SELECT * FROM users WHERE id = $1", [
      req.user.id,
    ]);
    if (result.rows.length > 0) {
      const { password, ...user } = result.rows[0];
      res.status(200).json({ success: true, user });
    } else {
      res.status(401).json({ success: false });
    }
  } catch (error) {
    res.status(500).json({ success: false });
  }
};
