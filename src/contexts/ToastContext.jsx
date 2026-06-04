import { useCallback, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";

import { ToastContext } from "./toastContextValue";

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const addToast = useCallback(
    (message, type = "info", duration = 4000) => {
      const id = ++idRef.current;
      setToasts((prev) => [...prev, { id, message, type }]);
      if (duration > 0) {
        setTimeout(() => dismiss(id), duration);
      }
      return id;
    },
    [dismiss],
  );

  return (
    <ToastContext.Provider value={{ addToast, dismiss }}>
      {children}
      <Toaster toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

const TONE = {
  success: {
    bar: "bg-emerald-500",
    icon: CheckCircle2,
    iconClass: "text-emerald-500",
    ring: "border-emerald-100",
  },
  error: {
    bar: "bg-rose-500",
    icon: AlertCircle,
    iconClass: "text-rose-500",
    ring: "border-rose-100",
  },
  info: {
    bar: "bg-blue-500",
    icon: Info,
    iconClass: "text-blue-500",
    ring: "border-blue-100",
  },
};

function Toast({ id, message, type, onDismiss }) {
  const { bar, icon: Icon, iconClass, ring } = TONE[type] ?? TONE.info;

  return (
    <div
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
      className={`relative flex w-full max-w-sm items-start gap-3 overflow-hidden rounded-xl border bg-white px-4 py-3 shadow-lg ${ring}`}
    >
      <span className={`absolute left-0 top-0 h-full w-1 ${bar}`} aria-hidden="true" />

      <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${iconClass}`} aria-hidden="true" />

      <p className="flex-1 text-sm leading-5 text-slate-800">{message}</p>

      <button
        aria-label="Dismiss notification"
        className="rounded p-0.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
        onClick={() => onDismiss(id)}
        type="button"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

function Toaster({ toasts, onDismiss }) {
  if (toasts.length === 0) return null;

  return (
    <div
      aria-label="Notifications"
      className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2"
    >
      {toasts.map((toast) => (
        <Toast key={toast.id} {...toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
}
