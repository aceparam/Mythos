# Mythos — Retirement Planner for India

A modern, responsive retirement-planning web app that answers the five big questions:
**When can I retire? How much will I need? Am I on track? What should I change? What's the trade-off?**

Built mobile-first for users in India (₹ lakh/crore formatting, EPF/PPF/NPS, Indian tax regimes),
with the calculation engine kept country-agnostic for future markets.

## Features

| Module | What it does |
| --- | --- |
| **Dashboard** (`/`) | Readiness score (0–100, red/yellow/green), Monte Carlo success probability, corpus trajectory, net worth, prioritized recommendations, PDF export |
| **Retirement Calculator** (`/calculator`) | Required corpus (growing-annuity model), projected corpus (monthly SIP compounding with step-up), surplus/shortfall, gap-closing SIP, earliest fully-funded retirement age — every slider doubles as what-if analysis |
| **Net Worth** (`/networth`) | 9 asset classes (cash, MF, stocks, EPF, PPF, NPS, gold, bonds, real estate) and 3 liability types, allocation pie, monthly history trend, portfolio review (risk score, diversification, age-based equity guideline) |
| **Monte Carlo** (`/montecarlo`) | 1,000–10,000 lognormal-return lifecycle simulations: success probability, percentile fan chart, corpus distribution histogram, retirement survival timeline |
| **FIRE Calculator** (`/fire`) | Lean / Regular / Fat FIRE numbers, years to FI, FI age, SIP needed for FI in 15 years, adjustable SWR (default 3.5% for Indian inflation) |
| **Goals** (`/goals`) | Child education, marriage, house, travel, emergency fund — future cost, funding SIP, and the quantified cost to your retirement corpus if goals crowd out retirement SIPs |
| **Retirement Income** (`/income`) | Pension/rental/dividends/annuity/SWP sources, inflation-linked or fixed, tax-adjusted monthly cash flow, corpus depletion forecast, legacy estimate |
| **Tax Optimizer** (`/tax`) | Old vs New regime (FY 2025-26 slabs, 87A rebate, cess), 80C / 80CCD(1B) / 80D / 24(b), equity LTCG/STCG estimator, prioritized tax-saving opportunities |
| **Scenarios** (`/scenarios`) | Save any calculator configuration and compare corpus, success rate, monthly income and net worth trajectories side by side |
| **AI Coach** (`/coach`) | Conversational coach — "Can I retire at 50?", "What if inflation is 8%?" — every answer computed live from *your* plan by the same engines that power the dashboards |
| **Onboarding** (`/onboarding`) | 4-step guided setup, under 2 minutes |

Plus: dark mode (system-aware, no flash), mobile drawer navigation, accessible form controls,
print-to-PDF report styling, and all state persisted locally.

## Tech stack

- **Next.js (App Router) + React + TypeScript** — all 12 routes statically prerendered
- **Tailwind CSS v4** — class-based dark mode
- **Recharts** — area/line/pie/bar charts, fan charts, survival curves
- **Zustand + localStorage persistence** — plans survive reloads, no account needed

### Architecture

```
src/
  lib/
    types.ts            Domain model (Profile, Assets, Goals, Scenarios…)
    format.ts           ₹ lakh/crore formatting
    store.ts            Zustand store with localStorage persistence
    engine/             Pure, framework-free TypeScript — unit-testable
      retirement.ts     Corpus math (growing annuity, SIP FV, gap SIP)
      montecarlo.ts     Seeded lognormal lifecycle simulation
      fire.ts           Lean/Regular/Fat FIRE
      tax.ts            FY 2025-26 old/new regimes, capital gains
      goals.ts          Goal funding & retirement impact
      income.ts         Post-retirement cash-flow planning
      portfolio.ts      Allocation, diversification, risk scoring
      score.ts          Composite readiness score
      recommendations.ts Prioritized, quantified action plan
      coach.ts          Deterministic Q&A over the engines
  components/           Shell (nav/dark mode), UI primitives, chart wrappers
  app/                  One route per module
```

The engine layer has no React or browser dependencies, so it can be lifted unchanged into a
NestJS/PostgreSQL backend when multi-device sync and OAuth login are added. The coach is
deterministic by design — financial answers come from the calculation engines, never from
free-text generation — and can be wrapped with an LLM layer for natural-language flexibility later.

## Getting started

```bash
npm install
npm run dev     # http://localhost:3000
npm run build   # production build (all routes static)
npm run lint
```

## Financial model notes

- **Required corpus** is the present value at retirement of an inflation-growing annuity-due
  through life expectancy at the post-retirement return.
- **Projected corpus** compounds current savings + monthly SIP monthly, with annual step-up.
- **Monte Carlo** samples lognormal annual returns (drift-adjusted), de-risks volatility to 60%
  post-retirement, and withdraws the inflation-growing expense schedule; success = solvent at
  life expectancy. Seeded PRNG keeps results reproducible.
- **Defaults**: 6% inflation, 11% pre-retirement return, 7.5% post-retirement, 14% volatility,
  3.5% SWR — conservative for India; all adjustable.

> Estimates only — not investment advice. Verify assumptions with a SEBI-registered advisor.
