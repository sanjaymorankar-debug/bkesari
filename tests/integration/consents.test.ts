/**
 * Consent versioning (Part 58 — DPDPA 2023 §6: consent must be demonstrable).
 */
import { beforeEach, describe, expect, it } from "vitest";

import {
  CURRENT_POLICY_VERSION,
  getLatestConsent,
  hasCurrentConsent,
  listConsentHistory,
  recordConsent,
} from "@/server/services/consents";
import { createUser, resetDatabase } from "../helpers/fixtures";

describe("consent recording", () => {
  beforeEach(resetDatabase);

  it("records a consent against the current policy version by default", async () => {
    const user = await createUser();
    const consent = await recordConsent(user.id, "TERMS_AND_PRIVACY");
    expect(consent.version).toBe(CURRENT_POLICY_VERSION);
    expect(consent.userId).toBe(user.id);
  });

  it("reports hasCurrentConsent true only when the latest record matches CURRENT_POLICY_VERSION", async () => {
    const user = await createUser();
    expect(await hasCurrentConsent(user.id, "TERMS_AND_PRIVACY")).toBe(false);

    await recordConsent(user.id, "TERMS_AND_PRIVACY", { version: "2020-01-01" });
    expect(await hasCurrentConsent(user.id, "TERMS_AND_PRIVACY")).toBe(false);

    await recordConsent(user.id, "TERMS_AND_PRIVACY");
    expect(await hasCurrentConsent(user.id, "TERMS_AND_PRIVACY")).toBe(true);
  });

  it("is append-only — a later consent supersedes without deleting the earlier record", async () => {
    const user = await createUser();
    await recordConsent(user.id, "TERMS_AND_PRIVACY", { version: "2020-01-01" });
    await recordConsent(user.id, "TERMS_AND_PRIVACY", { version: "2021-06-01" });

    const history = await listConsentHistory(user.id);
    expect(history).toHaveLength(2);

    const latest = await getLatestConsent(user.id, "TERMS_AND_PRIVACY");
    expect(latest?.version).toBe("2021-06-01");
  });

  it("tracks consent types independently", async () => {
    const user = await createUser();
    await recordConsent(user.id, "TERMS_AND_PRIVACY");
    expect(await getLatestConsent(user.id, "MARKETING_COMMUNICATIONS")).toBeUndefined();
  });
});
