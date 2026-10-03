/**
 * Application error taxonomy.
 *
 * Services throw these; the API layer maps them to HTTP status codes and a safe
 * client-facing message. Raw errors and stack traces never reach the client
 * (requirement §53).
 */

export type AppErrorCode =
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION_FAILED"
  | "CONFLICT"
  | "INSUFFICIENT_BALANCE"
  | "PRODUCT_NOT_PURCHASABLE_ONLINE"
  | "OUT_OF_STOCK"
  | "SHOP_NOT_APPROVED"
  | "INVALID_STATE_TRANSITION"
  | "PAYMENT_VERIFICATION_FAILED"
  | "RATE_LIMITED"
  | "INTERNAL";

const STATUS_BY_CODE: Record<AppErrorCode, number> = {
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  VALIDATION_FAILED: 422,
  CONFLICT: 409,
  INSUFFICIENT_BALANCE: 402,
  PRODUCT_NOT_PURCHASABLE_ONLINE: 409,
  OUT_OF_STOCK: 409,
  SHOP_NOT_APPROVED: 409,
  INVALID_STATE_TRANSITION: 409,
  PAYMENT_VERIFICATION_FAILED: 400,
  RATE_LIMITED: 429,
  INTERNAL: 500,
};

export class AppError extends Error {
  readonly code: AppErrorCode;
  readonly status: number;
  readonly details?: Record<string, unknown>;

  constructor(
    code: AppErrorCode,
    message: string,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.status = STATUS_BY_CODE[code];
    this.details = details;
  }
}

/* Convenience constructors, so services read declaratively. */

export const unauthenticated = (msg = "Please sign in to continue.") =>
  new AppError("UNAUTHENTICATED", msg);

export const forbidden = (msg = "You do not have access to do that.") =>
  new AppError("FORBIDDEN", msg);

export const notFound = (what = "Resource") =>
  new AppError("NOT_FOUND", `${what} was not found.`);

export const validationFailed = (
  msg: string,
  details?: Record<string, unknown>,
) => new AppError("VALIDATION_FAILED", msg, details);

export const conflict = (msg: string, details?: Record<string, unknown>) =>
  new AppError("CONFLICT", msg, details);

export const insufficientBalance = (
  requiredPaise: number,
  availablePaise: number,
) =>
  new AppError(
    "INSUFFICIENT_BALANCE",
    "Insufficient wallet balance. Please recharge your wallet.",
    { requiredPaise, availablePaise, shortfallPaise: requiredPaise - availablePaise },
  );

export const notPurchasableOnline = (reason: string) =>
  new AppError("PRODUCT_NOT_PURCHASABLE_ONLINE", reason);

export const outOfStock = (msg = "This product is currently unavailable online.") =>
  new AppError("OUT_OF_STOCK", msg);

export const invalidTransition = (from: string, to: string) =>
  new AppError(
    "INVALID_STATE_TRANSITION",
    `Cannot change status from ${from} to ${to}.`,
    { from, to },
  );

export const paymentVerificationFailed = (
  msg = "We could not verify this payment.",
) => new AppError("PAYMENT_VERIFICATION_FAILED", msg);

/**
 * Normalises anything thrown into a safe client payload. Unknown errors are
 * logged server-side and reported generically so internals never leak.
 */
export function toClientError(error: unknown): {
  status: number;
  body: { error: { code: AppErrorCode; message: string; details?: unknown } };
} {
  if (error instanceof AppError) {
    return {
      status: error.status,
      body: {
        error: {
          code: error.code,
          message: error.message,
          ...(error.details ? { details: error.details } : {}),
        },
      },
    };
  }

  console.error("[unhandled]", error);
  return {
    status: 500,
    body: {
      error: {
        code: "INTERNAL",
        message: "Something went wrong. Please try again.",
      },
    },
  };
}

/**
 * MySQL's duplicate-key error, used to detect idempotency-key collisions.
 *
 * mysql2 reports it as `ER_DUP_ENTRY` with `errno` 1062 (SQLSTATE 23000). Both
 * are checked because the string code is the documented surface while `errno` is
 * what survives being serialised across a driver boundary. The Postgres driver
 * raised SQLSTATE 23505 instead, which never matches on MySQL — so leaving the
 * old value here would have silently turned every idempotency-key collision
 * into an unhandled 500 instead of the conflict the callers expect.
 */
export const MYSQL_DUPLICATE_ENTRY = 1062;

export function isUniqueViolation(error: unknown): boolean {
  // Drizzle does not surface driver errors directly: it throws
  // `DrizzleQueryError` and hangs the mysql2 error off `cause`. The chain is
  // walked rather than just the top-level object, so this keeps working whether
  // the error arrives wrapped or raw.
  let current: unknown = error;
  for (let depth = 0; current !== null && current !== undefined && depth < 5; depth += 1) {
    const err = current as { code?: unknown; errno?: unknown; cause?: unknown };
    if (err.code === "ER_DUP_ENTRY" || err.errno === MYSQL_DUPLICATE_ENTRY) {
      return true;
    }
    current = err.cause;
  }
  return false;
}
