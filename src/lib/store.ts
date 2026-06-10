"use client";

import { useSyncExternalStore } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  Assets,
  Goal,
  IncomeSource,
  Liabilities,
  NetWorthSnapshot,
  Profile,
  Scenario,
} from "./types";

export const DEFAULT_PROFILE: Profile = {
  name: "",
  currentAge: 30,
  retirementAge: 60,
  lifeExpectancy: 85,
  annualExpenses: 720_000,
  inflationPct: 6,
  currentSavings: 1_500_000,
  monthlyInvestment: 30_000,
  sipStepUpPct: 5,
  preReturnPct: 11,
  postReturnPct: 7.5,
  volatilityPct: 14,
  annualIncome: 1_800_000,
};

export const DEFAULT_ASSETS: Assets = {
  cash: 300_000,
  mutualFunds: 800_000,
  stocks: 200_000,
  epf: 400_000,
  ppf: 150_000,
  nps: 100_000,
  gold: 100_000,
  bonds: 0,
  realEstate: 0,
};

export const DEFAULT_LIABILITIES: Liabilities = {
  homeLoan: 0,
  personalLoan: 0,
  creditCard: 0,
};

interface PlannerState {
  onboarded: boolean;
  profile: Profile;
  assets: Assets;
  liabilities: Liabilities;
  goals: Goal[];
  incomeSources: IncomeSource[];
  scenarios: Scenario[];
  history: NetWorthSnapshot[];

  setOnboarded: (v: boolean) => void;
  setProfile: (patch: Partial<Profile>) => void;
  setAssets: (patch: Partial<Assets>) => void;
  setLiabilities: (patch: Partial<Liabilities>) => void;
  addGoal: (goal: Goal) => void;
  removeGoal: (id: string) => void;
  addIncomeSource: (source: IncomeSource) => void;
  removeIncomeSource: (id: string) => void;
  saveScenario: (name: string) => void;
  removeScenario: (id: string) => void;
  recordSnapshot: () => void;
  resetAll: () => void;
}

function currentMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

export const usePlanner = create<PlannerState>()(
  persist(
    (set, get) => ({
      onboarded: false,
      profile: DEFAULT_PROFILE,
      assets: DEFAULT_ASSETS,
      liabilities: DEFAULT_LIABILITIES,
      goals: [],
      incomeSources: [],
      scenarios: [],
      history: [],

      setOnboarded: (v) => set({ onboarded: v }),
      setProfile: (patch) => set({ profile: { ...get().profile, ...patch } }),
      setAssets: (patch) => {
        set({ assets: { ...get().assets, ...patch } });
        get().recordSnapshot();
      },
      setLiabilities: (patch) => {
        set({ liabilities: { ...get().liabilities, ...patch } });
        get().recordSnapshot();
      },
      addGoal: (goal) => set({ goals: [...get().goals, goal] }),
      removeGoal: (id) => set({ goals: get().goals.filter((g) => g.id !== id) }),
      addIncomeSource: (source) => set({ incomeSources: [...get().incomeSources, source] }),
      removeIncomeSource: (id) =>
        set({ incomeSources: get().incomeSources.filter((s) => s.id !== id) }),
      saveScenario: (name) =>
        set({
          scenarios: [
            ...get().scenarios,
            {
              id: crypto.randomUUID(),
              name,
              profile: { ...get().profile },
              createdAt: new Date().toISOString(),
            },
          ],
        }),
      removeScenario: (id) => set({ scenarios: get().scenarios.filter((s) => s.id !== id) }),
      recordSnapshot: () => {
        const { assets, liabilities, history } = get();
        const snap: NetWorthSnapshot = {
          month: currentMonth(),
          assets: Object.values(assets).reduce((s, v) => s + v, 0),
          liabilities: Object.values(liabilities).reduce((s, v) => s + v, 0),
        };
        const rest = history.filter((h) => h.month !== snap.month);
        set({ history: [...rest, snap].sort((a, b) => a.month.localeCompare(b.month)).slice(-60) });
      },
      resetAll: () =>
        set({
          onboarded: false,
          profile: DEFAULT_PROFILE,
          assets: DEFAULT_ASSETS,
          liabilities: DEFAULT_LIABILITIES,
          goals: [],
          incomeSources: [],
          scenarios: [],
          history: [],
        }),
    }),
    { name: "mythos-planner-v1" },
  ),
);

/**
 * Zustand's persist rehydrates from localStorage on the client only; gate UI
 * on this to avoid hydration mismatches between server HTML and saved state.
 */
const emptySubscribe = () => () => {};
export function useHydrated(): boolean {
  // Server snapshot is false, client snapshot is true — flips exactly once
  // after hydration, when persisted localStorage state is available.
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
}
