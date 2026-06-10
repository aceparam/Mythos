import { MonteCarloResult, Profile } from "../types";

/** Deterministic PRNG (mulberry32) so simulations are reproducible. */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Standard normal via Box–Muller. */
function makeGaussian(rand: () => number) {
  let spare: number | null = null;
  return () => {
    if (spare !== null) {
      const v = spare;
      spare = null;
      return v;
    }
    let u = 0;
    let v = 0;
    while (u === 0) u = rand();
    while (v === 0) v = rand();
    const mag = Math.sqrt(-2 * Math.log(u));
    spare = mag * Math.sin(2 * Math.PI * v);
    return mag * Math.cos(2 * Math.PI * v);
  };
}

function percentile(sorted: number[], q: number): number {
  if (sorted.length === 0) return 0;
  const idx = (sorted.length - 1) * q;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

/**
 * Monte Carlo over the full lifecycle: lognormal annual returns during
 * accumulation and drawdown, inflation-growing withdrawals in retirement.
 * Success = corpus survives to life expectancy.
 */
export function runMonteCarlo(p: Profile, runs = 2000, seed = 42): MonteCarloResult {
  const rand = mulberry32(seed);
  const gauss = makeGaussian(rand);

  const yearsToRetire = Math.max(0, p.retirementAge - p.currentAge);
  const retirementYears = Math.max(1, p.lifeExpectancy - p.retirementAge);
  const totalYears = yearsToRetire + retirementYears;

  const muPre = Math.log(1 + p.preReturnPct / 100);
  const muPost = Math.log(1 + p.postReturnPct / 100);
  const sigma = p.volatilityPct / 100;
  // Post-retirement portfolios are assumed de-risked to ~60% of volatility.
  const sigmaPost = sigma * 0.6;
  const g = p.inflationPct / 100;

  const finals: number[] = [];
  const atRetirement: number[] = [];
  const paths: number[][] = []; // corpus per year per run
  let successes = 0;

  for (let run = 0; run < runs; run++) {
    let corpus = p.currentSavings;
    let sip = p.monthlyInvestment;
    let withdrawal = p.annualExpenses * Math.pow(1 + g, yearsToRetire);
    const path: number[] = [];
    let failed = false;

    for (let y = 0; y < totalYears; y++) {
      const accumulating = y < yearsToRetire;
      const mu = accumulating ? muPre : muPost;
      const sd = accumulating ? sigma : sigmaPost;
      // Lognormal annual return with drift adjustment.
      const ret = Math.exp(mu - (sd * sd) / 2 + sd * gauss()) - 1;

      if (accumulating) {
        corpus = corpus * (1 + ret) + sip * 12 * (1 + ret / 2); // contributions mid-year on average
        sip *= 1 + p.sipStepUpPct / 100;
      } else {
        corpus = (corpus - withdrawal) * (1 + ret);
        withdrawal *= 1 + g;
        if (corpus <= 0) {
          corpus = 0;
          failed = true;
        }
      }
      path.push(corpus);
      if (y === yearsToRetire - 1) atRetirement.push(corpus);
    }

    if (!failed) successes++;
    finals.push(corpus);
    paths.push(path);
  }

  finals.sort((a, b) => a - b);
  atRetirement.sort((a, b) => a - b);

  // Fan-chart percentile bands per year.
  const bands: MonteCarloResult["bands"] = [];
  for (let y = 0; y < totalYears; y++) {
    const col = paths.map((path) => path[y]).sort((a, b) => a - b);
    bands.push({
      age: p.currentAge + y + 1,
      p10: percentile(col, 0.1),
      p25: percentile(col, 0.25),
      p50: percentile(col, 0.5),
      p75: percentile(col, 0.75),
      p90: percentile(col, 0.9),
    });
  }

  // Histogram of corpus at retirement (or finals when already retired).
  const histSource = atRetirement.length > 0 ? atRetirement : finals;
  const lo = percentile(histSource, 0.01);
  const hi = percentile(histSource, 0.99);
  const bucketCount = 24;
  const width = Math.max(1, (hi - lo) / bucketCount);
  const histogram: MonteCarloResult["histogram"] = [];
  for (let b = 0; b < bucketCount; b++) {
    const start = lo + b * width;
    const end = start + width;
    const mid = (start + end) / 2;
    const count = histSource.filter((v) => v >= start && (b === bucketCount - 1 ? v <= end : v < end)).length;
    histogram.push({ bucket: `${(start / 1e7).toFixed(1)}–${(end / 1e7).toFixed(1)} Cr`, mid, count });
  }

  // Survival curve during retirement.
  const survival: MonteCarloResult["survival"] = [];
  for (let y = yearsToRetire; y < totalYears; y++) {
    const alive = paths.filter((path) => path[y] > 0).length;
    survival.push({ age: p.currentAge + y + 1, alivePct: (alive / runs) * 100 });
  }

  return {
    runs,
    successProbability: (successes / runs) * 100,
    medianFinalCorpus: percentile(finals, 0.5),
    p10FinalCorpus: percentile(finals, 0.1),
    p90FinalCorpus: percentile(finals, 0.9),
    medianCorpusAtRetirement: percentile(histSource, 0.5),
    bands,
    histogram,
    survival,
  };
}
