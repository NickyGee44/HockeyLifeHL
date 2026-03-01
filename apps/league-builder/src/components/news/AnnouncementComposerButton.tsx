'use client';

import { useState } from 'react';
import { Send, X } from 'lucide-react';
import { EmailComposer } from '@/components/notifications';

interface AnnouncementComposerButtonProps {
  leagueId: string;
  leagueName: string;
}

export function AnnouncementComposerButton({ leagueId, leagueName }: AnnouncementComposerButtonProps) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm bg-neutral-800 text-neutral-300 border border-white/10 hover:bg-neutral-700 hover:text-white transition-colors"
      >
        <Send className="w-4 h-4" />
        Send Announcement
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 overflow-y-auto">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setOpen(false)} />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-3xl mt-8 mb-8 bg-neutral-900 border border-white/10 rounded-2xl shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Send className="w-5 h-5 text-rink-500" />
            <h2 className="text-lg font-bold text-white">Send League Announcement</h2>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Composer */}
        <div className="p-5">
          <EmailComposer
            leagueId={leagueId}
            leagueName={leagueName}
            onSuccess={() => setOpen(false)}
          />
        </div>
      </div>
    </div>
  );
}
