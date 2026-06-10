"use client";

import { useMemo, useState } from "react";
import { uid, usePlanner } from "@/lib/store";
import { analyzeGoal, totalGoalMonthly } from "@/lib/engine/goals";
import { analyzeRetirement } from "@/lib/engine/retirement";
import { Goal, GoalCategory } from "@/lib/types";
import { formatCompact } from "@/lib/format";
import { Button, Card, NumberField, Progress, SelectField, Stat, TextField } from "@/components/ui";
import { Trash2 } from "lucide-react";

const CATEGORIES: GoalCategory[] = [
  "Child Education",
  "Marriage",
  "House Purchase",
  "International Travel",
  "Emergency Fund",
  "Other",
];

export default function GoalsPage() {
  const { goals, addGoal, removeGoal, profile } = usePlanner();

  const [name, setName] = useState("");
  const [category, setCategory] = useState<GoalCategory>("Child Education");
  const [cost, setCost] = useState(1_000_000);
  const [years, setYears] = useState(10);
  const [saved, setSaved] = useState(0);
  const [inflation, setInflation] = useState(8);

  const analyses = useMemo(() => goals.map((g) => analyzeGoal(g, profile.preReturnPct)), [goals, profile.preReturnPct]);
  const goalMonthly = useMemo(() => totalGoalMonthly(goals, profile.preReturnPct), [goals, profile.preReturnPct]);

  // Impact on retirement: goal SIPs divert money that would otherwise compound for retirement.
  const retirementImpact = useMemo(() => {
    const base = analyzeRetirement(profile);
    const diverted = analyzeRetirement({
      ...profile,
      monthlyInvestment: Math.max(0, profile.monthlyInvestment - goalMonthly),
    });
    return { base, diverted };
  }, [profile, goalMonthly]);


  const submit = () => {
    if (!name.trim() || cost <= 0) return;
    addGoal({
      id: uid(),
      name: name.trim(),
      category,
      presentCost: cost,
      yearsToGoal: Math.max(1, Math.round(years)),
      saved: Math.max(0, saved),
      inflationPct: Math.max(0, inflation),
    } satisfies Goal);
    setName("");
    setSaved(0);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Goal-Based Planning</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Plan life goals alongside retirement and see exactly what funding them costs your future self.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card title="Add a goal">
          <div className="space-y-3">
            <TextField label="Goal name" value={name} onChange={setName} placeholder="e.g. Aarav's engineering degree" />
            <SelectField label="Category" value={category} onChange={(v) => setCategory(v as GoalCategory)}
              options={CATEGORIES.map((c) => ({ value: c, label: c }))} />
            <div className="grid grid-cols-2 gap-3">
              <NumberField label="Cost today" prefix="₹" value={cost} step={50000} onChange={setCost} />
              <NumberField label="Years away" value={years} min={1} max={40} onChange={setYears} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <NumberField label="Already saved" prefix="₹" value={saved} step={10000} onChange={setSaved} />
              <NumberField label="Goal inflation" suffix="%" value={inflation} min={0} max={15} step={0.5}
                hint="Education ~8–10%, travel ~6%" onChange={setInflation} />
            </div>
            <Button onClick={submit} className="w-full">Add goal</Button>
          </div>
        </Card>

        <div className="space-y-4 lg:col-span-2">
          {analyses.length === 0 && (
            <Card>
              <p className="text-sm text-slate-500">No goals yet — add your first goal to see its funding plan.</p>
            </Card>
          )}
          {analyses.map(({ goal, futureCost, gap, monthlyNeeded, fundedPct }) => (
            <Card key={goal.id}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold">{goal.name}</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {goal.category} · in {goal.yearsToGoal} yrs · {goal.inflationPct}% inflation
                  </p>
                </div>
                <button onClick={() => removeGoal(goal.id)} aria-label={`Delete ${goal.name}`}
                  className="text-slate-400 hover:text-rose-500">
                  <Trash2 size={16} />
                </button>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div>
                  <p className="text-xs text-slate-500">Future cost</p>
                  <p className="font-semibold tabular-nums">{formatCompact(futureCost)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Gap</p>
                  <p className="font-semibold tabular-nums">{formatCompact(gap)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">SIP needed</p>
                  <p className="font-semibold tabular-nums">
                    {Number.isFinite(monthlyNeeded) ? `${formatCompact(monthlyNeeded)}/mo` : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Funded</p>
                  <p className="font-semibold tabular-nums">{fundedPct.toFixed(0)}%</p>
                </div>
              </div>
              <div className="mt-2">
                <Progress pct={fundedPct} band={fundedPct >= 70 ? "green" : fundedPct >= 35 ? "yellow" : "red"} />
              </div>
            </Card>
          ))}
        </div>
      </div>

      {goals.length > 0 && (
        <Card title="Impact on retirement"
          subtitle={`Funding all goals needs ${formatCompact(goalMonthly)}/month — if that comes out of your current ${formatCompact(profile.monthlyInvestment)}/month investing budget:`}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Stat label="Retirement corpus (goals funded separately)"
              value={formatCompact(retirementImpact.base.projectedCorpus)} tone="good" />
            <Stat label="Retirement corpus (goals from same budget)"
              value={formatCompact(retirementImpact.diverted.projectedCorpus)} tone="warn" />
            <Stat label="Cost to retirement"
              value={formatCompact(retirementImpact.base.projectedCorpus - retirementImpact.diverted.projectedCorpus)}
              tone="bad" sub="Corpus you give up if goals crowd out retirement SIPs" />
          </div>
          <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
            Best practice: fund goals with <em>additional</em> savings rather than cutting retirement SIPs —
            your retirement has no loan option.
          </p>
        </Card>
      )}
    </div>
  );
}
