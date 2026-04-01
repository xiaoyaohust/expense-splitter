'use client';

import { useEffect } from 'react';

interface Props {
  message: string;
  type: 'success' | 'error';
  onDismiss: () => void;
}

export default function Toast({ message, type, onDismiss }: Props) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 3000);
    return () => clearTimeout(t);
  }, [onDismiss]);

  return (
    <div
      className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] px-5 py-3 rounded-xl shadow-xl text-white text-sm font-medium flex items-center gap-2 animate-fade-in ${
        type === 'success' ? 'bg-green-600' : 'bg-red-600'
      }`}
    >
      <span className="text-base">{type === 'success' ? '✓' : '✕'}</span>
      {message}
    </div>
  );
}
