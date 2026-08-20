/**
 * Excel price parsing (§21).
 *
 * The parser is the boundary between a shopkeeper's spreadsheet and integer
 * paise. Everything it can be handed that is *not* a clean number is tested
 * here, because a silent mis-parse becomes a wrong price on a live shelf.
 */
import { describe, expect, it } from "vitest";

import { parseRupeesToPaise } from "@/server/services/excel";

describe("parseRupeesToPaise", () => {
  it("converts whole rupees", () => {
    expect(parseRupeesToPaise("70")).toBe(7000);
    expect(parseRupeesToPaise(70)).toBe(7000);
    expect(parseRupeesToPaise("0")).toBe(0);
  });

  it("converts paise without floating-point drift", () => {
    expect(parseRupeesToPaise("72.50")).toBe(7250);
    expect(parseRupeesToPaise("0.05")).toBe(5);
    // 110.10 * 100 is 11009.999... in binary floating point.
    expect(parseRupeesToPaise("110.10")).toBe(11010);
  });

  it("tolerates the formatting a spreadsheet actually produces", () => {
    expect(parseRupeesToPaise("₹70")).toBe(7000);
    expect(parseRupeesToPaise("1,250")).toBe(125000);
    expect(parseRupeesToPaise(" 70 ")).toBe(7000);
  });

  it("rejects anything that is not a plain positive amount", () => {
    expect(parseRupeesToPaise("")).toBeNull();
    expect(parseRupeesToPaise(null)).toBeNull();
    expect(parseRupeesToPaise(undefined)).toBeNull();
    expect(parseRupeesToPaise("abc")).toBeNull();
    expect(parseRupeesToPaise("-70")).toBeNull();
    expect(parseRupeesToPaise("70.999")).toBeNull(); // more precision than paise
    expect(parseRupeesToPaise("7e3")).toBeNull();
    expect(parseRupeesToPaise("70/-")).toBeNull();
  });

  it("does not evaluate a formula cell as a number (§21)", () => {
    // sanitiseCell prefixes these with an apostrophe before they reach the
    // parser; either way the result must not become a price.
    expect(parseRupeesToPaise("=1+1")).toBeNull();
    expect(parseRupeesToPaise("'=SUM(A1:A9)")).toBeNull();
    expect(parseRupeesToPaise("@SUM(A1)")).toBeNull();
  });
});
