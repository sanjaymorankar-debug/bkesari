/**
 * Money and quantity arithmetic.
 *
 * Every monetary value in this system is an integer count of paise, and every
 * quantity is an integer count of milli-units (thousandths). Floating point is
 * never used for either — `0.1 + 0.2 !== 0.3` is not an acceptable failure mode
 * for a wallet.
 */

/** One rupee in paise. */
export const PAISE_PER_RUPEE = 100;

/** One whole unit (1 L, 1 kg, 1 piece) in milli-units. */
export const MILLI_PER_UNIT = 1000;

export function rupeesToPaise(rupees: number): number {
  if (!Number.isFinite(rupees)) {
    throw new RangeError(`Cannot convert non-finite rupees: ${rupees}`);
  }
  // Round rather than truncate so 70.005 → 7001 rather than 7000.
  return Math.round(rupees * PAISE_PER_RUPEE);
}

export function paiseToRupees(paise: number): number {
  assertInteger(paise, "paise");
  return paise / PAISE_PER_RUPEE;
}

/** Formats paise as an Indian-locale currency string, e.g. 7000 → "₹70.00". */
export function formatPaise(paise: number): string {
  assertInteger(paise, "paise");
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(paise / PAISE_PER_RUPEE);
}

/** Compact form without decimals when the amount is a whole rupee value. */
export function formatPaiseCompact(paise: number): string {
  assertInteger(paise, "paise");
  if (paise % PAISE_PER_RUPEE === 0) {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(paise / PAISE_PER_RUPEE);
  }
  return formatPaise(paise);
}

export function unitsToMilli(units: number): number {
  if (!Number.isFinite(units)) {
    throw new RangeError(`Cannot convert non-finite units: ${units}`);
  }
  return Math.round(units * MILLI_PER_UNIT);
}

export function milliToUnits(milli: number): number {
  assertInteger(milli, "milli");
  return milli / MILLI_PER_UNIT;
}

/** Formats milli-units for display, e.g. 2000 + "L" → "2 L", 500 + "L" → "0.5 L". */
export function formatQuantity(milli: number, unit: string): string {
  assertInteger(milli, "milli");
  const units = milli / MILLI_PER_UNIT;
  const text = Number.isInteger(units) ? String(units) : String(units);
  return `${text} ${unit}`;
}

/**
 * Line total for a quantity expressed in milli-units.
 *
 * unitPricePaise is the price of ONE whole unit, so the total is
 * `price × milli / 1000`. Division is performed last and rounded, keeping the
 * result an exact integer number of paise.
 */
export function lineTotalPaise(
  unitPricePaise: number,
  quantityMilli: number,
): number {
  assertInteger(unitPricePaise, "unitPricePaise");
  assertInteger(quantityMilli, "quantityMilli");
  if (unitPricePaise < 0) {
    throw new RangeError("unitPricePaise must not be negative");
  }
  if (quantityMilli <= 0) {
    throw new RangeError("quantityMilli must be positive");
  }
  return Math.round((unitPricePaise * quantityMilli) / MILLI_PER_UNIT);
}

/** Sums paise amounts, guarding against accidental float contamination. */
export function sumPaise(amounts: readonly number[]): number {
  return amounts.reduce<number>((total, amount) => {
    assertInteger(amount, "paise");
    return total + amount;
  }, 0);
}

function assertInteger(value: number, label: string): void {
  if (!Number.isInteger(value)) {
    throw new RangeError(`${label} must be an integer, received ${value}`);
  }
  if (!Number.isSafeInteger(value)) {
    throw new RangeError(`${label} exceeds safe integer range: ${value}`);
  }
}

/** Standard wallet top-up presets from requirement §20, in paise. */
export const TOPUP_PRESETS_PAISE = [
  10_000, 25_000, 50_000, 100_000, 200_000, 500_000,
] as const;
