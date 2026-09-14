import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  Activity, ArrowLeft, Bell, ChevronLeft, ChevronRight, Download, Eye, Inbox, ListChecks, Plus, Power,
  Receipt, RefreshCw, Search, Star, Trash2, TrendingUp, Wallet,
} from "lucide-react";
import { accounts, errorText } from "../api/accountsClient";
import type { Dashboard, Order, Position, Watchlist } from "../api/types";
import { usePageTitle } from "../hooks/usePageTitle";
import { useConnection } from "../state/connection";
import { useToast } from "../state/toast";
import { OrderTicket } from "../components/OrderTicket";
import { OrderTrace } from "../components/OrderTrace";
import {
  AllocationBar, AppShell, DangerButton, DashboardSkeleton, DateTime, EmptyState, ErrorPanel, freshnessMeta,
  GhostButton, Loading, Money, MetricCard, OrderStatusBadge, Panel, PnL, PrimaryButton,
  SecondaryButton, SortableTh, StockLogo, TextField, TickerPill,
} from "../components/ui";
import type { SortState } from "../components/ui";

const companyNames: Record<string, string> = {
  AAPL: "Apple Inc.", NVDA: "NVIDIA Corp.", TSLA: "Tesla Inc.", MSFT: "Microsoft Corp.",
  AMZN: "Amazon.com Inc.", GOOGL: "Alphabet Inc.", GOOG: "Alphabet Inc.", META: "Meta Platforms Inc.",
  AMD: "Advanced Micro Devices", NFLX: "Netflix Inc.", DIS: "Walt Disney Co.", BA: "Boeing Co.",
  JPM: "JPMorgan Chase & Co.", V: "Visa Inc.", MA: "Mastercard Inc.", INTC: "Intel Corp.",
  SPY: "SPDR S&P 500 ETF", QQQ: "Invesco QQQ Trust",
};

const watchlistIcons = [ListChecks, Eye, Star, Bell];

type PositionSortKey = "symbol" | "quantity" | "avgPrice" | "currentPrice" | "marketValue" | "pnl";

// The backend returns costBasis directly per position; only derive it as a fallback
// (e.g. for demo/mock data) so percentage math stays anchored to the real field when present.
function positionCostBasis(p: Position): number {
  const real = Number(p.costBasis);
  if (real) return real;
  return (Number(p.averageEntryPrice) || 0) * (Number(p.quantity) || 0);
}

function positionSortValue(p: Position, key: PositionSortKey): string | number {
  switch (key) {
    case "symbol": return p.symbol;
    case "quantity": return Number(p.quantity) || 0;
    case "avgPrice": return Number(p.averageEntryPrice) || 0;
    case "currentPrice": return Number(p.currentPrice) || 0;
    case "marketValue": return Number(p.marketValue) || 0;
    case "pnl": return Number(p.unrealizedPnl) || 0;
  }
}

