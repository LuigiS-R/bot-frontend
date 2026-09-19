import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertCircle, ArrowDownRight, ArrowRight, ArrowUpRight, Database, Loader2, Newspaper,
  Radio, Send, ShieldCheck, Sparkles, Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { accounts, errorText } from "../api/accountsClient";
import { signals } from "../api/signalsClient";
import type { Dashboard, Freshness, NewsSignal, SignalInputs, Watchlist } from "../api/types";
import { usePageTitle } from "../hooks/usePageTitle";
import { EmptyState, ErrorPanel, freshnessMeta, Loading, Logo, SiteFooter } from "../components/ui";
import { NewsRow, readMacd, readRsi, ReadBadge, SentimentChart } from "./Signals";

const DEFAULT_TICKERS = ["AAPL", "NVDA", "TSLA", "MSFT", "AMZN"];

const PLAYGROUND_PRESETS = [
  "Company reports record quarterly revenue, beating analyst estimates by a wide margin.",
  "Federal Reserve signals it may keep interest rates higher for longer amid persistent inflation.",
  "Firm announces routine leadership transition as part of its long-planned succession process.",
];

// One canonical list for the pipeline section — previously this content was split
// across two near-identical sections (a feature grid and a separate pipeline
// diagram) describing the same four stages. "tag" is the real RabbitMQ routing
// key or service name for that stage, from the project's architecture (Fig. 1).
// "schema" lists the real field names each stage's message actually carries
// (Sections 3.3/3.5/3.6/3.7 of the report) — shown as field names, never as
// invented live values. "metric" is a real number from the report's own
// historical-replay evaluation (Tables 7 & 8), labeled as such.
interface PipelineStage {
  icon: LucideIcon; accent: string; step: string; title: string; body: string; tag: string;
  schema: string[]; metric?: { label: string; value: string };
}
const pipelineStages: PipelineStage[] = [
  {
    icon: Database,
    accent: "indigo",
    step: "INGESTION",
    title: "Market data & news",
    body: "OHLCV bars and financial headlines are collected from Alpaca and published onto RabbitMQ.",
    tag: "market-data, financial-news",
    schema: ["open, high, low, close", "volume", "return, ma5, ma20", "volatility5, rsi14, macd"],
  },
  {
    icon: Newspaper,
    accent: "blue",
    step: "AI ANALYSIS",
    title: "FinBERT + LSTM",
    body: "A fine-tuned FinBERT model scores headline sentiment in real time; a multi-input LSTM combines that with a 20-step sequence of 11 market features to estimate direction.",
    tag: "news-sentiment, predictions",
    schema: ["ticker", "direction (UP / DOWN)", "upwardProbability, confidence", "timestamp"],
    metric: { label: "LSTM inference latency", value: "101.7 ms mean" },
  },
  {
    icon: ShieldCheck,
    accent: "violet",
    step: "DECISION",
    title: "Strategy engine",
    body: "Confidence ≥ 0.65 and portfolio-aware sizing (approved BUYs at ~5% of available cash) turn a prediction into a BUY, SELL, or HOLD.",
    tag: "orders.approved",
    schema: ["symbol", "decision (BUY / SELL / HOLD)", "confidenceThreshold: 0.65", "cashAllocationPct: ~5%"],
    metric: { label: "Strategy handler latency", value: "50.6 ms mean" },
  },
  {
    icon: Zap,
    accent: "emerald",
    step: "EXECUTION",
    title: "Order execution",
    body: "Approved orders are validated, then submitted as LIMIT/DAY orders straight to Alpaca Paper Trading.",
    tag: "Order Execution Service",
    schema: ["symbol, side, quantity", "orderType: LIMIT", "limitPrice", "timeInForce: DAY"],
    metric: { label: "Order fill rate", value: "99.688%" },
  },
];

const accentClasses: Record<string, string> = {
  indigo: "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400",
  blue: "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400",
  violet: "bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400",
  emerald: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400",
};
const accentText: Record<string, string> = {
  indigo: "text-indigo-600 dark:text-indigo-400",
  blue: "text-blue-600 dark:text-blue-400",
  violet: "text-violet-600 dark:text-violet-400",
  emerald: "text-emerald-600 dark:text-emerald-400",
};

