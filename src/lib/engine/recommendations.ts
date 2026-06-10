import { Assets, Liabilities, Profile } from "../types";
import { formatCompact } from "../format";
import { analyzeRetirement, projectCorpusAtRetirement, requiredCorpus } from "./retirement";
import { reviewPortfolio, totalAssets } from "./portfolio";

export interface Recommendation {
  priority: number;
  title: string;
  detail: string;
  /** e.g. "+₹42 L corpus" or "+11% funded" */
  impact: string;
}

function fundedPct(p: Profile): number {
  const req = requiredCorpus(p);
  return req > 0 ? (projectCorpusAtRetirement(p) / req) * 100 : 100;
}

/** Prioritized, quantified action plan based on the user's full picture. */
export function buildRecommendations(
  p: Profile,
  assets: Assets,
  liabilities: Liabilities,
): Recommendation[] {
  const recs: Recommendation[] = [];
  const ret = analyzeRetirement(p);
  const review = reviewPortfolio(assets, p.currentAge);
  const baseFunded = fundedPct(p);

  // High-interest debt always comes first.
  if (liabilities.creditCard > 0) {
    recs.push({
      priority: 1,
      title: `Clear ${formatCompact(liabilities.creditCard)} of credit-card debt`,
      detail: "Card debt compounds at 36–42% p.a. — no investment beats paying it off.",
      impact: `Saves ~${formatCompact(liabilities.creditCard * 0.38)}/yr in interest`,
    });
  }

  // Emergency fund before aggressive investing.
  const efMonths = p.annualExpenses > 0 ? assets.cash / (p.annualExpenses / 12) : 6;
  if (efMonths < 6) {
    const need = (6 - efMonths) * (p.annualExpenses / 12);
    recs.push({
      priority: 2,
      title: `Build emergency fund by ${formatCompact(need)}`,
      detail: `You hold ${efMonths.toFixed(1)} months of expenses in cash; 6 months protects your SIPs from being broken in a crisis.`,
      impact: "Protects the whole plan",
    });
  }

  // Close the retirement gap with a step-up SIP.
  if (ret.surplus < 0) {
    const bumps = [5_000, 10_000, 20_000, 50_000];
    const bump =
      bumps.find(
        (b) => fundedPct({ ...p, monthlyInvestment: p.monthlyInvestment + b }) >= 100,
      ) ?? bumps[bumps.length - 1];
    const newFunded = fundedPct({ ...p, monthlyInvestment: p.monthlyInvestment + bump });
    recs.push({
      priority: 3,
      title: `Increase SIP by ${formatCompact(bump)}/month`,
      detail: `Exact gap-closing amount is ${formatCompact(ret.additionalMonthlyNeeded)}/month. Even a smaller step-up moves the needle.`,
      impact: `Funded ratio ${baseFunded.toFixed(0)}% → ${newFunded.toFixed(0)}%`,
    });

    const delayed = { ...p, retirementAge: Math.min(p.retirementAge + 2, p.lifeExpectancy - 5) };
    recs.push({
      priority: 4,
      title: `Or delay retirement by 2 years (to ${delayed.retirementAge})`,
      detail: "Two more earning years add contributions, add growth, and shorten the drawdown period.",
      impact: `Funded ratio ${baseFunded.toFixed(0)}% → ${fundedPct(delayed).toFixed(0)}%`,
    });
  }

  // Allocation drift.
  if (totalAssets(assets) > 0 && Math.abs(review.equityPct - review.targetEquityPct) > 15) {
    const high = review.equityPct > review.targetEquityPct;
    recs.push({
      priority: 5,
      title: high
        ? `Reduce equity from ${review.equityPct.toFixed(0)}% to ~${review.targetEquityPct}%`
        : `Raise equity from ${review.equityPct.toFixed(0)}% to ~${review.targetEquityPct}%`,
      detail: high
        ? "Shift gains into debt funds or NPS tier-1 to cut sequence-of-returns risk near retirement."
        : "Long-horizon money in FDs loses to inflation; index funds via SIP are a low-cost fix.",
      impact: high ? "Lower volatility drag" : "Higher expected growth",
    });
  }

  // NPS for tax + retirement.
  recs.push({
    priority: 6,
    title: "Use the extra ₹50K NPS deduction (80CCD(1B))",
    detail: "If you're on the old regime, ₹50K/yr into NPS saves up to ₹15.6K tax and compounds till 60.",
    impact: `~${formatCompact(50_000 * 25)} extra corpus over 25 yrs`,
  });

  // Step-up discipline.
  if (p.sipStepUpPct < 5) {
    const stepped = { ...p, sipStepUpPct: 10 };
    recs.push({
      priority: 7,
      title: "Add a 10% annual step-up to your SIP",
      detail: "Increase SIPs with every salary hike — the single most painless way to close a gap.",
      impact: `Funded ratio ${baseFunded.toFixed(0)}% → ${fundedPct(stepped).toFixed(0)}%`,
    });
  }

  return recs.sort((a, b) => a.priority - b.priority).slice(0, 6);
}
