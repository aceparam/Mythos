"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { usePlanner } from "@/lib/store";
import { formatCompact } from "@/lib/format";
import { Button, NumberField, Progress, SliderField, TextField } from "@/components/ui";

const STEPS = ["About you", "Spending", "Savings", "Assumptions"] as const;

export default function OnboardingPage() {
  const router = useRouter();
  const { profile, setProfile, setOnboarded } = usePlanner();
  const [step, setStep] = useState(0);


  const finish = () => {
    setOnboarded(true);
    router.push("/");
  };

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Let&apos;s set up your plan</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Step {step + 1} of {STEPS.length} — {STEPS[step]}. Takes under 2 minutes; everything can be changed later.
        </p>
        <div className="mt-3">
          <Progress pct={((step + 1) / STEPS.length) * 100} />
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        {step === 0 && (
          <div className="space-y-4">
            <TextField label="Your name (optional)" value={profile.name}
              onChange={(v) => setProfile({ name: v })} placeholder="e.g. Siddhartha" />
            <div className="grid grid-cols-2 gap-3">
              <NumberField label="Current age" value={profile.currentAge} min={18} max={70}
                onChange={(v) => setProfile({ currentAge: v })} />
              <NumberField label="Retire at" value={profile.retirementAge} min={profile.currentAge + 1} max={75}
                onChange={(v) => setProfile({ retirementAge: v })} />
            </div>
            <SliderField label="Plan until age (life expectancy)" min={70} max={100} value={profile.lifeExpectancy}
              display={`${profile.lifeExpectancy}`} onChange={(v) => setProfile({ lifeExpectancy: v })} />
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Tip: plan to 85–90. Running out of money at 82 is a worse problem than leaving a legacy.
            </p>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <NumberField label="Monthly household expenses" prefix="₹" step={5000}
              value={Math.round(profile.annualExpenses / 12)}
              hint="Rent/EMI, groceries, utilities, lifestyle — what it costs to be you, per month"
              onChange={(v) => setProfile({ annualExpenses: v * 12 })} />
            <NumberField label="Gross annual income" prefix="₹" step={100000} value={profile.annualIncome}
              hint="Used for savings-rate scoring and the tax optimizer"
              onChange={(v) => setProfile({ annualIncome: v })} />
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <NumberField label="Retirement savings so far" prefix="₹" step={50000} value={profile.currentSavings}
              hint="Mutual funds, EPF, PPF, NPS, stocks — everything earmarked for retirement"
              onChange={(v) => setProfile({ currentSavings: v })} />
            <NumberField label="Monthly investing" prefix="₹" step={1000} value={profile.monthlyInvestment}
              hint="SIPs + EPF contribution + NPS, per month"
              onChange={(v) => setProfile({ monthlyInvestment: v })} />
            <SliderField label="Annual SIP step-up" min={0} max={20} value={profile.sipStepUpPct}
              display={`${profile.sipStepUpPct}%`} onChange={(v) => setProfile({ sipStepUpPct: v })} />
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <SliderField label="Inflation" min={3} max={10} step={0.5} value={profile.inflationPct}
              display={`${profile.inflationPct}%`} onChange={(v) => setProfile({ inflationPct: v })} />
            <SliderField label="Expected return before retirement" min={5} max={16} step={0.5} value={profile.preReturnPct}
              display={`${profile.preReturnPct}%`} onChange={(v) => setProfile({ preReturnPct: v })} />
            <SliderField label="Expected return after retirement" min={4} max={12} step={0.5} value={profile.postReturnPct}
              display={`${profile.postReturnPct}%`} onChange={(v) => setProfile({ postReturnPct: v })} />
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Defaults: 6% inflation, 11% pre-retirement (equity-heavy), 7.5% post-retirement (balanced). India
              long-run equity has returned ~12–14% nominal, but conservative inputs make sturdier plans.
            </p>
            <div className="rounded-xl bg-indigo-50 p-4 text-sm dark:bg-indigo-950/40">
              You&apos;re investing <strong>{formatCompact(profile.monthlyInvestment)}/month</strong> with{" "}
              <strong>{formatCompact(profile.currentSavings)}</strong> saved, retiring at{" "}
              <strong>{profile.retirementAge}</strong>. Hit finish to see your projection.
            </div>
          </div>
        )}

        <div className="mt-6 flex justify-between">
          <Button variant="ghost" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
            Back
          </Button>
          {step < STEPS.length - 1 ? (
            <Button onClick={() => setStep((s) => s + 1)}>Continue</Button>
          ) : (
            <Button onClick={finish}>Finish &amp; see my plan</Button>
          )}
        </div>
      </div>
    </div>
  );
}
