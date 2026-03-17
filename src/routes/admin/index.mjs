import { Router } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import pool from "../../../utils/dbConnect.mjs";
import authenticateToken from "../../../utils/middlewares/authenticateToken.mjs";

const router = Router();

// Middleware to ensure role is admin or medic
const isMedic = (req, res, next) => {
  if (req.user.role === "admin" || req.user.role === "medic") return next();
  res.status(403).json({ error: "Unauthorized. Medics only." });
};

router.get("/admin/users", authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, full_name, email, phone, state, country, onboarding_completed 
      FROM users 
      WHERE role = 'responder'
    `);

    // IMPORTANT: Map the DB 'full_name' to Frontend 'fullName'
    const users = result.rows.map((user) => ({
      id: user.id,
      fullName: user.full_name, // Mapping happens here
      email: user.email,
      phone: user.phone || "No Phone",
      state: user.state || "N/A",
      country: user.country || "Nigeria",
      onboardingCompleted: user.onboarding_completed,
    }));

    res.status(200).json({ success: true, data: users });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});


///admin level
// Admin Registration (Automatically assigns 'medic' role)
router.post("/admin/register", async (req, res) => {
  const { fullName, email, password } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `INSERT INTO users (full_name, email, password_hash, role, onboarding_completed) 
       VALUES ($1, $2, $3, 'medic', TRUE) 
       RETURNING id, full_name, email, role`,
      [fullName, email, hashedPassword]
    );
    
    const user = result.rows[0];
    const token = jwt.sign(
      { userId: user.id, role: user.role }, 
      process.env.JWT_SECRET, 
      { expiresIn: '8h' } // 8 Hour Expiry
    );

    res.status(200).json({ success: true, token, user });
  } catch (error) {
    res.status(500).json({ success: false, message: "Registration failed." });
  }
});

// Admin Login
router.post("/authentication/admin/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const result = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: "Admin not found." });

    const user = result.rows[0];
    if (user.role === 'responder') return res.status(403).json({ success: false, message: "Access denied." });

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) return res.status(401).json({ success: false, message: "Invalid credentials." });

    const token = jwt.sign(
      { userId: user.id, role: user.role }, 
      process.env.JWT_SECRET, 
      { expiresIn: '8h' }
    );

    res.status(200).json({ 
      success: true, 
      token, 
      user: { fullName: user.full_name, email: user.email, role: user.role } 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Login failed." });
  }
});

// Create or Update a Decision Tree
router.post("/protocols", authenticateToken, isMedic, async (req, res) => {
  const { slug, title, category, nodes } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO emergency_guides (slug, title, category, nodes, created_by)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (slug) DO UPDATE SET 
       title = EXCLUDED.title, nodes = EXCLUDED.nodes, updated_at = NOW()
       RETURNING *`,
      [slug, title, category, nodes, req.user.userId],
    );
    res.status(200).json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get("/protocols", authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, slug, title, category FROM emergency_guides ORDER BY title ASC",
    );
    res.status(200).json({ success: true, data: result.rows });
  } catch (err) {
    console.error("Error fetching protocols:", err);
    res.status(500).json({ success: false, message: "Database error" });
  }
});

// Route: GET /protocols/:slug
router.get("/protocols/:slug", authenticateToken, async (req, res) => {
  const { slug } = req.params;
  try {
    const result = await pool.query(
      "SELECT title, nodes, category FROM emergency_guides WHERE slug = $1",
      [slug],
    );

    if (result.rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Protocol not found" });
    }

    res.status(200).json({
      success: true,
      data: {
        title: result.rows[0].title,
        nodes:
          typeof result.rows[0].nodes === "string"
            ? JSON.parse(result.rows[0].nodes)
            : result.rows[0].nodes,
        category: result.rows[0].category,
      },
    });
  } catch (err) {
    res
      .status(500)
      .json({ success: false, message: "Error fetching specific protocol" });
  }
});

export default router;
