import { useState } from "react";
import { ArrowDownRight, ArrowUpRight, Loader2, X } from "lucide-react";
import { accounts, ApiError } from "../api/accountsClient";
import { useToast } from "../state/toast";
import { PrimaryButton, SecondaryButton, StockLogo, TextField } from "./ui";

interface OrderTicketProps {
  symbol?: string;
  defaultSide?: "BUY" | "SELL";
  defaultLimitPrice?: string;
  onClose: () => void;
  onPlaced?: () => void;
}

// Mirrors the validation the Order Execution Service performs before broker submission:
// symbol, positive quantity, BUY/SELL side, and a positive LIMIT price. Every manual
// order is submitted as a LIMIT order with time-in-force=DAY, matching the automated pipeline.
export function OrderTicket({ symbol: lockedSymbol, defaultSide = "BUY", defaultLimitPrice, onClose, onPlaced }: OrderTicketProps) {
  const [symbolInput, setSymbolInput] = useState(lockedSymbol ?? "");
  const [side, setSide] = useState<"BUY" | "SELL">(defaultSide);
  const [quantity, setQuantity] = useState("");
  const [limitPrice, setLimitPrice] = useState(defaultLimitPrice ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const { push } = useToast();

  const symbol = (lockedSymbol ?? symbolInput).trim().toUpperCase();
  const quantityValid = Number(quantity) > 0;
  const limitPriceValid = Number(limitPrice) > 0;
  const canSubmit = Boolean(symbol) && quantityValid && limitPriceValid && !submitting;

  const submit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError("");
    try {
      await accounts.placeOrder({ symbol, side, quantity, limitPrice });
      push("success", `${side === "BUY" ? "Buy" : "Sell"} order for ${quantity} ${symbol} submitted.`);
      onPlaced?.();
      onClose();
    } catch (e) {
      if (e instanceof ApiError && (e.status === 404 || e.status >= 500)) {
        setError("Order placement isn't available on the backend yet — the POST /api/v1/orders endpoint hasn't been implemented.");
      } else {
        setError((e as any)?.payload?.message || (e as any)?.message || "Order submission failed.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/50 px-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <StockLogo symbol={symbol} />
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Place order</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">{symbol || "New order"} · LIMIT · Day</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200">
            <X size={16} />
          </button>
        </div>

        {!lockedSymbol && (
          <div className="mt-4">
            <TextField
              label="Symbol"
              placeholder="AAPL"
              value={symbolInput}
              onChange={e => setSymbolInput(e.target.value.toUpperCase())}
            />
          </div>
        )}

        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            onClick={() => setSide("BUY")}
            className={`flex items-center justify-center gap-1.5 rounded-lg border py-2.5 text-sm font-bold transition ${
              side === "BUY"
                ? "border-emerald-500 bg-emerald-50 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-400"
                : "border-slate-200 text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
            }`}
          >
            <ArrowUpRight size={15} /> Buy
          </button>
          <button
            onClick={() => setSide("SELL")}
            className={`flex items-center justify-center gap-1.5 rounded-lg border py-2.5 text-sm font-bold transition ${
              side === "SELL"
                ? "border-rose-500 bg-rose-50 text-rose-700 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-400"
                : "border-slate-200 text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
            }`}
          >
            <ArrowDownRight size={15} /> Sell
          </button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <TextField
            label="Quantity"
            type="number"
            min="0"
            step="1"
            placeholder="10"
            value={quantity}
            onChange={e => setQuantity(e.target.value)}
          />
          <TextField
            label="Limit price"
            type="number"
            min="0"
            step="0.01"
            placeholder="0.00"
            value={limitPrice}
            onChange={e => setLimitPrice(e.target.value)}
          />
        </div>

        <p className="mt-3 text-[11px] leading-relaxed text-slate-400 dark:text-slate-500">
          Submitted as a LIMIT order with time-in-force=DAY. The Order Execution Service validates the order before it reaches Alpaca Paper Trading.
        </p>

        {error && (
          <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300">
            {error}
          </div>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <SecondaryButton onClick={onClose} disabled={submitting}>Cancel</SecondaryButton>
          <PrimaryButton onClick={submit} disabled={!canSubmit}>
            {submitting ? <Loader2 size={14} className="animate-spin" /> : null}
            {submitting ? "Submitting…" : `Submit ${side === "BUY" ? "buy" : "sell"} order`}
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
}
