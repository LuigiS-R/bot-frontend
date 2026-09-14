import {
  Activity, BarChart3, Bot, CheckCircle2, Clock, Gauge, Layers, Newspaper, TrendingUp, Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { usePageTitle } from "../hooks/usePageTitle";
import { AppShell, Panel } from "../components/ui";

// Figures below are drawn directly from the project's final report (20-session historical
// replay + AI model development evaluation), Sept 2026. Kept static/hardcoded — this page
// documents a fixed evaluation, not live telemetry.

function StatCard({ icon: Icon, tone, label, value, detail }: { icon: LucideIcon; tone: "indigo" | "emerald" | "amber" | "rose"; label: string; value: string; detail?: string }) {
  const tones: Record<string, string> = {
    indigo: "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400",
    emerald: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400",
    amber: "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400",
    rose: "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400",
  };
  return (
    <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</span>
        <div className={`flex h-7 w-7 items-center justify-center rounded-md ${tones[tone]}`}>
          <Icon size={14} />
        </div>
      </div>
      <div className="mt-3 text-2xl font-bold tracking-tight tabular-nums text-slate-900 dark:text-white">{value}</div>
      {detail && <p className="mt-2 text-xs font-medium text-slate-500 dark:text-slate-400">{detail}</p>}
    </div>
  );
}

function ProgressRow({ label, percent, tone = "indigo" }: { label: string; percent: number; tone?: "indigo" | "emerald" | "slate" }) {
  const bar: Record<string, string> = { indigo: "bg-indigo-600", emerald: "bg-emerald-500", slate: "bg-slate-400" };
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-xs">
        <span className="font-semibold text-slate-700 dark:text-slate-300">{label}</span>
        <span className="font-bold tabular-nums text-slate-900 dark:text-white">{percent.toFixed(2)}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        <div className={`h-full rounded-full ${bar[tone]}`} style={{ width: `${Math.min(100, Math.max(0, percent))}%` }} />
      </div>
    </div>
  );
}

function SectionHeading({ eyebrow, title, subtitle }: { eyebrow: string; title: string; subtitle: string }) {
  return (
    <div>
      <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">{eyebrow}</span>
      <h2 className="mt-1 text-lg font-bold text-slate-900 dark:text-white">{title}</h2>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>
    </div>
  );
}

export function ResultsPage() {
  usePageTitle("Results");

  return (
    <AppShell>
      <div className="space-y-10 pb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Project results &amp; evaluation</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-500 dark:text-slate-400">
            Figures from the final report's AI model development and 20-session historical replay evaluation of the complete
            event-driven pipeline — market data through paper-trade execution.
          </p>
        </div>

        <section className="space-y-4">
          <SectionHeading
            eyebrow="System reliability"
            title="Event-driven pipeline under accelerated replay"
            subtitle="20 sessions replaying historical market data at ~220x speed, 7,298 prediction inputs generated end-to-end."
          />
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard icon={CheckCircle2} tone="emerald" label="Paper-order fill rate" value="99.688%" detail="319 of 320 submitted orders filled" />
            <StatCard icon={Zap} tone="indigo" label="Prediction throughput" value="3.427/s" detail="7,298 predictions across 20 sessions" />
            <StatCard icon={Clock} tone="indigo" label="LSTM inference latency" value="101.7 ms" detail="mean — 97.6 ms p50, 123.0 ms p95" />
            <StatCard icon={Layers} tone="emerald" label="RabbitMQ queue errors" value="0" detail="all 20 sessions drained successfully" />
          </div>
        </section>

        <section className="space-y-4">
          <SectionHeading
            eyebrow="AI models"
            title="Model development performance"
            subtitle="Evaluated independently during training, before integration into the streaming pipeline."
          />
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <Panel className="p-6">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                  <Newspaper size={16} />
                </div>
                <h3 className="font-bold text-slate-900 dark:text-white">FinBERT News Impact model</h3>
              </div>
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Fine-tuned from ProsusAI/finbert to estimate the directional market impact of financial news.</p>
              <div className="mt-5 space-y-3">
                <ProgressRow label="Overall accuracy" percent={65.58} />
                <ProgressRow label="Overall F1-score" percent={67.35} />
                <ProgressRow label="UP-class F1-score" percent={68.87} tone="emerald" />
                <ProgressRow label="UP-class recall" percent={77.89} tone="emerald" />
              </div>
            </Panel>
            <Panel className="p-6">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                  <TrendingUp size={16} />
                </div>
                <h3 className="font-bold text-slate-900 dark:text-white">Multi-input LSTM price model</h3>
              </div>
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Combines a 20-step sequence of 11 market features with news-derived information to predict short-term direction.</p>
              <div className="mt-5 space-y-3">
                <ProgressRow label="Validation directional accuracy" percent={70.1} tone="emerald" />
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3 text-center">
                <div className="rounded-lg bg-slate-50 py-3 dark:bg-slate-800/60">
                  <div className="text-lg font-bold text-slate-900 dark:text-white">20 × 11</div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">market input shape</div>
                </div>
                <div className="rounded-lg bg-slate-50 py-3 dark:bg-slate-800/60">
                  <div className="text-lg font-bold text-slate-900 dark:text-white">~5 min</div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">update interval</div>
                </div>
              </div>
            </Panel>
          </div>
        </section>

        <section className="space-y-4">
          <SectionHeading
            eyebrow="Paper trading"
            title="Simulated execution across 20 independent $100,000 accounts"
            subtitle="Each replay session reset to a fresh simulated account, so sessions are not one continuous portfolio."
          />
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard icon={Activity} tone="indigo" label="Orders submitted" value="320" detail="368 decisions rejected before submission" />
            <StatCard icon={CheckCircle2} tone="emerald" label="Orders filled" value="319" detail="99.688% fill rate" />
            <StatCard icon={BarChart3} tone="indigo" label="Total turnover" value="$1.56M" detail="$1,556,896.36 across 20 sessions" />
            <StatCard icon={Gauge} tone="amber" label="Mean max drawdown" value="0.728%" detail="max observed 1.888% in a single session" />
          </div>
        </section>

        <div className="flex items-center gap-2 rounded-xl border border-slate-200/90 bg-slate-50 px-4 py-3 text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
          <Bot size={14} className="shrink-0" />
          Source: "Real-Time AI-Based Stock Trading System" final report, Team AI Got This, Pusan National University, Sept 2026.
        </div>
      </div>
    </AppShell>
  );
}
