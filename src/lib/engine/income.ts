import { IncomeSource, Profile } from "../types";
import { sanitizeProfile } from "./retirement";

export interface IncomeYear {
  age: number;
  /** Gross annual income from all sources (pension, rent, SWP top-up…) */
  income: number;
  /** Tax paid across sources */
  tax: number;
  /** Annual expense need (inflated) */
  expenses: number;
  /** Withdrawal taken from corpus to cover any shortfall */
  corpusWithdrawal: number;
  corpus: number;
}

export interface IncomePlan {
  years: IncomeYear[];
  firstYearMonthlyIncome: number;
  firstYearMonthlyAfterTax: number;
  depletionAge: number | null;
  corpusAtLifeExpectancy: number;
}

/**
 * Post-retirement cash-flow plan. Income sources cover expenses first;
 * any shortfall is withdrawn from the corpus, which keeps compounding at
 * the post-retirement return.
 */
export function planRetirementIncome(
  profile: Profile,
  sources: IncomeSource[],
  startingCorpus: number,
): IncomePlan {
  const p = sanitizeProfile(profile);
  const years: IncomeYear[] = [];
  const g = p.inflationPct / 100;
  const r = p.postReturnPct / 100;
  const yearsToRetire = Math.max(0, p.retirementAge - p.currentAge);

  let corpus = startingCorpus;
  let expenses = p.annualExpenses * Math.pow(1 + g, yearsToRetire);
  let depletionAge: number | null = null;

  const amounts = sources.map((s) => ({ ...s, annual: s.monthlyAmount * 12 }));

  for (let age = p.retirementAge; age < p.lifeExpectancy; age++) {
    let gross = 0;
    let tax = 0;
    for (const s of amounts) {
      gross += s.annual;
      tax += s.annual * (s.taxRatePct / 100);
      if (s.inflationLinked) s.annual *= 1 + g;
    }
    const net = gross - tax;
    const shortfall = Math.max(0, expenses - net);
    const withdrawal = Math.min(shortfall, Math.max(0, corpus));
    corpus = (corpus - withdrawal) * (1 + r);
    if (withdrawal < shortfall && depletionAge === null) depletionAge = age;

    years.push({
      age: age + 1,
      income: gross,
      tax,
      expenses,
      corpusWithdrawal: withdrawal,
      corpus: Math.max(0, corpus),
    });
    expenses *= 1 + g;
  }

  const first = years[0];
  return {
    years,
    firstYearMonthlyIncome: first ? (first.income + first.corpusWithdrawal) / 12 : 0,
    firstYearMonthlyAfterTax: first ? (first.income - first.tax + first.corpusWithdrawal) / 12 : 0,
    depletionAge,
    corpusAtLifeExpectancy: years.length ? years[years.length - 1].corpus : startingCorpus,
  };
}
