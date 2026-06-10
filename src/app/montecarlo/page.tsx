"use client";

import { useMemo, useState } from "react";
import { usePlanner, useHydrated } from "@/lib/store";
import { runMonteCarlo } from "@/lib/engine/montecarlo";
import { formatCompact } from "@/lib/format";
import { Card, SliderField, Stat } from "@/components/ui";
import { FanChart, HistogramChart, SurvivalChart } from "@/components/charts";

export default function MonteCarloPage() {
  const hydrated = useHydrated();
  const { profile, setProfile } = usePlanner();
  const [runs, setRuns] = useState(2000);

  const result = useMemo(() => runMonteCarlo(profile, runs), [profile, runs]);

  if (!hydrated) return <p className="py-20 text-center text-sm text-slate-400">Loading…</p>;

  const tone =
    result.successProbability >= 80 ? "good" : result.successProbability >= 60 ? "warn" : "bad";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Monte Carlo Simulation</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {result.runs.toLocaleString()} randomised market paths through your accumulation and retirement years.
          Success means the corpus survives to age {profile.lifeExpectancy}.
        </p>
      </div>

      <Card title="Simulation settings">
        <div className="grid gap-4 sm:grid-cols-3">
          <SliderField label="Simulation runs" min={1000} max={10000} step={1000} value={runs}
            display={runs.toLocaleString()} onChange={setRuns} />
          <SliderField label="Portfolio volatility" min={5} max={25} step={1} value={profile.volatilityPct}
            display={`${profile.volatilityPct}%`} onChange={(v) => setProfile({ volatilityPct: v })} />
          <SliderField label="Expected return (pre-retirement)" min={5} max={16} step={0.5} value={profile.preReturnPct}
            display={`${profile.preReturnPct}%`} onChange={(v) => setProfile({ preReturnPct: v })} />
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Success probability" value={`${result.successProbability.toFixed(1)}%`} tone={tone}
          sub="Corpus lasts to life expectancy" />
        <Stat label="Median corpus at retirement" value={formatCompact(result.medianCorpusAtRetirement)} />
        <Stat label="Worst case (P10 final)" value={formatCompact(result.p10FinalCorpus)} tone="bad"
          sub="10% of runs end below this" />
        <Stat label="Best case (P90 final)" value={formatCompact(result.p90FinalCorpus)} tone="good"
          sub="10% of runs end above this" />
      </div>

      <Card title="Corpus fan chart" subtitle="Shaded bands: 10th–90th and 25th–75th percentiles; dark line: median">
        <FanChart result={result} retirementAge={profile.retirementAge} />
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Corpus distribution at retirement" subtitle="How widely outcomes spread across runs">
          <HistogramChart result={result} />
        </Card>
        <Card title="Retirement survival timeline" subtitle="Share of simulations still solvent at each age (green line: 80% comfort level)">
          <SurvivalChart result={result} />
        </Card>
      </div>
    </div>
  );
}
