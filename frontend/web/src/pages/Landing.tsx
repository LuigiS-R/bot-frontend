import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertCircle, ArrowDownRight, ArrowRight, ArrowUpRight, Database, Newspaper,
  Radio, Receipt, ShieldCheck, TrendingUp, Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { accounts, errorText } from "../api/accountsClient";
import { signals } from "../api/signalsClient";
import type { Dashboard, Freshness, NewsSignal, Order, SignalInputs, Watchlist } from "../api/types";
import { usePageTitle } from "../hooks/usePageTitle";
import { DateTime, EmptyState, freshnessMeta, Loading, Logo, Money, OrderStatusBadge, SiteFooter } from "../components/ui";
import { NewsRow, readMacd, readRsi, ReadBadge, SentimentChart } from "./Signals";

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
type PreviewTab = "signal" | "news" | "orders";

// Deliberately bypasses accounts.orders()'s demo-data fallback — this panel exists to show
// genuinely live data or say so honestly, never to paper over a backend outage with fake fills.
function useRealOrders() {
  const [orders, setOrders] = useState<Order[]>();
  const [error, setError] = useState("");
  useEffect(() => {
    fetch("/api/v1/orders")
      .then(async r => {
        const body = await r.json().catch(() => undefined);
        if (!r.ok) throw new Error(body?.message || `Orders unavailable (${r.status}).`);
        return body as Order[];
      })
      .then(setOrders)
      .catch(e => setError(errorText(e)));
  }, []);
  return { orders, error };
}

function LivePreviewPanel() {
  const [data, setData] = useState<PreviewData>();
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [tab, setTab] = useState<PreviewTab>("signal");
  const { orders, error: ordersError } = useRealOrders();

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

  return (
    <div className="mx-auto max-w-4xl overflow-hidden rounded-2xl border border-slate-200/90 bg-white text-left shadow-xl dark:border-slate-800 dark:bg-slate-900">
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
          <button
            onClick={() => setTab("orders")}
            className={`rounded-md px-3 py-1 transition ${tab === "orders" ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white" : "hover:text-slate-900 dark:hover:text-white"}`}
          >
            Recent orders
          </button>
        </div>
      </div>

      <div className="p-5 sm:p-6">
        {tab === "orders" ? (
          !orders && !ordersError ? (
            <Loading />
          ) : ordersError ? (
            <EmptyState icon={AlertCircle} title="Order feed unavailable" subtitle={ordersError} />
          ) : !orders || orders.length === 0 ? (
            <EmptyState icon={Receipt} title="No orders yet." subtitle="Orders from the bot or from manual trades will appear here." />
          ) : (
            <div className="-m-5 divide-y divide-slate-100 sm:-m-6 dark:divide-slate-800">
              {orders.slice(0, 5).map(o => (
                <div key={o.orderId} className="flex items-center justify-between gap-3 px-5 py-3 sm:px-6">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-bold ${o.side === "BUY" ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>{o.side}</span>
                      <span className="text-sm font-bold text-slate-900 dark:text-white">{o.symbol}</span>
                    </div>
                    <span className="text-[11px] text-slate-400"><DateTime value={o.createdAt} /></span>
                  </div>
                  <div className="text-right">
                    <Money value={o.limitPrice} className="text-sm font-bold text-slate-700 dark:text-slate-300" />
                    <div className="mt-0.5"><OrderStatusBadge status={o.status} /></div>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : loading ? (
          <Loading />
        ) : failed || !data ? (
          <EmptyState icon={AlertCircle} title="Live preview unavailable" subtitle="Couldn't reach live market data right now — the app itself isn't affected." />
        ) : tab === "signal" ? (
          <div>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">{data.symbol}</h3>
                  {rsi && <ReadBadge tone={rsi.tone} label={rsi.label} />}
                  {macd && <ReadBadge tone={macd.tone} label={macd.label} />}
                </div>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Last 30 trading days, with recent news sentiment overlaid</p>
              </div>
              <div className="text-right">
                <span className="text-2xl font-extrabold tabular-nums text-slate-900 dark:text-white">${data.inputs.features.close.toFixed(2)}</span>
                <span className={`ml-2 inline-flex items-center gap-0.5 text-sm font-bold tabular-nums ${positive ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                  {positive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                  {positive ? "+" : ""}{returnPct.toFixed(2)}%
                </span>
              </div>
            </div>

            <div className="mt-5 rounded-xl border border-slate-100 bg-slate-50/60 p-3 dark:border-slate-800 dark:bg-slate-800/30">
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
          <nav className="hidden items-center gap-7 text-sm font-medium text-slate-600 dark:text-slate-300 md:flex">
            <a href="#preview" className="transition hover:text-indigo-600 dark:hover:text-indigo-400">Live preview</a>
            <a href="#metrics" className="transition hover:text-indigo-600 dark:hover:text-indigo-400">Metrics</a>
            <a href="#pipeline" className="transition hover:text-indigo-600 dark:hover:text-indigo-400">Pipeline</a>
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

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-center px-4 pb-20 pt-16 text-center sm:px-6 sm:pt-24">
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

        <div id="preview" className="mt-16 w-full scroll-mt-24">
          <LivePreviewPanel />
        </div>

        <div id="metrics" className="mt-16 w-full max-w-3xl scroll-mt-24 rounded-2xl border border-indigo-100 bg-gradient-to-b from-indigo-50/60 to-transparent p-6 dark:border-indigo-500/10 dark:from-indigo-500/[0.04]">
          <span className="text-[11px] font-bold uppercase tracking-widest text-indigo-500 dark:text-indigo-400">Proven at scale</span>
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {stats.map(s => (
              <div key={s.label} className="rounded-xl border border-slate-200/90 bg-white px-4 py-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
                <div className="text-2xl font-extrabold tabular-nums text-slate-900 dark:text-white sm:text-3xl">{s.value}</div>
                <div className="mt-1.5 text-[11px] font-medium leading-tight text-slate-500 dark:text-slate-400">{s.label}</div>
              </div>
            ))}
          </div>
          <p className="mt-4 text-[11px] text-slate-400">From a 20-session historical replay evaluation — full results, including directional accuracy, on the Report page.</p>
        </div>

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

      <section id="pipeline" className="scroll-mt-24 bg-gradient-to-b from-slate-950 via-indigo-950 to-slate-950 py-16 text-slate-100">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <span className="text-xs font-bold uppercase tracking-widest text-indigo-400">End-to-end pipeline</span>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">How the pipeline works</h2>
            <p className="mt-2 text-sm text-slate-400">An event-driven microservice system — each stage communicates asynchronously through RabbitMQ rather than calling the next stage directly.</p>
          </div>
          <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {pipelineStages.map(stage => (
              <div key={stage.step} className="rounded-2xl border border-indigo-500/20 bg-indigo-500/[0.06] p-5 backdrop-blur-sm">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-500/15 text-indigo-300">
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
