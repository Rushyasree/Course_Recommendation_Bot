import React, { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Info, CheckCircle, AlertCircle, X } from "lucide-react";

const ICONS = {
  info: Info,
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertCircle,
};

/**
 * Reusable toast notification component.
 * Props:
 *   - message: string – notification text (HTML allowed).
 *   - type: 'info' | 'success' | 'error' | 'warning' (default: 'info')
 *   - duration: time in ms before auto‑dismiss (default 5000).
 *   - onDismiss: callback invoked when the toast is dismissed.
 */
export default function Toast({ message, type = "info", duration = 5000, onDismiss }) {
  // Auto‑close after the specified duration.
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => {
      onDismiss?.();
    }, duration);
    return () => clearTimeout(timer);
  }, [message, duration, onDismiss]);

  const Icon = ICONS[type] || Info;

  return (
    <AnimatePresence>
      {message && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="fixed top-4 right-4 z-50 max-w-xs w-full bg-black/70 backdrop-blur-sm rounded-xl border border-white/10 shadow-xl flex items-center gap-3 p-4 text-white"
        >
          <Icon className="w-5 h-5 flex-shrink-0" />
          <div className="flex-1 text-sm leading-snug">{message}</div>
          <button
            onClick={onDismiss}
            className="p-1 rounded-full hover:bg-white/10 focus:outline-none"
            aria-label="Dismiss toast"
          >
            <X className="w-4 h-4" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
