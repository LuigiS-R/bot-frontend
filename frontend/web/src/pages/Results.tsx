import {
  Activity, Archive, ArrowDown, BarChart3, CheckCircle2, Clock, Cpu, Database, Gauge, Layers, Newspaper, Receipt,
  ShieldCheck, TrendingUp, Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { usePageTitle } from "../hooks/usePageTitle";
import { AppShell, Panel } from "../components/ui";

// Figures below are from the project's AI model development and a 20-session historical
// replay evaluation of the full system, Sept 2026. Kept static/hardcoded — this page
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

interface PipelineStage { icon: LucideIcon; title: string; items: string[]; queue?: string; }

const pipelineStages: PipelineStage[] = [
  {
    icon: Database,
    title: "Data collection",
    items: [
      "Market Data Service — OHLCV bars from Alpaca, computes the 11 technical features below",
      "News Ingestion Service — real-time financial headlines from Alpaca",
    ],
    queue: "market-data, financial-news",
  },
  {
    icon: Cpu,
    title: "AI analysis",
    items: [
      "News Impact Prediction — fine-tuned FinBERT → UP/DOWN direction + confidence",
      "Price Prediction — multi-input LSTM combining a 20×11 market sequence with the news signal",
    ],
    queue: "news-sentiment, predictions",
  },
  {
    icon: ShieldCheck,
    title: "Trading decision",
    items: ["Strategy & Decision Engine — confidence ≥ 0.65 and portfolio-aware sizing → BUY / SELL / HOLD"],
    queue: "orders.approved",
  },
  {
    icon: Receipt,
    title: "Order execution",
    items: ["Order Execution Service — validates and submits LIMIT/DAY orders to Alpaca Paper Trading"],
  },
  {
    icon: Archive,
    title: "Persistence & access",
    items: [
      "Order Execution Persister — order projections and broker reconciliation",
      "Account Service — the only backend this frontend talks to: portfolio, orders, watchlists",
    ],
  },
];

function PipelineCard({ stage, number }: { stage: PipelineStage; number: number }) {
  return (
    <div className="flex flex-col rounded-xl border border-slate-200/90 bg-white p-5 shadow-sm transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center gap-3">
        <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
          <stage.icon size={18} />
          <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-indigo-600 text-[9px] font-bold text-white">
            {number}
          </span>
        </div>
        <div className="text-sm font-bold text-slate-900 dark:text-white">{stage.title}</div>
      </div>
      <ul className="mt-3 flex-1 space-y-1.5">
        {stage.items.map(item => (
          <li key={item} className="flex gap-2 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
            <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-slate-300 dark:bg-slate-600" />
            {item}
          </li>
        ))}
      </ul>
      {stage.queue && (
        <div className="mt-3 inline-flex w-fit items-center rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
          RabbitMQ → {stage.queue}
        </div>
      )}
    </div>
  );
}

function PipelineDiagram() {
  const firstRow = pipelineStages.slice(0, 2);
  const secondRow = pipelineStages.slice(2);
  return (
    <div>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        {firstRow.map((stage, i) => <PipelineCard key={stage.title} stage={stage} number={i + 1} />)}
      </div>

      <div className="flex justify-center py-2">
        <ArrowDown size={18} className="text-indigo-300 dark:text-indigo-500/60" />
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        {secondRow.map((stage, i) => <PipelineCard key={stage.title} stage={stage} number={i + 3} />)}
      </div>
    </div>
  );
}

export function ResultsPage() {
  usePageTitle("Report");

  return (
    <AppShell>
      <div className="space-y-10 pb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Project report</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-500 dark:text-slate-400">
            How the pipeline is built, and how the AI models and full system performed across a 20-session historical
            replay evaluation — market data through paper-trade execution.
          </p>
        </div>

        <section className="space-y-4">
          <SectionHeading
            eyebrow="Architecture"
            title="24h trading bot pipeline"
            subtitle="An event-driven microservice system — each stage communicates asynchronously through RabbitMQ rather than calling the next stage directly."
          />
          <PipelineDiagram />
        </section>

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
      </div>
    </AppShell>
  );
}
