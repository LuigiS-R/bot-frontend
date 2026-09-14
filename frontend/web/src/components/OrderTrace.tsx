import type { LucideIcon } from "lucide-react";
import { HelpCircle, Newspaper, Receipt, ShieldCheck, User, X } from "lucide-react";
import type { Order } from "../api/types";
import { DateTime, Money, OrderStatusBadge, StockLogo } from "./ui";

interface OrderTraceProps {
  order: Order;
  onClose: () => void;
}

const CONFIDENCE_THRESHOLD = 0.65;

type Reason =
  | { kind: "signal"; direction: "UP" | "DOWN"; confidence: number }
  | { kind: "manual" }
  | { kind: "other"; text: string }
  | { kind: "none" };

// Reconstructed from the Strategy Engine's free-text `reason` field, which is the only
// per-order decision context the backend currently persists — the headline text and the
// exact market feature snapshot used at decision time aren't logged anywhere yet. A reason
// that isn't a manual order and doesn't match the confidence pattern (e.g. a rejection like
// "Insufficient buying power") still went through the automated pipeline — it's shown as-is
// rather than misclassified as manual.
function classifyReason(reason?: string): Reason {
  if (!reason) return { kind: "none" };
  const match = reason.match(/(UP|DOWN) prediction, confidence ([0-9.]+)/i);
  if (match) return { kind: "signal", direction: match[1].toUpperCase() as "UP" | "DOWN", confidence: Number(match[2]) };
  if (/manual/i.test(reason)) return { kind: "manual" };
  return { kind: "other", text: reason };
}

const toneStyles: Record<string, string> = {
  indigo: "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400",
  emerald: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400",
  amber: "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400",
  slate: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
};

interface Step { icon: LucideIcon; tone: keyof typeof toneStyles; title: string; detail: React.ReactNode; note?: string; }

export function OrderTrace({ order, onClose }: OrderTraceProps) {
  const reason = classifyReason(order.reason);
  const side = order.side === "SELL" ? "SELL" : "BUY";
  const passed = reason.kind === "signal" ? reason.confidence >= CONFIDENCE_THRESHOLD : undefined;

  const steps: Step[] = (() => {
    if (reason.kind === "signal") {
      return [
        {
          icon: Newspaper,
          tone: "indigo",
          title: "AI signal",
          detail: `${reason.direction} prediction · confidence ${(reason.confidence * 100).toFixed(0)}%`,
          note: "Combines FinBERT news sentiment and the LSTM market prediction. The headline text and market feature snapshot behind this signal aren't persisted per-order yet.",
        },
        {
          icon: ShieldCheck,
          tone: passed ? "emerald" : "amber",
          title: "Strategy engine",
          detail: `${reason.confidence.toFixed(2)} ${passed ? "≥" : "<"} threshold ${CONFIDENCE_THRESHOLD} → ${passed ? "order approved" : "HOLD"}`,
          note: side === "BUY" ? "BUY sizing allocates roughly 5% of available cash." : "SELL orders require an existing position in the ticker.",
        },
      ];
    }
    if (reason.kind === "manual") {
      return [{
        icon: User,
        tone: "slate",
        title: "Manual order",
        detail: "Submitted directly by a user, bypassing the automated Strategy Engine.",
      }];
    }
    if (reason.kind === "other") {
      return [{
        icon: HelpCircle,
        tone: "amber",
        title: "Strategy engine",
        detail: reason.text,
        note: "Went through the automated pipeline, but this reason doesn't match the confidence-signal format this trace parses.",
      }];
    }
    return [{
      icon: HelpCircle,
      tone: "slate",
      title: "Strategy engine",
      detail: "No decision reason recorded for this order.",
    }];
  })();

  steps.push({
    icon: Receipt,
    tone: "indigo",
    title: "Order execution",
    detail: (
      <span>
        {side} {order.quantity ?? "—"} {order.symbol} @ <Money value={order.limitPrice} /> LIMIT · DAY
      </span>
    ),
    note: `${order.filledQuantity ?? "0"} of ${order.quantity ?? "—"} filled.`,
  });

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/50 px-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <StockLogo symbol={order.symbol ?? ""} />
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Decision trace</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {order.symbol} · <DateTime value={order.createdAt} />
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <OrderStatusBadge status={order.status} />
            <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200">
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="mt-6 space-y-1">
          {steps.map((step, index) => (
            <div key={step.title} className="relative flex gap-3 pb-5 last:pb-0">
              {index < steps.length - 1 && (
                <span className="absolute left-4 top-9 bottom-0 w-px bg-slate-200 dark:bg-slate-700" aria-hidden="true" />
              )}
              <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${toneStyles[step.tone]}`}>
                <step.icon size={15} />
              </div>
              <div className="pt-1">
                <div className="text-sm font-bold text-slate-900 dark:text-white">{step.title}</div>
                <div className="mt-0.5 text-sm text-slate-700 dark:text-slate-300">{step.detail}</div>
                {step.note && <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">{step.note}</p>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
