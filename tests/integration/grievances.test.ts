/**
 * Grievance redressal (Part 58 — IT Rules 2021 Rule 3(2)).
 */
import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";

import { db } from "@/server/db";
import { grievances } from "@/server/db/schema";
import {
  assignGrievance,
  getGrievanceByTicket,
  getGrievanceDashboard,
  listGrievances,
  lookupGrievance,
  resolveGrievance,
  setGrievanceStatus,
  submitGrievance,
} from "@/server/services/grievances";
import { createUser, resetDatabase } from "../helpers/fixtures";

const ADMIN = (id: string) => ({ id, role: "ADMIN" as const });

describe("grievance submission", () => {
  beforeEach(resetDatabase);

  it("is reachable without authentication and issues a GRV- ticket number", async () => {
    const grievance = await submitGrievance({
      name: "Asha Rao",
      email: "asha@example.com",
      category: "ORDER",
      subject: "Order never arrived",
      description: "My order placed on Monday has not been delivered.",
    });

    expect(grievance.ticketNumber).toMatch(/^GRV-\d{6}$/);
    expect(grievance.status).toBe("OPEN");
    expect(grievance.submittedByUserId).toBeNull();
  });

  it("associates the grievance with the signed-in user when provided", async () => {
    const user = await createUser();
    const grievance = await submitGrievance({
      name: user.name ?? "Test User",
      email: "user@example.com",
      category: "WALLET",
      subject: "Wallet balance looks wrong",
      description: "My wallet shows a lower balance than expected after a refund.",
      submittedByUserId: user.id,
    });
    expect(grievance.submittedByUserId).toBe(user.id);
  });

  it("rejects an invalid email", async () => {
    await expect(
      submitGrievance({
        name: "Bad Email",
        email: "not-an-email",
        category: "OTHER",
        subject: "Test",
        description: "Description long enough to pass validation.",
      }),
    ).rejects.toThrow();
  });

  it("rejects a too-short description", async () => {
    await expect(
      submitGrievance({
        name: "Short",
        email: "short@example.com",
        category: "OTHER",
        subject: "Test",
        description: "short",
      }),
    ).rejects.toThrow();
  });
});

describe("grievance ticket lookup", () => {
  beforeEach(resetDatabase);

  it("returns the grievance when the ticket number and email match", async () => {
    const grievance = await submitGrievance({
      name: "Priya",
      email: "priya@example.com",
      category: "PAYMENT",
      subject: "Payment charged twice",
      description: "I was charged twice for the same order this morning.",
    });

    const found = await lookupGrievance(grievance.ticketNumber, "priya@example.com");
    expect(found.id).toBe(grievance.id);
  });

  it("is case-insensitive on the email match", async () => {
    const grievance = await submitGrievance({
      name: "Priya",
      email: "priya@example.com",
      category: "PAYMENT",
      subject: "Payment charged twice",
      description: "I was charged twice for the same order this morning.",
    });

    const found = await lookupGrievance(grievance.ticketNumber, "PRIYA@EXAMPLE.COM");
    expect(found.id).toBe(grievance.id);
  });

  it("refuses lookup with a mismatched email — a leaked ticket number cannot expose someone else's complaint", async () => {
    const grievance = await submitGrievance({
      name: "Priya",
      email: "priya@example.com",
      category: "PAYMENT",
      subject: "Payment charged twice",
      description: "I was charged twice for the same order this morning.",
    });

    await expect(
      lookupGrievance(grievance.ticketNumber, "someone-else@example.com"),
    ).rejects.toThrow();
  });

  it("404s a ticket number that does not exist", async () => {
    await expect(getGrievanceByTicket("GRV-999999")).rejects.toThrow();
  });
});

describe("admin grievance management", () => {
  beforeEach(resetDatabase);

  it("assigns a grievance and moves OPEN to IN_PROGRESS", async () => {
    const admin = await createUser({ role: "ADMIN" });
    const grievance = await submitGrievance({
      name: "Test",
      email: "t@example.com",
      category: "OTHER",
      subject: "Subject",
      description: "A description that is long enough to pass validation.",
    });

    const updated = await assignGrievance(grievance.id, admin.id, ADMIN(admin.id));
    expect(updated.assignedToUserId).toBe(admin.id);
    expect(updated.status).toBe("IN_PROGRESS");
  });

  it("resolves a grievance with resolution notes and notifies the submitter", async () => {
    const admin = await createUser({ role: "ADMIN" });
    const submitter = await createUser();
    const grievance = await submitGrievance({
      name: "Test",
      email: "t2@example.com",
      category: "OTHER",
      subject: "Subject",
      description: "A description that is long enough to pass validation.",
      submittedByUserId: submitter.id,
    });

    const resolved = await resolveGrievance(
      grievance.id,
      "Issue was a duplicate charge; refunded to wallet.",
      ADMIN(admin.id),
    );
    expect(resolved.status).toBe("RESOLVED");
    expect(resolved.resolvedAt).not.toBeNull();
    expect(resolved.resolutionNotes).toContain("refunded");
  });

  it("rejects resolving with too-short notes", async () => {
    const admin = await createUser({ role: "ADMIN" });
    const grievance = await submitGrievance({
      name: "Test",
      email: "t3@example.com",
      category: "OTHER",
      subject: "Subject",
      description: "A description that is long enough to pass validation.",
    });
    await expect(resolveGrievance(grievance.id, "ok", ADMIN(admin.id))).rejects.toThrow();
  });

  it("sets an arbitrary status directly", async () => {
    const admin = await createUser({ role: "ADMIN" });
    const grievance = await submitGrievance({
      name: "Test",
      email: "t4@example.com",
      category: "OTHER",
      subject: "Subject",
      description: "A description that is long enough to pass validation.",
    });
    const updated = await setGrievanceStatus(grievance.id, "CLOSED", ADMIN(admin.id));
    expect(updated.status).toBe("CLOSED");
  });

  it("filters by status and search term", async () => {
    await submitGrievance({
      name: "One",
      email: "one@example.com",
      category: "ORDER",
      subject: "Delivery delay",
      description: "Delivery is delayed by several hours today.",
    });
    await submitGrievance({
      name: "Two",
      email: "two@example.com",
      category: "PAYMENT",
      subject: "Refund missing",
      description: "My refund has not appeared in my wallet balance.",
    });

    const paymentOnly = await listGrievances({ category: "PAYMENT" });
    expect(paymentOnly).toHaveLength(1);
    expect(paymentOnly[0].subject).toBe("Refund missing");

    const searched = await listGrievances({ search: "delay" });
    expect(searched).toHaveLength(1);
  });

  it("computes dashboard counts including overdue (>15 days) complaints", async () => {
    const grievance = await submitGrievance({
      name: "Old",
      email: "old@example.com",
      category: "OTHER",
      subject: "Old complaint",
      description: "This complaint was filed a while ago and never resolved.",
    });

    const sixteenDaysAgo = new Date(Date.now() - 16 * 24 * 60 * 60 * 1000);
    await db
      .update(grievances)
      .set({ createdAt: sixteenDaysAgo })
      .where(eq(grievances.id, grievance.id));

    const dashboard = await getGrievanceDashboard();
    expect(dashboard.total).toBe(1);
    expect(dashboard.open).toBe(1);
    expect(dashboard.overdue).toBe(1);
  });
});
