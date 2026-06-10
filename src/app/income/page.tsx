"use client";

import { useMemo, useState } from "react";
import { usePlanner, useHydrated } from "@/lib/store";
import { planRetirementIncome } from "@/lib/engine/income";
import { projectCorpusAtRetirement } from "@/lib/engine/retirement";
import { IncomeSource } from "@/lib/types";
import { formatCompact, formatINR } from "@/lib/format";
import { Button, Card, NumberField, SelectField, Stat } from "@/components/ui";
import { IncomeChart } from "@/components/charts";
import { Trash2 } from "lucide-react";

const KINDS: IncomeSource["kind"][] = ["Pension", "Rental", "Dividends", "Annuity", "SWP", "Other"];

export default function IncomePage() {
  const hydrated = useHydrated();
  const { profile, incomeSources, addIncomeSource, removeIncomeSource } = usePlanner();

  const [kind, setKind] = useState<IncomeSource["kind"]>("Pension");
  const [amount, setAmount] = useState(20_000);
  const [linked, setLinked] = useState("yes");
  const [taxRate, setTaxRate] = useState(10);

  const startingCorpus = useMemo(() => projectCorpusAtRetirement(profile), [profile]);
  const plan = useMemo(
    () => planRetirementIncome(profile, incomeSources, startingCorpus),
    [profile, incomeSources, startingCorpus],
  );

  const chartData = useMemo(
    () =>
      plan.years.map((y) => ({
        age: y.age,
        income: y.income + y.corpusWithdrawal,
        expenses: y.expenses,
        corpus: y.corpus,
      })),
    [plan],
  );

  if (!hydrated) return <p className="py-20 text-center text-sm text-slate-400">Loading…</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Retirement Income Planner</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Model your cash flow after age {profile.retirementAge}: income sources cover expenses first, the corpus
          (projected {formatCompact(startingCorpus)}) tops up the rest.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Monthly income (year 1)" value={formatINR(plan.firstYearMonthlyIncome)}
          sub="Sources + corpus withdrawals" />
        <Stat label="After tax (year 1)" value={formatINR(plan.firstYearMonthlyAfterTax)} tone="good" />
        <Stat label="Corpus depletion"
          value={plan.depletionAge ? `Age ${plan.depletionAge}` : "Never"}
          tone={plan.depletionAge ? "bad" : "good"}
          sub={plan.depletionAge ? "Income falls short after this" : `Lasts past ${profile.lifeExpectancy}`} />
        <Stat label="Corpus at life expectancy" value={formatCompact(plan.corpusAtLifeExpectancy)}
          sub="Potential legacy" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card title="Add income source" subtitle="Monthly amounts at retirement start">
          <div className="space-y-3">
            <SelectField label="Type" value={kind} onChange={(v) => setKind(v as IncomeSource["kind"])}
              options={KINDS.map((k) => ({ value: k, label: k }))} />
            <NumberField label="Monthly amount" prefix="₹" value={amount} step={1000} onChange={setAmount} />
            <SelectField label="Grows with inflation?" value={linked} onChange={setLinked}
              options={[
                { value: "yes", label: "Yes (rent, dividends…)" },
                { value: "no", label: "No (fixed annuity/pension)" },
              ]} />
            <NumberField label="Effective tax rate" suffix="%" value={taxRate} min={0} max={40} onChange={setTaxRate} />
            <Button className="w-full"
              onClick={() => {
                if (amount <= 0) return;
                addIncomeSource({
                  id: crypto.randomUUID(),
                  kind,
                  monthlyAmount: amount,
                  inflationLinked: linked === "yes",
                  taxRatePct: taxRate,
                });
              }}>
              Add source
            </Button>

            {incomeSources.length > 0 && (
              <ul className="space-y-2 pt-2">
                {incomeSources.map((s) => (
                  <li key={s.id}
                    className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-800">
                    <span>
                      <strong>{s.kind}</strong> · {formatINR(s.monthlyAmount)}/mo
                      {s.inflationLinked ? " · inflation-linked" : " · fixed"} · {s.taxRatePct}% tax
                    </span>
                    <button onClick={() => removeIncomeSource(s.id)} aria-label="Remove source"
                      className="text-slate-400 hover:text-rose-500">
                      <Trash2 size={15} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>

        <Card title="Cash flow through retirement"
          subtitle="Green: total income · Red: expenses · Grey: remaining corpus (right axis)"
          className="lg:col-span-2">
          <IncomeChart data={chartData} />
          <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
            Tax-adjusted: each source is taxed at the rate you set; corpus withdrawals are modelled gross —
            EPF/PPF withdrawals are tax-free, equity redemptions enjoy the ₹1.25L LTCG exemption (see Tax Optimizer).
          </p>
        </Card>
      </div>
    </div>
  );
}
