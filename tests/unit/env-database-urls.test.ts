/**
 * Which connection string migrations use.
 *
 * On Neon the app runs on the pooled endpoint (DATABASE_URL) and migrations go
 * over the direct one (DATABASE_URL_UNPOOLED), falling back to DATABASE_URL
 * when there is only one database URL, as locally and in CI. A DATABASE_URL
 * given in the shell names the database to migrate even when .env holds a
 * direct URL. Migrating must not need the app's secrets: a database is
 * migrated from a checkout that holds only that tier's URLs.
 */
import { afterEach, describe, expect, it } from "vitest";

import { databaseUrlForMigrations } from "@/lib/env";

const ENV_KEYS = [
  "DATABASE_URL",
  "DATABASE_URL_UNPOOLED",
  "DB_HOST",
  "DB_PORT",
  "DB_NAME",
  "DB_USER",
  "DB_PASS",
  "DB_SSLMODE",
  "AUTH_SECRET",
  "CRON_SECRET",
] as const;
const originalValues: Record<string, string | undefined> = {};
for (const key of ENV_KEYS) originalValues[key] = process.env[key];

function setEnv(values: Partial<Record<(typeof ENV_KEYS)[number], string>>) {
  for (const key of ENV_KEYS) delete process.env[key];
  Object.assign(process.env, values);
}

afterEach(() => {
  for (const key of ENV_KEYS) {
    if (originalValues[key] === undefined) delete process.env[key];
    else process.env[key] = originalValues[key];
  }
});

const pooled =
  "postgresql://milk_app:pw@ep-x-123-pooler.ap-southeast-1.aws.neon.tech/milk?sslmode=require&channel_binding=require";
const direct =
  "postgresql://milk_app:pw@ep-x-123.ap-southeast-1.aws.neon.tech/milk?sslmode=require&channel_binding=require";

describe("databaseUrlForMigrations", () => {
  it("prefers the direct endpoint when DATABASE_URL_UNPOOLED is set", () => {
    setEnv({ DATABASE_URL: pooled, DATABASE_URL_UNPOOLED: direct });
    expect(databaseUrlForMigrations()).toEqual({ variable: "DATABASE_URL_UNPOOLED", url: direct });
  });

  it("lets a DATABASE_URL set in the shell beat a DATABASE_URL_UNPOOLED from .env", () => {
    // `DATABASE_URL=<local> npm run db:migrate` with a .env holding another
    // database's direct URL: the command line names the database to migrate.
    const local = "postgresql://postgres:postgres@127.0.0.1:5432/milk_scratch";
    setEnv({ DATABASE_URL: local, DATABASE_URL_UNPOOLED: direct });
    expect(databaseUrlForMigrations(new Set(["DATABASE_URL"]))).toEqual({
      variable: "DATABASE_URL",
      url: local,
    });
    // Both set in the shell: the direct one still wins.
    expect(
      databaseUrlForMigrations(new Set(["DATABASE_URL", "DATABASE_URL_UNPOOLED"])).url,
    ).toBe(direct);
  });

  it("falls back to DATABASE_URL when there is only one URL", () => {
    setEnv({ DATABASE_URL: pooled });
    expect(databaseUrlForMigrations()).toEqual({ variable: "DATABASE_URL", url: pooled });
  });

  it("treats a blank DATABASE_URL_UNPOOLED (as .env.example ships it) as unset", () => {
    setEnv({ DATABASE_URL: pooled, DATABASE_URL_UNPOOLED: "" });
    expect(databaseUrlForMigrations().url).toBe(pooled);
  });

  it("still composes the URL from the DB_* fields", () => {
    setEnv({ DB_HOST: "db.local", DB_NAME: "milk", DB_USER: "milk_app", DB_PASS: "p@ss", DB_SSLMODE: "require" });
    expect(databaseUrlForMigrations().url).toBe(
      "postgresql://milk_app:p%40ss@db.local:5432/milk?sslmode=require",
    );
  });

  it("needs no AUTH_SECRET or CRON_SECRET", () => {
    setEnv({ DATABASE_URL_UNPOOLED: direct });
    expect(databaseUrlForMigrations().url).toBe(direct);
  });

  it("refuses a non-PostgreSQL URL and a missing one", () => {
    setEnv({ DATABASE_URL_UNPOOLED: "mysql://root@localhost:3306/milk" });
    expect(() => databaseUrlForMigrations()).toThrow(/PostgreSQL URL/);
    setEnv({});
    expect(() => databaseUrlForMigrations()).toThrow(/DATABASE_URL_UNPOOLED/);
  });
});
