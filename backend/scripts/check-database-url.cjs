const path = require("node:path");
const dotenv = require("dotenv");

dotenv.config({ path: path.resolve(__dirname, "../.env") });

if (!process.env.DATABASE_URL) {
  console.error(
    "DATABASE_URL is missing. Copy backend/.env.example to backend/.env, set DATABASE_URL, and start PostgreSQL before migrating or seeding.",
  );
  process.exit(1);
}
