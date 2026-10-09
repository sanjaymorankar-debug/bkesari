/**
 * Applies pending SQL migrations from ./drizzle.
 *
 * Run with: npm run db:migrate
 *
 * The connection comes from getEnv(), not process.env, so this resolves the
 * database exactly as the application does: either a whole DATABASE_URL, or
 * the discrete DB_* fields that .env.example also accepts. Reading
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

import { resolveSsl, stripSslMode } from "./ssl";

async function main() {
  const url = getEnv().DATABASE_URL;

  // Managed providers require TLS; the flag is read from the URL rather than
  // assumed, so the same script works against localhost and a managed host.
  const client = new pg.Client({
    connectionString: stripSslMode(url),
    ssl: resolveSsl(url),
  });
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
