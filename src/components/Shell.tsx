"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";
import clsx from "clsx";
import { useTheme } from "@/lib/theme";
import { usePlanner } from "@/lib/store";
import {
  Bot,
  Calculator,
  Flame,
  GitCompareArrows,
  LayoutDashboard,
  Menu,
  Moon,
  PieChart,
  ReceiptIndianRupee,
  Sparkles,
  Sun,
  Target,
  TrendingUp,
  Wallet,
  X,
} from "lucide-react";

const NAV = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/oracle", label: "The Oracle", icon: Sparkles },
  { href: "/calculator", label: "Retirement Calculator", icon: Calculator },
  { href: "/networth", label: "Net Worth", icon: Wallet },
  { href: "/montecarlo", label: "Monte Carlo", icon: TrendingUp },
  { href: "/fire", label: "FIRE Calculator", icon: Flame },
  { href: "/goals", label: "Goals", icon: Target },
  { href: "/income", label: "Retirement Income", icon: PieChart },
  { href: "/tax", label: "Tax Optimizer", icon: ReceiptIndianRupee },
  { href: "/scenarios", label: "Scenarios", icon: GitCompareArrows },
  { href: "/coach", label: "AI Coach", icon: Bot },
];

export default function Shell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [dark, toggleDark] = useTheme();
  const [open, setOpen] = useState(false);

  // Load saved plan from localStorage after mount (persist has skipHydration),
  // and signal the layout's watchdog that the app bundle is alive.
  useEffect(() => {
    (window as unknown as Record<string, unknown>).__mythosHydrated = true;
    usePlanner.persist.rehydrate();
  }, []);

  const nav = (
    <nav className="flex flex-col gap-1 p-3">
      {NAV.map(({ href, label, icon: Icon }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            onClick={() => setOpen(false)}
            className={clsx(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-indigo-600 text-white"
                : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800",
            )}
          >
            <Icon size={17} aria-hidden />
            {label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 lg:flex">
        <div className="flex items-center gap-2 px-5 py-5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-sm font-bold text-white">M</span>
          <div>
            <p className="text-sm font-bold leading-tight">Mythos</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Retirement Planner</p>
          </div>
        </div>
        {nav}
      </aside>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-64 bg-white shadow-xl dark:bg-slate-900">
            <div className="flex items-center justify-between px-5 py-4">
              <p className="text-sm font-bold">Mythos</p>
              <button onClick={() => setOpen(false)} aria-label="Close menu">
                <X size={18} />
              </button>
            </div>
            {nav}
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white/80 px-4 py-3 backdrop-blur dark:border-slate-800 dark:bg-slate-900/80">
          <div className="flex items-center gap-3">
            <button className="lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu">
              <Menu size={20} />
            </button>
            <h1 className="text-sm font-semibold lg:hidden">Mythos Retirement Planner</h1>
          </div>
          <button
            onClick={toggleDark}
            aria-label="Toggle dark mode"
            className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            {dark ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 p-4 lg:p-8">{children}</main>
        <footer className="px-4 pb-6 text-center text-xs text-slate-400 dark:text-slate-500">
          Estimates only — not investment advice. Assumptions are yours to verify with a SEBI-registered advisor.
        </footer>
      </div>
    </div>
  );
}
