/**
 * Applies pending SQL migrations from ./drizzle.
 *
 * Run with: npm run db:migrate        (the database .env points at)
 *           npm run db:migrate:test   (the one TEST_DATABASE_URL points at)
 *
 * The --test form exists because the test database needs the schema too, and
 * the only documented way to give it one was to write the URL out by hand:
 *
 *     DATABASE_URL=mysql://root@localhost:3306/dairy_bakery_test npm run db:migrate
 *
 * That is bash-only syntax, it does not work in cmd.exe, and `$TEST_DATABASE_URL`
 * cannot be used in it because the value lives in .env rather than the shell --
 * so the URL had to be duplicated by hand, in a second place, correctly.
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
import { pgConnectionOptions } from "./ssl";

async function main() {
  // getEnv() resolves DATABASE_URL or the discrete DB_* fields; TEST_DATABASE_URL
  // is read straight from the environment because it is a test-only knob that
  // the application itself never uses, so getEnv() does not model it.
  const useTest = process.argv.includes("--test");
  let url: string;
  if (useTest) {
    const testUrl = process.env.TEST_DATABASE_URL;
    if (!testUrl) {
      throw new Error(
        "TEST_DATABASE_URL must be set in .env to migrate the test database. " +
          "See .env.example -- it must be a SEPARATE database from DATABASE_URL, " +
          "because the suite truncates every table between tests.",
      );
    }
    url = testUrl;
  } else {
    url = getEnv().DATABASE_URL;
  }

  // TLS, if the server requires it, is requested in the URL (`?sslmode=require`),
  // so the same script works against localhost and against a managed provider.
  // Resolved exactly as the application's pool does it; see ./ssl.
  const client = new pg.Client(pgConnectionOptions(url));
  await client.connect();
  try {
    await migrate(drizzle(client), { migrationsFolder: "./drizzle" });
    // Name which database, so running both forms in a row is unambiguous.
    console.log(`Migrations applied to ${useTest ? "the test" : "the application"} database.`);
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
