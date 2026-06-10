"use client";

import { useMemo, useState } from "react";
import { usePlanner, useHydrated } from "@/lib/store";
import { analyzeRetirement, earliestRetirementAge } from "@/lib/engine/retirement";
import { runMonteCarlo } from "@/lib/engine/montecarlo";
import { formatCompact, formatINR } from "@/lib/format";
import { Button, Card, NumberField, SliderField, Stat } from "@/components/ui";
import { CorpusTimelineChart } from "@/components/charts";

export default function CalculatorPage() {
  const hydrated = useHydrated();
  const { profile, setProfile, saveScenario } = usePlanner();
  const [saved, setSaved] = useState(false);

  const ret = useMemo(() => analyzeRetirement(profile), [profile]);
  const mc = useMemo(() => runMonteCarlo(profile, 1000), [profile]);
  const earliest = useMemo(() => earliestRetirementAge(profile), [profile]);

  if (!hydrated) return <p className="py-20 text-center text-sm text-slate-400">Loading…</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Retirement Calculator</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Every change updates the projection instantly — this is also your what-if analysis playground.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card title="Your inputs" className="lg:row-span-2">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <NumberField label="Current age" value={profile.currentAge} min={18} max={70}
                onChange={(v) => setProfile({ currentAge: v })} />
              <NumberField label="Retire at" value={profile.retirementAge} min={profile.currentAge + 1} max={75}
                onChange={(v) => setProfile({ retirementAge: v })} />
            </div>
            <NumberField label="Life expectancy" value={profile.lifeExpectancy} min={profile.retirementAge + 1} max={110}
              onChange={(v) => setProfile({ lifeExpectancy: v })} />
            <NumberField label="Current annual expenses" prefix="₹" value={profile.annualExpenses} step={10000}
              hint="Today's rupees — what your lifestyle costs per year"
              onChange={(v) => setProfile({ annualExpenses: v })} />
            <NumberField label="Current savings" prefix="₹" value={profile.currentSavings} step={50000}
              hint="Investments already earmarked for retirement"
              onChange={(v) => setProfile({ currentSavings: v })} />
            <NumberField label="Monthly investment" prefix="₹" value={profile.monthlyInvestment} step={1000}
              hint="SIPs + EPF + NPS, per month"
              onChange={(v) => setProfile({ monthlyInvestment: v })} />
            <SliderField label="SIP annual step-up" min={0} max={20} step={1} value={profile.sipStepUpPct}
              display={`${profile.sipStepUpPct}%`} onChange={(v) => setProfile({ sipStepUpPct: v })} />
            <SliderField label="Inflation" min={3} max={10} step={0.5} value={profile.inflationPct}
              display={`${profile.inflationPct}%`} onChange={(v) => setProfile({ inflationPct: v })} />
            <SliderField label="Return before retirement" min={5} max={16} step={0.5} value={profile.preReturnPct}
              display={`${profile.preReturnPct}%`} onChange={(v) => setProfile({ preReturnPct: v })} />
            <SliderField label="Return after retirement" min={4} max={12} step={0.5} value={profile.postReturnPct}
              display={`${profile.postReturnPct}%`} onChange={(v) => setProfile({ postReturnPct: v })} />
            <div className="flex items-center gap-3 pt-2">
              <Button
                onClick={() => {
                  saveScenario(`Retire at ${profile.retirementAge}`);
                  setSaved(true);
                  setTimeout(() => setSaved(false), 2000);
                }}
              >
                {saved ? "Saved ✓" : "Save as scenario"}
              </Button>
              <span className="text-xs text-slate-500">Compare saved scenarios on the Scenarios page.</span>
            </div>
          </div>
        </Card>

        <div className="space-y-6 lg:col-span-2">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Stat label="Required corpus" value={formatCompact(ret.requiredCorpus)} sub={`at age ${profile.retirementAge}`} />
            <Stat label="Projected corpus" value={formatCompact(ret.projectedCorpus)}
              tone={ret.surplus >= 0 ? "good" : "bad"}
              sub={`${(ret.fundedRatio * 100).toFixed(0)}% funded`} />
            <Stat label={ret.surplus >= 0 ? "Surplus" : "Shortfall"} value={formatCompact(Math.abs(ret.surplus))}
              tone={ret.surplus >= 0 ? "good" : "bad"}
              sub={ret.surplus >= 0 ? "Above requirement" : `Add ${formatCompact(ret.additionalMonthlyNeeded)}/mo to close`} />
            <Stat label="Success probability" value={`${mc.successProbability.toFixed(0)}%`}
              tone={mc.successProbability >= 80 ? "good" : mc.successProbability >= 60 ? "warn" : "bad"}
              sub="1,000 Monte Carlo runs" />
          </div>

          <Card title="Corpus over your lifetime"
            subtitle={`Monthly expenses at retirement: ${formatINR(ret.expensesAtRetirement / 12)} (today: ${formatINR(profile.annualExpenses / 12)})`}>
            <CorpusTimelineChart timeline={ret.timeline} retirementAge={profile.retirementAge} requiredCorpus={ret.requiredCorpus} />
            <div className="mt-3 grid gap-2 text-sm text-slate-600 dark:text-slate-300 sm:grid-cols-2">
              <p>
                {ret.depletionAge
                  ? `⚠️ On this deterministic path the corpus runs out at age ${ret.depletionAge}.`
                  : `✓ The corpus lasts beyond age ${profile.lifeExpectancy} on this path.`}
              </p>
              <p>
                {earliest
                  ? `Earliest fully-funded retirement age on current inputs: ${earliest}.`
                  : "Current investments don't fully fund retirement by 75 — increase SIPs or trim expenses."}
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
