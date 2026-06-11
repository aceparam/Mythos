import { Profile } from "../types";
import { formatCompact, formatINR } from "../format";
import {
  analyzeRetirement,
  earliestRetirementAge,
  sanitizeProfile,
} from "./retirement";

/**
 * The Oracle engine. Everything here is deterministic and offline — given a
 * profile and an age, it reconstructs the life your money is building at that
 * moment: how much corpus you're sitting on, what your lifestyle costs by then,
 * the emotional "mood" of that future self, and a short hand-written letter
 * from them back to you. No network, no LLM — just the same projection math the
 * calculator uses, retold as a person you can meet.
 */

export type LifePhase = "accumulation" | "drawdown";
export type Mood = "thriving" | "comfortable" | "stretched" | "struggling" | "broke";

/** A safe perpetual withdrawal rate — the classic 4% rule. */
const SAFE_WITHDRAWAL_RATE = 0.04;

export interface FutureSelf {
  age: number;
  /** Calendar year this age is reached. */
  year: number;
  phase: LifePhase;
  retired: boolean;
  /** Whether this age is at or past the earliest fully-funded ("freedom") age. */
  free: boolean;
  /** Corpus standing at this age (nominal rupees). */
  corpus: number;
  /** Annual cost of your lifestyle by this year (inflated from today). */
  annualExpenses: number;
  /** Monthly passive income a safe 4% draw on the corpus would throw off. */
  monthlyPassiveIncome: number;
  /** Passive income ÷ monthly expenses. >1 means money works harder than you. */
  coverageRatio: number;
  /** How many years of that-era lifestyle the corpus covers outright. */
  yearsOfExpensesBanked: number;
  mood: Mood;
  /** A short letter from this future self, addressed to you, today. */
  letter: string;
}

export interface LifeReading {
  freedomAge: number | null;
  /** The exact calendar date you cross into financial independence. */
  freedomDate: Date | null;
  depletionAge: number | null;
  /** One-line verdict on the whole life path. */
  verdict: string;
  verdictOk: boolean;
}

const MOOD_LABEL: Record<Mood, string> = {
  thriving: "Thriving",
  comfortable: "Comfortable",
  stretched: "Stretched",
  struggling: "Struggling",
  broke: "Out of money",
};

export function moodLabel(mood: Mood): string {
  return MOOD_LABEL[mood];
}

/** Corpus at the end of a given age, reading the deterministic timeline. */
function corpusAtAge(
  timeline: { age: number; corpus: number }[],
  age: number,
  currentAge: number,
  currentSavings: number,
): number {
  if (age <= currentAge) return currentSavings;
  const point = timeline.find((p) => p.age === age);
  if (point) return point.corpus;
  // Past the end of the timeline (beyond life expectancy) — carry the last value.
  return timeline.length ? timeline[timeline.length - 1].corpus : currentSavings;
}

function moodFor(
  retired: boolean,
  yearsBanked: number,
  fundedRatio: number,
  corpus: number,
): Mood {
  if (retired) {
    if (corpus <= 0) return "broke";
    if (yearsBanked >= 25) return "thriving";
    if (yearsBanked >= 14) return "comfortable";
    if (yearsBanked >= 7) return "stretched";
    return "struggling";
  }
  // Still working — judge by how on-track the plan is.
  if (fundedRatio >= 1.25) return "thriving";
  if (fundedRatio >= 1) return "comfortable";
  if (fundedRatio >= 0.7) return "stretched";
  if (fundedRatio >= 0.4) return "struggling";
  return "broke";
}

