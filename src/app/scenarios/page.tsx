"use client";

import { useMemo } from "react";
import Link from "next/link";
import { usePlanner } from "@/lib/store";
import { analyzeRetirement } from "@/lib/engine/retirement";
import { runMonteCarlo } from "@/lib/engine/montecarlo";
import { formatCompact, formatINR } from "@/lib/format";
import { Button, Card } from "@/components/ui";
import { ComparisonChart } from "@/components/charts";
import { Trash2 } from "lucide-react";

const COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ec4899", "#06b6d4", "#8b5cf6"];

export default function ScenariosPage() {
  const { scenarios, removeScenario, profile, saveScenario } = usePlanner();

  const rows = useMemo(
    () =>
      scenarios.map((s, i) => {
        const ret = analyzeRetirement(s.profile);
        const mc = runMonteCarlo(s.profile, 1000);
        // Sustainable monthly income: first-year withdrawal the plan supports.
        const monthlyIncome = ret.expensesAtRetirement / 12;
        return { scenario: s, ret, mc, monthlyIncome, color: COLORS[i % COLORS.length] };
      }),
    [scenarios],
  );

  const series = useMemo(
    () =>
      rows.map((r) => ({
        name: r.scenario.name,
        color: r.color,
        points: r.ret.timeline.map((pt) => ({ age: pt.age, corpus: pt.corpus })),
      })),
    [rows],
  );


  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Scenario Comparison</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Save variations from the calculator (retire at 55 vs 60 vs 65, higher SIP, lower returns…) and compare
            them side by side.
          </p>
        </div>
        <Button variant="ghost" onClick={() => saveScenario(`Retire at ${profile.retirementAge}`)}>
          Snapshot current plan
        </Button>
      </div>

      {rows.length === 0 ? (
        <Card>
          <p className="text-sm text-slate-500">
            No saved scenarios yet. Tune your plan on the{" "}
            <Link href="/calculator" className="font-medium text-indigo-600 hover:underline dark:text-indigo-400">
              calculator
            </Link>{" "}
            and hit “Save as scenario”, or snapshot your current plan above.
          </p>
        </Card>
      ) : (
        <>
          <Card title="Net worth trajectories">
            <ComparisonChart series={series} />
          </Card>

          <Card title="Side by side">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500 dark:border-slate-800">
                    <th className="py-2 pr-4">Scenario</th>
                    <th className="py-2 pr-4">Retire at</th>
                    <th className="py-2 pr-4">Corpus at retirement</th>
                    <th className="py-2 pr-4">Required</th>
                    <th className="py-2 pr-4">Success rate</th>
                    <th className="py-2 pr-4">Monthly income (yr 1)</th>
                    <th className="py-2" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map(({ scenario, ret, mc, monthlyIncome, color }) => (
                    <tr key={scenario.id} className="border-b border-slate-100 dark:border-slate-800/60">
                      <td className="py-3 pr-4 font-medium">
                        <span className="mr-2 inline-block h-2.5 w-2.5 rounded-full" style={{ background: color }} />
                        {scenario.name}
                      </td>
                      <td className="py-3 pr-4 tabular-nums">{scenario.profile.retirementAge}</td>
                      <td className="py-3 pr-4 tabular-nums">{formatCompact(ret.projectedCorpus)}</td>
                      <td className="py-3 pr-4 tabular-nums">{formatCompact(ret.requiredCorpus)}</td>
                      <td className="py-3 pr-4 tabular-nums">
                        <span className={mc.successProbability >= 80 ? "text-emerald-600 dark:text-emerald-400" : mc.successProbability >= 60 ? "text-amber-600 dark:text-amber-400" : "text-rose-600 dark:text-rose-400"}>
                          {mc.successProbability.toFixed(0)}%
                        </span>
                      </td>
                      <td className="py-3 pr-4 tabular-nums">{formatINR(monthlyIncome)}</td>
                      <td className="py-3 text-right">
                        <button onClick={() => removeScenario(scenario.id)} aria-label={`Delete ${scenario.name}`}
                          className="text-slate-400 hover:text-rose-500">
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
