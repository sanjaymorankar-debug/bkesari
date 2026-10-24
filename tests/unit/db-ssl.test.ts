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

  it("keeps other query parameters and the encoded password", () => {
    const result = pgConnectionOptions(
      `${base}?sslmode=require&application_name=bkesari`,
    );
    expect(result.connectionString).toBe(`${base}?application_name=bkesari`);
  });
});
