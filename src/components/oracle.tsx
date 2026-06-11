"use client";

import clsx from "clsx";
import { Mood } from "@/lib/engine/oracle";

/**
 * A procedurally-aged portrait of your future self. Everything is driven by two
 * numbers — how far through life this age sits, and the financial "mood" — so
 * the same face greys, wrinkles, reaches for glasses, and smiles or frowns as
 * you drag the dial across the years. No images, just SVG.
 */

const MOOD_HALO: Record<Mood, string> = {
  thriving: "#10b981",
  comfortable: "#6366f1",
  stretched: "#f59e0b",
  struggling: "#f97316",
  broke: "#f43f5e",
};

/** Mouth curvature: positive = smile, negative = frown. */
const MOOD_SMILE: Record<Mood, number> = {
  thriving: 11,
  comfortable: 7,
  stretched: 2,
  struggling: -4,
  broke: -9,
};

/** Interpolate hair from young-brown → grey → white across the life span. */
function hairColor(t: number): string {
  // t in [0,1]: 0 = youngest, 1 = life expectancy.
  if (t < 0.45) return "#3f2d1d";
  if (t < 0.6) return "#5b4636";
  if (t < 0.72) return "#8a8a93";
  if (t < 0.85) return "#b9bcc4";
  return "#e8eaee";
}

export function AgingPortrait({
  age,
  currentAge,
  lifeExpectancy,
  mood,
  free,
}: {
  age: number;
  currentAge: number;
  lifeExpectancy: number;
  mood: Mood;
  free: boolean;
}) {
  const span = Math.max(1, lifeExpectancy - currentAge);
  const t = Math.min(1, Math.max(0, (age - currentAge) / span));

  const halo = MOOD_HALO[mood];
  const hair = hairColor(t);
  const smile = MOOD_SMILE[mood];
  const glasses = age >= 48;
  const wrinkle = age >= 70 ? 0.5 : age >= 56 ? 0.28 : 0;
  const cx = 110;

  // Mouth: a quadratic curve whose control point dips (smile) or rises (frown).
  const mouthPath = `M ${cx - 20} 168 Q ${cx} ${168 + smile} ${cx + 20} 168`;

  return (
    <svg viewBox="0 0 220 240" className="h-full w-full" role="img" aria-label={`Future self at age ${age}`}>
      {/* Mood halo */}
      <defs>
        <radialGradient id="halo" cx="50%" cy="45%" r="55%">
          <stop offset="0%" stopColor={halo} stopOpacity={0.35} />
          <stop offset="100%" stopColor={halo} stopOpacity={0} />
        </radialGradient>
      </defs>
      <circle cx={cx} cy="108" r="100" fill="url(#halo)" />

      {/* Freedom crown */}
      {free && (
        <g transform={`translate(${cx}, 26)`} fill="#fbbf24">
          <path d="M -16 6 L -10 -8 L -3 2 L 0 -12 L 3 2 L 10 -8 L 16 6 Z" />
          <circle cx="0" cy="9" r="2" />
        </g>
      )}

      {/* Hair (back) */}
      <path d="M 62 96 Q 58 44 110 42 Q 162 44 158 96 L 158 110 Q 110 78 62 110 Z" fill={hair} />

      {/* Neck + shoulders */}
      <path d="M 96 168 L 96 188 Q 110 196 124 188 L 124 168 Z" fill="#e8b89a" />
      <path d="M 70 240 Q 74 198 110 196 Q 146 198 150 240 Z" fill={halo} fillOpacity={0.22} />

      {/* Face */}
      <ellipse cx={cx} cy="118" rx="48" ry="56" fill="#f0c4a4" />
      <ellipse cx={cx} cy="118" rx="48" ry="56" fill="none" stroke="#d8a888" strokeWidth="1" />

      {/* Ears */}
      <circle cx="62" cy="122" r="9" fill="#f0c4a4" />
      <circle cx="158" cy="122" r="9" fill="#f0c4a4" />

      {/* Hair (front fringe) */}
      <path d="M 64 92 Q 70 58 110 56 Q 150 58 156 92 Q 134 74 110 76 Q 86 74 64 92 Z" fill={hair} />

      {/* Brows */}
      <path d="M 84 104 Q 94 100 104 104" fill="none" stroke="#7a5a3e" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M 116 104 Q 126 100 136 104" fill="none" stroke="#7a5a3e" strokeWidth="2.5" strokeLinecap="round" />

      {/* Eyes */}
      <ellipse cx="94" cy="116" rx="4.5" ry="5" fill="#3a3a3a" />
      <ellipse cx="126" cy="116" rx="4.5" ry="5" fill="#3a3a3a" />

      {/* Glasses */}
      {glasses && (
        <g fill="none" stroke="#475569" strokeWidth="2.5">
          <rect x="80" y="108" width="28" height="20" rx="7" />
          <rect x="112" y="108" width="28" height="20" rx="7" />
          <path d="M 108 116 L 112 116" />
          <path d="M 80 114 L 66 118" />
          <path d="M 140 114 L 154 118" />
        </g>
      )}

      {/* Nose */}
      <path d="M 110 122 L 106 140 Q 110 144 114 140" fill="none" stroke="#cf9a78" strokeWidth="2" strokeLinecap="round" />

      {/* Mouth */}
      <path d={mouthPath} fill="none" stroke="#b15c54" strokeWidth="3" strokeLinecap="round" />

      {/* Wrinkles, fading in with age */}
      {wrinkle > 0 && (
        <g stroke="#c79a78" strokeWidth="1.4" strokeLinecap="round" fill="none" opacity={wrinkle}>
          <path d="M 74 96 Q 92 92 110 94" />
          <path d="M 110 94 Q 128 92 146 96" />
          <path d="M 78 138 Q 84 146 82 156" />
          <path d="M 142 138 Q 136 146 138 156" />
          <path d="M 86 128 Q 90 131 94 129" />
          <path d="M 126 129 Q 130 131 134 128" />
        </g>
      )}
    </svg>
  );
}

