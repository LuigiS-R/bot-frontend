import { useEffect, useMemo, useRef, useState } from "react";
import type { MouseEvent as ReactMouseEvent } from "react";
import { ArrowDownRight, ArrowUpRight, Newspaper, RefreshCw } from "lucide-react";
import { accounts, errorText } from "../api/accountsClient";
import { signals } from "../api/signalsClient";
import type { MarketFeatures, NewsSignal, SignalInputs, Watchlist } from "../api/types";
import { usePageTitle } from "../hooks/usePageTitle";
import { AppShell, DateTime, EmptyState, ErrorPanel, Loading, Panel, SecondaryButton, StockLogo } from "../components/ui";

const DEFAULT_TICKERS = ["AAPL", "NVDA", "TSLA", "MSFT", "AMZN"];

export type Tone = "emerald" | "rose" | "amber" | "slate";

export const toneBadge: Record<Tone, string> = {
  emerald: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
  rose: "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400",
  amber: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
  slate: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
};

export function ReadBadge({ tone, label }: { tone: Tone; label: string }) {
  return <span className={`inline-flex shrink-0 rounded-md px-2 py-0.5 text-[11px] font-bold ${toneBadge[tone]}`}>{label}</span>;
}

export function readRsi(v: number): { label: string; tone: Tone } {
  if (v >= 70) return { label: "Overbought", tone: "rose" };
  if (v <= 30) return { label: "Oversold", tone: "emerald" };
  return { label: "Neutral", tone: "slate" };
}
export function readMacd(v: number): { label: string; tone: Tone } {
  return v >= 0 ? { label: "Bullish momentum", tone: "emerald" } : { label: "Bearish momentum", tone: "rose" };
}
function readTrend(ma5: number, ma20: number): { label: string; tone: Tone } {
  return ma5 >= ma20 ? { label: "Bullish", tone: "emerald" } : { label: "Bearish", tone: "rose" };
}
function readVolatility(v: number): { label: string; tone: Tone } {
  if (v < 0.01) return { label: "Low", tone: "emerald" };
  if (v < 0.03) return { label: "Moderate", tone: "amber" };
  return { label: "High", tone: "rose" };
}

