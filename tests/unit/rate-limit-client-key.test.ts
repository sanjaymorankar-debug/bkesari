/**
 * clientKey(): the key of every anonymous rate limit (grievance submission and
 * lookup, the cron endpoint). Each proxy appends the address it received the
 * request from to X-Forwarded-For, so the header reads
 * "<whatever the visitor sent>, <visitor>, <proxy>, …". The key must be the
 * visitor, found from the right past trusted proxies, never anything the
 * visitor wrote.
 *
 * A file of its own: env.ts caches its configuration on first use, and these
 * tests change TRUSTED_PROXIES, so each test re-imports the modules (the same
 * pattern as env-admin-emails.test.ts).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const originalTrustedProxies = process.env.TRUSTED_PROXIES;

beforeEach(() => {
  vi.resetModules();
  delete process.env.TRUSTED_PROXIES;
});

afterEach(() => {
  if (originalTrustedProxies === undefined) delete process.env.TRUSTED_PROXIES;
  else process.env.TRUSTED_PROXIES = originalTrustedProxies;
});

/** clientKey for one request, read with the TRUSTED_PROXIES now in process.env. */
async function keyFor(forwardedFor: string | null): Promise<string> {
  const { clientKey } = await import("@/server/api/rate-limit");
  const headers = new Headers();
  if (forwardedFor !== null) headers.set("x-forwarded-for", forwardedFor);
  return clientKey(new Request("http://localhost/api/grievances", { method: "POST", headers }), "grievance");
}

