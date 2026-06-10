"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { MonteCarloResult, YearPoint } from "@/lib/types";
import { AllocationSlice } from "@/lib/engine/portfolio";
import { formatCompact } from "@/lib/format";

const GRID = "rgba(148,163,184,0.2)";
const AXIS = { fontSize: 11, fill: "#94a3b8" };

const compactTick = (v: number) => formatCompact(v).replace("₹", "₹");

/** Corpus timeline: accumulation area + drawdown, with retirement marker. */
export function CorpusTimelineChart({
  timeline,
  retirementAge,
  requiredCorpus,
}: {
  timeline: YearPoint[];
  retirementAge: number;
  requiredCorpus?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={timeline} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
        <defs>
          <linearGradient id="corpusFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6366f1" stopOpacity={0.5} />
            <stop offset="100%" stopColor="#6366f1" stopOpacity={0.05} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="age" tick={AXIS} tickLine={false} axisLine={false} />
        <YAxis tickFormatter={compactTick} tick={AXIS} tickLine={false} axisLine={false} width={70} />
        <Tooltip
          formatter={(v) => formatCompact(Number(v))}
          labelFormatter={(age) => `Age ${age}`}
          contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }}
        />
        <ReferenceLine x={retirementAge} stroke="#f59e0b" strokeDasharray="4 4" label={{ value: "Retire", fontSize: 11, fill: "#f59e0b" }} />
        {requiredCorpus !== undefined && (
          <ReferenceLine y={requiredCorpus} stroke="#10b981" strokeDasharray="4 4" label={{ value: "Required", fontSize: 11, fill: "#10b981" }} />
        )}
        <Area type="monotone" dataKey="corpus" name="Corpus" stroke="#6366f1" strokeWidth={2} fill="url(#corpusFill)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

