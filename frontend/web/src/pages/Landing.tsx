import { useNavigate } from "react-router-dom";
import {
  ArrowRight, Newspaper, Radio, ShieldCheck, Sun, Moon, TrendingUp, Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { usePageTitle } from "../hooks/usePageTitle";
import { useTheme } from "../state/theme";
import { Logo } from "../components/ui";

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

function LandingThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  return (
    <button
      onClick={toggleTheme}
      title="Toggle light / dark theme"
      className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 text-slate-300 transition hover:bg-white/5 hover:text-white"
    >
      {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  );
}

export function LandingPage() {
  usePageTitle("Tradify");
  const navigate = useNavigate();

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-slate-100">
      {/* Grid + glow backdrop */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "linear-gradient(to right, #818cf8 1px, transparent 1px), linear-gradient(to bottom, #818cf8 1px, transparent 1px)",
          backgroundSize: "44px 44px",
        }}
      />
      <div className="pointer-events-none absolute -top-40 left-1/2 h-[32rem] w-[32rem] -translate-x-1/2 rounded-full bg-indigo-600/25 blur-[120px]" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-96 w-96 rounded-full bg-violet-600/20 blur-[100px]" />

      <div className="relative mx-auto flex min-h-screen max-w-6xl flex-col px-6">
        <header className="flex items-center justify-between py-6">
          <div className="flex items-center gap-2.5">
            <Logo />
            <span className="text-lg font-bold tracking-tight text-white">Tradify</span>
          </div>
          <LandingThemeToggle />
        </header>

        <main className="flex flex-1 flex-col items-center justify-center py-16 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-400/20 bg-indigo-500/10 px-3 py-1 text-xs font-semibold text-indigo-300">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-indigo-400" />
            Real-time AI-based stock trading system
          </div>

          <h1 className="mt-6 max-w-3xl text-4xl font-bold tracking-tight text-white sm:text-5xl">
            AI-driven signals.<br className="hidden sm:block" /> Automated paper trading.
          </h1>

          <p className="mt-5 max-w-xl text-sm leading-relaxed text-slate-400 sm:text-base">
            Tradify combines FinBERT news sentiment and an LSTM price-prediction model to generate trading signals,
            executed automatically through Alpaca Paper Trading — real market data, simulated money.
          </p>

          <div className="mt-9 flex flex-col items-center gap-3 sm:flex-row">
            <button
              onClick={() => navigate("/dashboard")}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-600/30 transition hover:bg-indigo-500 active:scale-95"
            >
              Enter dashboard
              <ArrowRight size={16} />
            </button>
            <button
              onClick={() => navigate("/results")}
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-6 py-3 text-sm font-semibold text-slate-300 transition hover:bg-white/5 hover:text-white"
            >
              <Radio size={15} />
              View the pipeline
            </button>
          </div>

          <div className="mt-16 grid w-full max-w-2xl grid-cols-2 gap-4 sm:grid-cols-4">
            {stats.map(s => (
              <div key={s.label} className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-4 backdrop-blur-sm">
                <div className="text-xl font-bold tabular-nums text-white">{s.value}</div>
                <div className="mt-1 text-[11px] leading-tight text-slate-500">{s.label}</div>
              </div>
            ))}
          </div>

          <div className="mt-16 grid w-full grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {features.map(f => (
              <div key={f.title} className="rounded-xl border border-white/10 bg-white/[0.02] p-5 text-left transition hover:border-indigo-400/30 hover:bg-white/[0.04]">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400">
                  <f.icon size={17} />
                </div>
                <div className="mt-3 text-sm font-bold text-white">{f.title}</div>
                <p className="mt-1.5 text-xs leading-relaxed text-slate-400">{f.body}</p>
              </div>
            ))}
          </div>
        </main>

        <footer className="flex flex-col items-center gap-1 pb-8 text-center text-[11px] text-slate-500">
          <span>Simulated data via Alpaca Paper Trading — no real funds involved</span>
          <span className="text-slate-600">Pusan National University · School of Computer Science and Engineering</span>
        </footer>
      </div>
    </div>
  );
}
