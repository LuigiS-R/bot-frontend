import { useState } from "react";
import { NavLink } from "react-router-dom";
import { ArrowDownRight, ArrowUpRight, ChevronUp, Loader2, Menu, Moon, Sun, TrendingUp, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Freshness } from "../api/types";
import { useConnection } from "../state/connection";
import { useTheme } from "../state/theme";

const currencyFormatter = new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" });

export const Money = ({ value, className = "" }: { value?: string | number; className?: string }) => {
  if (value == null || value === "" || Number.isNaN(Number(value))) return <span className={`text-slate-400 dark:text-slate-600 ${className}`}>—</span>;
  return <span className={`tabular-nums ${className}`}>{currencyFormatter.format(Number(value))}</span>;
};

export const DateTime = ({ value }: { value?: string }) => <>{value ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "—"}</>;

export const freshnessMeta: Record<Freshness, { badge: string; dot: string; text: string; label: string }> = {
  FRESH: {
    badge: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20",
    dot: "bg-emerald-500",
    text: "text-emerald-600 dark:text-emerald-400",
    label: "Alpaca connected",
  },
  STALE: {
    badge: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20",
    dot: "bg-amber-500",
    text: "text-amber-600 dark:text-amber-400",
    label: "Data stale",
  },
  UNAVAILABLE: {
    badge: "bg-amber-50 text-amber-800 border-amber-200/70 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20",
    dot: "bg-amber-500",
    text: "text-amber-600 dark:text-amber-400",
    label: "Demo data",
  },
};

export function PnL({ amount, percent, stacked = false }: { amount?: number; percent?: number; stacked?: boolean }) {
  if (amount == null || Number.isNaN(amount)) return <span className="tabular-nums text-slate-400 dark:text-slate-600">—</span>;
  const positive = amount >= 0;
  const color = positive ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400";
  const sign = positive ? "+" : "-";
  if (stacked) {
    return (
      <div className="text-right">
        <div className={`text-sm font-bold tabular-nums ${color}`}>{sign}{currencyFormatter.format(Math.abs(amount))}</div>
        {percent != null && !Number.isNaN(percent) && <div className={`text-[11px] font-semibold tabular-nums ${color} opacity-90`}>{sign}{Math.abs(percent).toFixed(2)}%</div>}
      </div>
    );
  }
  const Icon = positive ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={`inline-flex items-center gap-1 font-semibold tabular-nums ${color}`}>
      <Icon size={13} strokeWidth={2.5} />
      {sign}
      {currencyFormatter.format(Math.abs(amount))}
      {percent != null && !Number.isNaN(percent) && <span className="text-xs opacity-80">({sign}{Math.abs(percent).toFixed(2)}%)</span>}
    </span>
  );
}

export function Logo() {
  return (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-sm shadow-indigo-600/30">
      <TrendingUp className="h-4 w-4" strokeWidth={2.5} />
    </div>
  );
}

function TabLink({ to, children, onClick, mobile = false }: { to: string; children: React.ReactNode; onClick?: () => void; mobile?: boolean }) {
  if (mobile) {
    return (
      <NavLink
        to={to}
        onClick={onClick}
        className={({ isActive }) =>
          `block touch-manipulation rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors ${
            isActive
              ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400"
              : "text-slate-600 active:bg-slate-100 dark:text-slate-300 dark:active:bg-slate-800"
          }`
        }
      >
        {children}
      </NavLink>
    );
  }
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `rounded-md px-3.5 py-1 text-xs font-semibold transition-all ${
          isActive
            ? "bg-white text-slate-900 shadow-sm dark:bg-indigo-600 dark:text-white"
            : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
        }`
      }
    >
      {children}
    </NavLink>
  );
}

