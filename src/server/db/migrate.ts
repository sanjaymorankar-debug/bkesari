/**
 * Applies pending SQL migrations from ./drizzle.
 * Run with: npm run db:migrate  (uses DATABASE_URL)
 */
import "dotenv/config";
import { drizzle } from "drizzle-orm/mysql2";
import { migrate } from "drizzle-orm/mysql2/migrator";
import mysql from "mysql2/promise";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");

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
