"use client";

import { useSyncExternalStore } from "react";

/**
 * Theme state lives on <html class="dark">, set before paint by the inline
 * script in layout.tsx. This hook subscribes components to it.
 */

const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): boolean {
  return document.documentElement.classList.contains("dark");
}

export function toggleTheme() {
  const next = !document.documentElement.classList.contains("dark");
  document.documentElement.classList.toggle("dark", next);
  localStorage.setItem("mythos-theme", next ? "dark" : "light");
  listeners.forEach((l) => l());
}

export function useTheme(): [boolean, () => void] {
  const dark = useSyncExternalStore(subscribe, getSnapshot, () => false);
  return [dark, toggleTheme];
}
