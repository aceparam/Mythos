import { Profile, RetirementResult, YearPoint } from "../types";

const clamp = (v: number, min: number, max: number) =>
  Math.min(max, Math.max(min, Number.isFinite(v) ? v : min));

/**
 * Clamp a profile into a coherent, computable range. Inputs can be
 * momentarily wild while the user is typing (age 2 on the way to 28,
 * retirement before current age); every engine entry point normalises
 * through this so projections never blow up.
 */
export function sanitizeProfile(p: Profile): Profile {
  const currentAge = clamp(p.currentAge, 16, 90);
  const retirementAge = clamp(p.retirementAge, currentAge + 1, 95);
  const lifeExpectancy = clamp(p.lifeExpectancy, retirementAge + 1, 120);
  return {
    ...p,
    currentAge,
    retirementAge,
    lifeExpectancy,
    annualExpenses: Math.max(0, p.annualExpenses || 0),
    currentSavings: Math.max(0, p.currentSavings || 0),
    monthlyInvestment: Math.max(0, p.monthlyInvestment || 0),
    annualIncome: Math.max(0, p.annualIncome || 0),
    inflationPct: clamp(p.inflationPct, 0, 20),
    sipStepUpPct: clamp(p.sipStepUpPct, 0, 30),
    preReturnPct: clamp(p.preReturnPct, 0, 30),
    postReturnPct: clamp(p.postReturnPct, 0, 30),
    volatilityPct: clamp(p.volatilityPct, 1, 50),
  };
}

/**
 * Future value of current savings plus a monthly SIP with annual step-up,
 * compounded monthly at the given nominal annual return.
 */
export function projectCorpusAtRetirement(profile: Profile): number {
  const p = sanitizeProfile(profile);
  const months = Math.max(0, (p.retirementAge - p.currentAge) * 12);
  const r = p.preReturnPct / 100 / 12;
  let corpus = p.currentSavings;
  let sip = p.monthlyInvestment;
  for (let m = 0; m < months; m++) {
    corpus = corpus * (1 + r) + sip;
    if ((m + 1) % 12 === 0) sip *= 1 + p.sipStepUpPct / 100;
  }
  return corpus;
}

/**
 * Corpus required at retirement so that inflation-growing withdrawals last
 * through life expectancy. Present value of a growing annuity-due at the
 * post-retirement return.
 */
export function requiredCorpus(profile: Profile): number {
  const p = sanitizeProfile(profile);
  const yearsToRetire = Math.max(0, p.retirementAge - p.currentAge);
  const retirementYears = Math.max(1, p.lifeExpectancy - p.retirementAge);
  const g = p.inflationPct / 100;
  const r = p.postReturnPct / 100;
  const firstYearExpense = p.annualExpenses * Math.pow(1 + g, yearsToRetire);
  if (Math.abs(r - g) < 1e-9) return firstYearExpense * retirementYears;
  const ratio = (1 + g) / (1 + r);
  // Annuity-due: withdrawals happen at the start of each retirement year.
  return firstYearExpense * ((1 - Math.pow(ratio, retirementYears)) / (1 - ratio));
}

/** Monthly SIP (flat, no step-up) needed to accumulate `target` in `months`. */
export function sipForTarget(target: number, months: number, annualReturnPct: number): number {
  if (months <= 0) return target > 0 ? Infinity : 0;
  const r = annualReturnPct / 100 / 12;
  if (r === 0) return target / months;
  return (target * r) / (Math.pow(1 + r, months) - 1);
}

/** Deterministic year-by-year accumulation and drawdown timeline. */
export function buildTimeline(profile: Profile): YearPoint[] {
  const p = sanitizeProfile(profile);
  const points: YearPoint[] = [];
  const startYear = new Date().getFullYear();
  const rPre = p.preReturnPct / 100 / 12;
  const rPost = p.postReturnPct / 100;
  const g = p.inflationPct / 100;

  let corpus = p.currentSavings;
  let sip = p.monthlyInvestment;

  for (let age = p.currentAge; age < p.retirementAge; age++) {
    let contribution = 0;
    for (let m = 0; m < 12; m++) {
      corpus = corpus * (1 + rPre) + sip;
      contribution += sip;
    }
    sip *= 1 + p.sipStepUpPct / 100;
    points.push({
      year: startYear + (age - p.currentAge),
      age: age + 1,
      corpus,
      contribution,
      withdrawal: 0,
      phase: "accumulation",
    });
  }

  const yearsToRetire = p.retirementAge - p.currentAge;
  let withdrawal = p.annualExpenses * Math.pow(1 + g, Math.max(0, yearsToRetire));
  for (let age = p.retirementAge; age < p.lifeExpectancy; age++) {
    corpus = (corpus - withdrawal) * (1 + rPost);
    points.push({
      year: startYear + (age - p.currentAge),
      age: age + 1,
      corpus: Math.max(corpus, 0),
      contribution: 0,
      withdrawal,
      phase: "drawdown",
    });
    withdrawal *= 1 + g;
    if (corpus <= 0) {
      corpus = 0;
      withdrawal = 0;
    }
  }
  return points;
}

export function analyzeRetirement(profile: Profile): RetirementResult {
  const p = sanitizeProfile(profile);
  const yearsToRetirement = Math.max(0, p.retirementAge - p.currentAge);
  const retirementYears = Math.max(0, p.lifeExpectancy - p.retirementAge);
  const required = requiredCorpus(p);
  const projected = projectCorpusAtRetirement(p);
  const timeline = buildTimeline(p);

  const depleted = timeline.find((pt) => pt.phase === "drawdown" && pt.corpus <= 0);
  const gap = Math.max(0, required - projected);

  return {
    yearsToRetirement,
    retirementYears,
    expensesAtRetirement:
      p.annualExpenses * Math.pow(1 + p.inflationPct / 100, yearsToRetirement),
    requiredCorpus: required,
    projectedCorpus: projected,
    surplus: projected - required,
    fundedRatio: required > 0 ? projected / required : 1,
    timeline,
    depletionAge: depleted ? depleted.age : null,
    additionalMonthlyNeeded: sipForTarget(gap, yearsToRetirement * 12, p.preReturnPct),
  };
}

/** Earliest retirement age (keeping all else fixed) at which the plan is fully funded. */
export function earliestRetirementAge(profile: Profile): number | null {
  const p = sanitizeProfile(profile);
  for (let age = p.currentAge + 1; age <= Math.min(p.lifeExpectancy - 1, 75); age++) {
    const trial = { ...p, retirementAge: age };
    if (projectCorpusAtRetirement(trial) >= requiredCorpus(trial)) return age;
  }
  return null;
}
