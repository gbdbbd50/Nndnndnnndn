import React, { createContext, useContext, useState, useEffect } from 'react';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
  toasts: ToastItem[];
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = (message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, message }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast, toasts, removeToast }}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

function ToastContainer({ toasts, removeToast }: { toasts: ToastItem[]; removeToast: (id: string) => void }) {
  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => (
          <ToastCard key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
        ))}
      </AnimatePresence>
    </div>
  );
}

function ToastCard({ toast, onClose, key }: { toast: ToastItem; onClose: () => void; key?: React.Key }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 4500);
    return () => clearTimeout(timer);
  }, [onClose]);

  const config = {
    success: {
      icon: <CheckCircle2 className="w-5 h-5 text-lime-400" />,
      border: 'border-lime-500/30',
      bg: 'bg-zinc-950/95',
      shadow: 'shadow-[0_0_20px_rgba(132,204,22,0.15)]',
      accent: 'bg-lime-500',
    },
    error: {
      icon: <AlertTriangle className="w-5 h-5 text-red-400" />,
      border: 'border-red-500/30',
      bg: 'bg-zinc-950/95',
      shadow: 'shadow-[0_0_20px_rgba(239,68,68,0.15)]',
      accent: 'bg-red-500',
    },
    info: {
      icon: <Info className="w-5 h-5 text-sky-400" />,
      border: 'border-sky-500/30',
      bg: 'bg-zinc-950/95',
      shadow: 'shadow-[0_0_20px_rgba(14,165,233,0.15)]',
      accent: 'bg-sky-500',
    },
  }[toast.type];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className={`pointer-events-auto flex w-full gap-3 p-4 rounded-xl border ${config.border} ${config.bg} ${config.shadow} relative overflow-hidden`}
    >
      <div className={`absolute top-0 left-0 w-1 h-full ${config.accent}`} />
      <div className="flex-shrink-0 mt-0.5">{config.icon}</div>
      <div className="flex-1 text-left">
        <p className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-400 mb-0.5">
          {toast.type === 'success' ? 'SYSTEM OK' : toast.type === 'error' ? 'SYSTEM ERROR' : 'SYSTEM INFO'}
        </p>
        <p className="text-xs text-white leading-relaxed">{toast.message}</p>
      </div>
      <button
        onClick={onClose}
        className="flex-shrink-0 self-start p-0.5 rounded hover:bg-zinc-900 text-zinc-500 hover:text-white transition"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </motion.div>
  );
}
