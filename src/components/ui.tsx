"use client";

import clsx from "clsx";
import { ReactNode } from "react";

export function Card({
  title,
  subtitle,
  children,
  className,
}: {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={clsx(
        "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900",
        className,
      )}
    >
      {title && (
        <header className="mb-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            {title}
          </h2>
          {subtitle && <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>}
        </header>
      )}
      {children}
    </section>
  );
}

export function Stat({
  label,
  value,
  sub,
  tone = "default",
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "default" | "good" | "bad" | "warn";
}) {
  const tones = {
    default: "text-slate-900 dark:text-slate-100",
    good: "text-emerald-600 dark:text-emerald-400",
    bad: "text-rose-600 dark:text-rose-400",
    warn: "text-amber-600 dark:text-amber-400",
  };
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</p>
      <p className={clsx("mt-1 text-2xl font-bold tabular-nums", tones[tone])}>{value}</p>
      {sub && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{sub}</p>}
    </div>
  );
}

export function NumberField({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  prefix,
  suffix,
  hint,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  prefix?: string;
  suffix?: string;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</span>
      <div className="mt-1 flex items-center rounded-lg border border-slate-300 bg-white focus-within:ring-2 focus-within:ring-indigo-500 dark:border-slate-700 dark:bg-slate-950">
        {prefix && <span className="pl-3 text-sm text-slate-500">{prefix}</span>}
        <input
          type="number"
          className="w-full rounded-lg bg-transparent px-3 py-2 text-sm tabular-nums outline-none"
          value={Number.isFinite(value) ? value : 0}
          min={min}
          max={max}
          step={step}
          onChange={(e) => onChange(Number(e.target.value))}
        />
        {suffix && <span className="pr-3 text-sm text-slate-500">{suffix}</span>}
      </div>
      {hint && <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">{hint}</span>}
    </label>
  );
}

export function SliderField({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  display,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step?: number;
  display?: string;
}) {
  return (
    <label className="block">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</span>
        <span className="text-sm font-semibold tabular-nums text-indigo-600 dark:text-indigo-400">
          {display ?? value}
        </span>
      </div>
      <input
        type="range"
        className="mt-2 w-full accent-indigo-600"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  );
}

export function Button({
  children,
  onClick,
  variant = "primary",
  type = "button",
  className,
  disabled,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "ghost" | "danger";
  type?: "button" | "submit";
  className?: string;
  disabled?: boolean;
}) {
  const variants = {
    primary:
      "bg-indigo-600 text-white hover:bg-indigo-500 disabled:bg-slate-300 dark:disabled:bg-slate-700",
    ghost:
      "border border-slate-300 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800",
    danger: "bg-rose-600 text-white hover:bg-rose-500",
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={clsx(
        "rounded-lg px-4 py-2 text-sm font-medium transition-colors",
        variants[variant],
        className,
      )}
    >
      {children}
    </button>
  );
}

export function Badge({
  children,
  tone = "default",
}: {
  children: ReactNode;
  tone?: "default" | "good" | "bad" | "warn";
}) {
  const tones = {
    default: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
    good: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400",
    bad: "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400",
    warn: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400",
  };
  return (
    <span className={clsx("inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold", tones[tone])}>
      {children}
    </span>
  );
}

export function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</span>
      <select
        className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function TextField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</span>
      <input
        type="text"
        className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-950"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

/** Simple progress bar with banded colors. */
export function Progress({ pct, band }: { pct: number; band?: "red" | "yellow" | "green" }) {
  const color =
    band === "green" ? "bg-emerald-500" : band === "yellow" ? "bg-amber-500" : band === "red" ? "bg-rose-500" : "bg-indigo-500";
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
      <div className={clsx("h-full rounded-full transition-all", color)} style={{ width: `${Math.min(100, Math.max(0, pct))}%` }} />
    </div>
  );
}
