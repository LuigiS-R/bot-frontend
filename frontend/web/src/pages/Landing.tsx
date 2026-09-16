import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertCircle, ArrowRight, ArrowUpRight, ArrowDownRight, Database, Newspaper,
  Radio, ShieldCheck, TrendingUp, Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { accounts, errorText } from "../api/accountsClient";
import { signals } from "../api/signalsClient";
import type { Dashboard, Freshness, NewsSignal, SignalInputs, Watchlist } from "../api/types";
import { usePageTitle } from "../hooks/usePageTitle";
import { EmptyState, freshnessMeta, Loading, Logo, SiteFooter } from "../components/ui";

const DEFAULT_TICKERS = ["AAPL", "NVDA", "TSLA", "MSFT", "AMZN"];

// Operational metrics only — no directional-accuracy claims here. The LSTM's 70.1%
// validation accuracy didn't hold up in the integrated historical replay (49.386%,
// below the 50.492% majority-class baseline — see the Report page), so this hero
// leads with the numbers that did hold up under the real pipeline.
const stats: { label: string; value: string }[] = [
  { label: "Paper-order fill rate", value: "99.688%" },
  { label: "Predictions / second", value: "3.427" },
  { label: "LSTM inference latency", value: "101.7 ms" },
  { label: "RabbitMQ queue errors", value: "0" },
];

interface Feature { icon: LucideIcon; title: string; body: string; tag: string; }
const features: Feature[] = [
  {
    icon: Newspaper,
    title: "News sentiment",
    body: "A fine-tuned FinBERT model reads financial headlines in real time and scores their directional impact.",
    tag: "ProsusAI/finbert, fine-tuned",
  },
  {
    icon: TrendingUp,
    title: "Price prediction",
    body: "A multi-input LSTM combines a 20-step sequence of 11 market features with news sentiment to estimate direction.",
    tag: "20 × 11 rolling sequence",
  },
  {
    icon: ShieldCheck,
    title: "Portfolio-aware decisions",
    body: "Predictions below a 0.65 confidence threshold are held. Approved BUYs size to ~5% of available cash.",
    tag: "Strategy & Decision Engine",
  },
  {
    icon: Zap,
    title: "Automated execution",
    body: "Approved orders are validated, then submitted as LIMIT/DAY orders straight to Alpaca Paper Trading.",
    tag: "Order Execution Service",
  },
];

interface PipelineStage { icon: LucideIcon; step: string; title: string; body: string; }
const pipelineStages: PipelineStage[] = [
  { icon: Database, step: "01 / INGESTION", title: "Market data & news", body: "OHLCV bars and financial headlines collected from Alpaca, published to RabbitMQ." },
  { icon: Newspaper, step: "02 / AI ANALYSIS", title: "FinBERT + LSTM", body: "News sentiment and an 11-feature market sequence combine into a direction + confidence score." },
  { icon: ShieldCheck, step: "03 / DECISION", title: "Strategy engine", body: "Confidence ≥ 0.65 and portfolio-aware sizing turn a prediction into a BUY, SELL, or HOLD." },
  { icon: Zap, step: "04 / EXECUTION", title: "Order execution", body: "Approved LIMIT/DAY orders are validated and submitted to Alpaca Paper Trading." },
];

function ConnectionPill() {
  const [freshness, setFreshness] = useState<Freshness>();
  useEffect(() => {
    accounts.dashboard().then((d: Dashboard) => setFreshness(d.freshness)).catch(() => {});
  }, []);
  const meta = freshness ? freshnessMeta[freshness] : null;
  if (!meta) return null;
  return (
    <div className={`hidden items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium sm:inline-flex ${meta.badge}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${meta.dot} ${freshness === "FRESH" ? "animate-pulse" : ""}`} />
      {meta.label}
    </div>
  );
}

interface Preview { symbol: string; close: number; returnPct: number; rsi14: number; macd: number; headlines: NewsSignal[]; }

function readRsi(v: number) { if (v >= 70) return "Overbought"; if (v <= 30) return "Oversold"; return "Neutral"; }
function readMacd(v: number) { return v >= 0 ? "Bullish momentum" : "Bearish momentum"; }

