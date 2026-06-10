import { sipForTarget } from "./retirement";

export type FireVariant = "lean" | "regular" | "fat";

export interface FireInput {
  annualSpending: number;
  safeWithdrawalRatePct: number;
  inflationPct: number;
  currentSavings: number;
  monthlyInvestment: number;
  expectedReturnPct: number;
  currentAge: number;
}

export interface FireResult {
  variant: FireVariant;
  label: string;
  /** Target spending used for this variant (today's rupees) */
  targetSpending: number;
  /** FIRE number in today's rupees */
  fireNumber: number;
  /** Years until corpus (growing with SIPs) crosses the inflating FIRE number */
  yearsToFI: number | null;
  fiAge: number | null;
  /** Flat monthly SIP needed to reach FI in 15 years */
  monthlyFor15Years: number;
}

const VARIANTS: { variant: FireVariant; label: string; multiplier: number }[] = [
  { variant: "lean", label: "Lean FIRE", multiplier: 0.7 },
  { variant: "regular", label: "Regular FIRE", multiplier: 1.0 },
  { variant: "fat", label: "Fat FIRE", multiplier: 1.7 },
];

/**
 * Years until projected corpus crosses the FIRE number. The FIRE number
 * inflates each year; the corpus compounds and receives contributions.
 */
function yearsToCross(input: FireInput, fireNumberToday: number): number | null {
  const r = input.expectedReturnPct / 100;
  const g = input.inflationPct / 100;
  let corpus = input.currentSavings;
  let target = fireNumberToday;
  if (corpus >= target) return 0;
  for (let y = 1; y <= 60; y++) {
    corpus = corpus * (1 + r) + input.monthlyInvestment * 12 * (1 + r / 2);
    target *= 1 + g;
    if (corpus >= target) return y;
  }
  return null;
}

export function analyzeFire(input: FireInput): FireResult[] {
  const swr = input.safeWithdrawalRatePct / 100;
  return VARIANTS.map(({ variant, label, multiplier }) => {
    const targetSpending = input.annualSpending * multiplier;
    const fireNumber = swr > 0 ? targetSpending / swr : Infinity;
    const years = yearsToCross(input, fireNumber);
    const inflatedTarget15 = fireNumber * Math.pow(1 + input.inflationPct / 100, 15);
    const fvSavings15 =
      input.currentSavings * Math.pow(1 + input.expectedReturnPct / 100, 15);
    return {
      variant,
      label,
      targetSpending,
      fireNumber,
      yearsToFI: years,
      fiAge: years === null ? null : input.currentAge + years,
      monthlyFor15Years: sipForTarget(
        Math.max(0, inflatedTarget15 - fvSavings15),
        15 * 12,
        input.expectedReturnPct,
      ),
    };
  });
}
