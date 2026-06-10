"use client";

import { useMemo, useState } from "react";
import { usePlanner, useHydrated } from "@/lib/store";
import { analyzeFire } from "@/lib/engine/fire";
import { formatCompact } from "@/lib/format";
import { Badge, Card, SliderField } from "@/components/ui";
import { Flame } from "lucide-react";

export default function FirePage() {
  const hydrated = useHydrated();
  const { profile } = usePlanner();
  const [swr, setSwr] = useState(3.5);
  const [spendOverride, setSpendOverride] = useState<number | null>(null);

  const spending = spendOverride ?? profile.annualExpenses;

  const results = useMemo(
    () =>
      analyzeFire({
        annualSpending: spending,
        safeWithdrawalRatePct: swr,
        inflationPct: profile.inflationPct,
        currentSavings: profile.currentSavings,
        monthlyInvestment: profile.monthlyInvestment,
        expectedReturnPct: profile.preReturnPct,
        currentAge: profile.currentAge,
      }),
    [spending, swr, profile],
  );

  if (!hydrated) return <p className="py-20 text-center text-sm text-slate-400">Loading…</p>;

  const cardStyles: Record<string, string> = {
    lean: "border-emerald-300 dark:border-emerald-800",
    regular: "border-indigo-300 ring-1 ring-indigo-200 dark:border-indigo-700 dark:ring-indigo-900",
    fat: "border-amber-300 dark:border-amber-800",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">FIRE Calculator</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Financial Independence, Retire Early — your FIRE number is the corpus from which a safe withdrawal
          rate covers spending indefinitely.
        </p>
      </div>

      <Card title="Assumptions">
        <div className="grid gap-4 sm:grid-cols-3">
          <SliderField label="Annual spending" min={200000} max={6000000} step={50000} value={spending}
            display={formatCompact(spending)} onChange={setSpendOverride} />
          <SliderField label="Safe withdrawal rate" min={2.5} max={5} step={0.25} value={swr}
            display={`${swr}%`} onChange={setSwr} />
          <div className="text-sm text-slate-500 dark:text-slate-400">
            <p className="font-medium text-slate-700 dark:text-slate-300">Why 3.5%?</p>
            <p className="mt-1">
              The classic 4% rule was derived from US data; with India&apos;s higher inflation, 3–3.5% is the
              commonly used conservative equivalent.
            </p>
          </div>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        {results.map((r) => (
          <Card key={r.variant} className={cardStyles[r.variant]}>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-base font-bold">
                <Flame size={18} className={r.variant === "lean" ? "text-emerald-500" : r.variant === "fat" ? "text-amber-500" : "text-indigo-500"} />
                {r.label}
              </h2>
              {r.variant === "regular" && <Badge tone="default">Your lifestyle</Badge>}
            </div>
            <p className="text-3xl font-bold tabular-nums">{formatCompact(r.fireNumber)}</p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              supports {formatCompact(r.targetSpending)}/yr spending at {swr}% SWR
            </p>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-slate-500 dark:text-slate-400">Years to FI</dt>
                <dd className="font-semibold tabular-nums">
                  {r.yearsToFI === null ? "40+" : r.yearsToFI === 0 ? "Reached 🎉" : `${r.yearsToFI} yrs`}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500 dark:text-slate-400">FI age</dt>
                <dd className="font-semibold tabular-nums">{r.fiAge ?? "—"}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500 dark:text-slate-400">Monthly SIP for FI in 15 yrs</dt>
                <dd className="font-semibold tabular-nums">
                  {Number.isFinite(r.monthlyFor15Years) ? formatCompact(r.monthlyFor15Years) : "—"}
                </dd>
              </div>
            </dl>
          </Card>
        ))}
      </div>

      <Card title="Reading the three numbers">
        <ul className="list-disc space-y-1.5 pl-5 text-sm text-slate-600 dark:text-slate-300">
          <li><strong>Lean FIRE</strong> covers a pared-down lifestyle (~70% of current spending) — fastest to reach, least margin.</li>
          <li><strong>Regular FIRE</strong> sustains your current lifestyle unchanged.</li>
          <li><strong>Fat FIRE</strong> funds an upgraded lifestyle (~170%) with room for travel, healthcare and family support.</li>
          <li>Years-to-FI assumes your current savings and {formatCompact(profile.monthlyInvestment)}/month SIP keep compounding at {profile.preReturnPct}% while the target inflates at {profile.inflationPct}%.</li>
        </ul>
      </Card>
    </div>
  );
}
