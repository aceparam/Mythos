import { Assets, Liabilities, Profile } from "../types";
import { analyzeRetirement } from "./retirement";
import { reviewPortfolio, totalAssets, totalLiabilities } from "./portfolio";

export interface ScoreComponent {
  key: string;
  label: string;
  /** 0–100 */
  score: number;
  weight: number;
  detail: string;
}

export interface ReadinessScore {
  /** 0–100 */
  total: number;
  band: "red" | "yellow" | "green";
  components: ScoreComponent[];
}

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

/**
 * Composite retirement readiness score:
 * retirement gap 40%, savings rate 20%, emergency fund 15%,
 * asset allocation 15%, debt burden 10%.
 */
export function computeReadiness(p: Profile, assets: Assets, liabilities: Liabilities): ReadinessScore {
  const ret = analyzeRetirement(p);
  const review = reviewPortfolio(assets, p.currentAge);

  // 1. Retirement gap — funded ratio of 1+ is a full score.
  const gapScore = clamp01(ret.fundedRatio) * 100;

  // 2. Savings rate — 30%+ of gross income earns full marks.
  const savingsRate = p.annualIncome > 0 ? (p.monthlyInvestment * 12) / p.annualIncome : 0;
  const savingsScore = clamp01(savingsRate / 0.3) * 100;

  // 3. Emergency fund — 6 months of expenses in cash earns full marks.
  const monthlyExpenses = p.annualExpenses / 12;
  const efMonths = monthlyExpenses > 0 ? assets.cash / monthlyExpenses : 0;
  const efScore = clamp01(efMonths / 6) * 100;

  // 4. Asset allocation — closeness to the age-based equity guideline.
  const totalA = totalAssets(assets);
  const allocScore =
    totalA > 0 ? clamp01(1 - Math.abs(review.equityPct - review.targetEquityPct) / 50) * 100 : 30;

  // 5. Debt burden — liabilities above 50% of assets score zero.
  const debtRatio = totalA > 0 ? totalLiabilities(liabilities) / totalA : totalLiabilities(liabilities) > 0 ? 1 : 0;
  const debtScore = clamp01(1 - debtRatio / 0.5) * 100;

  const components: ScoreComponent[] = [
    {
      key: "gap",
      label: "Retirement gap",
      score: gapScore,
      weight: 0.4,
      detail: `Projected corpus covers ${(ret.fundedRatio * 100).toFixed(0)}% of your requirement.`,
    },
    {
      key: "savings",
      label: "Savings rate",
      score: savingsScore,
      weight: 0.2,
      detail: `You invest ${(savingsRate * 100).toFixed(0)}% of gross income (target 30%).`,
    },
    {
      key: "emergency",
      label: "Emergency fund",
      score: efScore,
      weight: 0.15,
      detail: `Cash covers ${efMonths.toFixed(1)} months of expenses (target 6).`,
    },
    {
      key: "allocation",
      label: "Asset allocation",
      score: allocScore,
      weight: 0.15,
      detail: `Equity ${review.equityPct.toFixed(0)}% vs ~${review.targetEquityPct}% guideline for your age.`,
    },
    {
      key: "debt",
      label: "Debt burden",
      score: debtScore,
      weight: 0.1,
      detail: `Liabilities are ${(debtRatio * 100).toFixed(0)}% of assets.`,
    },
  ];

  const total = Math.round(components.reduce((s, c) => s + c.score * c.weight, 0));
  return {
    total,
    band: total >= 70 ? "green" : total >= 45 ? "yellow" : "red",
    components,
  };
}