/** Monte Carlo fan chart with stacked percentile bands. */
export function FanChart({ result, retirementAge }: { result: MonteCarloResult; retirementAge: number }) {
  const data = result.bands.map((b) => ({
    age: b.age,
    p10: b.p10,
    band1025: b.p25 - b.p10,
    band2575: b.p75 - b.p25,
    band7590: b.p90 - b.p75,
    p50: b.p50,
  }));
  return (
    <ResponsiveContainer width="100%" height={320}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="age" tick={AXIS} tickLine={false} axisLine={false} />
        <YAxis tickFormatter={compactTick} tick={AXIS} tickLine={false} axisLine={false} width={70} />
        <Tooltip
          formatter={(v, name) => {
            if (name === "Median") return [formatCompact(Number(v)), name];
            return null;
          }}
          labelFormatter={(age) => `Age ${age}`}
          contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }}
        />
        <ReferenceLine x={retirementAge} stroke="#f59e0b" strokeDasharray="4 4" />
        <Area stackId="band" type="monotone" dataKey="p10" stroke="none" fill="transparent" name=" " />
        <Area stackId="band" type="monotone" dataKey="band1025" stroke="none" fill="#6366f1" fillOpacity={0.15} name=" " />
        <Area stackId="band" type="monotone" dataKey="band2575" stroke="none" fill="#6366f1" fillOpacity={0.35} name=" " />
        <Area stackId="band" type="monotone" dataKey="band7590" stroke="none" fill="#6366f1" fillOpacity={0.15} name=" " />
        <Line type="monotone" dataKey="p50" stroke="#312e81" strokeWidth={2} dot={false} name="Median" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function HistogramChart({ result }: { result: MonteCarloResult }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={result.histogram} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="bucket" tick={{ ...AXIS, fontSize: 9 }} tickLine={false} axisLine={false} interval={3} />
        <YAxis tick={AXIS} tickLine={false} axisLine={false} width={40} />
        <Tooltip
          formatter={(v) => [`${v} runs`, "Count"]}
          labelFormatter={(b) => `₹${b}`}
          contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }}
        />
        <Bar dataKey="count" fill="#6366f1" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function SurvivalChart({ result }: { result: MonteCarloResult }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={result.survival} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="age" tick={AXIS} tickLine={false} axisLine={false} />
        <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={AXIS} tickLine={false} axisLine={false} width={45} />
        <Tooltip
          formatter={(v) => [`${Number(v).toFixed(1)}%`, "Plans still solvent"]}
          labelFormatter={(age) => `Age ${age}`}
          contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }}
        />
        <ReferenceLine y={80} stroke="#10b981" strokeDasharray="4 4" />
        <Area type="monotone" dataKey="alivePct" stroke="#10b981" strokeWidth={2} fill="#10b981" fillOpacity={0.15} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function AllocationPie({ slices }: { slices: AllocationSlice[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie
          data={slices}
          dataKey="value"
          nameKey="label"
          innerRadius={60}
          outerRadius={95}
          paddingAngle={2}
          strokeWidth={0}
        >
          {slices.map((s) => (
            <Cell key={s.key} fill={s.color} />
          ))}
        </Pie>
        <Tooltip
          formatter={(v, name) => [formatCompact(Number(v)), name]}
          contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }}
        />
        <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function NetWorthTrendChart({ data }: { data: { month: string; netWorth: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="month" tick={AXIS} tickLine={false} axisLine={false} />
        <YAxis tickFormatter={compactTick} tick={AXIS} tickLine={false} axisLine={false} width={70} />
        <Tooltip
          formatter={(v) => [formatCompact(Number(v)), "Net worth"]}
          contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }}
        />
        <Line type="monotone" dataKey="netWorth" stroke="#6366f1" strokeWidth={2} dot={{ r: 3 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

/** Multi-series comparison (scenarios) on a shared age axis. */
export function ComparisonChart({
  series,
}: {
  series: { name: string; color: string; points: { age: number; corpus: number }[] }[];
}) {
  // Merge on age.
  const byAge = new Map<number, Record<string, number>>();
  for (const s of series) {
    for (const pt of s.points) {
      const row = byAge.get(pt.age) ?? { age: pt.age };
      row[s.name] = pt.corpus;
      byAge.set(pt.age, row);
    }
  }
  const data = [...byAge.values()].sort((a, b) => a.age - b.age);
  return (
    <ResponsiveContainer width="100%" height={320}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="age" tick={AXIS} tickLine={false} axisLine={false} />
        <YAxis tickFormatter={compactTick} tick={AXIS} tickLine={false} axisLine={false} width={70} />
        <Tooltip
          formatter={(v) => formatCompact(Number(v))}
          labelFormatter={(age) => `Age ${age}`}
          contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        {series.map((s) => (
          <Line key={s.name} type="monotone" dataKey={s.name} stroke={s.color} strokeWidth={2} dot={false} />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

/** Post-retirement income vs expenses with corpus on a second axis. */
export function IncomeChart({
  data,
}: {
  data: { age: number; income: number; expenses: number; corpus: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="age" tick={AXIS} tickLine={false} axisLine={false} />
        <YAxis yAxisId="flow" tickFormatter={compactTick} tick={AXIS} tickLine={false} axisLine={false} width={70} />
        <YAxis yAxisId="corpus" orientation="right" tickFormatter={compactTick} tick={AXIS} tickLine={false} axisLine={false} width={70} />
        <Tooltip
          formatter={(v) => formatCompact(Number(v))}
          labelFormatter={(age) => `Age ${age}`}
          contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Area yAxisId="corpus" type="monotone" dataKey="corpus" name="Corpus" stroke="#94a3b8" strokeWidth={1.5} fill="#94a3b8" fillOpacity={0.1} />
        <Area yAxisId="flow" type="monotone" dataKey="income" name="Income" stroke="#10b981" strokeWidth={2} fill="#10b981" fillOpacity={0.15} />
        <Area yAxisId="flow" type="monotone" dataKey="expenses" name="Expenses" stroke="#f43f5e" strokeWidth={2} fill="#f43f5e" fillOpacity={0.1} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