function LivePreviewPanel() {
  const [preview, setPreview] = useState<Preview>();
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    accounts.watchlists()
      .then((lists: Watchlist[]) => {
        const fromWatchlists = Array.from(new Set(lists.flatMap(w => w.entries.map(e => e.ticker))));
        return fromWatchlists[0] ?? DEFAULT_TICKERS[0];
      })
      .catch(() => DEFAULT_TICKERS[0])
      .then(async symbol => {
        const [inputs, news] = await Promise.all([
          signals.inputs(symbol) as Promise<SignalInputs>,
          signals.news(symbol).then(r => r.items).catch(() => [] as NewsSignal[]),
        ]);
        if (cancelled) return;
        setPreview({
          symbol,
          close: inputs.features.close,
          returnPct: inputs.features.return * 100,
          rsi14: inputs.features.rsi14,
          macd: inputs.features.macd,
          headlines: news.slice(0, 2),
        });
        setLoading(false);
      })
      .catch(() => { if (!cancelled) { setFailed(true); setLoading(false); } });
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="mx-auto max-w-4xl overflow-hidden rounded-2xl border border-slate-200/90 bg-white text-left shadow-lg dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between border-b border-slate-200/80 px-5 py-3 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-rose-300" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber-300" />
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-300" />
          </div>
          <span className="hidden font-mono text-[11px] font-medium text-slate-400 sm:inline">tradify · live signal preview</span>
        </div>
        {preview && <span className="text-[11px] font-semibold text-slate-400">{preview.symbol}</span>}
      </div>

      <div className="p-5 sm:p-6">
        {loading ? (
          <Loading />
        ) : failed || !preview ? (
          <EmptyState icon={AlertCircle} title="Live preview unavailable" subtitle="Couldn't reach live market data right now — the app itself isn't affected." />
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Latest bar · {preview.symbol}</div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-bold tabular-nums text-slate-900 dark:text-white">${preview.close.toFixed(2)}</span>
                <span className={`inline-flex items-center gap-0.5 text-sm font-bold tabular-nums ${preview.returnPct >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                  {preview.returnPct >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                  {preview.returnPct >= 0 ? "+" : ""}{preview.returnPct.toFixed(2)}%
                </span>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800/60">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">RSI (14)</div>
                  <div className="mt-0.5 text-sm font-bold text-slate-800 dark:text-slate-200">{readRsi(preview.rsi14)}</div>
                </div>
                <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800/60">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">MACD</div>
                  <div className="mt-0.5 text-sm font-bold text-slate-800 dark:text-slate-200">{readMacd(preview.macd)}</div>
                </div>
              </div>
              <p className="mt-3 text-[11px] leading-relaxed text-slate-400">Same 11 features the LSTM consumes as a 20-step rolling sequence — this is just the latest step, fetched live.</p>
            </div>

            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Recent headlines</div>
              {preview.headlines.length === 0 ? (
                <p className="mt-2 text-xs text-slate-400">No recent headlines for {preview.symbol} right now.</p>
              ) : (
                <div className="mt-2 space-y-2.5">
                  {preview.headlines.map((h, i) => (
                    <a key={i} href={h.url} target="_blank" rel="noreferrer" className="block rounded-lg border border-slate-100 bg-slate-50 p-3 transition hover:border-indigo-200 dark:border-slate-800 dark:bg-slate-800/60">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-xs font-medium leading-snug text-slate-700 dark:text-slate-300">{h.headline}</p>
                        {h.direction && (
                          <span className={`shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-bold ${h.direction === "UP" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400" : "bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400"}`}>
                            {h.direction} {Math.round((h.confidence ?? 0) * 100)}%
                          </span>
                        )}
                      </div>
                      <span className="mt-1 block text-[10px] text-slate-400">{h.source}</span>
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function LandingPage() {
  usePageTitle("Tradify");
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 font-sans text-slate-900 antialiased transition-colors duration-200 dark:bg-slate-950 dark:text-slate-100">
      <div className="pointer-events-none fixed left-1/2 top-0 -z-10 h-[28rem] w-full max-w-7xl -translate-x-1/2 bg-gradient-to-b from-indigo-500/10 via-blue-500/5 to-transparent blur-3xl" />
      <div
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[36rem] opacity-[0.35] dark:opacity-[0.12]"
        style={{
          backgroundImage: "linear-gradient(to right, #c7d2fe 1px, transparent 1px), linear-gradient(to bottom, #c7d2fe 1px, transparent 1px)",
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
          <nav className="hidden items-center gap-7 text-sm font-medium text-slate-600 dark:text-slate-300 md:flex">
            <a href="#preview" className="transition hover:text-indigo-600 dark:hover:text-indigo-400">Live preview</a>
            <a href="#metrics" className="transition hover:text-indigo-600 dark:hover:text-indigo-400">Metrics</a>
            <a href="#pipeline" className="transition hover:text-indigo-600 dark:hover:text-indigo-400">Pipeline</a>
          </nav>
          <ConnectionPill />
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-center px-4 pb-20 pt-16 text-center sm:px-6 sm:pt-24">
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

        <div id="preview" className="mt-16 w-full scroll-mt-24">
          <LivePreviewPanel />
        </div>

        <div id="metrics" className="mt-16 grid w-full max-w-2xl scroll-mt-24 grid-cols-2 gap-4 sm:grid-cols-4">
          {stats.map(s => (
            <div key={s.label} className="rounded-xl border border-slate-200/90 bg-white px-4 py-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="text-xl font-bold tabular-nums text-slate-900 dark:text-white">{s.value}</div>
              <div className="mt-1 text-[11px] leading-tight text-slate-500 dark:text-slate-400">{s.label}</div>
            </div>
          ))}
        </div>
        <p className="mt-3 text-[11px] text-slate-400">From a 20-session historical replay evaluation — full results, including directional accuracy, on the Report page.</p>

        <div className="mt-16 grid w-full grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map(f => (
            <div key={f.title} className="rounded-xl border border-slate-200/90 bg-white p-5 text-left shadow-sm transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                <f.icon size={17} />
              </div>
              <div className="mt-3 text-sm font-bold text-slate-900 dark:text-white">{f.title}</div>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{f.body}</p>
              <div className="mt-3 font-mono text-[10px] font-medium text-indigo-600 dark:text-indigo-400">{f.tag}</div>
            </div>
          ))}
        </div>
      </main>

      <section id="pipeline" className="scroll-mt-24 bg-slate-900 py-16 text-slate-100">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <span className="text-xs font-bold uppercase tracking-widest text-indigo-400">End-to-end pipeline</span>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">How the pipeline works</h2>
            <p className="mt-2 text-sm text-slate-400">An event-driven microservice system — each stage communicates asynchronously through RabbitMQ rather than calling the next stage directly.</p>
          </div>
          <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {pipelineStages.map(stage => (
              <div key={stage.step} className="rounded-2xl border border-slate-700/80 bg-slate-800/70 p-5">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400">
                  <stage.icon size={16} />
                </div>
                <div className="mt-3 font-mono text-[10px] font-bold text-indigo-400">{stage.step}</div>
                <div className="mt-1 text-sm font-bold text-white">{stage.title}</div>
                <p className="mt-1.5 text-xs leading-relaxed text-slate-400">{stage.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