function ConnectionPill() {
  const [freshness, setFreshness] = useState<Freshness>();
  useEffect(() => {
    accounts.dashboard().then((d: Dashboard) => setFreshness(d.freshness)).catch(() => {});
  }, []);
  const meta = freshness ? freshnessMeta[freshness] : null;
  if (!meta) return null;
  return (
    <div className={`hidden items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium sm:inline-flex ${meta.badge}`}>
      <span className="relative flex h-2 w-2">
        {freshness === "FRESH" && <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-60 ${meta.dot}`} />}
        <span className={`relative inline-flex h-2 w-2 rounded-full ${meta.dot}`} />
      </span>
      {meta.label}
    </div>
  );
}

// Real, live-fetched quotes for a fixed set of well-known symbols — no fabricated
// prices or random-walk animation. Just the price/features endpoint already used
// elsewhere in the app, called once per symbol and rendered in a scrolling strip.
const TICKER_SYMBOLS = ["AAPL", "NVDA", "TSLA", "MSFT", "AMZN", "SPY", "META"];
interface TickerQuote { symbol: string; close: number; returnPct: number; }

function TickerTape() {
  const [quotes, setQuotes] = useState<TickerQuote[]>([]);

  useEffect(() => {
    let cancelled = false;
    Promise.allSettled(TICKER_SYMBOLS.map(symbol => signals.inputs(symbol) as Promise<SignalInputs>))
      .then(results => {
        if (cancelled) return;
        const ok = results
          .filter((r): r is PromiseFulfilledResult<SignalInputs> => r.status === "fulfilled")
          .map(r => ({ symbol: r.value.symbol, close: r.value.features.close, returnPct: r.value.features.return * 100 }));
        setQuotes(ok);
      });
    return () => { cancelled = true; };
  }, []);

  if (quotes.length === 0) return null;
  const track = [...quotes, ...quotes];

  return (
    <div className="overflow-hidden border-b border-slate-800 bg-slate-950 py-2 text-xs">
      <div className="flex w-max animate-ticker-scroll">
        {track.map((q, i) => (
          <div key={i} className="inline-flex items-center gap-2 whitespace-nowrap border-r border-slate-800 px-6">
            <span className="font-bold text-slate-200">{q.symbol}</span>
            <span className="text-slate-400">${q.close.toFixed(2)}</span>
            <span className={`font-semibold ${q.returnPct >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
              {q.returnPct >= 0 ? "+" : ""}{q.returnPct.toFixed(2)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

interface PreviewData { symbol: string; inputs: SignalInputs; news: NewsSignal[]; }
type PreviewTab = "signal" | "news";

function LivePreviewPanel() {
  const [data, setData] = useState<PreviewData>();
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [tab, setTab] = useState<PreviewTab>("signal");

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
        setData({ symbol, inputs, news });
        setLoading(false);
      })
      .catch(() => { if (!cancelled) { setFailed(true); setLoading(false); } });
    return () => { cancelled = true; };
  }, []);

  const returnPct = data ? data.inputs.features.return * 100 : 0;
  const positive = returnPct >= 0;
  const rsi = data ? readRsi(data.inputs.features.rsi14) : null;
  const macd = data ? readMacd(data.inputs.features.macd) : null;
  const latestHeadline = data?.news[0];

  return (
    <div className="mx-auto max-w-4xl overflow-hidden rounded-2xl border border-slate-300/80 bg-white text-left shadow-xl dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 px-5 py-3.5 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-rose-300" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber-300" />
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-300" />
          </div>
          <span className="hidden font-mono text-[11px] font-medium text-slate-400 sm:inline">tradify · live signal preview</span>
        </div>
        <div className="flex items-center rounded-lg bg-slate-100 p-1 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-400">
          <button
            onClick={() => setTab("signal")}
            className={`rounded-md px-3 py-1 transition ${tab === "signal" ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white" : "hover:text-slate-900 dark:hover:text-white"}`}
          >
            Market signal
          </button>
          <button
            onClick={() => setTab("news")}
            className={`rounded-md px-3 py-1 transition ${tab === "news" ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white" : "hover:text-slate-900 dark:hover:text-white"}`}
          >
            News feed
          </button>
        </div>
      </div>

      <div className="p-5 sm:p-6">
        {loading ? (
          <Loading />
        ) : failed || !data ? (
          <EmptyState icon={AlertCircle} title="Live preview unavailable" subtitle="Couldn't reach live market data right now — the app itself isn't affected." />
        ) : tab === "signal" ? (
          <div>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">{data.symbol}</h3>
                  {rsi && <ReadBadge tone={rsi.tone} label={rsi.label} />}
                  {macd && <ReadBadge tone={macd.tone} label={macd.label} />}
                  {latestHeadline?.direction && (
                    <ReadBadge
                      tone={latestHeadline.direction === "UP" ? "emerald" : "rose"}
                      label={`Latest headline ${Math.round((latestHeadline.confidence ?? 0) * 100)}%`}
                    />
                  )}
                </div>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Live 30-day price, fetched from Alpaca on page load</p>
              </div>
              <div className="text-right">
                <span className="text-2xl font-extrabold tabular-nums text-slate-900 dark:text-white">${data.inputs.features.close.toFixed(2)}</span>
                <span className={`ml-2 inline-flex items-center gap-0.5 text-sm font-bold tabular-nums ${positive ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                  {positive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                  {positive ? "+" : ""}{returnPct.toFixed(2)}%
                </span>
              </div>
            </div>

            <div className="mt-5 rounded-xl border border-slate-100 bg-white p-3 shadow-inner dark:border-slate-800 dark:bg-slate-950/40">
              <div className="mb-1 flex items-center gap-1.5 px-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                <span className="inline-block h-2 w-2 rounded-full bg-indigo-500" />
                Historical price ($)
                <span className="mx-1 text-slate-300 dark:text-slate-700">·</span>
                <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
                News sentiment (dot size = confidence)
              </div>
              <SentimentChart inputs={data.inputs} news={data.news} />
            </div>
            <p className="mt-3 text-[11px] leading-relaxed text-slate-400">Same 11 features the LSTM consumes as a 20-step rolling sequence — this is just the latest step, fetched live.</p>
          </div>
        ) : (
          <div className="-m-5 sm:-m-6">
            {data.news.length === 0 ? (
              <p className="p-6 text-xs text-slate-400">No recent headlines for {data.symbol} right now.</p>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {data.news.map((item, i) => <NewsRow key={i} item={item} />)}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function FinbertPlayground() {
  const [text, setText] = useState("");
  const [result, setResult] = useState<{ direction: "UP" | "DOWN"; confidence: number }>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const analyze = (headline: string) => {
    const trimmed = headline.trim();
    if (!trimmed) return;
    setText(headline);
    setLoading(true);
    setError("");
    setResult(undefined);
    signals.analyze(trimmed)
      .then(setResult)
      .catch(e => setError(errorText(e)))
      .finally(() => setLoading(false));
  };

  // The model is a binary classifier (UP vs DOWN), so its confidence in the
  // predicted class and 1-confidence in the other class are both real, derived
  // from the same softmax output — not an invented three-way sentiment split.
  const bullishPct = result ? Math.round((result.direction === "UP" ? result.confidence : 1 - result.confidence) * 100) : 0;
  const bearishPct = 100 - bullishPct;

  return (
    <section id="playground" className="w-full scroll-mt-24 bg-gradient-to-b from-indigo-50/70 via-white to-white py-16 dark:from-indigo-500/[0.06] dark:via-slate-950 dark:to-slate-950 sm:py-20">
      <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
      <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-bold uppercase tracking-widest text-indigo-600 dark:border-indigo-500/20 dark:bg-indigo-500/10 dark:text-indigo-400">
        <Sparkles size={13} />
        Interactive playground
      </span>
      <h2 className="mt-3 text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">Test the real FinBERT model</h2>
      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
        Type any financial headline — this calls your actual fine-tuned model live, not a simulation.
      </p>

      <div className="mt-8 grid grid-cols-1 gap-6 rounded-2xl border border-slate-300/80 bg-white p-6 text-left shadow-xl dark:border-slate-700 dark:bg-slate-900 lg:grid-cols-12 lg:p-8">
        <div className="lg:col-span-7">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Financial news headline</label>
          <div className="mt-2 flex flex-col gap-2.5 sm:flex-row">
            <input
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={e => e.key === "Enter" && analyze(text)}
              placeholder="Paste or type a financial headline…"
              className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            />
            <button
              onClick={() => analyze(text)}
              disabled={loading || !text.trim()}
              className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? <Loader2 size={15} className="animate-spin" /> : <Send size={14} />}
              Analyze
            </button>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <span className="self-center text-[11px] text-slate-400">Try:</span>
            {PLAYGROUND_PRESETS.map((p, i) => (
              <button
                key={i}
                onClick={() => analyze(p)}
                className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600 transition hover:border-indigo-300 hover:text-indigo-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-indigo-500/40 dark:hover:text-indigo-400"
              >
                {p.length > 42 ? p.slice(0, 42) + "…" : p}
              </button>
            ))}
          </div>

          {error && <div className="mt-5"><ErrorPanel message={error} /></div>}
        </div>

        <div className="flex flex-col justify-center rounded-xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-800/40 lg:col-span-5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Inference signal</span>
          {loading ? (
            <div className="mt-3 flex items-center gap-2 text-sm text-slate-400">
              <Loader2 size={15} className="animate-spin" /> Running on the real model…
            </div>
          ) : result ? (
            <>
              <span className={`mt-2 inline-flex w-fit items-center gap-1.5 text-sm font-bold ${result.direction === "UP" ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                {result.direction === "UP" ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                {result.direction === "UP" ? "Bullish signal" : "Bearish signal"}
              </span>
              <span className="mt-0.5 text-xs font-semibold text-slate-500 dark:text-slate-400">{Math.round(result.confidence * 100)}% model confidence</span>
              <div className="mt-3 flex h-2.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                <div className="h-full bg-rose-500" style={{ width: `${bearishPct}%` }} />
                <div className="h-full bg-emerald-500" style={{ width: `${bullishPct}%` }} />
              </div>
              <div className="mt-1.5 flex justify-between text-[11px] font-semibold">
                <span className="text-rose-600 dark:text-rose-400">Bearish {bearishPct}%</span>
                <span className="text-emerald-600 dark:text-emerald-400">Bullish {bullishPct}%</span>
              </div>
            </>
          ) : (
            <p className="mt-3 text-xs leading-relaxed text-slate-400">Type a headline and click Analyze — the result appears here.</p>
          )}
        </div>
      </div>
      </div>
    </section>
  );
}

// Real exchange name from the report (Section 3.3): "the resulting market-data
// message is published to the RabbitMQ market-data-exchange". Not a live speed —
// the throughput figure is the historical replay's measured average (Table 7).
const REAL_EXCHANGE_NAME = "market-data-exchange";
const REAL_THROUGHPUT = "3.427 predictions/s avg";

function PipelineGraph() {
  const [active, setActive] = useState(0);
  const [liveSymbol, setLiveSymbol] = useState<{ symbol: string; features: SignalInputs["features"] }>();

  useEffect(() => {
    let cancelled = false;
    accounts.watchlists()
      .then((lists: Watchlist[]) => {
        const fromWatchlists = Array.from(new Set(lists.flatMap(w => w.entries.map(e => e.ticker))));
        return fromWatchlists[0] ?? DEFAULT_TICKERS[0];
      })
      .catch(() => DEFAULT_TICKERS[0])
      .then(symbol => (signals.inputs(symbol) as Promise<SignalInputs>).then(inputs => {
        if (cancelled) return;
        setLiveSymbol({ symbol, features: inputs.features });
      }))
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const stage = pipelineStages[active];

  return (
    <section id="pipeline" className="relative w-full scroll-mt-24 overflow-hidden border-y border-slate-200 bg-slate-50 py-16 dark:border-slate-800 dark:bg-slate-900/40 sm:py-20">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.4] dark:opacity-[0.15]"
        style={{ backgroundImage: "radial-gradient(#cbd5e1 1.2px, transparent 1.2px)", backgroundSize: "22px 22px" }}
      />
      <div className="relative mx-auto max-w-4xl px-4 text-center sm:px-6">
      <div className="mx-auto max-w-2xl text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-white px-3 py-1 text-xs font-bold uppercase tracking-widest text-indigo-600 shadow-sm dark:border-indigo-500/20 dark:bg-slate-900 dark:text-indigo-400">
          <Radio size={12} />
          Interactive architecture graph
        </span>
        <h2 className="mt-3 text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">How the pipeline works</h2>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Click any stage to inspect its real message schema and evaluation metrics from the project's report.
        </p>
      </div>

      <div className="relative mt-10 overflow-hidden rounded-3xl border border-slate-300/80 bg-white p-6 shadow-xl dark:border-slate-700 dark:bg-slate-900 sm:p-8">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.4] dark:opacity-[0.15]"
          style={{ backgroundImage: "radial-gradient(#cbd5e1 1.2px, transparent 1.2px)", backgroundSize: "22px 22px" }}
        />

        <div className="relative flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-5 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <span className="h-2.5 w-2.5 rounded-full bg-indigo-500" />
            <span className="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300">RabbitMQ message exchange</span>
            <span className="rounded border border-slate-200 bg-slate-100 px-2 py-0.5 font-mono text-[11px] text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">{REAL_EXCHANGE_NAME}</span>
          </div>
          <span className="font-mono text-xs text-slate-400">
            {REAL_THROUGHPUT} <span className="text-slate-300 dark:text-slate-600">· historical replay</span>
          </span>
        </div>

        <div className="relative mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <div className="absolute left-0 right-0 top-6 hidden h-0.5 bg-gradient-to-r from-indigo-400 via-violet-400 to-emerald-400 opacity-50 lg:block" />
          {pipelineStages.map((s, i) => (
            <button
              key={s.step}
              onClick={() => setActive(i)}
              className={`relative z-10 flex flex-col rounded-2xl border-2 bg-white p-5 text-left shadow-sm transition hover:-translate-y-1 dark:bg-slate-900 ${
                active === i ? "border-indigo-500 shadow-lg" : "border-slate-200 hover:border-indigo-300 dark:border-slate-700"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${accentClasses[s.accent]}`}>
                  <s.icon size={18} />
                </div>
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 text-[11px] font-bold text-white dark:bg-white dark:text-slate-900">{i + 1}</span>
              </div>
              <div className={`mt-3 font-mono text-[10px] font-bold uppercase tracking-widest ${accentText[s.accent]}`}>{s.step}</div>
              <div className="mt-0.5 text-sm font-bold text-slate-900 dark:text-white">{s.title}</div>
              <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-100 pt-2.5 dark:border-slate-800">
                <span className="text-[10px] font-medium uppercase text-slate-400">Topic</span>
                <span className="truncate rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">{s.tag}</span>
              </div>
            </button>
          ))}
        </div>

        <div className="relative mt-8 grid grid-cols-1 gap-5 border-t border-slate-100 pt-8 dark:border-slate-800 lg:grid-cols-12">
          <div className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-800/40 lg:col-span-4">
            <div>
              <div className="flex items-center justify-between">
                <span className={`text-xs font-bold uppercase tracking-wider ${accentText[stage.accent]}`}>Stage {active + 1} detail</span>
              </div>
              <h3 className="mt-1 text-base font-extrabold text-slate-900 dark:text-white">{stage.title}</h3>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{stage.body}</p>
            </div>
            {stage.metric && (
              <div className="border-t border-slate-200 pt-3 dark:border-slate-700">
                <span className="block text-[10px] uppercase tracking-wide text-slate-400">{stage.metric.label}</span>
                <span className="font-mono text-sm font-bold text-slate-900 dark:text-white">{stage.metric.value}</span>
                <span className="ml-1.5 text-[10px] text-slate-400">(historical replay)</span>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 font-mono text-xs text-slate-300 dark:border-slate-700 lg:col-span-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 text-[11px] text-slate-500">
              <span className="flex items-center gap-2 font-bold text-white">Message schema</span>
              <span className="rounded bg-slate-800 px-2 py-0.5 text-slate-300">{stage.tag}</span>
            </div>
            <div className="mt-3 space-y-2">
              {stage.schema.map((field, i) => {
                if (active === 0 && liveSymbol) {
                  // Node 1 is the only stage whose fields this frontend can read live —
                  // reuse the same real fetch shown in the preview panel above, rather
                  // than a static example.
                  const liveMap: Record<number, string> = {
                    0: `open ${liveSymbol.features.open.toFixed(2)}, high ${liveSymbol.features.high.toFixed(2)}, low ${liveSymbol.features.low.toFixed(2)}, close ${liveSymbol.features.close.toFixed(2)}`,
                    1: `volume ${liveSymbol.features.volume.toLocaleString()}`,
                    2: `return ${(liveSymbol.features.return * 100).toFixed(2)}%, ma5 ${liveSymbol.features.ma5.toFixed(2)}, ma20 ${liveSymbol.features.ma20.toFixed(2)}`,
                    3: `volatility5 ${(liveSymbol.features.volatility5 * 100).toFixed(2)}%, rsi14 ${liveSymbol.features.rsi14.toFixed(1)}, macd ${liveSymbol.features.macd.toFixed(2)}`,
                  };
                  return (
                    <div key={i} className="flex items-center justify-between gap-3 rounded bg-slate-800/60 px-2.5 py-1.5">
                      <span className="text-emerald-400">{liveMap[i]}</span>
                      <span className="shrink-0 text-[10px] text-slate-500">live · {liveSymbol.symbol}</span>
                    </div>
                  );
                }
                return (
                  <div key={i} className="rounded bg-slate-800/60 px-2.5 py-1.5 text-slate-300">
                    {field}
                  </div>
                );
              })}
            </div>
            {active !== 0 && (
              <p className="mt-3 text-[10px] leading-relaxed text-slate-500">
                Field names only — this stage's values are produced and consumed inside the backend pipeline and aren't exposed to this frontend.
              </p>
            )}
          </div>
        </div>
      </div>
      </div>
    </section>
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

      <TickerTape />

      <header className="border-b border-slate-200/80 bg-white/90 backdrop-blur-md transition-colors dark:border-slate-800 dark:bg-slate-900/90">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center space-x-2.5">
            <Logo />
            <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">Tradify</span>
            <span className="hidden rounded-md border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 sm:inline-flex">
              Paper
            </span>
          </div>
          <nav className="hidden items-center gap-6 text-sm font-semibold text-slate-600 dark:text-slate-300 md:flex">
            <a href="#preview" className="transition hover:text-indigo-600 dark:hover:text-indigo-400">Live preview</a>
            <a href="#pipeline" className="transition hover:text-indigo-600 dark:hover:text-indigo-400">Pipeline</a>
            <a href="#playground" className="transition hover:text-indigo-600 dark:hover:text-indigo-400">Playground</a>
          </nav>
          <div className="flex items-center gap-3">
            <ConnectionPill />
            <button
              onClick={() => navigate("/dashboard")}
              className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
            >
              Launch app
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-center px-4 pb-8 pt-14 text-center sm:px-6 sm:pt-20">
        <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-3.5 py-1.5 text-xs font-semibold text-indigo-700 shadow-sm dark:border-indigo-500/20 dark:bg-indigo-500/10 dark:text-indigo-400">
          <span className="h-2 w-2 animate-pulse rounded-full bg-indigo-500 dark:bg-indigo-400" />
          Real-time AI-based stock trading system
        </div>

        <h1 className="mt-7 max-w-4xl text-5xl font-extrabold leading-[1.08] tracking-tight sm:text-6xl lg:text-7xl">
          <span className="bg-gradient-to-r from-slate-900 via-indigo-600 to-indigo-500 bg-clip-text text-transparent dark:from-white dark:via-indigo-300 dark:to-indigo-400">
            AI-driven signals.
          </span>
          <br />
          <span className="text-slate-900 dark:text-white">Automated paper trading.</span>
        </h1>

        <p className="mt-6 max-w-2xl text-base leading-relaxed text-slate-500 dark:text-slate-400 sm:text-lg">
          Tradify combines <b className="font-semibold text-slate-700 dark:text-slate-300">FinBERT news sentiment</b> and an{" "}
          <b className="font-semibold text-slate-700 dark:text-slate-300">LSTM price-prediction model</b> to generate trading signals,
          executed automatically through Alpaca Paper Trading — real market data, simulated money.
        </p>

        <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row">
          <button
            onClick={() => navigate("/dashboard")}
            className="group inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 px-8 py-4 text-sm font-bold text-white shadow-lg shadow-indigo-600/30 transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-indigo-600/40 active:translate-y-0"
          >
            Enter dashboard
            <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
          </button>
          <button
            onClick={() => navigate("/results")}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-7 py-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            <Radio size={15} />
            View the pipeline
          </button>
        </div>

        <div id="preview" className="mt-14 w-full scroll-mt-24">
          <LivePreviewPanel />
        </div>
      </main>

      <PipelineGraph />

      <FinbertPlayground />

      <SiteFooter />
    </div>
  );
}
