"use client";

import { createContext, useContext, useState, useCallback, ReactNode, useEffect } from "react";
import { CheckCircleIcon, XCircleIcon } from "./Icons";

export type ToastType = "success" | "error" | "info";

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

interface ToastContextType {
  show: (message: string, type?: ToastType, duration?: number) => void;
  success: (message: string, duration?: number) => void;
  error: (message: string, duration?: number) => void;
  info: (message: string, duration?: number) => void;
  remove: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const remove = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const show = useCallback(
    (message: string, type: ToastType = "info", duration = 3000) => {
      const id = Math.random().toString(36).substring(2, 9);
      const toast: Toast = { id, message, type, duration };
      setToasts((prev) => [...prev, toast]);

      if (duration > 0) {
        setTimeout(() => {
          remove(id);
        }, duration);
      }
    },
    [remove]
  );

  const success = useCallback(
    (message: string, duration?: number) => show(message, "success", duration),
    [show]
  );

  const error = useCallback(
    (message: string, duration?: number) => show(message, "error", duration),
    [show]
  );

  const info = useCallback(
    (message: string, duration?: number) => show(message, "info", duration),
    [show]
  );

  return (
    <ToastContext.Provider value={{ show, success, error, info, remove }}>
      {children}
      <div className="fixed top-4 left-1/2 z-50 flex -translate-x-1/2 flex-col gap-2">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onRemove={() => remove(toast.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: () => void }) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Small delay to trigger entry animation
    const timer = setTimeout(() => setIsVisible(true), 10);
    return () => clearTimeout(timer);
  }, []);

  const handleRemove = () => {
    setIsVisible(false);
    setTimeout(onRemove, 300); // Wait for exit animation
  };

  // Determine styles based on type
  let bgClass = "bg-white";
  let borderClass = "border-slate-200";
  let textClass = "text-slate-700";
  let icon = null;

  switch (toast.type) {
    case "success":
      bgClass = "bg-emerald-50";
      borderClass = "border-emerald-200";
      textClass = "text-emerald-800";
      icon = <CheckCircleIcon className="h-5 w-5 text-emerald-500" />;
      break;
    case "error":
      bgClass = "bg-rose-50";
      borderClass = "border-rose-200";
      textClass = "text-rose-800";
      icon = <XCircleIcon className="h-5 w-5 text-rose-500" />;
      break;
    case "info":
    default:
      bgClass = "bg-blue-50";
      borderClass = "border-blue-200";
      textClass = "text-blue-800";
      // Info icon could be added here, or just use default
      break;
  }

  return (
    <div
      className={`
        flex items-center gap-3 rounded-lg border px-4 py-3 shadow-lg transition-all duration-300 ease-in-out
        ${bgClass} ${borderClass} ${textClass}
        ${isVisible ? "translate-y-0 opacity-100" : "-translate-y-4 opacity-0"}
      `}
      role="alert"
    >
      {icon}
      <span className="text-sm font-medium">{toast.message}</span>
      <button
        onClick={handleRemove}
        className="ml-4 text-slate-400 hover:text-slate-600 focus:outline-none"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>
    </div>
  );
}
