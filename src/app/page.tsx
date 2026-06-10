"use client";

import Link from "next/link";
import { useMemo } from "react";
import { usePlanner, useHydrated } from "@/lib/store";
import { analyzeRetirement } from "@/lib/engine/retirement";
import { runMonteCarlo } from "@/lib/engine/montecarlo";
import { computeReadiness } from "@/lib/engine/score";
import { buildRecommendations } from "@/lib/engine/recommendations";
import { allocationByClass, netWorth, totalAssets, totalLiabilities } from "@/lib/engine/portfolio";
import { formatCompact } from "@/lib/format";
import { Badge, Card, Progress, Stat } from "@/components/ui";
import { AllocationPie, CorpusTimelineChart } from "@/components/charts";
import { ArrowRight, Printer, Sparkles } from "lucide-react";

export default function Dashboard() {
  const hydrated = useHydrated();
  const { profile, assets, liabilities, onboarded } = usePlanner();

  const ret = useMemo(() => analyzeRetirement(profile), [profile]);
  const mc = useMemo(() => runMonteCarlo(profile, 1000), [profile]);
  const score = useMemo(() => computeReadiness(profile, assets, liabilities), [profile, assets, liabilities]);
  const recs = useMemo(() => buildRecommendations(profile, assets, liabilities), [profile, assets, liabilities]);
  const slices = useMemo(() => allocationByClass(assets), [assets]);

  if (!hydrated) {
    return <p className="py-20 text-center text-sm text-slate-400">Loading your plan…</p>;
  }

  const bandTone = score.band === "green" ? "good" : score.band === "yellow" ? "warn" : "bad";

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">
            {profile.name ? `${profile.name}'s retirement plan` : "Your retirement plan"}
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Retiring at {profile.retirementAge}, planning to {profile.lifeExpectancy}.
          </p>
        </div>
        <button
          onClick={() => window.print()}
          className="no-print inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <Printer size={15} /> Export PDF
        </button>
      </div>

      {!onboarded && (
        <div className="flex flex-col items-start justify-between gap-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 p-6 text-white sm:flex-row sm:items-center">
          <div>
            <h2 className="text-lg font-bold">Welcome to Mythos 👋</h2>
            <p className="mt-1 text-sm text-indigo-100">
              Answer 8 quick questions and get your retirement projection in under a minute.
            </p>
          </div>
          <Link
            href="/onboarding"
            className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-50"
          >
            Start onboarding <ArrowRight size={16} />
          </Link>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat
          label="Readiness score"
          value={`${score.total}/100`}
          tone={bandTone}
          sub={score.band === "green" ? "On track" : score.band === "yellow" ? "Needs attention" : "Off track"}
        />
        <Stat
          label="Success probability"
          value={`${mc.successProbability.toFixed(0)}%`}
          tone={mc.successProbability >= 80 ? "good" : mc.successProbability >= 60 ? "warn" : "bad"}
          sub={`${mc.runs.toLocaleString()} Monte Carlo runs`}
        />
        <Stat
          label="Projected corpus"
          value={formatCompact(ret.projectedCorpus)}
          sub={`at age ${profile.retirementAge}`}
        />
        <Stat
          label={ret.surplus >= 0 ? "Surplus" : "Shortfall"}
          value={formatCompact(Math.abs(ret.surplus))}
          tone={ret.surplus >= 0 ? "good" : "bad"}
          sub={`vs ${formatCompact(ret.requiredCorpus)} required`}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card
          title="Corpus trajectory"
          subtitle={`Accumulation to ${profile.retirementAge}, drawdown to ${profile.lifeExpectancy}`}
          className="lg:col-span-2"
        >
          <CorpusTimelineChart
            timeline={ret.timeline}
            retirementAge={profile.retirementAge}
            requiredCorpus={ret.requiredCorpus}
          />
        </Card>

        <Card title="Readiness breakdown">
          <ul className="space-y-4">
            {score.components.map((c) => (
              <li key={c.key}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="font-medium">{c.label}</span>
                  <span className="tabular-nums text-slate-500">{Math.round(c.score)}</span>
                </div>
                <Progress pct={c.score} band={c.score >= 70 ? "green" : c.score >= 45 ? "yellow" : "red"} />
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{c.detail}</p>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card title="Net worth" subtitle="Assets minus liabilities">
          <p className="text-3xl font-bold tabular-nums">{formatCompact(netWorth(assets, liabilities))}</p>
          <div className="mt-2 flex gap-4 text-sm text-slate-500 dark:text-slate-400">
            <span>Assets {formatCompact(totalAssets(assets))}</span>
            <span>Debt {formatCompact(totalLiabilities(liabilities))}</span>
          </div>
          {slices.length > 0 ? (
            <AllocationPie slices={slices} />
          ) : (
            <p className="mt-6 text-sm text-slate-500">Add assets on the Net Worth page to see your allocation.</p>
          )}
          <Link
            href="/networth"
            className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-indigo-600 hover:underline dark:text-indigo-400"
          >
            Manage assets <ArrowRight size={14} />
          </Link>
        </Card>

        <Card title="Top recommendations" subtitle="Highest-impact actions first" className="lg:col-span-2">
          <ol className="space-y-3">
            {recs.map((r, i) => (
              <li key={i} className="flex items-start gap-3 rounded-xl border border-slate-100 p-3 dark:border-slate-800">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold">{r.title}</p>
                  <p className="mt-0.5 mb-1 text-xs text-slate-500 dark:text-slate-400">{r.detail}</p>
                  <Badge tone="good">{r.impact}</Badge>
                </div>
              </li>
            ))}
          </ol>
          <Link
            href="/coach"
            className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-indigo-600 hover:underline dark:text-indigo-400"
          >
            <Sparkles size={15} /> Ask the AI coach
          </Link>
        </Card>
      </div>
    </div>
  );
}