interface LifeCell {
  age: number;
  kind: "past" | "accumulation" | "drawdown" | "broke";
  freedom: boolean;
}

const CELL_TONE: Record<LifeCell["kind"], string> = {
  past: "bg-slate-200 dark:bg-slate-700",
  accumulation: "bg-indigo-400 dark:bg-indigo-500",
  drawdown: "bg-emerald-400 dark:bg-emerald-500",
  broke: "bg-rose-400 dark:bg-rose-500",
};

/**
 * A memento-mori life grid: one tile per year of your whole life, coloured by
 * the phase your money is in. The selected year glows; the freedom year wears a
 * gold ring. Click any year to send the dial — and your future self — there.
 */
export function LifeGrid({
  currentAge,
  retirementAge,
  lifeExpectancy,
  freedomAge,
  depletionAge,
  selectedAge,
  onSelect,
}: {
  currentAge: number;
  retirementAge: number;
  lifeExpectancy: number;
  freedomAge: number | null;
  depletionAge: number | null;
  selectedAge: number;
  onSelect: (age: number) => void;
}) {
  const cells: LifeCell[] = [];
  for (let age = 0; age < lifeExpectancy; age++) {
    let kind: LifeCell["kind"];
    if (age < currentAge) kind = "past";
    else if (age < retirementAge) kind = "accumulation";
    else if (depletionAge !== null && age >= depletionAge) kind = "broke";
    else kind = "drawdown";
    cells.push({ age, kind, freedom: freedomAge !== null && age === freedomAge });
  }

  return (
    <div
      className="grid gap-1"
      style={{ gridTemplateColumns: "repeat(auto-fill, minmax(16px, 1fr))" }}
    >
      {cells.map((c) => {
        const selectable = c.age >= currentAge;
        const selected = c.age === selectedAge;
        return (
          <button
            key={c.age}
            type="button"
            disabled={!selectable}
            onClick={() => selectable && onSelect(c.age)}
            title={`Age ${c.age}${c.freedom ? " — freedom year" : ""}`}
            aria-label={`Age ${c.age}`}
            className={clsx(
              "aspect-square rounded-[3px] transition-all",
              CELL_TONE[c.kind],
              selectable && "cursor-pointer hover:scale-125 hover:ring-1 hover:ring-slate-400",
              selected && "scale-125 ring-2 ring-slate-900 dark:ring-white",
              c.freedom && !selected && "ring-2 ring-amber-400",
            )}
          />
        );
      })}
    </div>
  );
}
