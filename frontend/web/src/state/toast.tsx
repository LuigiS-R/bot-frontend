import { createContext, useCallback, useContext, useRef, useState } from "react";
import { CheckCircle2, X, XCircle } from "lucide-react";

type ToastKind = "success" | "error";
interface ToastItem { id: number; kind: ToastKind; message: string; }

const ToastContext = createContext<{ push: (kind: ToastKind, message: string) => void }>({ push: () => {} });

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const counter = useRef(0);

  const remove = useCallback((id: number) => setToasts(t => t.filter(x => x.id !== id)), []);
  const push = useCallback((kind: ToastKind, message: string) => {
    const id = ++counter.current;
    setToasts(t => [...t, { id, kind, message }]);
    setTimeout(() => remove(id), 4000);
  }, [remove]);

  return (
    <ToastContext.Provider value={{ push }}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-full max-w-sm flex-col gap-2 sm:bottom-6 sm:right-6">
        {toasts.map(t => (
          <div
            key={t.id}
            className={`animate-toast-in pointer-events-auto flex items-start gap-2 rounded-xl border px-4 py-3 text-sm font-medium shadow-lg backdrop-blur-md ${
              t.kind === "success"
                ? "border-emerald-200 bg-emerald-50/95 text-emerald-800 dark:border-emerald-500/20 dark:bg-emerald-950/90 dark:text-emerald-300"
                : "border-rose-200 bg-rose-50/95 text-rose-800 dark:border-rose-500/20 dark:bg-rose-950/90 dark:text-rose-300"
            }`}
          >
            {t.kind === "success" ? <CheckCircle2 size={16} className="mt-0.5 shrink-0" /> : <XCircle size={16} className="mt-0.5 shrink-0" />}
            <span className="flex-1">{t.message}</span>
            <button onClick={() => remove(t.id)} className="mt-0.5 shrink-0 opacity-60 transition hover:opacity-100">
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
