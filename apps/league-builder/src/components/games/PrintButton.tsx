'use client';

import { Printer } from 'lucide-react';

export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="inline-flex items-center gap-2 px-4 py-2 bg-white text-neutral-950 text-sm font-semibold rounded-lg hover:bg-neutral-100 transition-colors"
    >
      <Printer className="w-4 h-4" />
      Print / Save PDF
    </button>
  );
}
