/**
 * Applies pending SQL migrations from ./drizzle.
 * Run with: npm run db:migrate  (uses DATABASE_URL)
 */
import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");

  // Managed providers require TLS; read the flag from the URL rather than
  // assuming, so the same script works against localhost and against Neon.
  const sslmode = new URL(url).searchParams.get("sslmode");
  const ssl = !sslmode || sslmode === "disable" ? false : ("require" as const);

  const client = postgres(url, { max: 1, ssl });
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
