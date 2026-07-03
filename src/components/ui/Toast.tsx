"use client";

import React, { useState, useEffect } from 'react';
import { CheckCircle, AlertCircle, X } from 'lucide-react';

interface ToastProps {
  message: string;
  type: 'success' | 'error';
}

export const Toast: React.FC<ToastProps> = ({ message, type }) => {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    setVisible(true);
    const timer = setTimeout(() => {
      setVisible(false);
    }, 4000);
    return () => clearTimeout(timer);
  }, [message]);

  if (!visible) return null;

  return (
    <div className={`fixed bottom-5 right-5 z-55 flex items-center gap-3 px-4 py-3.5 rounded-2xl shadow-2xl border transition-all duration-300 transform translate-y-0 opacity-100 ${
      type === 'success' 
        ? 'bg-emerald-50 border-emerald-250 text-emerald-850 dark:bg-emerald-950/90 dark:border-emerald-900/50 dark:text-emerald-400'
        : 'bg-red-50 border-red-250 text-red-850 dark:bg-red-950/90 dark:border-red-900/50 dark:text-red-400'
    }`} style={{ animation: 'slideIn 0.3s ease-out forwards' }}>
      {type === 'success' ? (
        <CheckCircle className="h-5 w-5 text-emerald-500 shrink-0" />
      ) : (
        <AlertCircle className="h-5 w-5 text-red-500 shrink-0" />
      )}
      <span className="text-sm font-bold tracking-wide">{message}</span>
      <button 
        onClick={() => setVisible(false)} 
        className="ml-2 p-0.5 hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50 rounded-lg text-zinc-400 hover:text-zinc-650 dark:hover:text-zinc-300 transition-colors"
      >
        <X className="h-4 w-4" />
      </button>

      <style jsx global>{`
        @keyframes slideIn {
          from {
            transform: translateY(100px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
};
