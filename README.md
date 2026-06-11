# The Tuesday Letters

A retirement planner disguised as correspondence from your future self.

Every retirement tool asks for numbers and returns numbers. This one returns **letters** — written by you, from one ordinary Tuesday at 67, at 74, at 81, at 88 — generated deterministically from a real financial model. Change something today (save ₹6,000 more a month, retire two years later, downsize at 70) and the letters visibly rewrite themselves: old sentences struck through, new ones inked in, each carrying a margin note explaining why.

**Editing your present edits your future, sentence by sentence.**

## Run it

Open `index.html` in any modern browser. That's the whole app — no build, no backend, no sign-up. Everything is computed client-side and persisted in `localStorage`.

## What's inside

- **Intake as conversation** — 8 short questions, under two minutes. The names you give (partner, kids, friends) appear inside the letters.
- **The Dial of Years** — scrub from 60 to 95; the letter rewrites for every age. The dial quietly marks *the year the letters change* — the age the model says money gets tight.
- **The Rewrite Desk** — levers for monthly savings, retirement age, part-time years, downsizing, a one-time big purchase, and a market mood (Cautious / Expected / Fortunate). Moving a lever strikes through and rewrites the affected sentences with margin notes.
- **Two Futures** — your first plan and your current plan, same age, side by side.
- **The three seasons** — go-go (~60–75), slow-go (~75–85), no-go (85+). A letter from 68 and a letter from 88 could never be mistaken for each other.
- **The honest twist** — when the model shows over-funding, the letters say so: *"The math supports retiring at 58."*
- **Extras** — a shareable postcard from future-you, a write-back letter kept for your return, a 45-second read-through of every letter from 60 to 95, an assumptions drawer where every number is editable, and one collapsible balance chart with all three market moods.

## The engine

Deterministic, monthly time steps, everything in inflation-adjusted (real) terms. Defaults — all editable in the Assumptions drawer: 6% real return pre-retirement, 4% post; go-go years at 100% of target lifestyle, slow-go at 80% + 12% healthcare, no-go at 60% + 30% healthcare; market moods at ±1.5%. Funding ratio per age (annuitised resources ÷ that year's lifestyle cost) maps to five narrative bands: Abundant · Comfortable · Careful · Strained · Critical.

*An educational thought experiment, not financial advice.*
