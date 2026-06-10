import { Assets, AssetKey, Liabilities } from "../types";

export const ASSET_META: Record<
  AssetKey,
  { label: string; class: "equity" | "debt" | "gold" | "realEstate" | "cash"; color: string }
> = {
  cash: { label: "Cash & FDs", class: "cash", color: "#94a3b8" },
  mutualFunds: { label: "Mutual Funds", class: "equity", color: "#6366f1" },
  stocks: { label: "Direct Stocks", class: "equity", color: "#8b5cf6" },
  epf: { label: "EPF", class: "debt", color: "#0ea5e9" },
  ppf: { label: "PPF", class: "debt", color: "#06b6d4" },
  nps: { label: "NPS", class: "debt", color: "#14b8a6" },
  bonds: { label: "Bonds", class: "debt", color: "#22c55e" },
  gold: { label: "Gold", class: "gold", color: "#eab308" },
  realEstate: { label: "Real Estate", class: "realEstate", color: "#f97316" },
};

export const LIABILITY_META: Record<keyof Liabilities, { label: string }> = {
  homeLoan: { label: "Home Loan" },
  personalLoan: { label: "Personal Loan" },
  creditCard: { label: "Credit Card Debt" },
};

export function totalAssets(a: Assets): number {
  return Object.values(a).reduce((s, v) => s + v, 0);
}

export function totalLiabilities(l: Liabilities): number {
  return Object.values(l).reduce((s, v) => s + v, 0);
}

export function netWorth(a: Assets, l: Liabilities): number {
  return totalAssets(a) - totalLiabilities(l);
}

export interface AllocationSlice {
  key: string;
  label: string;
  value: number;
  pct: number;
  color: string;
}

export function allocationByClass(a: Assets): AllocationSlice[] {
  const total = totalAssets(a);
  const byClass = new Map<string, number>();
  for (const [key, value] of Object.entries(a) as [AssetKey, number][]) {
    const cls = ASSET_META[key].class;
    byClass.set(cls, (byClass.get(cls) ?? 0) + value);
  }
  const labels: Record<string, { label: string; color: string }> = {
    equity: { label: "Equity", color: "#6366f1" },
    debt: { label: "Debt", color: "#0ea5e9" },
    gold: { label: "Gold", color: "#eab308" },
    realEstate: { label: "Real Estate", color: "#f97316" },
    cash: { label: "Cash", color: "#94a3b8" },
  };
  return [...byClass.entries()]
    .filter(([, v]) => v > 0)
    .map(([key, value]) => ({
      key,
      label: labels[key].label,
      value,
      pct: total > 0 ? (value / total) * 100 : 0,
      color: labels[key].color,
    }))
    .sort((x, y) => y.value - x.value);
}

export interface PortfolioReview {
  equityPct: number;
  debtPct: number;
  /** 1 (very conservative) … 10 (very aggressive) */
  riskScore: number;
  /** 0–100, higher = better spread across classes */
  diversificationScore: number;
  /** Rule-of-thumb equity target for the investor's age */
  targetEquityPct: number;
  notes: string[];
}

export function reviewPortfolio(a: Assets, age: number): PortfolioReview {
  const total = totalAssets(a);
  const slices = allocationByClass(a);
  const pct = (cls: string) => slices.find((s) => s.key === cls)?.pct ?? 0;
  const equityPct = pct("equity");
  const debtPct = pct("debt");
  const cashPct = pct("cash");
  const rePct = pct("realEstate");

  // Herfindahl-based diversification: 1 - sum(share^2), normalised so an
  // even split across the 5 classes scores 100.
  const hhi = slices.reduce((s, sl) => s + Math.pow(sl.pct / 100, 2), 0);
  const diversificationScore =
    total > 0 ? Math.max(0, Math.min(100, Math.round(((1 - hhi) / (1 - 1 / 5)) * 100))) : 0;

  const targetEquityPct = Math.min(85, Math.max(25, 110 - age));
  const riskScore = Math.round(1 + (equityPct / 100) * 9);

  const notes: string[] = [];
  if (total === 0) {
    notes.push("Add your assets on the Net Worth page to get a portfolio review.");
  } else {
    if (equityPct > targetEquityPct + 15)
      notes.push(
        `Equity at ${equityPct.toFixed(0)}% is well above the ~${targetEquityPct}% guideline for age ${age}. Consider shifting gains into debt funds.`,
      );
    if (equityPct < targetEquityPct - 15)
      notes.push(
        `Equity at ${equityPct.toFixed(0)}% is low for age ${age} (guideline ~${targetEquityPct}%). Long-horizon money may grow too slowly to beat inflation.`,
      );
    if (cashPct > 20)
      notes.push(`Cash is ${cashPct.toFixed(0)}% of assets — beyond a 6-month emergency fund it loses to inflation.`);
    if (rePct > 50)
      notes.push(`Real estate is ${rePct.toFixed(0)}% of assets — illiquid for retirement withdrawals.`);
    if (slices.length <= 2)
      notes.push("Portfolio is concentrated in very few asset classes — diversify across equity, debt and gold.");
    if (notes.length === 0) notes.push("Allocation looks balanced for your age. Rebalance once a year to keep it that way.");
  }

  return {
    equityPct,
    debtPct,
    riskScore,
    diversificationScore,
    targetEquityPct,
    notes,
  };
}