function ConnectionBadge({ className = "" }: { className?: string }) {
  const { state } = useConnection();
  const meta = state.freshness ? freshnessMeta[state.freshness] : null;
  if (!meta) {
    return (
      <div className={`flex items-center rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 ${className}`}>
        <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-slate-400" />
        Single paper account
      </div>
    );
  }
  return (
    <div className={`flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium ${meta.badge} ${className}`}>
      <span className={`mr-1.5 h-1.5 w-1.5 rounded-full ${meta.dot} ${state.freshness === "FRESH" ? "animate-pulse" : ""}`} />
      {meta.label}
    </div>
  );
}

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  return (
    <button
      onClick={toggleTheme}
      title="Toggle light / dark theme"
      className="flex h-8 w-8 touch-manipulation items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 active:bg-slate-100 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white dark:active:bg-slate-800"
    >
      {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 antialiased transition-colors duration-200 dark:bg-slate-950 dark:text-slate-100">
      <div className="pointer-events-none fixed left-1/2 top-0 -z-10 h-64 w-full max-w-7xl -translate-x-1/2 bg-gradient-to-b from-indigo-500/10 via-blue-500/5 to-transparent blur-3xl" />
      <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/90 backdrop-blur-md transition-colors dark:border-slate-800 dark:bg-slate-900/90">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center space-x-4 md:space-x-8">
            <NavLink to="/dashboard" className="flex items-center space-x-2.5">
              <Logo />
              <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">Tradify</span>
              <span className="hidden rounded-md border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 sm:inline-flex">
                Paper
              </span>
            </NavLink>
            <nav className="hidden items-center rounded-lg border border-slate-200 bg-slate-100 p-1 dark:border-slate-700 dark:bg-slate-800 md:flex">
              <TabLink to="/dashboard">Dashboard</TabLink>
              <TabLink to="/watchlists">Watchlists</TabLink>
            </nav>
          </div>
          <div className="flex items-center space-x-2 sm:space-x-3">
            <ConnectionBadge className="hidden md:flex" />
            <ThemeToggle />
            <button
              onClick={() => setMenuOpen(o => !o)}
              className="flex h-8 w-8 touch-manipulation items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 active:bg-slate-100 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white dark:active:bg-slate-800 md:hidden"
            >
              {menuOpen ? <X size={16} /> : <Menu size={16} />}
            </button>
          </div>
        </div>
        {menuOpen && (
          <div className="space-y-2 border-t border-slate-200/80 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900 md:hidden">
            <TabLink to="/dashboard" mobile onClick={() => setMenuOpen(false)}>Dashboard</TabLink>
            <TabLink to="/watchlists" mobile onClick={() => setMenuOpen(false)}>Watchlists</TabLink>
            <ConnectionBadge className="mt-1" />
          </div>
        )}
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}

export const Loading = () => (
  <div className="flex items-center gap-3 rounded-xl border border-slate-200/90 bg-white px-5 py-4 text-sm text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
    <Spinner />
    Loading account data…
  </div>
);

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-slate-200 dark:bg-slate-800 ${className}`} />;
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-7 w-56" />
          <Skeleton className="h-4 w-80" />
        </div>
        <div className="flex gap-3">
          <Skeleton className="h-8 w-28 rounded-lg" />
          <Skeleton className="h-8 w-36 rounded-lg" />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        {[0, 1, 2].map(i => (
          <div key={i} className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-7 w-7 rounded-md" />
            </div>
            <Skeleton className="mt-3 h-7 w-32" />
            <Skeleton className="mt-3 h-3 w-40" />
          </div>
        ))}
      </div>
      <div className="overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="border-b border-slate-200/80 p-5 dark:border-slate-800">
          <Skeleton className="h-5 w-32" />
        </div>
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {[0, 1, 2].map(i => (
            <div key={i} className="flex items-center gap-4 px-6 py-3.5">
              <Skeleton className="h-7 w-7 shrink-0 rounded-lg" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-24" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export const ErrorPanel = ({ message }: { message: string }) => (
  <div className="rounded-xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300">{message}</div>
);

export function Spinner({ className = "" }: { className?: string }) {
  return <Loader2 className={`h-4 w-4 animate-spin ${className}`} />;
}

const iconTones: Record<string, string> = {
  slate: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  indigo: "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400",
  emerald: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400",
};

export function MetricCard({ icon: Icon, tone = "slate", label, value, valueClassName, hint }: { icon: LucideIcon; tone?: "slate" | "indigo" | "emerald"; label: string; value: React.ReactNode; valueClassName?: string; hint?: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-sm transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between text-slate-500">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</span>
        <div className={`flex h-7 w-7 items-center justify-center rounded-md ${iconTones[tone]}`}>
          <Icon size={14} />
        </div>
      </div>
      <div className="mt-3">
        <div className={`text-2xl font-bold tracking-tight tabular-nums ${valueClassName ?? "text-slate-900 dark:text-white"}`}>{value}</div>
        {hint}
      </div>
    </div>
  );
}

export function PrimaryButton({ className = "", ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm shadow-indigo-600/20 transition hover:bg-indigo-500 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100 ${className}`}
    />
  );
}

export function SecondaryButton({ className = "", ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 ${className}`}
    />
  );
}

export function GhostButton({ className = "", ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white ${className}`}
    />
  );
}

