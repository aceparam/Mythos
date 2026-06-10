"use client";

import { useMemo } from "react";
import { usePlanner, useHydrated } from "@/lib/store";
import {
  ASSET_META,
  LIABILITY_META,
  allocationByClass,
  netWorth,
  reviewPortfolio,
  totalAssets,
  totalLiabilities,
} from "@/lib/engine/portfolio";
import { AssetKey, LiabilityKey } from "@/lib/types";
import { formatCompact } from "@/lib/format";
import { Badge, Card, NumberField, Stat } from "@/components/ui";
import { AllocationPie, NetWorthTrendChart } from "@/components/charts";

export default function NetWorthPage() {
  const hydrated = useHydrated();
  const { assets, liabilities, setAssets, setLiabilities, profile, history } = usePlanner();

  const slices = useMemo(() => allocationByClass(assets), [assets]);
  const review = useMemo(() => reviewPortfolio(assets, profile.currentAge), [assets, profile.currentAge]);
  const trend = useMemo(
    () => history.map((h) => ({ month: h.month, netWorth: h.assets - h.liabilities })),
    [history],
  );

  if (!hydrated) return <p className="py-20 text-center text-sm text-slate-400">Loading…</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Financial Health Dashboard</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Track every asset and liability — your net worth history builds automatically as you update values.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Net worth" value={formatCompact(netWorth(assets, liabilities))} tone="default" />
        <Stat label="Total assets" value={formatCompact(totalAssets(assets))} tone="good" />
        <Stat label="Total liabilities" value={formatCompact(totalLiabilities(liabilities))}
          tone={totalLiabilities(liabilities) > 0 ? "bad" : "default"} />
        <Stat label="Risk score" value={`${review.riskScore}/10`}
          sub={`${review.equityPct.toFixed(0)}% equity`} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Assets" subtitle="Current market value of each holding">
          <div className="grid grid-cols-2 gap-3">
            {(Object.keys(ASSET_META) as AssetKey[]).map((key) => (
              <NumberField key={key} label={ASSET_META[key].label} prefix="₹" step={10000}
                value={assets[key]} onChange={(v) => setAssets({ [key]: Math.max(0, v) })} />
            ))}
          </div>
        </Card>

        <div className="space-y-6">
          <Card title="Liabilities" subtitle="Outstanding balances">
            <div className="grid grid-cols-2 gap-3">
              {(Object.keys(LIABILITY_META) as LiabilityKey[]).map((key) => (
                <NumberField key={key} label={LIABILITY_META[key].label} prefix="₹" step={10000}
                  value={liabilities[key]} onChange={(v) => setLiabilities({ [key]: Math.max(0, v) })} />
              ))}
            </div>
          </Card>

          <Card title="Portfolio review" subtitle="Allocation, diversification & retirement suitability">
            <div className="mb-3 flex flex-wrap gap-2">
              <Badge tone={Math.abs(review.equityPct - review.targetEquityPct) <= 15 ? "good" : "warn"}>
                Equity {review.equityPct.toFixed(0)}% (target ~{review.targetEquityPct}%)
              </Badge>
              <Badge tone={review.diversificationScore >= 50 ? "good" : "warn"}>
                Diversification {review.diversificationScore}/100
              </Badge>
            </div>
            <ul className="list-disc space-y-1.5 pl-5 text-sm text-slate-600 dark:text-slate-300">
              {review.notes.map((n, i) => (
                <li key={i}>{n}</li>
              ))}
            </ul>
          </Card>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Asset allocation">
          {slices.length > 0 ? (
            <AllocationPie slices={slices} />
          ) : (
            <p className="text-sm text-slate-500">Enter asset values above to see your allocation.</p>
          )}
        </Card>
        <Card title="Net worth trend" subtitle="A snapshot is saved each month you update your numbers">
          {trend.length >= 2 ? (
            <NetWorthTrendChart data={trend} />
          ) : (
            <p className="text-sm text-slate-500">
              Your history will appear here once you have snapshots from more than one month. Update any value to record this month.
            </p>
          )}
        </Card>
      </div>
    </div>
  );
}
