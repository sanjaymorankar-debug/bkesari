import { describe, expect, it } from "vitest";

import { pgConnectionOptions } from "@/server/db/ssl";

const base = "postgresql://user:p%40ss@db.example.com:5432/app";

describe("pgConnectionOptions", () => {
  it("leaves a URL without sslmode untouched and sets no ssl option", () => {
    expect(pgConnectionOptions(base)).toEqual({ connectionString: base });
  });

  it.each(["require", "prefer", "verify-ca", "verify-full"])(
    "turns sslmode=%s into verified TLS and strips it from the URL",
    (mode) => {
      const result = pgConnectionOptions(`${base}?sslmode=${mode}`);
      expect(result.ssl).toEqual({ rejectUnauthorized: true });
      expect(result.connectionString).toBe(base);
    },
  );

  it("turns sslmode=no-verify into unverified TLS", () => {
    expect(pgConnectionOptions(`${base}?sslmode=no-verify`).ssl).toEqual({
      rejectUnauthorized: false,
    });
  });

  it("turns sslmode=disable into no TLS", () => {
    expect(pgConnectionOptions(`${base}?sslmode=disable`).ssl).toBe(false);
  });

  it("accepts Neon's exact connection string: verified TLS plus channel binding", () => {
    const neon =
      "postgresql://milk_app:p%40ss@ep-cool-name-123456-pooler.ap-southeast-1.aws.neon.tech/milk" +
      "?sslmode=require&channel_binding=require";
    const result = pgConnectionOptions(neon);
    expect(result.ssl).toEqual({ rejectUnauthorized: true });
    expect(result.enableChannelBinding).toBe(true);
    // Both libpq parameters are consumed here, so node-postgres neither warns
    // about sslmode nor silently ignores channel_binding.
    expect(result.connectionString).toBe(
      "postgresql://milk_app:p%40ss@ep-cool-name-123456-pooler.ap-southeast-1.aws.neon.tech/milk",
    );
  });

  it("turns channel_binding=disable into no channel binding, keeping TLS", () => {
    const result = pgConnectionOptions(`${base}?sslmode=require&channel_binding=disable`);
    expect(result.ssl).toEqual({ rejectUnauthorized: true });
    expect(result.enableChannelBinding).toBe(false);
  });

  it("refuses channel_binding=require without TLS", () => {
    expect(() =>
      pgConnectionOptions(`${base}?sslmode=disable&channel_binding=require`),
    ).toThrow(/channel binding needs TLS/);
  });

  it("keeps other query parameters and the encoded password", () => {
    const result = pgConnectionOptions(
      `${base}?sslmode=require&application_name=bkesari`,
    );
    expect(result.connectionString).toBe(`${base}?application_name=bkesari`);
  });
});
