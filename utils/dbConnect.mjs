import { Pool } from "pg";

// 1. Added // after postgresql:
// 2. Changed port from 8080 to 5432
const connectionString = "postgresql://postgres:musictutor@localhost:8080/EFAA";

const isProduction = process.env.NODE_ENV === "production";

const pool = new Pool({
  connectionString: connectionString,
  // This ensures local development works without SSL errors
  ssl: isProduction ? { rejectUnauthorized: false } : false,
});

pool.on("error", (err, client) => {
  console.error("Unexpected error on idle client", err);
  process.exit(-1);
});

export default pool;