function downloadPositionsCsv(positions: Position[]) {
  const header = ["Symbol", "Shares", "AvgPrice", "CurrentPrice", "MarketValue", "UnrealizedPnL"];
  const rows = positions.map(p => [p.symbol, p.quantity ?? "", p.averageEntryPrice ?? "", p.currentPrice ?? "", p.marketValue ?? "", p.unrealizedPnl ?? ""]);
  const csv = [header, ...rows].map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `tradify-positions-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function DashboardPage() {
  usePageTitle("Dashboard");
  const [data, setData] = useState<Dashboard>();
  const [error, setError] = useState("");
  const [reconciling, setReconciling] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "profit" | "loss">("all");
  const [sort, setSort] = useState<SortState<PositionSortKey>>({ key: "marketValue", dir: "desc" });
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [ticket, setTicket] = useState<{ symbol: string; limitPrice?: string } | null>(null);
  const { setFreshness } = useConnection();
  const { push } = useToast();

  const load = () => accounts.dashboard().then(d => { setData(d); setFreshness(d.freshness); }).catch(e => setError(errorText(e)));
  useEffect(() => { void load(); }, []);

  const reconcile = async () => {
    setReconciling(true);
    try {
      const d = await accounts.reconcile();
      setData(d);
      setFreshness(d.freshness);
      push("success", "Account reconciled successfully.");
    } catch (e) { push("error", errorText(e)); }
    finally { setReconciling(false); }
  };

  const onSort = (key: PositionSortKey) => setSort(s => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: key === "symbol" ? "asc" : "desc" }));

  useEffect(() => { setPage(1); }, [query, filter, sort]);

  const positions = data?.positions ?? [];
  const totalPnl = positions.reduce((sum, p) => sum + (Number(p.unrealizedPnl) || 0), 0);
  const totalMarketValue = positions.reduce((sum, p) => sum + (Number(p.marketValue) || 0), 0);
  const costBasis = positions.reduce((sum, p) => sum + positionCostBasis(p), 0);
  const totalPnlPercent = costBasis ? (totalPnl / costBasis) * 100 : undefined;
  const winners = positions.filter(p => Number(p.unrealizedPnl) > 0);
  const losers = positions.filter(p => Number(p.unrealizedPnl) < 0);
  const topGainer = positions.reduce<Position | undefined>(
    (a, b) => (a == null || (Number(b.unrealizedPnl) || -Infinity) > (Number(a.unrealizedPnl) || -Infinity) ? b : a),
    undefined,
  );
  const topGainerPercent = topGainer
    ? ((Number(topGainer.unrealizedPnl) || 0) / (positionCostBasis(topGainer) || 1)) * 100
    : undefined;

  const visiblePositions = useMemo(() => {
    const filtered = positions.filter(p => {
      if (query && !p.symbol.toLowerCase().includes(query.trim().toLowerCase())) return false;
      const pnl = Number(p.unrealizedPnl) || 0;
      if (filter === "profit" && pnl <= 0) return false;
      if (filter === "loss" && pnl >= 0) return false;
      return true;
    });
    const dir = sort.dir === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      const va = positionSortValue(a, sort.key);
      const vb = positionSortValue(b, sort.key);
      if (typeof va === "string" || typeof vb === "string") return String(va).localeCompare(String(vb)) * dir;
      return (va - vb) * dir;
    });
  }, [positions, query, filter, sort]);

  const totalPages = Math.max(1, Math.ceil(visiblePositions.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * pageSize;
  const pagedPositions = visiblePositions.slice(pageStart, pageStart + pageSize);

  // Prefer the backend's own longMarketValue when it sends one; fall back to
  // equity - cash only for data sources (like the demo fallback) that don't.
  const longMarketValue = Number(data?.account?.longMarketValue);
  const equity = Number(data?.account?.equity);
  const cash = Number(data?.account?.cash);
  const inPositions = !Number.isNaN(longMarketValue) && longMarketValue
    ? longMarketValue
    : (!Number.isNaN(equity) && !Number.isNaN(cash) ? equity - cash : undefined);

  return (
    <AppShell>
      {!data && !error ? (
        <DashboardSkeleton />
      ) : (
        <div className="space-y-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Trading overview</h1>
              {data ? (
                <div className="mt-1 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <span>Last synchronized <DateTime value={data.asOf} /></span>
                  <span>•</span>
                  <span className={`font-medium ${freshnessMeta[data.freshness].text}`}>{freshnessMeta[data.freshness].label}</span>
                  {data.freshness === "UNAVAILABLE" && (
                    <button onClick={() => void load()} className="font-semibold text-indigo-600 underline-offset-2 hover:underline dark:text-indigo-400">
                      Retry connecting
                    </button>
                  )}
                </div>
              ) : (
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Live synchronized metrics from your automated paper execution bot.</p>
              )}
            </div>
            <div className="flex items-center gap-3">
              <SecondaryButton onClick={() => downloadPositionsCsv(positions)} disabled={positions.length === 0}>
                <Download size={14} /> Export CSV
              </SecondaryButton>
              <PrimaryButton onClick={reconcile} disabled={reconciling}>
                <RefreshCw size={14} className={reconciling ? "animate-spin" : ""} />
                {reconciling ? "Reconciling…" : "Reconcile now"}
              </PrimaryButton>
            </div>
          </div>

          {error && <ErrorPanel message={error} />}

          {data && (
            <>
              <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
                <MetricCard
                  icon={Wallet}
                  label="Available cash"
                  value={<Money value={data.account?.cash} />}
                  hint={<p className="mt-2 text-xs font-medium text-slate-500 dark:text-slate-400">Buying power for new positions</p>}
                />
                <MetricCard
                  icon={TrendingUp}
                  tone="indigo"
                  label="Net equity"
                  value={<Money value={data.account?.equity} />}
                  hint={
                    inPositions != null && (
                      <p className="mt-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                        <Money value={inPositions} className="font-bold text-slate-700 dark:text-slate-300" /> tied up in open positions
                      </p>
                    )
                  }
                />
                <MetricCard
                  icon={Activity}
                  tone="emerald"
                  label="Unrealized P&L"
                  value={positions.length ? <>{totalPnl >= 0 ? "+" : "-"}<Money value={Math.abs(totalPnl)} /></> : <Money value={undefined} />}
                  valueClassName={positions.length ? (totalPnl >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400") : undefined}
                  hint={
                    positions.length > 0 && (
                      <p className="mt-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                        {totalPnlPercent != null && <span className={totalPnl >= 0 ? "font-bold text-emerald-600 dark:text-emerald-400" : "font-bold text-rose-600 dark:text-rose-400"}>{totalPnl >= 0 ? "+" : ""}{totalPnlPercent.toFixed(2)}%</span>} return across {positions.length} position{positions.length === 1 ? "" : "s"}
                      </p>
                    )
                  }
                />
              </div>

              <Panel className="overflow-hidden">
                <div className="flex flex-col gap-4 border-b border-slate-200/80 p-5 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-bold text-slate-900 dark:text-white">Positions</h2>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">{visiblePositions.length}</span>
                    </div>
                    {positions.length > 0 && (
                      <>
                        <span className="hidden h-4 w-px bg-slate-200 dark:bg-slate-700 sm:block" />
                        <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                          <span>Winners: <strong className="font-semibold text-emerald-600 dark:text-emerald-400">{winners.length}</strong></span>
                          <span>Losers: <strong className="font-semibold text-rose-600 dark:text-rose-400">{losers.length}</strong></span>
                          {topGainer && (
                            <span>Top: <span className="font-semibold text-slate-800 dark:text-slate-200">{topGainer.symbol} {Number(topGainer.unrealizedPnl) >= 0 ? "+" : ""}{(topGainerPercent ?? 0).toFixed(2)}%</span></span>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                  {positions.length > 0 && (
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                      <div className="relative">
                        <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          value={query}
                          onChange={e => setQuery(e.target.value)}
                          placeholder="Filter ticker…"
                          className="w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-8 pr-3 text-xs text-slate-800 placeholder-slate-400 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 sm:w-44"
                        />
                      </div>
                      <div className="flex rounded-lg border border-slate-200 bg-slate-100 p-0.5 dark:border-slate-700 dark:bg-slate-800">
                        {(["all", "profit", "loss"] as const).map(key => (
                          <button
                            key={key}
                            onClick={() => setFilter(key)}
                            className={`rounded-md px-2.5 py-1 text-[11px] font-bold capitalize transition ${
                              filter === key
                                ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white"
                                : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                            }`}
                          >
                            {key}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {positions.length === 0 ? (
                  <EmptyState icon={Inbox} title="No open positions." subtitle="Bot is monitoring market signals." />
                ) : visiblePositions.length === 0 ? (
                  <EmptyState icon={Search} title="No matching positions." subtitle="Try a different search or filter." />
                ) : (() => {
                  const rows = pagedPositions.map(position => {
                    const avg = Number(position.averageEntryPrice);
                    const current = Number(position.currentPrice);
                    const pnl = Number(position.unrealizedPnl);
                    const rowCostBasis = positionCostBasis(position);
                    const pnlPercent = rowCostBasis ? (pnl / rowCostBasis) * 100 : undefined;
                    const marketValue = Number(position.marketValue) || 0;
                    const allocation = totalMarketValue ? (marketValue / totalMarketValue) * 100 : 0;
                    const companyName = companyNames[position.symbol];
                    return { position, avg, current, pnl, pnlPercent, marketValue, allocation, companyName };
                  });
                  return (
                    <>
                      {/* Below md: stacked cards — a 9-column table has no room to breathe this narrow */}
                      <ul className="divide-y divide-slate-100 dark:divide-slate-800 lg:hidden">
                        {rows.map(({ position, pnl, pnlPercent, allocation, companyName }, index) => (
                          <li key={position.symbol} className="flex flex-col gap-3 px-5 py-4">
                            <div className="flex items-start gap-3">
                              <span className="w-4 shrink-0 pt-1.5 text-right text-xs font-medium tabular-nums text-slate-400">{pageStart + index + 1}</span>
                              <StockLogo symbol={position.symbol} />
                              <div className="min-w-0 flex-1">
                                <div className="text-sm font-bold leading-tight text-slate-900 dark:text-white">{position.symbol}</div>
                                {companyName && <div className="truncate text-xs leading-tight text-slate-500 dark:text-slate-400">{companyName}</div>}
                              </div>
                              <div className="shrink-0 text-right">
                                <div className="text-sm font-bold tabular-nums text-slate-900 dark:text-white"><Money value={position.marketValue} /></div>
                                <PnL amount={pnl} percent={pnlPercent} />
                              </div>
                            </div>

                            <div className="grid grid-cols-3 gap-2 rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-800/60">
                              <div>
                                <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Shares</div>
                                <div className="mt-0.5 text-xs font-semibold tabular-nums text-slate-700 dark:text-slate-300">{position.quantity ?? "—"}</div>
                              </div>
                              <div>
                                <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Avg cost</div>
                                <div className="mt-0.5 text-xs font-semibold tabular-nums text-slate-700 dark:text-slate-300"><Money value={position.averageEntryPrice} /></div>
                              </div>
                              <div>
                                <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Current</div>
                                <div className="mt-0.5 text-xs font-semibold tabular-nums text-slate-700 dark:text-slate-300">
                                  <Money value={position.currentPrice} />
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <AllocationBar percent={allocation} className="w-auto" />
                              <span className="shrink-0 whitespace-nowrap text-[11px] text-slate-400">of portfolio</span>
                              <button
                                onClick={() => setTicket({ symbol: position.symbol, limitPrice: position.currentPrice })}
                                className="ml-auto shrink-0 rounded-md bg-indigo-50 px-2.5 py-1 text-[11px] font-semibold text-indigo-600 transition hover:bg-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-400 dark:hover:bg-indigo-500/20"
                              >
                                Trade
                              </button>
                            </div>
                          </li>
                        ))}
                      </ul>

                      {/* md and up: full data table, sized to always fit — no horizontal scroll */}
                      <div className="hidden lg:block">
                        <table className="w-full table-fixed text-left text-xs">
                          <colgroup>
                            <col className="w-[4%]" />
                            <col className="w-[12%]" />
                            <col className="w-[8%]" />
                            <col className="w-[10%]" />
                            <col className="w-[10%]" />
                            <col className="w-[16%]" />
                            <col className="w-[15%]" />
                            <col className="w-[15%]" />
                            <col className="w-[10%]" />
                          </colgroup>
                          <thead>
                            <tr className="border-b border-slate-200/80 bg-slate-50/60 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:border-slate-800 dark:bg-slate-800/40">
                              <th className="px-3 py-3 text-center align-bottom">#</th>
                              <SortableTh label="Asset" sortKey="symbol" sort={sort} onSort={onSort} padding="pl-3 pr-2 py-3" />
                              <SortableTh label="Shares" sortKey="quantity" sort={sort} onSort={onSort} align="right" padding="pl-3 pr-4 py-3" />
                              <SortableTh label="Avg price" sortKey="avgPrice" sort={sort} onSort={onSort} align="right" padding="pl-3 pr-4 py-3" />
                              <SortableTh label="Current" sortKey="currentPrice" sort={sort} onSort={onSort} align="right" padding="pl-3 pr-4 py-3" />
                              <SortableTh label="Market value" sortKey="marketValue" sort={sort} onSort={onSort} align="right" padding="pl-3 pr-6 py-3" />
                              <th className="min-w-[140px] px-4 py-3 text-right align-bottom text-[11px] font-bold uppercase tracking-wider text-slate-400 leading-tight">Allocation</th>
                              <SortableTh label="Unrealized P&L" sortKey="pnl" sort={sort} onSort={onSort} align="right" padding="pl-3 pr-4 py-3" />
                              <th className="px-3 py-3 text-center align-bottom text-[11px] font-bold uppercase tracking-wider text-slate-400 leading-tight">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {rows.map(({ position, avg, current, pnl, pnlPercent, allocation }, index) => {
                              const priceColor = current === avg ? "text-slate-900 dark:text-white" : current > avg ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400";
                              return (
                                <tr key={position.symbol} className="h-14 transition hover:bg-slate-50/80 dark:hover:bg-slate-800/50">
                                  <td className="px-3 py-3.5 align-middle text-center tabular-nums text-slate-400">{pageStart + index + 1}</td>
                                  <td className="pl-3 pr-2 py-3.5 align-middle text-left">
                                    <div className="flex items-center gap-2.5">
                                      <StockLogo symbol={position.symbol} size={26} />
                                      <span className="truncate text-sm font-bold text-slate-900 dark:text-white">{position.symbol}</span>
                                    </div>
                                  </td>
                                  <td className="py-3.5 pl-3 pr-4 align-middle text-right font-semibold tabular-nums text-slate-700 dark:text-slate-300">{position.quantity ?? "—"}</td>
                                  <td className="py-3.5 pl-3 pr-4 align-middle text-right whitespace-nowrap"><Money value={position.averageEntryPrice} className="text-slate-500 dark:text-slate-400" /></td>
                                  <td className="py-3.5 pl-3 pr-4 align-middle text-right whitespace-nowrap"><Money value={position.currentPrice} className={`font-bold ${priceColor}`} /></td>
                                  <td className="py-3.5 pl-3 pr-6 align-middle text-right whitespace-nowrap"><Money value={position.marketValue} className="font-bold text-slate-900 dark:text-white" /></td>
                                  <td className="min-w-[140px] px-4 py-3.5 align-middle"><AllocationBar percent={allocation} align="right" /></td>
                                  <td className="py-3.5 pl-3 pr-4 align-middle text-right"><PnL amount={pnl} percent={pnlPercent} stacked /></td>
                                  <td className="px-3 py-3.5 align-middle text-center">
                                    <button
                                      onClick={() => setTicket({ symbol: position.symbol, limitPrice: position.currentPrice })}
                                      className="rounded-md bg-indigo-50 px-2.5 py-1 text-[11px] font-semibold text-indigo-600 transition hover:bg-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-400 dark:hover:bg-indigo-500/20"
                                    >
                                      Trade
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      {totalPages > 1 && (
                        <div className="flex items-center justify-between gap-3 border-t border-slate-200/80 px-5 py-3 dark:border-slate-800">
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            Showing {pageStart + 1}–{Math.min(pageStart + pageSize, visiblePositions.length)} of {visiblePositions.length}
                          </span>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => setPage(p => Math.max(1, p - 1))}
                              disabled={currentPage === 1}
                              className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 text-slate-500 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
                            >
                              <ChevronLeft size={14} />
                            </button>
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                              <button
                                key={p}
                                onClick={() => setPage(p)}
                                className={`flex h-7 w-7 items-center justify-center rounded-md text-xs font-semibold tabular-nums transition ${
                                  p === currentPage
                                    ? "bg-indigo-600 text-white"
                                    : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                                }`}
                              >
                                {p}
                              </button>
                            ))}
                            <button
                              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                              disabled={currentPage === totalPages}
                              className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 text-slate-500 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
                            >
                              <ChevronRight size={14} />
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()}
              </Panel>
            </>
          )}
        </div>
      )}
      {ticket && (
        <OrderTicket
          symbol={ticket.symbol}
          defaultSide="SELL"
          defaultLimitPrice={ticket.limitPrice}
          onClose={() => setTicket(null)}
          onPlaced={() => void load()}
        />
      )}
    </AppShell>
  );
}

const orderStatusFilters = ["all", "FILLED", "PENDING", "REJECTED", "CANCELLED"] as const;

export function OrdersPage() {
  usePageTitle("Orders");
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<(typeof orderStatusFilters)[number]>("all");
  const [newOrder, setNewOrder] = useState(false);
  const [traceOrder, setTraceOrder] = useState<Order | null>(null);

  const load = () => { setLoading(true); return accounts.orders().then(setOrders).catch(e => setError(errorText(e))).finally(() => setLoading(false)); };
  useEffect(() => { void load(); }, []);

  const visibleOrders = useMemo(() => {
    return orders
      .filter(o => !query || (o.symbol ?? "").toLowerCase().includes(query.trim().toLowerCase()))
      .filter(o => status === "all" || (o.status ?? "").toUpperCase() === status)
      .sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime());
  }, [orders, query, status]);

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Order history</h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Orders submitted by the automated bot and manual trades.</p>
          </div>
          <PrimaryButton onClick={() => setNewOrder(true)}>
            <Plus size={14} /> New order
          </PrimaryButton>
        </div>

        {error && <ErrorPanel message={error} />}

        <Panel className="overflow-hidden">
          {orders.length > 0 && (
            <div className="flex flex-col gap-3 border-b border-slate-200/80 p-5 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative">
                <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Filter ticker…"
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-8 pr-3 text-xs text-slate-800 placeholder-slate-400 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 sm:w-44"
                />
              </div>
              <div className="flex flex-wrap rounded-lg border border-slate-200 bg-slate-100 p-0.5 dark:border-slate-700 dark:bg-slate-800">
                {orderStatusFilters.map(key => (
                  <button
                    key={key}
                    onClick={() => setStatus(key)}
                    className={`rounded-md px-2.5 py-1 text-[11px] font-bold capitalize transition ${
                      status === key
                        ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white"
                        : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                    }`}
                  >
                    {key.toLowerCase().replace("_", " ")}
                  </button>
                ))}
              </div>
            </div>
          )}

          {loading ? (
            <Loading />
          ) : orders.length === 0 ? (
            <EmptyState icon={Receipt} title="No orders yet." subtitle="Orders from the bot or from manual trades will appear here." />
          ) : visibleOrders.length === 0 ? (
            <EmptyState icon={Search} title="No matching orders." subtitle="Try a different search or filter." />
          ) : (
            <>
              <ul className="divide-y divide-slate-100 dark:divide-slate-800 lg:hidden">
                {visibleOrders.map(order => (
                  <li key={order.orderId}>
                    <button onClick={() => setTraceOrder(order)} className="flex w-full flex-col gap-2 px-5 py-4 text-left transition hover:bg-slate-50/80 dark:hover:bg-slate-800/50">
                      <div className="flex items-start gap-3">
                        <StockLogo symbol={order.symbol ?? ""} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-slate-900 dark:text-white">{order.symbol}</span>
                            <span className={`text-xs font-bold ${order.side === "BUY" ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>{order.side}</span>
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">{order.filledQuantity ?? "0"} / {order.quantity ?? "—"} filled @ <Money value={order.limitPrice} /></div>
                        </div>
                        <OrderStatusBadge status={order.status} />
                      </div>
                      {order.reason && <p className="text-xs text-slate-500 dark:text-slate-400">{order.reason}</p>}
                      <span className="text-[11px] text-slate-400"><DateTime value={order.createdAt} /></span>
                    </button>
                  </li>
                ))}
              </ul>

              <div className="hidden lg:block">
                <table className="w-full table-fixed text-left text-xs">
                  <colgroup>
                    <col className="w-[16%]" />
                    <col className="w-[8%]" />
                    <col className="w-[10%]" />
                    <col className="w-[12%]" />
                    <col className="w-[12%]" />
                    <col className="w-[12%]" />
                    <col className="w-[18%]" />
                    <col className="w-[12%]" />
                  </colgroup>
                  <thead>
                    <tr className="border-b border-slate-200/80 bg-slate-50/60 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:border-slate-800 dark:bg-slate-800/40">
                      <th className="px-4 py-3 text-left align-bottom">Asset</th>
                      <th className="px-3 py-3 text-left align-bottom">Side</th>
                      <th className="px-3 py-3 text-right align-bottom">Qty / Filled</th>
                      <th className="px-3 py-3 text-right align-bottom">Limit price</th>
                      <th className="px-3 py-3 text-center align-bottom">Status</th>
                      <th className="px-3 py-3 text-left align-bottom">Reason</th>
                      <th className="px-3 py-3 text-left align-bottom">Submitted</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {visibleOrders.map(order => (
                      <tr key={order.orderId} onClick={() => setTraceOrder(order)} className="h-14 cursor-pointer transition hover:bg-slate-50/80 dark:hover:bg-slate-800/50">
                        <td className="px-4 py-3.5 align-middle">
                          <div className="flex items-center gap-2.5">
                            <StockLogo symbol={order.symbol ?? ""} size={26} />
                            <span className="truncate text-sm font-bold text-slate-900 dark:text-white">{order.symbol}</span>
                          </div>
                        </td>
                        <td className={`px-3 py-3.5 align-middle text-left font-bold ${order.side === "BUY" ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>{order.side}</td>
                        <td className="px-3 py-3.5 align-middle text-right tabular-nums text-slate-700 dark:text-slate-300">{order.filledQuantity ?? "0"} / {order.quantity ?? "—"}</td>
                        <td className="px-3 py-3.5 align-middle text-right"><Money value={order.limitPrice} className="text-slate-700 dark:text-slate-300" /></td>
                        <td className="px-3 py-3.5 align-middle text-center"><OrderStatusBadge status={order.status} /></td>
                        <td className="truncate px-3 py-3.5 align-middle text-slate-500 dark:text-slate-400">{order.reason ?? "—"}</td>
                        <td className="px-3 py-3.5 align-middle text-slate-500 dark:text-slate-400"><DateTime value={order.createdAt} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </Panel>
      </div>
      {newOrder && <OrderTicket onClose={() => setNewOrder(false)} onPlaced={() => void load()} />}
      {traceOrder && <OrderTrace order={traceOrder} onClose={() => setTraceOrder(null)} />}
    </AppShell>
  );
}

export function WatchlistsPage() {
  usePageTitle("Watchlists");
  const nav = useNavigate();
  const [items, setItems] = useState<Watchlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [symbols, setSymbols] = useState("");
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const { push } = useToast();

  const load = () => { setLoading(true); return accounts.watchlists().then(setItems).catch(e => setError(errorText(e))).finally(() => setLoading(false)); };
  useEffect(() => { void load(); }, []);

  const create = async () => {
    setCreating(true);
    try {
      const result: any = await accounts.createWatchlist(name, symbols.split(",").map(x => x.trim()).filter(Boolean));
      nav(`/watchlists/${result.watchlist.watchlistId}`);
    } catch (e) { push("error", errorText(e)); setCreating(false); }
  };

  const removeWatchlist = (id: string, watchlistName: string) =>
    accounts.deleteWatchlist(id)
      .then(() => { load(); push("success", `Deleted "${watchlistName}".`); })
      .catch(e => push("error", errorText(e)));

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Signal watchlists</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Manage asset groups tracked by your automated signal engine.</p>
        </div>

        {error && <ErrorPanel message={error} />}

        <Panel className="p-6">
          <h2 className="mb-4 text-sm font-bold text-slate-900 dark:text-white">Create new watchlist</h2>
          <div className="grid grid-cols-1 items-end gap-4 md:grid-cols-12">
            <div className="md:col-span-4">
              <TextField label="Watchlist name" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. High Volatility Tech" />
            </div>
            <div className="md:col-span-6">
              <TextField label="Tickers (comma-separated)" value={symbols} onChange={e => setSymbols(e.target.value)} placeholder="AAPL, NVDA, TSLA, AMD" />
            </div>
            <div className="md:col-span-2">
              <PrimaryButton className="w-full py-2.5" onClick={create} disabled={creating || !name.trim()}>
                {creating ? <RefreshCw size={14} className="animate-spin" /> : <Plus size={14} />}
                {creating ? "Creating…" : "Add list"}
              </PrimaryButton>
            </div>
          </div>
        </Panel>

        {loading ? (
          <Loading />
        ) : items.length === 0 ? (
          <Panel><EmptyState icon={ListChecks} title="No watchlists yet." subtitle="Create one above to start tracking tickers." /></Panel>
        ) : (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {items.map((item, index) => {
              const Icon = watchlistIcons[index % watchlistIcons.length];
              const hasActive = item.entries.some(e => e.active);
              return (
                <div key={item.watchlist.watchlistId} className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
                    <Link to={`/watchlists/${item.watchlist.watchlistId}`} className="flex items-center space-x-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400">
                        <Icon size={16} />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 hover:text-indigo-600 dark:text-white dark:hover:text-indigo-400">{item.watchlist.name}</h3>
                        <span className="text-xs text-slate-500 dark:text-slate-400">{item.entries.length} symbol{item.entries.length === 1 ? "" : "s"} monitored</span>
                      </div>
                    </Link>
                    <span
                      className={`rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase ${
                        hasActive
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400"
                          : "border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400"
                      }`}
                    >
                      {hasActive ? "Active scan" : "Standby"}
                    </span>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {item.entries.length === 0
                      ? <span className="text-xs text-slate-500">No symbols yet.</span>
                      : item.entries.map(entry => <TickerPill key={entry.ticker} ticker={entry.ticker} active={entry.active} />)}
                  </div>

                  <div className="mt-5 flex items-center justify-end gap-4 border-t border-slate-100 pt-3 text-xs font-semibold dark:border-slate-800">
                    <Link to={`/watchlists/${item.watchlist.watchlistId}`} className="text-slate-600 transition hover:text-indigo-600 dark:text-slate-300 dark:hover:text-white">Manage</Link>
                    <button
                      className="text-rose-600 transition hover:text-rose-700 dark:text-rose-400"
                      onClick={() => removeWatchlist(item.watchlist.watchlistId, item.watchlist.name)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}

export function WatchlistDetailPage() {
  const { watchlistId = "" } = useParams();
  const nav = useNavigate();
  const [data, setData] = useState<Watchlist>();
  const [ticker, setTicker] = useState("");
  const [error, setError] = useState("");
  const [adding, setAdding] = useState(false);
  const { push } = useToast();
  usePageTitle(data?.watchlist.name ?? "Watchlist");

  const load = () => accounts.watchlist(watchlistId).then(setData).catch(e => setError(errorText(e)));
  useEffect(() => { void load(); }, [watchlistId]);

  if (!data) return <AppShell>{error ? <ErrorPanel message={error} /> : <Loading />}</AppShell>;

  const addTicker = async () => {
    if (!ticker.trim()) return;
    const symbol = ticker.trim().toUpperCase();
    setAdding(true);
    try { await accounts.addTicker(watchlistId, symbol); setTicker(""); await load(); push("success", `Added ${symbol}.`); }
    catch (e) { push("error", errorText(e)); }
    finally { setAdding(false); }
  };

  const toggleTicker = (entrySymbol: string, nextActive: boolean) =>
    accounts.toggleTicker(watchlistId, entrySymbol, nextActive)
      .then(() => { load(); push("success", `${entrySymbol} ${nextActive ? "activated" : "deactivated"}.`); })
      .catch(e => push("error", errorText(e)));

  const removeTicker = (entrySymbol: string) =>
    accounts.removeTicker(watchlistId, entrySymbol)
      .then(() => { load(); push("success", `Removed ${entrySymbol}.`); })
      .catch(e => push("error", errorText(e)));

  const deleteWatchlist = () =>
    accounts.deleteWatchlist(watchlistId)
      .then(() => { push("success", `Deleted "${data.watchlist.name}".`); nav("/watchlists"); })
      .catch(e => push("error", errorText(e)));

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link to="/watchlists" className="inline-flex items-center gap-1.5 text-sm text-slate-500 transition hover:text-slate-900 dark:text-slate-400 dark:hover:text-white">
              <ArrowLeft size={14} /> Watchlists
            </Link>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{data.watchlist.name}</h1>
          </div>
          <DangerButton className="self-start sm:self-auto" onClick={deleteWatchlist}>
            <Trash2 size={14} /> Delete watchlist
          </DangerButton>
        </div>

        {error && <ErrorPanel message={error} />}

        <Panel className="p-6">
          <div className="grid grid-cols-1 items-end gap-4 sm:grid-cols-[1fr_auto]">
            <TextField label="Add symbol" placeholder="AAPL" value={ticker} onChange={e => setTicker(e.target.value)} />
            <PrimaryButton onClick={addTicker} disabled={adding || !ticker.trim()}>
              {adding ? <RefreshCw size={14} className="animate-spin" /> : <Plus size={14} />}
              {adding ? "Adding…" : "Add symbol"}
            </PrimaryButton>
          </div>
        </Panel>

        <Panel className="overflow-hidden">
          {data.entries.length === 0 ? (
            <EmptyState icon={Inbox} title="No symbols yet." subtitle="Add a ticker above to start tracking it." />
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {data.entries.map(entry => (
                <li key={entry.ticker} className="flex flex-col gap-3 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <StockLogo symbol={entry.ticker} />
                    <span className="font-bold text-slate-900 dark:text-white">{entry.ticker}</span>
                    <TickerPill ticker={entry.active ? "ACTIVE" : "INACTIVE"} active={entry.active} />
                  </div>
                  <div className="flex items-center gap-2">
                    <GhostButton onClick={() => toggleTicker(entry.ticker, !entry.active)}>
                      <Power size={14} /> {entry.active ? "Deactivate" : "Activate"}
                    </GhostButton>
                    <DangerButton onClick={() => removeTicker(entry.ticker)}>
                      <Trash2 size={14} /> Remove
                    </DangerButton>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </AppShell>
  );
}

export function NotFoundPage() {
  usePageTitle("Page not found");
  return (
    <AppShell>
      <Panel className="flex flex-col items-center gap-3 px-5 py-16 text-center">
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">Page not found</h1>
        <Link to="/dashboard" className="text-sm font-semibold text-indigo-600 transition hover:text-indigo-500 dark:text-indigo-400">Return to dashboard</Link>
      </Panel>
    </AppShell>
  );
}
