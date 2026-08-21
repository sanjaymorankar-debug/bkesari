/**
 * Public grievance status lookup. Requires ticket number + the email the
 * complaint was filed with, so a guessed/leaked ticket number cannot expose
 * someone else's complaint (see grievances.ts::lookupGrievance).
 */
import type { NextRequest } from "next/server";
import { z } from "zod";

import { ok, parseQuery, route } from "@/server/api/handler";
import { RATE_LIMITS, clientKey, enforceRateLimit } from "@/server/api/rate-limit";
import { lookupGrievance } from "@/server/services/grievances";

export const dynamic = "force-dynamic";

const querySchema = z.object({
  ticket: z.string().min(3).max(30),
  email: z.string().email(),
});

export const GET = route(async (request: NextRequest) => {
  enforceRateLimit(clientKey(request, "grievance-lookup"), RATE_LIMITS.GRIEVANCE);
  const { ticket, email } = parseQuery(request, querySchema);
  const grievance = await lookupGrievance(ticket, email);
  return ok({
    ticketNumber: grievance.ticketNumber,
    status: grievance.status,
    subject: grievance.subject,
    category: grievance.category,
    resolutionNotes: grievance.resolutionNotes,
    createdAt: grievance.createdAt,
    resolvedAt: grievance.resolvedAt,
  });
});
