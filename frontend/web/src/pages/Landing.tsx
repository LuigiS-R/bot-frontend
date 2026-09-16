import { useNavigate } from "react-router-dom";
import { ArrowRight, Newspaper, Radio, ShieldCheck, TrendingUp, Zap } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { usePageTitle } from "../hooks/usePageTitle";
import { Logo, SiteFooter } from "../components/ui";

// Figures are the same ones on the Report page — from the project's AI model
// development and 20-session historical replay evaluation, Sept 2026.
const stats: { label: string; value: string }[] = [
  { label: "LSTM validation accuracy", value: "70.1%" },
  { label: "Paper-order fill rate", value: "99.688%" },
  { label: "Predictions / second", value: "3.427" },
  { label: "Predictions evaluated", value: "7,298" },
];

interface Feature { icon: LucideIcon; title: string; body: string; }
const features: Feature[] = [
  {
    icon: Newspaper,
    title: "News sentiment",
    body: "A fine-tuned FinBERT model reads financial headlines in real time and scores their directional impact.",
  },
  {
    icon: TrendingUp,
    title: "Price prediction",
    body: "A multi-input LSTM combines 11 market features with news sentiment to estimate short-term direction.",
  },
  {
    icon: ShieldCheck,
    title: "Portfolio-aware decisions",
    body: "A confidence threshold and position-sizing rules stand between a prediction and an actual order.",
  },
  {
    icon: Zap,
    title: "Automated execution",
    body: "Approved orders are validated and submitted straight to Alpaca Paper Trading — no manual step required.",
  },
];

export function LandingPage() {
  usePageTitle("Tradify");
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 font-sans text-slate-900 antialiased transition-colors duration-200 dark:bg-slate-950 dark:text-slate-100">
      {/* Same decorative wash used behind the app header, just taller for a hero moment */}
      <div className="pointer-events-none fixed left-1/2 top-0 -z-10 h-[28rem] w-full max-w-7xl -translate-x-1/2 bg-gradient-to-b from-indigo-500/10 via-blue-500/5 to-transparent blur-3xl" />
      <div
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[36rem] opacity-[0.35] dark:opacity-[0.12]"
        style={{
          backgroundImage:
            "linear-gradient(to right, #c7d2fe 1px, transparent 1px), linear-gradient(to bottom, #c7d2fe 1px, transparent 1px)",
          backgroundSize: "44px 44px",
          maskImage: "linear-gradient(to bottom, black, transparent)",
        }}
      />

      <header className="border-b border-slate-200/80 bg-white/90 backdrop-blur-md transition-colors dark:border-slate-800 dark:bg-slate-900/90">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center space-x-2.5">
            <Logo />
            <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">Tradify</span>
            <span className="hidden rounded-md border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 sm:inline-flex">
              Paper
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col items-center px-4 pb-16 pt-16 text-center sm:px-6 sm:pt-24">
        <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 dark:border-indigo-500/20 dark:bg-indigo-500/10 dark:text-indigo-400">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-indigo-500 dark:bg-indigo-400" />
          Real-time AI-based stock trading system
        </div>

        <h1 className="mt-6 text-4xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-5xl">
          AI-driven signals.<br className="hidden sm:block" /> Automated paper trading.
        </h1>

        <p className="mt-5 max-w-xl text-sm leading-relaxed text-slate-500 dark:text-slate-400 sm:text-base">
          Tradify combines FinBERT news sentiment and an LSTM price-prediction model to generate trading signals,
          executed automatically through Alpaca Paper Trading — real market data, simulated money.
        </p>

        <div className="mt-9 flex flex-col items-center gap-3 sm:flex-row">
          <button
            onClick={() => navigate("/dashboard")}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-bold text-white shadow-sm shadow-indigo-600/20 transition hover:bg-indigo-500 active:scale-95"
          >
            Enter dashboard
            <ArrowRight size={16} />
          </button>
          <button
            onClick={() => navigate("/results")}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            <Radio size={15} />
            View the pipeline
          </button>
        </div>

        <div className="mt-16 grid w-full max-w-2xl grid-cols-2 gap-4 sm:grid-cols-4">
          {stats.map(s => (
            <div key={s.label} className="rounded-xl border border-slate-200/90 bg-white px-4 py-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="text-xl font-bold tabular-nums text-slate-900 dark:text-white">{s.value}</div>
              <div className="mt-1 text-[11px] leading-tight text-slate-500 dark:text-slate-400">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="mt-16 grid w-full grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map(f => (
            <div key={f.title} className="rounded-xl border border-slate-200/90 bg-white p-5 text-left shadow-sm transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                <f.icon size={17} />
              </div>
              <div className="mt-3 text-sm font-bold text-slate-900 dark:text-white">{f.title}</div>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{f.body}</p>
            </div>
          ))}
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
