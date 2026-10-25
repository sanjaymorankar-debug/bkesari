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
 * The database is resolved the way the application resolves it, but over the
 * direct endpoint: DATABASE_URL_UNPOOLED when it is set (Neon's direct
 * connection string; DDL does not belong behind a transaction-mode pooler),
 * otherwise DATABASE_URL or the discrete DB_* fields that .env.example also
 * allows. Only those variables are needed: migrating does not require the
 * app's AUTH_SECRET or CRON_SECRET. A variable set in the shell wins over .env,
 * and a DATABASE_URL set in the shell also wins over a DATABASE_URL_UNPOOLED
 * from .env, which is how CI points this at its test database.
 */
import { config as loadDotenv } from "dotenv";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import pg from "pg";

import { databaseUrlForMigrations } from "@/lib/env";
import { pgConnectionOptions } from "./ssl";

// The database variables the shell set, read before .env fills in the rest: a
// DATABASE_URL given on the command line names the database to migrate, even
// when .env also holds a DATABASE_URL_UNPOOLED (see databaseUrlForMigrations).
const setInShell = new Set(
  ["DATABASE_URL", "DATABASE_URL_UNPOOLED"].filter((key) => process.env[key]),
);
loadDotenv();

async function main() {
  // TEST_DATABASE_URL is read straight from the environment because it is a
  // test-only knob that the application itself never uses, so env.ts does not
  // model it.
  const useTest = process.argv.includes("--test");
  let url: string;
  let source = "TEST_DATABASE_URL";
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
    ({ url, variable: source } = databaseUrlForMigrations(setInShell));
  }

  // TLS, if the server requires it, is requested in the URL (`?sslmode=require`),
  // so the same script works against localhost and against a managed provider.
  // Resolved exactly as the application's pool does it; see ./ssl.
  const client = new pg.Client({
    ...pgConnectionOptions(url),
    // A suspended Neon compute takes a moment to start on the first connection.
    connectionTimeoutMillis: 30_000,
  });
  // A connection the server drops between two statements is reported as an
  // 'error' event; listened for, the next statement rejects and the migration
  // fails with a message instead of the process dying of an unhandled event.
  client.on("error", (error) => {
    console.error(`[db:migrate] connection closed by the server: ${error.message}`);
  });
  await client.connect();
  try {
    await migrate(drizzle(client), { migrationsFolder: "./drizzle" });
    // Name which database, and which variable it came from (never its value),
    // so running both forms in a row is unambiguous.
    console.log(
      `Migrations applied to ${useTest ? "the test" : "the application"} database (${source}).`,
    );
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
