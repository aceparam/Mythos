/** Core domain types for the retirement planner. All money values are in INR. */

export interface Profile {
  name: string;
  currentAge: number;
  retirementAge: number;
  lifeExpectancy: number;
  /** Current annual living expenses (today's rupees) */
  annualExpenses: number;
  /** Expected long-run CPI inflation, % p.a. */
  inflationPct: number;
  /** Current invested savings earmarked for retirement */
  currentSavings: number;
  /** Total monthly investment (SIP + EPF + NPS etc.) */
  monthlyInvestment: number;
  /** Annual step-up of monthly investment, % p.a. */
  sipStepUpPct: number;
  /** Expected nominal portfolio return pre-retirement, % p.a. */
  preReturnPct: number;
  /** Expected nominal portfolio return post-retirement, % p.a. */
  postReturnPct: number;
  /** Portfolio volatility (annual std-dev), % — used by Monte Carlo */
  volatilityPct: number;
  /** Gross annual income (for savings-rate and tax modules) */
  annualIncome: number;
}

export interface Assets {
  cash: number;
  mutualFunds: number;
  stocks: number;
  epf: number;
  ppf: number;
  nps: number;
  gold: number;
  bonds: number;
  realEstate: number;
}

export interface Liabilities {
  homeLoan: number;
  personalLoan: number;
  creditCard: number;
}

export type AssetKey = keyof Assets;
export type LiabilityKey = keyof Liabilities;

export interface NetWorthSnapshot {
  /** ISO date (yyyy-mm) */
  month: string;
  assets: number;
  liabilities: number;
}

export type GoalCategory =
  | "Child Education"
  | "Marriage"
  | "House Purchase"
  | "International Travel"
  | "Emergency Fund"
  | "Other";

export interface Goal {
  id: string;
  name: string;
  category: GoalCategory;
  /** Cost in today's rupees */
  presentCost: number;
  /** Years from now when the goal is due */
  yearsToGoal: number;
  /** Amount already set aside for this goal */
  saved: number;
  /** Goal-specific inflation, % p.a. */
  inflationPct: number;
}

export interface IncomeSource {
  id: string;
  kind: "Pension" | "Rental" | "Dividends" | "Annuity" | "SWP" | "Other";
  /** Monthly amount in rupees at retirement start */
  monthlyAmount: number;
  /** Whether the amount grows with inflation */
  inflationLinked: boolean;
  /** Effective tax rate on this income, % */
  taxRatePct: number;
}

export interface Scenario {
  id: string;
  name: string;
  profile: Profile;
  createdAt: string;
}

export interface YearPoint {
  year: number;
  age: number;
  /** Portfolio corpus at end of year (nominal) */
  corpus: number;
  /** Annual contribution made during the year */
  contribution: number;
  /** Annual withdrawal made during the year */
  withdrawal: number;
  phase: "accumulation" | "drawdown";
}

export interface RetirementResult {
  yearsToRetirement: number;
  retirementYears: number;
  /** Annual expenses at retirement (inflated) */
  expensesAtRetirement: number;
  /** Corpus required at retirement to fund all retirement years */
  requiredCorpus: number;
  /** Projected corpus at retirement from savings + SIPs */
  projectedCorpus: number;
  surplus: number;
  /** projected / required */
  fundedRatio: number;
  /** Deterministic timeline, accumulation + drawdown */
  timeline: YearPoint[];
  /** Age at which corpus runs out (null = lasts beyond life expectancy) */
  depletionAge: number | null;
  /** Extra monthly SIP needed to close the gap (0 if surplus) */
  additionalMonthlyNeeded: number;
}

export interface MonteCarloResult {
  runs: number;
  successProbability: number;
  medianFinalCorpus: number;
  p10FinalCorpus: number;
  p90FinalCorpus: number;
  medianCorpusAtRetirement: number;
  /** Percentile bands per age for fan chart */
  bands: { age: number; p10: number; p25: number; p50: number; p75: number; p90: number }[];
  /** Histogram of corpus at retirement */
  histogram: { bucket: string; mid: number; count: number }[];
  /** Share of runs still solvent at each age during retirement */
  survival: { age: number; alivePct: number }[];
}
