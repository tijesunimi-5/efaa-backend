import { Pool } from "pg";


// const connectionString = process.env.POSTGRES_URL;
const connectionString = process.env.DATABASE_URL;

// IMPORTANT: Neon requires SSL/TLS. This configuration is essential for Vercel/Node.js connections.
const isProduction = process.env.NODE_ENV === "production";

const pool = new Pool({
  connectionString: connectionString,

  ssl: isProduction ? { rejectUnauthorized: false } : false,
});

pool.on("error", (err, client) => {
  console.error("Unexpected error on idle client", err);
  process.exit(-1);
});

export default pool;
