"use client";

import { useEffect, useMemo, useState } from "react";
import { usePlanner } from "@/lib/store";
import { readFutureSelf, readLife, moodLabel, Mood } from "@/lib/engine/oracle";
import { sanitizeProfile } from "@/lib/engine/retirement";
import { formatCompact, formatINR } from "@/lib/format";
import { Badge, Button, Card, SliderField, Stat } from "@/components/ui";
import { AgingPortrait, LifeGrid } from "@/components/oracle";
import { Sparkles } from "lucide-react";

const MOOD_TONE: Record<Mood, "good" | "warn" | "bad"> = {
  thriving: "good",
  comfortable: "good",
  stretched: "warn",
  struggling: "warn",
  broke: "bad",
};

function formatLifeDate(d: Date): string {
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
}

/** Break a future date into a years / months / days countdown from `from`. */
function countdown(target: Date, from: number) {
  let ms = target.getTime() - from;
  if (ms <= 0) return null;
  const day = 86_400_000;
  const years = Math.floor(ms / (365.25 * day));
  ms -= years * 365.25 * day;
  const months = Math.floor(ms / (30.44 * day));
  ms -= months * 30.44 * day;
  const days = Math.floor(ms / day);
  return { years, months, days };
}

export default function OraclePage() {
  const { profile, setProfile } = usePlanner();
  const p = useMemo(() => sanitizeProfile(profile), [profile]);

  // The age dial. Default to the moment you stop working. Stored raw, then
  // clamped during render so a profile change elsewhere can't strand it.
  const [rawAge, setAge] = useState(profile.retirementAge);
  const age = Math.min(Math.max(rawAge, p.currentAge), p.lifeExpectancy);

  // The Fork: a what-if monthly SIP that rewrites fate without touching the
  // store. Re-sync to the real plan when it changes (the adjust-during-render
  // pattern — no effect needed).
  const [fork, setFork] = useState(profile.monthlyInvestment);
  const [syncedSip, setSyncedSip] = useState(profile.monthlyInvestment);
  if (profile.monthlyInvestment !== syncedSip) {
    setSyncedSip(profile.monthlyInvestment);
    setFork(profile.monthlyInvestment);
  }

  // Gate live time behind mount to avoid a server/client hydration mismatch.
  // The freedom date shows immediately; the ticking boxes appear after mount.
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const self = useMemo(() => readFutureSelf(profile, age), [profile, age]);
  const life = useMemo(() => readLife(profile), [profile]);
  const forkedLife = useMemo(
    () => readLife({ ...profile, monthlyInvestment: fork }),
    [profile, fork],
  );

  const cd = life.freedomDate && now ? countdown(life.freedomDate, now) : null;
  const alreadyFree = life.freedomAge !== null && life.freedomAge <= p.currentAge;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <Sparkles size={22} className="text-indigo-500" /> The Oracle
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Drag the years and meet the person your money is building. Every face, letter and number
          is your real plan — just retold as a life you can walk through.
        </p>
      </div>

      {/* Verdict banner */}
      <div
        className={
          "rounded-2xl border p-4 text-sm font-medium " +
          (life.verdictOk
            ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300"
            : "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-300")
        }
      >
        {life.verdictOk ? "✦ " : "⚠ "}
        {life.verdict}
      </div>

      {/* The stage: portrait + letter */}
      <Card>
        <div className="grid gap-6 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <div className="mx-auto aspect-square max-w-[280px] rounded-2xl bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900">
              <AgingPortrait
                age={self.age}
                currentAge={p.currentAge}
                lifeExpectancy={p.lifeExpectancy}
                mood={self.mood}
                free={self.free}
              />
            </div>
            <div className="mt-3 flex items-center justify-center gap-3">
              <span className="text-3xl font-bold tabular-nums">{self.age}</span>
              <span className="text-sm text-slate-500 dark:text-slate-400">
                in {self.year} · {self.retired ? "retired" : "still working"}
              </span>
              <Badge tone={MOOD_TONE[self.mood]}>{moodLabel(self.mood)}</Badge>
            </div>
          </div>

          <div className="lg:col-span-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              A letter from you, at {self.age}
            </p>
            <blockquote className="mt-2 border-l-2 border-indigo-300 pl-4 text-[15px] leading-relaxed text-slate-700 dark:border-indigo-700 dark:text-slate-200">
              {self.letter}
            </blockquote>
            <p className="mt-3 text-right text-sm italic text-slate-500 dark:text-slate-400">
              — You, at {self.age}
            </p>

            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat label="Corpus" value={formatCompact(self.corpus)} />
              <Stat
                label="Passive / mo"
                value={formatINR(self.monthlyPassiveIncome)}
                sub="safe 4% draw"
              />
              <Stat
                label="Covers costs"
                value={`${self.coverageRatio.toFixed(1)}×`}
                tone={self.coverageRatio >= 1 ? "good" : "bad"}
                sub="passive vs. spend"
              />
              <Stat
                label="Lifestyle banked"
                value={`${Math.round(self.yearsOfExpensesBanked)} yrs`}
                sub="of that-era costs"
              />
            </div>
          </div>
        </div>

        {/* The age dial */}
        <div className="mt-6 border-t border-slate-200 pt-5 dark:border-slate-800">
          <SliderField
            label="Walk the years"
            min={p.currentAge}
            max={p.lifeExpectancy}
            value={age}
            display={`Age ${age}`}
            onChange={setAge}
          />
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Freedom Day */}
        <Card title="Freedom Day" subtitle="The day your money can fully fund the rest of your life">
          {life.freedomDate ? (
            alreadyFree ? (
              <p className="text-lg font-semibold text-emerald-600 dark:text-emerald-400">
                You are already financially free. 🎉
              </p>
            ) : (
              <div>
                <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                  {formatLifeDate(life.freedomDate)}
                </p>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Earliest fully-funded retirement at age {life.freedomAge}
                </p>
                {cd && (
                  <div className="mt-4 grid grid-cols-3 gap-3 text-center">
                    {[
                      { v: cd.years, l: "years" },
                      { v: cd.months, l: "months" },
                      { v: cd.days, l: "days" },
                    ].map((u) => (
                      <div
                        key={u.l}
                        className="rounded-xl border border-slate-200 bg-slate-50 py-3 dark:border-slate-800 dark:bg-slate-950"
                      >
                        <p className="text-2xl font-bold tabular-nums">{u.v}</p>
                        <p className="text-xs uppercase tracking-wide text-slate-500">{u.l}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          ) : (
            <p className="text-sm text-rose-600 dark:text-rose-400">
              On current inputs there is no fully-funded age before 75. Try The Fork →
            </p>
          )}
        </Card>

        {/* The Fork */}
        <Card title="The Fork" subtitle="Change one thing and watch the future rewrite itself">
          <SliderField
            label="What if you invested per month"
            min={0}
            max={Math.max(200_000, Math.round(profile.monthlyInvestment * 3))}
            step={1000}
            value={fork}
            display={formatINR(fork)}
            onChange={setFork}
          />
          <div
            className={
              "mt-4 rounded-xl border p-3 text-sm font-medium " +
              (forkedLife.verdictOk
                ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300"
                : "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300")
            }
          >
            {forkedLife.verdict}
          </div>
          <div className="mt-4 flex items-center gap-3">
            <Button
              onClick={() => setProfile({ monthlyInvestment: fork })}
              disabled={fork === profile.monthlyInvestment}
            >
              Make it so
            </Button>
            <Button
              variant="ghost"
              onClick={() => setFork(profile.monthlyInvestment)}
              disabled={fork === profile.monthlyInvestment}
            >
              Reset
            </Button>
            <span className="text-xs text-slate-500">
              {fork === profile.monthlyInvestment
                ? "Currently your real plan."
                : `${fork > profile.monthlyInvestment ? "+" : ""}${formatINR(
                    fork - profile.monthlyInvestment,
                  )}/mo vs. today`}
            </span>
          </div>
        </Card>
      </div>

      {/* Memento-mori life grid */}
      <Card
        title="Your life, one tile per year"
        subtitle="Click any year to send your future self there"
      >
        <LifeGrid
          currentAge={p.currentAge}
          retirementAge={p.retirementAge}
          lifeExpectancy={p.lifeExpectancy}
          freedomAge={life.freedomAge}
          depletionAge={life.depletionAge}
          selectedAge={age}
          onSelect={setAge}
        />
        <div className="mt-4 flex flex-wrap gap-4 text-xs text-slate-500 dark:text-slate-400">
          <Legend className="bg-slate-300 dark:bg-slate-700" label="Years lived" />
          <Legend className="bg-indigo-400 dark:bg-indigo-500" label="Building wealth" />
          <Legend className="bg-emerald-400 dark:bg-emerald-500" label="Living off it" />
          <Legend className="bg-rose-400 dark:bg-rose-500" label="Money ran out" />
          <Legend className="bg-transparent ring-2 ring-amber-400" label="Freedom year" />
        </div>
      </Card>

      <p className="text-center text-xs text-slate-400 dark:text-slate-500">
        The Oracle dramatises the same projection as the Calculator. Estimates only — your future is
        yours to write.
      </p>
    </div>
  );
}

function Legend({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={"h-3 w-3 rounded-[3px] " + className} />
      {label}
    </span>
  );
}
