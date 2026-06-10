import { Assets, Liabilities, Profile } from "../types";
import { formatCompact, formatPct } from "../format";
import {
  analyzeRetirement,
  earliestRetirementAge,
  projectCorpusAtRetirement,
  requiredCorpus,
} from "./retirement";
import { runMonteCarlo } from "./montecarlo";
import { buildRecommendations } from "./recommendations";
import { reviewPortfolio } from "./portfolio";

export interface CoachReply {
  answer: string;
  bullets: string[];
}

interface Ctx {
  profile: Profile;
  assets: Assets;
  liabilities: Liabilities;
}

function fundedPct(p: Profile): number {
  const req = requiredCorpus(p);
  return req > 0 ? (projectCorpusAtRetirement(p) / req) * 100 : 100;
}

/**
 * Deterministic retirement coach. Every answer is computed live from the
 * user's own plan with the same engines that power the dashboards, so the
 * numbers always agree with the rest of the app.
 */
export function askCoach(question: string, ctx: Ctx): CoachReply {
  const q = question.toLowerCase();
  const { profile: p } = ctx;

  // "Can I retire at 50?" — extract a target age if present.
  const ageMatch = q.match(/retire\s*(?:at|by)\s*(\d{2})/);
  if (ageMatch) {
    const target = Number(ageMatch[1]);
    const trial = { ...p, retirementAge: target };
    const res = analyzeRetirement(trial);
    const mc = runMonteCarlo(trial, 1000);
    const ok = res.surplus >= 0;
    return {
      answer: ok
        ? `Yes — retiring at ${target} looks feasible. Your projected corpus of ${formatCompact(res.projectedCorpus)} covers the ${formatCompact(res.requiredCorpus)} you'd need, with a ${mc.successProbability.toFixed(0)}% Monte Carlo success rate.`
        : `Not yet. Retiring at ${target} needs ${formatCompact(res.requiredCorpus)}, but you're on track for ${formatCompact(res.projectedCorpus)} — a shortfall of ${formatCompact(-res.surplus)}. Monte Carlo success rate is ${mc.successProbability.toFixed(0)}%.`,
      bullets: ok
        ? [
            `Surplus at ${target}: ${formatCompact(res.surplus)}`,
            `Plan still needs to survive ${res.retirementYears} years of withdrawals — keep 2–3 years of expenses in debt funds.`,
          ]
        : [
            `Closing the gap needs about ${formatCompact(res.additionalMonthlyNeeded)}/month more in SIPs.`,
            earliestRetirementAge(p) !== null
              ? `On current investments, the earliest fully-funded retirement age is ${earliestRetirementAge(p)}.`
              : `On current investments, the plan isn't fully funded by 75 — raise SIPs or expenses need a relook.`,
          ],
    };
  }

  // "Am I saving enough?"
  if (q.includes("saving enough") || q.includes("save enough") || q.includes("on track")) {
    const res = analyzeRetirement(p);
    const funded = fundedPct(p);
    const rate = p.annualIncome > 0 ? ((p.monthlyInvestment * 12) / p.annualIncome) * 100 : 0;
    return {
      answer:
        funded >= 100
          ? `Yes — your plan is ${funded.toFixed(0)}% funded. Projected corpus ${formatCompact(res.projectedCorpus)} vs ${formatCompact(res.requiredCorpus)} required at ${p.retirementAge}.`
          : `Not quite. Your plan is ${funded.toFixed(0)}% funded: ${formatCompact(res.projectedCorpus)} projected vs ${formatCompact(res.requiredCorpus)} required at ${p.retirementAge}.`,
      bullets: [
        `Savings rate: ${rate.toFixed(0)}% of gross income (aim for 25–30%).`,
        funded >= 100
          ? "Consider de-risking: shift 2–3 years of expenses into debt as you approach retirement."
          : `Add ${formatCompact(res.additionalMonthlyNeeded)}/month, or use a 10% annual SIP step-up to close the gap gradually.`,
      ],
    };
  }

  // "Should I increase my SIP?"
  if (q.includes("sip") || q.includes("invest more") || q.includes("increase")) {
    const res = analyzeRetirement(p);
    const plus10k = fundedPct({ ...p, monthlyInvestment: p.monthlyInvestment + 10_000 });
    return {
      answer:
        res.surplus >= 0
          ? `Your plan is already funded, so a higher SIP buys safety margin rather than necessity. Adding ₹10K/month lifts the funded ratio from ${fundedPct(p).toFixed(0)}% to ${plus10k.toFixed(0)}%.`
          : `Yes. You're ${formatCompact(-res.surplus)} short; the exact gap-closing SIP increase is ${formatCompact(res.additionalMonthlyNeeded)}/month. Adding ₹10K/month would take you from ${fundedPct(p).toFixed(0)}% to ${plus10k.toFixed(0)}% funded.`,
      bullets: [
        "Route increases into index/flexi-cap funds while you're 10+ years out.",
        "A step-up SIP that rises with salary beats a one-time jump.",
      ],
    };
  }

  // "What if inflation is 8%?"
  const inflMatch = q.match(/inflation[^\d]*(\d+(?:\.\d+)?)/);
  if (inflMatch || q.includes("inflation")) {
    const rate = inflMatch ? Number(inflMatch[1]) : 8;
    const trial = { ...p, inflationPct: rate };
    const res = analyzeRetirement(trial);
    const base = analyzeRetirement(p);
    return {
      answer: `At ${rate}% inflation your required corpus rises from ${formatCompact(base.requiredCorpus)} to ${formatCompact(res.requiredCorpus)}, and the plan goes from ${fundedPct(p).toFixed(0)}% to ${fundedPct(trial).toFixed(0)}% funded.`,
      bullets: [
        res.depletionAge
          ? `At ${rate}% inflation the corpus would run out at age ${res.depletionAge}.`
          : `Even at ${rate}% inflation the corpus lasts past age ${p.lifeExpectancy}.`,
        "Hedge with equity and inflation-linked income (rent, dividend growth) rather than fixed annuities alone.",
      ],
    };
  }

  // "Should I move to debt funds?"
  if (q.includes("debt") || q.includes("safer") || q.includes("de-risk") || q.includes("equity")) {
    const review = reviewPortfolio(ctx.assets, p.currentAge);
    const yearsOut = p.retirementAge - p.currentAge;
    return {
      answer:
        review.equityPct > review.targetEquityPct + 10
          ? `Yes, gradually. You're at ${formatPct(review.equityPct, 0)} equity vs a ~${review.targetEquityPct}% guideline for age ${p.currentAge}. Shift the excess into debt over 12–18 months rather than at once.`
          : `No rush. Equity is ${formatPct(review.equityPct, 0)} vs a ~${review.targetEquityPct}% guideline for your age, and you're ${yearsOut} years from retirement.`,
      bullets: [
        "Glide path: cut equity ~5% a year in the last 5 years before retirement.",
        "Keep 2–3 years of retirement expenses in liquid/short-duration debt to ride out crashes.",
      ],
    };
  }

  // Default: a personalised action plan.
  const recs = buildRecommendations(p, ctx.assets, ctx.liabilities);
  const res = analyzeRetirement(p);
  return {
    answer: `Here's where you stand: ${formatCompact(res.projectedCorpus)} projected vs ${formatCompact(res.requiredCorpus)} required at ${p.retirementAge} (${fundedPct(p).toFixed(0)}% funded). Top actions:`,
    bullets: recs.slice(0, 4).map((r) => `${r.title} — ${r.impact}`),
  };
}

export const SUGGESTED_QUESTIONS = [
  "Can I retire at 50?",
  "Am I saving enough?",
  "Should I increase my SIP?",
  "What happens if inflation is 8%?",
  "Should I move to more debt funds?",
  "Give me an action plan",
];
