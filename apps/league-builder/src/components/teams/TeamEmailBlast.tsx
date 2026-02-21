'use client';

import { useState } from 'react';
import { Mail, Send, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { sendTeamEmail, sendLeagueEmail } from '@/lib/actions/team-email';

interface TeamEmailBlastProps {
  teamId?: string;
  leagueId?: string;
  teamName?: string;
  leagueName?: string;
}

/**
 * Email blast component for sending messages to team or league players.
 * Pass teamId for single team, or leagueId for league-wide.
 */
export function TeamEmailBlast({
  teamId,
  leagueId,
  teamName,
  leagueName,
}: TeamEmailBlastProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [recipientFilter, setRecipientFilter] = useState<'all' | 'captains'>('all');
  const [isSending, setIsSending] = useState(false);
  const [result, setResult] = useState<{ success: boolean; sentCount: number; error?: string } | null>(null);

  const scopeLabel = teamId ? (teamName || 'Team') : (leagueName || 'League');

  async function handleSend() {
    if (!subject.trim() || !content.trim()) return;

    setIsSending(true);
    setResult(null);

    try {
      let res;
      if (teamId) {
        res = await sendTeamEmail({
          teamId,
          subject: subject.trim(),
          content: content.trim(),
          recipientFilter,
        });
      } else if (leagueId) {
        res = await sendLeagueEmail({
          leagueId,
          subject: subject.trim(),
          content: content.trim(),
          recipientFilter,
        });
      } else {
        return;
      }

      setResult(res);
      if (res.success) {
        // Clear form after successful send
        setTimeout(() => {
          setSubject('');
          setContent('');
          setResult(null);
          setIsOpen(false);
        }, 3000);
      }
    } catch (err) {
      console.error('Email send failed:', err);
      setResult({ success: false, sentCount: 0, error: 'Failed to send email' });
    } finally {
      setIsSending(false);
    }
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border border-neutral-700 bg-neutral-800 text-neutral-200 hover:bg-neutral-700 transition-colors"
      >
        <Mail className="w-4 h-4" />
        Email {teamId ? 'Team' : 'All Players'}
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-neutral-700 bg-neutral-900 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <Mail className="w-4 h-4 text-rink-400" />
          Email Blast — {scopeLabel}
        </h3>
        <button
          onClick={() => { setIsOpen(false); setResult(null); }}
          className="text-xs text-neutral-400 hover:text-white transition-colors"
        >
          Cancel
        </button>
      </div>

      {/* Recipient filter */}
      <div className="flex gap-2">
        <button
          onClick={() => setRecipientFilter('all')}
          className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
            recipientFilter === 'all'
              ? 'bg-rink-500/20 text-rink-400 border border-rink-500/30'
              : 'bg-neutral-800 text-neutral-400 border border-neutral-700'
          }`}
        >
          All Players
        </button>
        <button
          onClick={() => setRecipientFilter('captains')}
          className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
            recipientFilter === 'captains'
              ? 'bg-rink-500/20 text-rink-400 border border-rink-500/30'
              : 'bg-neutral-800 text-neutral-400 border border-neutral-700'
          }`}
        >
          Captains Only
        </button>
      </div>

      {/* Subject */}
      <input
        type="text"
        placeholder="Email subject..."
        value={subject}
        onChange={(e) => setSubject(e.target.value)}
        className="w-full px-3 py-2 text-sm rounded-lg bg-neutral-800 border border-neutral-700 text-white placeholder-neutral-500 focus:outline-none focus:border-rink-500"
      />

      {/* Content */}
      <textarea
        placeholder="Write your message..."
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={5}
        className="w-full px-3 py-2 text-sm rounded-lg bg-neutral-800 border border-neutral-700 text-white placeholder-neutral-500 focus:outline-none focus:border-rink-500 resize-none"
      />

      {/* Result message */}
      {result && (
        <div
          className={`flex items-center gap-2 p-3 rounded-lg text-sm ${
            result.success
              ? 'bg-green-500/10 border border-green-500/20 text-green-400'
              : 'bg-red-500/10 border border-red-500/20 text-red-400'
          }`}
        >
          {result.success ? (
            <CheckCircle className="w-4 h-4 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
          )}
          {result.success
            ? `Sent to ${result.sentCount} recipient${result.sentCount !== 1 ? 's' : ''}`
            : result.error || 'Failed to send'}
        </div>
      )}

      {/* Send button */}
      <button
        onClick={handleSend}
        disabled={isSending || !subject.trim() || !content.trim()}
        className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl bg-gradient-to-r from-rink-500 to-arena-500 text-black disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-rink-500/20 transition-all"
      >
        {isSending ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Send className="w-4 h-4" />
        )}
        {isSending ? 'Sending...' : 'Send Email'}
      </button>
    </div>
  );
}
