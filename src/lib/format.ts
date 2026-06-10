/** Indian-locale money and number formatting helpers. */

const inr = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });

export function formatINR(value: number): string {
  if (!Number.isFinite(value)) return "—";
  return `₹${inr.format(Math.round(value))}`;
}

/** Compact Indian notation: ₹1.2 L, ₹3.4 Cr */
export function formatCompact(value: number): string {
  if (!Number.isFinite(value)) return "—";
  const sign = value < 0 ? "-" : "";
  const v = Math.abs(value);
  if (v >= 1e7) return `${sign}₹${(v / 1e7).toFixed(2)} Cr`;
  if (v >= 1e5) return `${sign}₹${(v / 1e5).toFixed(1)} L`;
  if (v >= 1e3) return `${sign}₹${(v / 1e3).toFixed(0)} K`;
  return `${sign}₹${inr.format(Math.round(v))}`;
}

export function formatPct(value: number, digits = 1): string {
  if (!Number.isFinite(value)) return "—";
  return `${value.toFixed(digits)}%`;
}

export function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}
