'use client';

import React from 'react';
import { Bug } from 'lucide-react';
import { useBugReportContext } from './BugReportProvider';
import { BugReportModal } from './BugReportModal';

export function BugReportButton() {
  const { collector } = useBugReportContext();
  const [open, setOpen] = React.useState(false);
  const [hasError, setHasError] = React.useState(false);

  React.useEffect(() => {
    const check = () => setHasError(collector.getHasConsoleError());
    check();

    const interval = window.setInterval(check, 1500);
    return () => window.clearInterval(interval);
  }, [collector]);

  return (
    <>
      <button
        type="button"
        aria-label="Report a bug"
        onClick={() => setOpen(true)}
        className="group fixed bottom-6 right-4 z-[180] flex items-center gap-2 rounded-full border border-white/20 bg-neutral-900/75 px-3 py-2 text-sm font-medium text-white shadow-lg backdrop-blur-sm transition hover:bg-neutral-800/95 sm:right-6"
      >
        <span className="relative inline-flex">
          <Bug className="h-4 w-4" />
          {hasError && (
            <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-red-500" />
          )}
        </span>
        <span className="max-w-0 overflow-hidden whitespace-nowrap opacity-0 transition-all duration-200 group-hover:max-w-28 group-hover:opacity-100">
          Report Bug
        </span>
      </button>

      <BugReportModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
