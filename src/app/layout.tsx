import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Shell from "@/components/Shell";

/** Runs before paint to apply the saved/system theme without a flash. */
const THEME_INIT_SCRIPT = `(function(){try{var s=localStorage.getItem("mythos-theme");var d=s?s==="dark":window.matchMedia("(prefers-color-scheme: dark)").matches;document.documentElement.classList.toggle("dark",d);}catch(e){}})();`;

/**
 * If the app bundle fails to load/execute (stale deployment, blocked chunks,
 * unsupported browser), the page would otherwise look fine but be dead.
 * Surface that loudly instead. Shell sets __mythosHydrated on mount.
 */
const HYDRATION_WATCHDOG_SCRIPT = `window.addEventListener("load",function(){setTimeout(function(){if(!window.__mythosHydrated){var d=document.createElement("div");d.textContent="⚠ Interactive features failed to load — numbers won't update. Hard-refresh (Ctrl+Shift+R). If this persists, restart the app server: npm run build && npm start.";d.style.cssText="position:fixed;bottom:12px;left:50%;transform:translateX(-50%);background:#b91c1c;color:#fff;padding:10px 16px;border-radius:10px;font:13px/1.4 system-ui;z-index:9999;max-width:92%;text-align:center;box-shadow:0 4px 12px rgba(0,0,0,.3)";document.body.appendChild(d);}},5000);});`;

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Mythos — Retirement Planner",
  description:
    "Plan, track and optimize your retirement: corpus calculator, FIRE numbers, Monte Carlo simulations, goals, tax optimization and an AI coach — built for India.",
};

export const viewport: Viewport = {
  themeColor: "#4f46e5",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <script dangerouslySetInnerHTML={{ __html: HYDRATION_WATCHDOG_SCRIPT }} />
      </head>
      <body className="min-h-full">
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
