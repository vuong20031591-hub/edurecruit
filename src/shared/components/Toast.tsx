'use client';
import { useState, type ReactNode } from 'react';
import { cn } from '../lib/cn';

interface Toast {
  id: number;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
}

let listeners: Array<(t: Toast) => void> = [];
let nextId = 1;

export const toast = {
  success: (m: string) => emit('success', m),
  error:   (m: string) => emit('error', m),
  info:    (m: string) => emit('info', m),
  warning: (m: string) => emit('warning', m)
};

function emit(type: Toast['type'], message: string) {
  const t: Toast = { id: nextId++, type, message };
  listeners.forEach(l => l(t));
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  if (listeners.length === 0) {
    listeners.push(t => {
      setToasts(prev => [...prev, t]);
      setTimeout(() => setToasts(prev => prev.filter(x => x.id !== t.id)), 4000);
    });
  }
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map(t => (
        <div
          key={t.id}
          className={cn(
            'min-w-[280px] rounded-md px-4 py-2.5 text-sm shadow-md',
            t.type === 'success' && 'bg-green-50 text-green-900 border border-green-200',
            t.type === 'error'   && 'bg-red-50 text-red-900 border border-red-200',
            t.type === 'info'    && 'bg-sky-50 text-sky-900 border border-sky-200',
            t.type === 'warning' && 'bg-amber-50 text-amber-900 border border-amber-200'
          )}
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}
