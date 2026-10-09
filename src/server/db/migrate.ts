/**
 * Applies pending SQL migrations from ./drizzle.
 *
 * Run with: npm run db:migrate
 *
 * The connection comes from getEnv(), not process.env, so this resolves the
 * database exactly as the application does: either a whole DATABASE_URL, or
 * the discrete DB_* fields that .env.example also allows. Reading
 * process.env.DATABASE_URL directly meant a .env in the DB_* shape ran the app
 * and `db:seed` fine but failed here with "DATABASE_URL is not set". An
 * explicit DATABASE_URL on the command line still wins, which is how CI points
 * this at its test database.
 */
import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import pg from "pg";

import { getEnv } from "@/lib/env";

async function main() {
  // TLS, if the server requires it, is requested in the URL (`?sslmode=require`)
  // and read by node-postgres, so the same script works against localhost and
  // against a managed provider.
  const client = new pg.Client({ connectionString: getEnv().DATABASE_URL });
  await client.connect();
  try {
    await migrate(drizzle(client), { migrationsFolder: "./drizzle" });
    console.log("Migrations applied.");
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