export function DangerButton({ className = "", ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60 dark:text-rose-400 dark:hover:bg-rose-500/10 ${className}`}
    />
  );
}

export function TextField({ label, className = "", ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{label}</span>
      <input
        {...props}
        className={`w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white ${className}`}
      />
    </label>
  );
}

export function TickerPill({ ticker, active }: { ticker: string; active: boolean }) {
  return (
    <span className="inline-flex items-center rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-bold text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
      <span className={`mr-1.5 h-1.5 w-1.5 rounded-full ${active ? "bg-emerald-500" : "bg-slate-400 dark:bg-slate-600"}`} />
      {ticker}
    </span>
  );
}

const avatarPalette = [
  "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-indigo-500/20",
  "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20",
  "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20",
  "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-500/10 dark:text-purple-400 dark:border-purple-500/20",
  "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20",
  "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-500/10 dark:text-sky-400 dark:border-sky-500/20",
];

export function TickerAvatar({ symbol, size = 28 }: { symbol: string; size?: number }) {
  let hash = 0;
  for (let i = 0; i < symbol.length; i++) hash = (hash * 31 + symbol.charCodeAt(i)) >>> 0;
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-lg border text-xs font-bold ${avatarPalette[hash % avatarPalette.length]}`}
      style={{ width: size, height: size }}
    >
      {symbol.slice(0, 2)}
    </span>
  );
}

// Company logo for a ticker, sourced from a public logo CDN keyed by symbol.
// Falls back to the colored-initials avatar if the symbol has no logo or the request fails.
export function StockLogo({ symbol, size = 28 }: { symbol: string; size?: number }) {
  const [failed, setFailed] = useState(false);
  if (failed || !symbol) return <TickerAvatar symbol={symbol} size={size} />;
  return (
    <span
      className="flex shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-white p-1 dark:border-slate-700"
      style={{ width: size, height: size }}
    >
      <img
        src={`https://assets.parqet.com/logos/symbol/${encodeURIComponent(symbol)}?format=png`}
        alt=""
        className="h-full w-full object-contain"
        loading="lazy"
        onError={() => setFailed(true)}
      />
    </span>
  );
}

// Honest two-point trend line from average entry price to current price — no fabricated history.
export function MiniTrend({ from, to }: { from?: number; to?: number }) {
  if (from == null || to == null || !isFinite(from) || !isFinite(to) || from <= 0) return null;
  const positive = to >= from;
  const w = 48, h = 16, pad = 3;
  const min = Math.min(from, to), max = Math.max(from, to);
  const range = max - min || max * 0.02 || 1;
  const yFor = (v: number) => h - pad - ((v - min) / range) * (h - pad * 2);
  const y0 = yFor(from), y1 = yFor(to);
  const color = positive ? "#10b981" : "#f43f5e";
  const gradientId = `trend-${positive ? "up" : "down"}-${Math.round(y0)}-${Math.round(y1)}`;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="overflow-visible" aria-hidden>
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`M0,${y0} L${w},${y1} L${w},${h} L0,${h} Z`} fill={`url(#${gradientId})`} />
      <line x1={0} y1={y0} x2={w} y2={y1} stroke={color} strokeWidth={1.75} strokeLinecap="round" />
      <circle cx={w} cy={y1} r={2} fill={color} />
    </svg>
  );
}

export function AllocationBar({ percent }: { percent: number }) {
  return (
    <div className="flex items-center space-x-2">
      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        <div className="h-full rounded-full bg-indigo-600" style={{ width: `${Math.min(100, Math.max(0, percent))}%` }} />
      </div>
      <span className="w-9 text-[11px] font-medium tabular-nums text-slate-500 dark:text-slate-400">{percent.toFixed(1)}%</span>
    </div>
  );
}

export interface SortState<K extends string> { key: K; dir: "asc" | "desc"; }

export function SortableTh<K extends string>({ label, sortKey, sort, onSort, align = "left" }: {
  label: string; sortKey: K; sort: SortState<K>; onSort: (key: K) => void; align?: "left" | "right" | "center";
}) {
  const active = sort.key === sortKey;
  const alignClass = align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left";
  const justifyClass = align === "right" ? "justify-end" : align === "center" ? "justify-center" : "justify-start";
  return (
    <th className={`px-4 py-3 ${alignClass}`}>
      <button
        onClick={() => onSort(sortKey)}
        className={`inline-flex w-full items-center gap-1 transition-colors hover:text-slate-700 dark:hover:text-slate-200 ${justifyClass} ${active ? "text-slate-700 dark:text-slate-200" : ""}`}
      >
        {label}
        <ChevronUp size={12} className={`transition-transform ${active ? "opacity-100" : "opacity-0"} ${active && sort.dir === "desc" ? "rotate-180" : ""}`} />
      </button>
    </th>
  );
}

export function Panel({ className = "", children }: { className?: string; children: React.ReactNode }) {
  return <div className={`rounded-xl border border-slate-200/90 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 ${className}`}>{children}</div>;
}

export function EmptyState({ icon: Icon, title, subtitle }: { icon: LucideIcon; title: string; subtitle: string }) {
  return (
    <div className="flex flex-col items-center gap-3 px-5 py-16 text-center">
      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500">
        <Icon size={20} />
      </div>
      <div>
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">{title}</p>
        <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>
      </div>
    </div>
  );
}