// Same eleven values as featureRows before, but grouped with a plain-English read next to
// each one instead of a flat grid of unexplained numbers — this is what a viewer without ML
// background actually needs to make sense of "what feeds the model".
function ModelInputsPanel({ features: f }: { features: MarketFeatures }) {
  const rsi = readRsi(f.rsi14);
  const macd = readMacd(f.macd);
  const trend = readTrend(f.ma5, f.ma20);
  const vol = readVolatility(f.volatility5);
  const positive = f.return >= 0;

  return (
    <div className="space-y-5">
      <div>
        <div className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">Today&apos;s bar</div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold tabular-nums text-slate-900 dark:text-white">${f.close.toFixed(2)}</span>
          <span className={`text-sm font-bold tabular-nums ${positive ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
            {positive ? "+" : ""}{(f.return * 100).toFixed(2)}%
          </span>
        </div>
        <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Open ${f.open.toFixed(2)} · Range ${f.low.toFixed(2)}–${f.high.toFixed(2)} · Volume {f.volume.toLocaleString()}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800/60">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">RSI (14)</span>
            <ReadBadge tone={rsi.tone} label={rsi.label} />
          </div>
          <div className="mt-1 text-lg font-bold tabular-nums text-slate-900 dark:text-white">{f.rsi14.toFixed(1)}</div>
        </div>
        <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800/60">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">MACD</span>
            <ReadBadge tone={macd.tone} label={macd.label} />
          </div>
          <div className="mt-1 text-lg font-bold tabular-nums text-slate-900 dark:text-white">{f.macd.toFixed(2)}</div>
        </div>
        <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800/60">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">MA5 vs MA20</span>
            <ReadBadge tone={trend.tone} label={trend.label} />
          </div>
          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">${f.ma5.toFixed(2)} vs ${f.ma20.toFixed(2)}</div>
        </div>
        <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800/60">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">5-day volatility</span>
            <ReadBadge tone={vol.tone} label={vol.label} />
          </div>
          <div className="mt-1 text-lg font-bold tabular-nums text-slate-900 dark:text-white">{(f.volatility5 * 100).toFixed(2)}%</div>
        </div>
      </div>

      <p className="text-[11px] leading-relaxed text-slate-400 dark:text-slate-500">
        Same eleven features (OHLCV, return, MA5/MA20, volatility, RSI14, MACD) the LSTM consumes as a 20-step rolling sequence — this is just the latest step.
      </p>
    </div>
  );
}

export function NewsRow({ item }: { item: NewsSignal }) {
  return (
    <a
      href={item.url}
      target="_blank"
      rel="noreferrer"
      className="flex items-start gap-3 px-5 py-3.5 transition hover:bg-slate-50/80 dark:hover:bg-slate-800/50"
    >
      <StockLogo symbol={item.symbol} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium leading-snug text-slate-800 dark:text-slate-200">{item.headline}</p>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-400">
          <span className="font-semibold text-slate-500 dark:text-slate-400">{item.symbol}</span>
          <span>·</span>
          <span className="capitalize">{item.source}</span>
          <span>·</span>
          <DateTime value={item.publishedAt} />
        </div>
      </div>
      {item.direction ? (
        <span
          className={`inline-flex shrink-0 items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-bold ${
            item.direction === "UP"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400"
              : "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-400"
          }`}
        >
          {item.direction === "UP" ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
          {Math.round((item.confidence ?? 0) * 100)}%
        </span>
      ) : (
        <span className="shrink-0 rounded-md border border-slate-200 bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-500">
          n/a
        </span>
      )}
    </a>
  );
}

const chartDateFormat = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" });

interface ChartHover { pixelX: number; pixelY: number; markerX: number; markerY: number; title: string; subtitle: string; isNews: boolean; }

export function SentimentChart({ inputs, news }: { inputs: SignalInputs; news: NewsSignal[] }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hover, setHover] = useState<ChartHover | null>(null);
  const points = inputs.series;
  if (points.length < 2) return null;

  const width = 640;
  const height = 220;
  const pad = 30;
  const closes = points.map(p => p.close);
  const max = Math.max(...closes);
  const min = Math.min(...closes);
  const range = max - min || 1;
  const x = (i: number) => pad + (i * (width - 2 * pad)) / (points.length - 1);
  const y = (v: number) => height - pad - ((v - min) / range) * (height - 2 * pad);
  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p.close).toFixed(1)}`).join(" ");
  const areaPath = `${linePath} L${x(points.length - 1).toFixed(1)},${height - pad} L${x(0).toFixed(1)},${height - pad} Z`;
  const gridLevels = [0.25, 0.5, 0.75].map(f => min + range * f);

  // Several headlines often land on the same nearest trading day. Rather than one dot per
  // headline (which just stacks/overlaps), collapse each day into a single net-sentiment dot —
  // this also better matches how the price model actually consumes news: a decayed, aggregated
  // recent-news state per ticker, not each raw headline as its own signal.
  const dotsByIndex = new Map<number, typeof news>();
  news.filter(n => n.direction).forEach(n => {
    const newsTime = new Date(n.publishedAt).getTime();
    let closestIndex = 0;
    let closestDiff = Infinity;
    points.forEach((p, i) => {
      const diff = Math.abs(new Date(p.date).getTime() - newsTime);
      if (diff < closestDiff) { closestDiff = diff; closestIndex = i; }
    });
    dotsByIndex.set(closestIndex, [...(dotsByIndex.get(closestIndex) ?? []), n]);
  });
  const newsDots = Array.from(dotsByIndex.entries()).map(([index, group]) => {
    let upWeight = 0;
    let downWeight = 0;
    group.forEach(n => { if (n.direction === "UP") upWeight += n.confidence ?? 0; else downWeight += n.confidence ?? 0; });
    const direction: "UP" | "DOWN" = upWeight >= downWeight ? "UP" : "DOWN";
    const confidence = (upWeight + downWeight) / group.length;
    const topHeadline = [...group].sort((a, b) => (b.confidence ?? 0) - (a.confidence ?? 0))[0];
    return {
      index, direction, confidence, count: group.length, headline: topHeadline.headline,
      cx: x(index), cy: y(points[index].close),
    };
  });

  const handleMove = (e: ReactMouseEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const pixelX = e.clientX - rect.left;
    const pixelY = e.clientY - rect.top;
    const viewBoxX = (pixelX / rect.width) * width;

    const nearestDot = newsDots
      .filter(d => Math.abs(d.cx - viewBoxX) < 14)
      .sort((a, b) => Math.abs(a.cx - viewBoxX) - Math.abs(b.cx - viewBoxX))[0];
    if (nearestDot) {
      const more = nearestDot.count > 1 ? ` (+${nearestDot.count - 1} more that day)` : "";
      setHover({
        pixelX, pixelY, markerX: nearestDot.cx, markerY: nearestDot.cy, isNews: true,
        title: `${nearestDot.direction} · ${Math.round(nearestDot.confidence * 100)}% avg confidence`,
        subtitle: `${nearestDot.headline}${more}`,
      });
      return;
    }

    let nearestIndex = 0;
    let nearestDiff = Infinity;
    points.forEach((_, i) => {
      const diff = Math.abs(x(i) - viewBoxX);
      if (diff < nearestDiff) { nearestDiff = diff; nearestIndex = i; }
    });
    const p = points[nearestIndex];
    setHover({
      pixelX, pixelY, markerX: x(nearestIndex), markerY: y(p.close), isNews: false,
      title: `$${p.close.toFixed(2)}`,
      subtitle: chartDateFormat.format(new Date(p.date)),
    });
  };

  const tooltipOnLeft = hover ? hover.pixelX > (svgRef.current?.getBoundingClientRect().width ?? width) * 0.6 : false;

  return (
    <div className="relative">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${width} ${height}`}
        className="w-full cursor-crosshair"
        role="img"
        aria-label={`${inputs.symbol} price with recent news sentiment overlaid`}
        onMouseMove={handleMove}
        onMouseLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id="signal-chart-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#818cf8" stopOpacity={0.22} />
            <stop offset="100%" stopColor="#818cf8" stopOpacity={0} />
          </linearGradient>
        </defs>

        {gridLevels.map((level, i) => (
          <g key={i}>
            <line x1={pad} x2={width - pad} y1={y(level)} y2={y(level)} className="stroke-slate-100 dark:stroke-slate-800" strokeWidth={1} />
            <text x={width - pad} y={y(level) - 3} textAnchor="end" className="fill-slate-300 text-[9px] dark:fill-slate-600">${level.toFixed(0)}</text>
          </g>
        ))}

        <text x={pad} y={12} className="fill-slate-400 text-[10px]">${max.toFixed(0)}</text>
        <text x={pad} y={height - pad + 4} className="fill-slate-400 text-[10px]">${min.toFixed(0)}</text>
        <text x={pad} y={height - 8} className="fill-slate-400 text-[10px]">{chartDateFormat.format(new Date(points[0].date))}</text>
        <text x={width - pad} y={height - 8} textAnchor="end" className="fill-slate-400 text-[10px]">
          {chartDateFormat.format(new Date(points[points.length - 1].date))}
        </text>

        <path d={areaPath} fill="url(#signal-chart-fill)" stroke="none" />
        <path d={linePath} fill="none" className="stroke-indigo-500 dark:stroke-indigo-400" strokeWidth={1.75} strokeLinejoin="round" />

        {hover && !hover.isNews && (
          <circle cx={hover.markerX} cy={hover.markerY} r={3.5} className="fill-indigo-600 dark:fill-indigo-400" />
        )}

        {newsDots.map((d, i) => {
          const active = hover?.isNews && hover.markerX === d.cx;
          return (
            <g key={i}>
              <circle
                cx={d.cx}
                cy={d.cy}
                r={5 + d.confidence * 5}
                className={`stroke-white dark:stroke-slate-900 ${d.direction === "UP" ? "fill-emerald-500" : "fill-rose-500"}`}
                strokeWidth={active ? 2 : 1}
                opacity={active ? 1 : 0.85}
              />
              {d.count > 1 && (
                <text x={d.cx} y={d.cy + 3} textAnchor="middle" className="fill-white text-[9px] font-bold">{d.count}</text>
              )}
            </g>
          );
        })}
      </svg>

      {hover && (
        <div
          className="pointer-events-none absolute z-10 w-max max-w-[220px] rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg dark:border-slate-700 dark:bg-slate-800"
          style={{
            left: tooltipOnLeft ? undefined : hover.pixelX + 12,
            right: tooltipOnLeft ? (svgRef.current?.getBoundingClientRect().width ?? width) - hover.pixelX + 12 : undefined,
            top: Math.max(hover.pixelY - 44, 0),
          }}
        >
          <div className="font-bold text-slate-900 dark:text-white">{hover.title}</div>
          <div className="mt-0.5 leading-snug text-slate-500 dark:text-slate-400">{hover.subtitle}</div>
        </div>
      )}
    </div>
  );
}

export function SignalsPage() {
  usePageTitle("Signals");
  const [tickers, setTickers] = useState<string[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [news, setNews] = useState<NewsSignal[]>([]);
  const [inputs, setInputs] = useState<SignalInputs>();
  const [newsLoading, setNewsLoading] = useState(false);
  const [inputsLoading, setInputsLoading] = useState(false);
  const [newsError, setNewsError] = useState("");
  const [inputsError, setInputsError] = useState("");

  useEffect(() => {
    accounts.watchlists()
      .then((lists: Watchlist[]) => {
        const fromWatchlists = Array.from(new Set(lists.flatMap(w => w.entries.map(e => e.ticker))));
        const list = fromWatchlists.length > 0 ? fromWatchlists : DEFAULT_TICKERS;
        setTickers(list);
        setSelected(list[0]);
      })
      .catch(() => { setTickers(DEFAULT_TICKERS); setSelected(DEFAULT_TICKERS[0]); });
  }, []);

  const loadNews = (symbol: string) => {
    setNewsLoading(true);
    setNewsError("");
    signals.news(symbol).then(r => setNews(r.items)).catch(e => setNewsError(errorText(e))).finally(() => setNewsLoading(false));
  };

  const loadInputs = (symbol: string) => {
    setInputsLoading(true);
    setInputsError("");
    signals.inputs(symbol).then(setInputs).catch(e => setInputsError(errorText(e))).finally(() => setInputsLoading(false));
  };

  useEffect(() => {
    if (!selected) return;
    loadNews(selected);
    loadInputs(selected);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  const upCount = useMemo(() => news.filter(n => n.direction === "UP").length, [news]);
  const downCount = useMemo(() => news.filter(n => n.direction === "DOWN").length, [news]);

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Signals</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Live news sentiment and market inputs feeding the price prediction model — computed on request, not simulated.
          </p>
        </div>

        {tickers.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {tickers.map(ticker => (
              <button
                key={ticker}
                onClick={() => setSelected(ticker)}
                className={`rounded-lg border px-3 py-1.5 text-xs font-bold transition ${
                  selected === ticker
                    ? "border-indigo-600 bg-indigo-600 text-white"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                }`}
              >
                {ticker}
              </button>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Panel className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-200/80 p-5 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 dark:text-white">Live signal feed</h2>
                {news.length > 0 && (
                  <span className="text-xs text-slate-400">
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">{upCount} up</span> · <span className="font-semibold text-rose-600 dark:text-rose-400">{downCount} down</span>
                  </span>
                )}
              </div>
              <SecondaryButton onClick={() => selected && loadNews(selected)} disabled={newsLoading || !selected}>
                <RefreshCw size={13} className={newsLoading ? "animate-spin" : ""} /> Refresh
              </SecondaryButton>
            </div>
            {newsError && <div className="p-5"><ErrorPanel message={newsError} /></div>}
            {newsLoading ? (
              <div className="p-5"><Loading /></div>
            ) : news.length === 0 && !newsError ? (
              <EmptyState icon={Newspaper} title="No recent headlines." subtitle={`No news found for ${selected} right now.`} />
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {news.map((item, i) => <NewsRow key={i} item={item} />)}
              </div>
            )}
          </Panel>

          <Panel className="p-5">
            <h2 className="mb-4 text-base font-bold text-slate-900 dark:text-white">Model inputs — {selected || "…"}</h2>
            {inputsError && <ErrorPanel message={inputsError} />}
            {inputsLoading ? <Loading /> : inputs ? <ModelInputsPanel features={inputs.features} /> : null}
          </Panel>
        </div>

        <Panel className="p-5">
          <h2 className="mb-1 text-base font-bold text-slate-900 dark:text-white">Price with news sentiment — {selected || "…"}</h2>
          <p className="mb-4 text-xs text-slate-500 dark:text-slate-400">Last 30 trading days — hover to inspect. Dot color is sentiment direction, size is model confidence.</p>
          {inputsLoading || newsLoading ? (
            <Loading />
          ) : inputs ? (
            <SentimentChart inputs={inputs} news={news} />
          ) : null}
        </Panel>
      </div>
    </AppShell>
  );
}