describe("clientKey: the visitor, read from the right of X-Forwarded-For", () => {
  it("a forged leftmost entry does not change the key", async () => {
    // The visitor 198.51.100.23 sends anything at all; the hop on loopback
    // appended the visitor's real address.
    for (const forged of ["203.0.113.1", "203.0.113.2", "10.9.8.7", "127.0.0.1", "::1", "unknown", "x"]) {
      expect(await keyFor(`${forged}, 198.51.100.23, 127.0.0.1`)).toBe("grievance:198.51.100.23");
    }
    // Several forged entries are no different from one, or none.
    expect(await keyFor("203.0.113.1, 203.0.113.2, 203.0.113.3, 198.51.100.23, 127.0.0.1")).toBe(
      "grievance:198.51.100.23",
    );
    expect(await keyFor("198.51.100.23, 127.0.0.1")).toBe("grievance:198.51.100.23");
  });

  it("picks the real client through loopback proxies (127.0.0.0/8, ::1, ::ffff:127.x)", async () => {
    expect(await keyFor("203.0.113.50, 198.51.100.23, 127.0.0.1, ::1, ::ffff:127.0.0.1, 127.8.9.10")).toBe(
      "grievance:198.51.100.23",
    );
    // A visitor seen directly, with nothing in front: the address Next fills
    // in from the socket when the request carries no header.
    expect(await keyFor("198.51.100.23")).toBe("grievance:198.51.100.23");
  });

  it("picks the real client through a TRUSTED_PROXIES address, and without it the proxy is the key", async () => {
    const chain = "203.0.113.50, 198.51.100.23, 192.0.2.10, 127.0.0.1";

    // Not configured: the front end at 192.0.2.10 is the first untrusted
    // entry, so every visitor behind it shares its bucket. That over-limits;
    // it never lets a visitor pick a key.
    expect(await keyFor(chain)).toBe("grievance:192.0.2.10");

    vi.resetModules();
    process.env.TRUSTED_PROXIES = "192.0.2.10, 2001:db8::10";
    expect(await keyFor(chain)).toBe("grievance:198.51.100.23");
    expect(await keyFor("203.0.113.50, 2001:db8:1::23, 2001:db8::10")).toBe("grievance:2001:db8:1::23");
    // The trusted address matches however it is written.
    expect(await keyFor("203.0.113.50, 198.51.100.23, ::ffff:192.0.2.10")).toBe("grievance:198.51.100.23");
    expect(await keyFor("203.0.113.50, 198.51.100.23, 2001:0DB8:0:0::10")).toBe("grievance:198.51.100.23");
  });

  it("trusts a TRUSTED_PROXIES CIDR range, and nothing outside it", async () => {
    process.env.TRUSTED_PROXIES = "10.0.0.0/8,2001:db8::/32";
    expect(await keyFor("203.0.113.50, 198.51.100.23, 10.20.30.40, 10.0.0.1")).toBe("grievance:198.51.100.23");
    expect(await keyFor("203.0.113.50, 198.51.100.23, 2001:db8:ffff::1")).toBe("grievance:198.51.100.23");
    expect(await keyFor("203.0.113.50, 198.51.100.23, 11.0.0.1")).toBe("grievance:11.0.0.1");
    expect(await keyFor("203.0.113.50, 198.51.100.23, 2001:db9::1")).toBe("grievance:2001:db9::1");
  });

  it("falls back to the unknown bucket when every entry is trusted, or there is no header", async () => {
    expect(await keyFor(null)).toBe("grievance:unknown");
    expect(await keyFor("127.0.0.1")).toBe("grievance:unknown");
    expect(await keyFor("::ffff:127.0.0.1")).toBe("grievance:unknown");
    expect(await keyFor("127.0.0.1, ::1, 127.0.0.1")).toBe("grievance:unknown");

    vi.resetModules();
    process.env.TRUSTED_PROXIES = "192.0.2.10";
    expect(await keyFor("192.0.2.10, 127.0.0.1")).toBe("grievance:unknown");
  });

  it("handles malformed entries: spaces, empty items, ports, IPv6", async () => {
    // Spaces and tabs around entries, and no space after the comma (how
    // http-proxy appends).
    expect(await keyFor("  203.0.113.50 ,198.51.100.23\t,  127.0.0.1  ")).toBe("grievance:198.51.100.23");
    expect(await keyFor("203.0.113.50,198.51.100.23,127.0.0.1")).toBe("grievance:198.51.100.23");
    // Empty items on the visitor's side are never read.
    expect(await keyFor(", ,203.0.113.50,,198.51.100.23,127.0.0.1")).toBe("grievance:198.51.100.23");
    // Ports, on IPv4 and on bracketed IPv6.
    expect(await keyFor("203.0.113.50, 198.51.100.23:51234, 127.0.0.1:8080")).toBe("grievance:198.51.100.23");
    expect(await keyFor("203.0.113.50, [2001:db8:1::23]:443, [::1]:3000")).toBe("grievance:2001:db8:1::23");
    // IPv6 in capitals, and an IPv4 visitor written as an IPv4-mapped address.
    expect(await keyFor("203.0.113.50, 2001:DB8:1::23, ::1")).toBe("grievance:2001:db8:1::23");
    expect(await keyFor("203.0.113.50, ::ffff:198.51.100.23, ::ffff:127.0.0.1")).toBe("grievance:198.51.100.23");
    // Where the visitor should be, an entry that is not an address: the chain
    // cannot be read past it, so the request goes to the shared bucket rather
    // than to anything further left, which the visitor wrote.
    expect(await keyFor("203.0.113.50, unknown, 127.0.0.1")).toBe("grievance:unknown");
    expect(await keyFor("203.0.113.50, , 127.0.0.1")).toBe("grievance:unknown");
    expect(await keyFor("203.0.113.50, 198.51.100.23, garbage!, 127.0.0.1")).toBe("grievance:unknown");
    expect(await keyFor("203.0.113.50, 198.51.100.23,")).toBe("grievance:unknown");
    expect(await keyFor("")).toBe("grievance:unknown");
  });
});

describe("TRUSTED_PROXIES validation (src/lib/env.ts)", () => {
  it("accepts comma-separated IP addresses and CIDR ranges, or nothing", async () => {
    process.env.TRUSTED_PROXIES = " 192.0.2.10 , 2001:db8::10,10.0.0.0/8, 2001:db8::/32 ,";
    const { getEnv } = await import("@/lib/env");
    expect(() => getEnv()).not.toThrow();

    vi.resetModules();
    process.env.TRUSTED_PROXIES = "";
    const fresh = await import("@/lib/env");
    expect(fresh.getEnv().TRUSTED_PROXIES).toBeUndefined();
  });

  it.each([
    ["not-an-ip"],
    ["192.0.2.10:8080"],
    ["10.0.0.0/33"],
    ["10.0.0.0/"],
    ["2001:db8::/129"],
    ["192.0.2.10, 192.0.2.300"],
  ])("refuses %j at startup, naming the variable", async (value) => {
    process.env.TRUSTED_PROXIES = value;
    const { getEnv } = await import("@/lib/env");
    expect(() => getEnv()).toThrow(/TRUSTED_PROXIES/);
  });
});
