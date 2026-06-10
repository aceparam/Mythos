"use client";

import { useMemo, useState } from "react";
import { usePlanner } from "@/lib/store";
import {
  computeNewRegime,
  computeOldRegime,
  equityCapitalGainsTax,
  taxOpportunities,
} from "@/lib/engine/tax";
import { formatCompact, formatINR } from "@/lib/format";
import { Badge, Card, NumberField, Stat } from "@/components/ui";

export default function TaxPage() {
  const { profile } = usePlanner();

  const [income, setIncome] = useState(profile.annualIncome);
  const [d80c, setD80c] = useState(150_000);
  const [nps, setNps] = useState(0);
  const [d80d, setD80d] = useState(25_000);
  const [homeInt, setHomeInt] = useState(0);
  const [ltcg, setLtcg] = useState(0);
  const [stcg, setStcg] = useState(0);

  const input = useMemo(
    () => ({
      grossAnnualIncome: income,
      deduction80C: d80c,
      npsExtra: nps,
      deduction80D: d80d,
      homeLoanInterest: homeInt,
    }),
    [income, d80c, nps, d80d, homeInt],
  );

  const oldR = useMemo(() => computeOldRegime(input), [input]);
  const newR = useMemo(() => computeNewRegime(input), [input]);
  const cgTax = useMemo(() => equityCapitalGainsTax(ltcg, stcg), [ltcg, stcg]);
  const ops = useMemo(() => taxOpportunities(input), [input]);


  const better = oldR.tax <= newR.tax ? "old" : "new";
  const saving = Math.abs(oldR.tax - newR.tax);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Tax Optimizer (India)</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          FY 2025-26 slabs for a salaried resident under 60, including standard deduction, 87A rebate and 4% cess.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card title="Your numbers">
          <div className="space-y-3">
            <NumberField label="Gross annual income" prefix="₹" value={income} step={50000} onChange={setIncome} />
            <NumberField label="80C investments" prefix="₹" value={d80c} step={10000} max={150000}
              hint="EPF, PPF, ELSS, life insurance — capped at ₹1.5L" onChange={setD80c} />
            <NumberField label="NPS extra (80CCD(1B))" prefix="₹" value={nps} step={5000} max={50000}
              hint="Over and above 80C — capped at ₹50K" onChange={setNps} />
            <NumberField label="Health insurance (80D)" prefix="₹" value={d80d} step={5000} onChange={setD80d} />
            <NumberField label="Home loan interest (24b)" prefix="₹" value={homeInt} step={10000}
              hint="Capped at ₹2L" onChange={setHomeInt} />
            <div className="grid grid-cols-2 gap-3 border-t border-slate-200 pt-3 dark:border-slate-800">
              <NumberField label="Equity LTCG this year" prefix="₹" value={ltcg} step={10000} onChange={setLtcg} />
              <NumberField label="Equity STCG this year" prefix="₹" value={stcg} step={10000} onChange={setStcg} />
            </div>
          </div>
        </Card>

        <div className="space-y-6 lg:col-span-2">
          <div className="grid gap-4 sm:grid-cols-2">
            <Card className={better === "old" ? "ring-2 ring-emerald-400" : undefined}>
              <div className="flex items-center justify-between">
                <h2 className="font-bold">Old Regime</h2>
                {better === "old" && <Badge tone="good">Better for you</Badge>}
              </div>
              <p className="mt-3 text-3xl font-bold tabular-nums">{formatINR(oldR.tax)}</p>
              <dl className="mt-3 space-y-1 text-sm text-slate-600 dark:text-slate-300">
                <div className="flex justify-between"><dt>Taxable income</dt><dd className="tabular-nums">{formatINR(oldR.taxableIncome)}</dd></div>
                <div className="flex justify-between"><dt>Effective rate</dt><dd className="tabular-nums">{oldR.effectiveRatePct.toFixed(1)}%</dd></div>
                <div className="flex justify-between"><dt>Deductions used</dt><dd className="tabular-nums">{formatINR(income - oldR.taxableIncome)}</dd></div>
              </dl>
            </Card>
            <Card className={better === "new" ? "ring-2 ring-emerald-400" : undefined}>
              <div className="flex items-center justify-between">
                <h2 className="font-bold">New Regime</h2>
                {better === "new" && <Badge tone="good">Better for you</Badge>}
              </div>
              <p className="mt-3 text-3xl font-bold tabular-nums">{formatINR(newR.tax)}</p>
              <dl className="mt-3 space-y-1 text-sm text-slate-600 dark:text-slate-300">
                <div className="flex justify-between"><dt>Taxable income</dt><dd className="tabular-nums">{formatINR(newR.taxableIncome)}</dd></div>
                <div className="flex justify-between"><dt>Effective rate</dt><dd className="tabular-nums">{newR.effectiveRatePct.toFixed(1)}%</dd></div>
                <div className="flex justify-between"><dt>Standard deduction</dt><dd className="tabular-nums">₹75,000</dd></div>
              </dl>
            </Card>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Stat label="Regime advantage" value={formatINR(saving)}
              sub={`Choosing the ${better} regime saves this much`} tone="good" />
            <Stat label="Capital gains tax" value={formatINR(cgTax)}
              sub="LTCG 12.5% above ₹1.25L · STCG 20%" tone={cgTax > 0 ? "warn" : "default"} />
          </div>

          <Card title="Tax-saving opportunities" subtitle="Ordered by estimated annual saving">
            <ul className="space-y-3">
              {ops.map((o, i) => (
                <li key={i} className="rounded-xl border border-slate-100 p-3 dark:border-slate-800">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold">{o.title}</p>
                    {o.estimatedSaving > 0 && <Badge tone="good">save ~{formatCompact(o.estimatedSaving)}/yr</Badge>}
                  </div>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{o.detail}</p>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
