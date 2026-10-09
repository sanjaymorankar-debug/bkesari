/**
 * Applies pending SQL migrations from ./drizzle.
 *
 * Run with: npm run db:migrate
 *
 * The connection comes from getEnv(), not process.env, so this resolves the
 * database exactly as the application does: either a whole DATABASE_URL, or
 * the discrete DB_* fields that hPanel issues and that .env.example tells you
 * to fill in. Reading process.env.DATABASE_URL directly meant a .env in the
 * documented DB_* shape ran the app and `db:seed` fine but failed here with
 * "DATABASE_URL is not set". An explicit DATABASE_URL on the command line
 * still wins, which is how CI points this at its test database.
 */
import "dotenv/config";
import { drizzle } from "drizzle-orm/mysql2";
import { migrate } from "drizzle-orm/mysql2/migrator";
import mysql from "mysql2/promise";

import { getEnv } from "@/lib/env";

async function main() {
  const url = getEnv().DATABASE_URL;

  // Hostinger's MySQL is local and unencrypted; a managed provider that needs
  // TLS says so with `?ssl=true`, so the flag is read rather than assumed.
  const ssl = new URL(url).searchParams.get("ssl");
  const connection = await mysql.createConnection({
    uri: url,
    ssl: !ssl || ssl === "false" ? undefined : { rejectUnauthorized: true },
    timezone: "Z",
    multipleStatements: true,
  });
  try {
    await migrate(drizzle(connection), { migrationsFolder: "./drizzle" });
    console.log("Migrations applied.");
  } finally {
    await connection.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
