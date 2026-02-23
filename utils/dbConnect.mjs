import pg from "pg";
const { Pool } = pg;
import "dotenv/config";

const isProduction = process.env.NODE_ENV === "production";

// Priority: 1. Env Variable (Production/Neon), 2. Hardcoded Neon (Fallback), 3. Localhost
const connectionString =
  process.env.POSTGRES_URL ||
  "postgresql://postgres:musictutor@localhost:8080/EFAA";

// const pool = new Pool({
//   connectionString,
//   // Neon ALWAYS needs SSL unless you are on a very specific local proxy.
//   // This setting allows local dev to talk to Neon and production to talk to Neon.
//   ssl: connectionString.includes("neon.tech")
//     ? { rejectUnauthorized: false }
//     : false,
// });
const pool = new Pool({
  connectionString: connectionString,
  
  ssl: isProduction ? { rejectUnauthorized: false } : false,
});

pool.on("error", (err) => {
  console.error("Unexpected error on idle database client", err);
  process.exit(-1);
});

export default pool;