function buildLetter(
  p: Profile,
  self: Omit<FutureSelf, "letter">,
  plan: { additionalMonthlyNeeded: number; depletionAge: number | null },
): string {
  const youngerYou = p.name?.trim() ? p.name.trim().split(/\s+/)[0] : "you";
  const yearsAhead = self.age - p.currentAge;
  const m = formatINR(self.monthlyPassiveIncome);
  const cov = self.coverageRatio;

  if (self.retired) {
    if (self.corpus <= 0) {
      const ranOut = plan.depletionAge ?? self.age;
      return `Dear ${youngerYou}, I have to be honest with the version of us reading this. The money ran dry at ${ranOut}, and I'm leaning on others in years that were meant to be ours alone. None of this was bad luck — it was the gap we kept meaning to close. Add ${formatCompact(plan.additionalMonthlyNeeded)}/mo now and you rewrite this whole letter.`;
    }
    if (self.mood === "thriving") {
      return `Dear ${youngerYou}, I haven't worked in ${self.age - p.retirementAge} years and I sleep just fine. The corpus quietly pays me ${m} a month — about ${cov.toFixed(1)}× what I spend — so the rest keeps growing while I do nothing. Every boring SIP you didn't skip bought me this freedom. Thank you for being patient with our money.`;
    }
    if (self.mood === "comfortable") {
      return `Dear ${youngerYou}, retirement is good. ${m} a month lands without me lifting a finger, and it covers the life we wanted with a little to spare. I'm not buying islands, but I never check a price tag at the chemist either. You built something steady. Keep the lid on lifestyle creep and we stay exactly here.`;
    }
    if (self.mood === "stretched") {
      return `Dear ${youngerYou}, I won't sugar-coat it — we're fine, but it's tighter than it looked on the spreadsheet. ${m} a month means watching the big-ticket years carefully. A slightly bigger SIP, or two more working years, would have handed me a lot more breathing room. Think about that while you still have the time I don't.`;
    }
    return `Dear ${youngerYou}, I'm getting by, but the cushion is thin and inflation is relentless. ${m} a month doesn't stretch the way the brochures promised. Please don't read this as a scolding — read it as a head start. Small additions today are enormous by the time they reach me.`;
  }

  // Still accumulating.
  if (self.mood === "thriving" || self.mood === "comfortable") {
    return `Dear ${youngerYou}, ${yearsAhead} years on and the plan is working. The corpus has crossed ${formatCompact(self.corpus)} and the compounding has clearly taken the wheel from us. Don't get clever, don't panic-sell, don't time anything. Just keep feeding it and let me take it from here.`;
  }
  if (self.mood === "stretched") {
    return `Dear ${youngerYou}, we're ${yearsAhead} years in and on the road — just not far enough ahead of it. The corpus sits at ${formatCompact(self.corpus)}. Nudging the SIP up by even one step-up cycle now changes my whole story. I can feel the gap from here; close a little of it for me.`;
  }
  return `Dear ${youngerYou}, this is the letter I hoped not to write. ${yearsAhead} years on we're behind, and time — our single biggest asset — is draining. Adding ${formatCompact(plan.additionalMonthlyNeeded)}/mo would put me back on course. You have the one thing I'd trade anything for: years for it to grow.`;
}

/** Build the future self that stands at a given age. */
export function readFutureSelf(profile: Profile, age: number): FutureSelf {
  const p = sanitizeProfile(profile);
  const plan = analyzeRetirement(p);
  const targetAge = Math.min(Math.max(age, p.currentAge), p.lifeExpectancy);

  const corpus = Math.max(
    0,
    corpusAtAge(plan.timeline, targetAge, p.currentAge, p.currentSavings),
  );
  const annualExpenses =
    p.annualExpenses * Math.pow(1 + p.inflationPct / 100, targetAge - p.currentAge);
  const monthlyPassiveIncome = (corpus * SAFE_WITHDRAWAL_RATE) / 12;
  const monthlyExpenses = annualExpenses / 12;
  const coverageRatio = monthlyExpenses > 0 ? monthlyPassiveIncome / monthlyExpenses : 0;
  const yearsOfExpensesBanked = annualExpenses > 0 ? corpus / annualExpenses : 0;

  const retired = targetAge >= p.retirementAge;
  const freedom = earliestRetirementAge(p);
  const free = freedom !== null && targetAge >= freedom;
  const mood = moodFor(retired, yearsOfExpensesBanked, plan.fundedRatio, corpus);

  const partial: Omit<FutureSelf, "letter"> = {
    age: targetAge,
    year: new Date().getFullYear() + (targetAge - p.currentAge),
    phase: retired ? "drawdown" : "accumulation",
    retired,
    free,
    corpus,
    annualExpenses,
    monthlyPassiveIncome,
    coverageRatio,
    yearsOfExpensesBanked,
    mood,
  };

  return { ...partial, letter: buildLetter(p, partial, plan) };
}

/** The big-picture reading of the whole life path. */
export function readLife(profile: Profile): LifeReading {
  const p = sanitizeProfile(profile);
  const plan = analyzeRetirement(p);
  const freedomAge = earliestRetirementAge(p);

  let freedomDate: Date | null = null;
  if (freedomAge !== null) {
    const d = new Date();
    d.setFullYear(d.getFullYear() + (freedomAge - p.currentAge));
    freedomDate = d;
  }

  const depletionAge = plan.depletionAge;
  let verdict: string;
  let verdictOk: boolean;
  if (depletionAge) {
    verdict = `On today's path the money runs out at ${depletionAge} — ${p.lifeExpectancy - depletionAge} years short of plan.`;
    verdictOk = false;
  } else if (freedomAge !== null && freedomAge <= p.retirementAge) {
    verdict = `Financially free at ${freedomAge}, with a corpus that outlives you. The plan holds.`;
    verdictOk = true;
  } else if (freedomAge !== null) {
    verdict = `Freedom arrives at ${freedomAge}, a little later than your target of ${p.retirementAge}.`;
    verdictOk = true;
  } else {
    verdict = `On current inputs the plan never fully funds itself by 75. Time to change the story.`;
    verdictOk = false;
  }

  return { freedomAge, freedomDate, depletionAge, verdict, verdictOk };
}
