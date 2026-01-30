"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";

type ToastType = "success" | "error" | "warning" | "info";

interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

interface ToastContextValue {
  toasts: Toast[];
  addToast: (
    message: string,
    type?: ToastType,
    duration?: number
  ) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

const typeStyles: Record<ToastType, string> = {
  success:
    "bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200",
  error:
    "bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200",
  warning:
    "bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200",
  info: "bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200",
};

const typeIcons: Record<ToastType, string> = {
  success: "✓",
  error: "✕",
  warning: "!",
  info: "i",
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback(
    (message: string, type: ToastType = "info", duration = 4000) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const newToast: Toast = { id, type, message, duration };

      setToasts((prev) => [...prev, newToast]);

      if (duration > 0) {
        setTimeout(() => {
          setToasts((prev) => prev.filter((t) => t.id !== id));
        }, duration);
      }
    },
    []
  );

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
}

function ToastContainer({
  toasts,
  onRemove,
}: {
  toasts: Toast[];
  onRemove: (id: string) => void;
}) {
  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm"
      role="region"
      aria-label="Notifications"
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
      ))}
    </div>
  );
}

function ToastItem({
  toast,
  onRemove,
}: {
  toast: Toast;
  onRemove: (id: string) => void;
}) {
  return (
    <div
      className={`
        toast-enter
        flex items-start gap-3 p-4 rounded-lg border shadow-lg
        ${typeStyles[toast.type]}
      `}
      role="alert"
    >
      <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded-full bg-current/10 text-sm font-bold">
        {typeIcons[toast.type]}
      </span>
      <p className="flex-1 text-sm font-medium">{toast.message}</p>
      <button
        onClick={() => onRemove(toast.id)}
        className="flex-shrink-0 p-1 rounded hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
        aria-label="Dismiss"
      >
        <span className="text-lg leading-none">&times;</span>
      </button>
    </div>
  );
}

// Convenience hooks for specific toast types
export function useSuccessToast() {
  const { addToast } = useToast();
  return useCallback(
    (message: string, duration?: number) => addToast(message, "success", duration),
    [addToast]
  );
}

export function useErrorToast() {
  const { addToast } = useToast();
  return useCallback(
    (message: string, duration?: number) => addToast(message, "error", duration),
    [addToast]
  );
}
