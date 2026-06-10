/**
 * Indian income-tax estimation for FY 2025-26 (AY 2026-27).
 * Simplified: salaried resident individual below 60, no surcharge breakdown
 * beyond the basic slabs, 4% health & education cess applied.
 */

export interface TaxInput {
  grossAnnualIncome: number;
  /** 80C investments: EPF, PPF, ELSS, life insurance… capped at 1.5L */
  deduction80C: number;
  /** NPS self contribution u/s 80CCD(1B), capped at 50K (old regime only) */
  npsExtra: number;
  /** Health insurance u/s 80D (old regime only) */
  deduction80D: number;
  /** Home loan interest u/s 24(b) (old regime only), capped at 2L */
  homeLoanInterest: number;
}

export interface RegimeResult {
  regime: "old" | "new";
  taxableIncome: number;
  tax: number;
  effectiveRatePct: number;
}

interface Slab {
  upTo: number;
  rate: number;
}

const OLD_SLABS: Slab[] = [
  { upTo: 250_000, rate: 0 },
  { upTo: 500_000, rate: 0.05 },
  { upTo: 1_000_000, rate: 0.2 },
  { upTo: Infinity, rate: 0.3 },
];

const NEW_SLABS: Slab[] = [
  { upTo: 400_000, rate: 0 },
  { upTo: 800_000, rate: 0.05 },
  { upTo: 1_200_000, rate: 0.1 },
  { upTo: 1_600_000, rate: 0.15 },
  { upTo: 2_000_000, rate: 0.2 },
  { upTo: 2_400_000, rate: 0.25 },
  { upTo: Infinity, rate: 0.3 },
];

function slabTax(taxable: number, slabs: Slab[]): number {
  let tax = 0;
  let prev = 0;
  for (const { upTo, rate } of slabs) {
    if (taxable <= prev) break;
    tax += (Math.min(taxable, upTo) - prev) * rate;
    prev = upTo;
  }
  return tax;
}

export function computeOldRegime(input: TaxInput): RegimeResult {
  const deductions =
    50_000 + // standard deduction
    Math.min(input.deduction80C, 150_000) +
    Math.min(input.npsExtra, 50_000) +
    Math.min(input.deduction80D, 75_000) +
    Math.min(input.homeLoanInterest, 200_000);
  const taxable = Math.max(0, input.grossAnnualIncome - deductions);
  let tax = slabTax(taxable, OLD_SLABS);
  if (taxable <= 500_000) tax = 0; // 87A rebate
  tax *= 1.04; // cess
  return {
    regime: "old",
    taxableIncome: taxable,
    tax,
    effectiveRatePct: input.grossAnnualIncome > 0 ? (tax / input.grossAnnualIncome) * 100 : 0,
  };
}

export function computeNewRegime(input: TaxInput): RegimeResult {
  const taxable = Math.max(0, input.grossAnnualIncome - 75_000); // standard deduction
  let tax = slabTax(taxable, NEW_SLABS);
  if (taxable <= 1_200_000) tax = 0; // 87A rebate (FY 2025-26)
  tax *= 1.04;
  return {
    regime: "new",
    taxableIncome: taxable,
    tax,
    effectiveRatePct: input.grossAnnualIncome > 0 ? (tax / input.grossAnnualIncome) * 100 : 0,
  };
}

/** Equity LTCG: 12.5% above ₹1.25L exemption. Equity STCG: 20%. */
export function equityCapitalGainsTax(ltcg: number, stcg: number): number {
  return Math.max(0, ltcg - 125_000) * 0.125 + Math.max(0, stcg) * 0.2;
}

export interface TaxOpportunity {
  title: string;
  detail: string;
  estimatedSaving: number;
}

export function taxOpportunities(input: TaxInput): TaxOpportunity[] {
  const ops: TaxOpportunity[] = [];
  const old = computeOldRegime(input);
  const marginal = old.taxableIncome > 1_000_000 ? 0.3 : old.taxableIncome > 500_000 ? 0.2 : 0.05;

  const room80C = Math.max(0, 150_000 - input.deduction80C);
  if (room80C > 0 && old.tax > 0) {
    ops.push({
      title: `Use remaining ₹${Math.round(room80C / 1000)}K of 80C limit`,
      detail: "ELSS funds, PPF or EPF (VPF) top-up qualify and double as retirement savings.",
      estimatedSaving: room80C * marginal * 1.04,
    });
  }
  const roomNps = Math.max(0, 50_000 - input.npsExtra);
  if (roomNps > 0 && old.tax > 0) {
    ops.push({
      title: `Contribute ₹${Math.round(roomNps / 1000)}K more to NPS (80CCD(1B))`,
      detail: "Extra ₹50K NPS deduction is over and above 80C, and builds your retirement corpus.",
      estimatedSaving: roomNps * marginal * 1.04,
    });
  }
  ops.push({
    title: "Harvest equity LTCG up to ₹1.25L every year",
    detail: "Realise long-term gains within the exemption and reinvest to step up your cost basis.",
    estimatedSaving: 125_000 * 0.125,
  });
  ops.push({
    title: "Plan retirement withdrawals across financial years",
    detail:
      "EPF and PPF withdrawals are tax-free; 60% of NPS is tax-free at exit. Stagger mutual-fund redemptions to stay within the LTCG exemption.",
    estimatedSaving: 0,
  });
  return ops;
}
