/**
 * Pure schedule-resolution tests (requirements §28–§31).
 * No database — these pin down the rule precedence exactly.
 */
import { describe, expect, it } from "vitest";

import { resolveDelivery, nextDeliveryDate, type ScheduleInput } from "@/server/services/subscriptions";

const base: ScheduleInput = {
  status: "ACTIVE",
  frequency: "DAILY",
  weekdays: [],
  quantityMilli: 2000, // 2 L/day
  startDate: "2026-08-20",
  endDate: null,
  pauseFrom: null,
  pauseUntil: null,
};

describe("resolveDelivery — standing schedule", () => {
  it("delivers the standing quantity on an ordinary day", () => {
    const result = resolveDelivery(base, "2026-08-21");
    expect(result).toEqual({
      delivers: true,
      quantityMilli: 2000,
      reason: "STANDARD",
    });
  });

  it("does not deliver before the start date", () => {
    expect(resolveDelivery(base, "2026-08-19")).toEqual({
      delivers: false,
      reason: "BEFORE_START",
    });
  });

  it("delivers on the start date itself", () => {
    expect(resolveDelivery(base, "2026-08-20").delivers).toBe(true);
  });

  it("does not deliver after the end date", () => {
    const bounded = { ...base, endDate: "2026-08-25" };
    expect(resolveDelivery(bounded, "2026-08-25").delivers).toBe(true);
    expect(resolveDelivery(bounded, "2026-08-26")).toEqual({
      delivers: false,
      reason: "AFTER_END",
    });
  });

  it("does not deliver when cancelled or completed", () => {
    for (const status of ["CANCELLED", "COMPLETED", "PAUSED"] as const) {
      expect(resolveDelivery({ ...base, status }, "2026-08-21")).toEqual({
        delivers: false,
        reason: "NOT_ACTIVE",
      });
    }
  });

  it("still delivers while PAYMENT_PENDING so a top-up can resume service", () => {
    expect(
      resolveDelivery({ ...base, status: "PAYMENT_PENDING" }, "2026-08-21")
        .delivers,
    ).toBe(true);
  });
});

describe("resolveDelivery — daily overrides (§28)", () => {
  it("uses the override quantity for that one date", () => {
    const result = resolveDelivery(base, "2026-08-21", {
      type: "QUANTITY",
      quantityMilli: 3000,
    });
    expect(result).toEqual({
      delivers: true,
      quantityMilli: 3000,
      reason: "OVERRIDE",
    });
  });

  it("reverts to the standing quantity the following day", () => {
    // 20-Aug → 2 L, 21-Aug → 3 L (override), 22-Aug → 1 L (override), 23-Aug → 2 L
    const overrides = new Map([
      ["2026-08-21", { type: "QUANTITY" as const, quantityMilli: 3000 }],
      ["2026-08-22", { type: "QUANTITY" as const, quantityMilli: 1000 }],
    ]);
    const quantities = [
      "2026-08-20",
      "2026-08-21",
      "2026-08-22",
      "2026-08-23",
    ].map((d) => {
      const r = resolveDelivery(base, d, overrides.get(d));
      return r.delivers ? r.quantityMilli : 0;
    });
    expect(quantities).toEqual([2000, 3000, 1000, 2000]);
  });

  it("supports half-litre steps exactly", () => {
    const result = resolveDelivery(base, "2026-08-21", {
      type: "QUANTITY",
      quantityMilli: 2500,
    });
    expect(result).toMatchObject({ quantityMilli: 2500 });
  });
});

describe("resolveDelivery — skip and pause (§30, §31)", () => {
  it("skips a single date", () => {
    expect(
      resolveDelivery(base, "2026-08-25", { type: "SKIP", quantityMilli: null }),
    ).toEqual({ delivers: false, reason: "SKIPPED" });
  });

  it("suppresses the whole pause window, inclusive of both ends", () => {
    const paused = {
      ...base,
      pauseFrom: "2026-08-25",
      pauseUntil: "2026-08-30",
    };
    expect(resolveDelivery(paused, "2026-08-24").delivers).toBe(true);
    for (const d of ["2026-08-25", "2026-08-27", "2026-08-30"]) {
      expect(resolveDelivery(paused, d)).toEqual({
        delivers: false,
        reason: "PAUSED",
      });
    }
    expect(resolveDelivery(paused, "2026-08-31").delivers).toBe(true);
  });

  it("lets a pause win over an override — a paused day never delivers", () => {
    const paused = {
      ...base,
      pauseFrom: "2026-08-25",
      pauseUntil: "2026-08-30",
    };
    const result = resolveDelivery(paused, "2026-08-27", {
      type: "QUANTITY",
      quantityMilli: 5000,
    });
    expect(result).toEqual({ delivers: false, reason: "PAUSED" });
  });
});

describe("resolveDelivery — weekly frequency", () => {
  const weekly: ScheduleInput = {
    ...base,
    frequency: "WEEKLY",
    weekdays: [1, 4], // Monday and Thursday
  };

  it("delivers only on the chosen weekdays", () => {
    // 2026-08-20 is a Thursday, 21st Friday, 24th Monday.
    expect(resolveDelivery(weekly, "2026-08-20").delivers).toBe(true);
    expect(resolveDelivery(weekly, "2026-08-21")).toEqual({
      delivers: false,
      reason: "NOT_SCHEDULED_DAY",
    });
    expect(resolveDelivery(weekly, "2026-08-24").delivers).toBe(true);
  });

  it("does not let an override create a delivery on an unscheduled day", () => {
    const result = resolveDelivery(weekly, "2026-08-21", {
      type: "QUANTITY",
      quantityMilli: 3000,
    });
    expect(result).toEqual({ delivers: false, reason: "NOT_SCHEDULED_DAY" });
  });
});

describe("nextDeliveryDate", () => {
  it("returns the first delivering date on or after the given day", () => {
    expect(nextDeliveryDate(base, "2026-08-18")).toBe("2026-08-20");
  });

  it("skips over a pause window", () => {
    const paused = {
      ...base,
      pauseFrom: "2026-08-20",
      pauseUntil: "2026-08-24",
    };
    expect(nextDeliveryDate(paused, "2026-08-20")).toBe("2026-08-25");
  });

  it("skips over an explicitly skipped date", () => {
    const overrides = new Map([
      [
        "2026-08-20",
        {
          id: "x",
          subscriptionId: "s",
          deliveryDate: "2026-08-20",
          type: "SKIP" as const,
          quantityMilli: null,
          createdBy: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    ]);
    expect(nextDeliveryDate(base, "2026-08-20", overrides)).toBe("2026-08-21");
  });

  it("returns null once the subscription has ended", () => {
    const ended = { ...base, endDate: "2026-08-22" };
    expect(nextDeliveryDate(ended, "2026-08-23")).toBeNull();
  });
});
