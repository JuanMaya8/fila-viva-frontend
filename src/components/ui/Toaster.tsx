'use client';

import { AlertTriangle, BellRing, CheckCircle2, Info, X, XCircle } from 'lucide-react';
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

export type ToastTone = 'success' | 'warn' | 'error' | 'info';

interface ToastItem {
  id: number;
  title: string;
  body?: string;
  tone: ToastTone;
}

type ShowToast = (toast: Omit<ToastItem, 'id'>) => void;

const ToastContext = createContext<ShowToast>(() => undefined);
const DURATION_MS = 5000;
const MAX_VISIBLE = 3;

const ICONS = {
  success: CheckCircle2,
  warn: AlertTriangle,
  error: XCircle,
  info: Info,
};

/** App-wide toasts; timers are cleared on dismiss and on unmount. */
export function Toaster({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((t) => t.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const show = useCallback<ShowToast>(
    (toast) => {
      const id = nextId.current++;
      setToasts((current) => [...current.slice(-(MAX_VISIBLE - 1)), { ...toast, id }]);
      timers.current.set(
        id,
        setTimeout(() => dismiss(id), DURATION_MS),
      );
    },
    [dismiss],
  );

  useEffect(() => {
    const active = timers.current;
    return () => {
      active.forEach((timer) => clearTimeout(timer));
      active.clear();
    };
  }, []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div className="toaster" role="status" aria-live="polite">
        {toasts.map((toast) => {
          const Icon = ICONS[toast.tone] ?? BellRing;
          return (
            <div key={toast.id} className={`toast ${toast.tone}`}>
              <Icon size={20} aria-hidden />
              <div style={{ flex: 1 }}>
                <strong>{toast.title}</strong>
                {toast.body && <span className="small ink-2">{toast.body}</span>}
              </div>
              <button
                className="ghost icon-only"
                aria-label="Cerrar aviso"
                onClick={() => dismiss(toast.id)}
                style={{ minHeight: 28, minWidth: 28, padding: 4 }}
              >
                <X size={16} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ShowToast {
  return useContext(ToastContext);
}
