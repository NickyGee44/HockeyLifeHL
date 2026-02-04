'use client';

/**
 * EmailComposer Component
 *
 * Rich text editor for composing league announcements
 */

import { useState } from 'react';
import {
  Send,
  Users,
  AlertTriangle,
  AlertCircle,
  Info,
  Loader2,
  Bold,
  Italic,
  List,
  Link2,
  Eye,
} from 'lucide-react';
import { sendLeagueAnnouncement } from '@/lib/notifications/actions';

type Priority = 'low' | 'normal' | 'high' | 'urgent';
type RecipientFilter = 'all' | 'captains' | 'players' | 'admins';

interface EmailComposerProps {
  leagueId: string;
  leagueName: string;
  onSuccess?: () => void;
}

const PRIORITY_OPTIONS: Array<{
  value: Priority;
  label: string;
  icon: React.ReactNode;
  color: string;
}> = [
  { value: 'low', label: 'Low', icon: <Info className="h-4 w-4" />, color: 'text-[#a3a3a3]' },
  { value: 'normal', label: 'Normal', icon: <Info className="h-4 w-4" />, color: 'text-[#22D3EE]' },
  { value: 'high', label: 'High', icon: <AlertTriangle className="h-4 w-4" />, color: 'text-[#eab308]' },
  { value: 'urgent', label: 'Urgent', icon: <AlertCircle className="h-4 w-4" />, color: 'text-[#ef4444]' },
];

const RECIPIENT_OPTIONS: Array<{
  value: RecipientFilter;
  label: string;
  description: string;
}> = [
  { value: 'all', label: 'All Members', description: 'Everyone in the league' },
  { value: 'captains', label: 'Captains Only', description: 'Team captains only' },
  { value: 'players', label: 'Players Only', description: 'All players (not captains)' },
  { value: 'admins', label: 'Admins Only', description: 'Owners and administrators' },
];

export function EmailComposer({ leagueId, leagueName, onSuccess }: EmailComposerProps) {
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [priority, setPriority] = useState<Priority>('normal');
  const [recipientFilter, setRecipientFilter] = useState<RecipientFilter>('all');
  const [actionButtonText, setActionButtonText] = useState('');
  const [actionButtonUrl, setActionButtonUrl] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  // Text formatting helpers
  const insertFormatting = (before: string, after: string = before) => {
    const textarea = document.getElementById('email-content') as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);
    const newText =
      content.substring(0, start) +
      before +
      selectedText +
      after +
      content.substring(end);

    setContent(newText);

    // Restore cursor position
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(
        start + before.length,
        end + before.length
      );
    }, 0);
  };

  // Handle send
  const handleSend = async () => {
    if (!subject.trim() || !content.trim()) {
      setResult({ success: false, message: 'Please fill in subject and message' });
      return;
    }

    setSending(true);
    setResult(null);

    try {
      const response = await sendLeagueAnnouncement({
        leagueId,
        subject,
        content,
        priority,
        recipientFilter,
        actionButtonText: actionButtonText || undefined,
        actionButtonUrl: actionButtonUrl || undefined,
      });

      if (response.success) {
        setResult({
          success: true,
          message: `Announcement sent to ${response.sent} recipients${response.failed ? ` (${response.failed} failed)` : ''}`,
        });
        // Reset form on success
        setSubject('');
        setContent('');
        setPriority('normal');
        setActionButtonText('');
        setActionButtonUrl('');
        onSuccess?.();
      } else {
        setResult({
          success: false,
          message: response.error || 'Failed to send announcement',
        });
      }
    } catch (error) {
      setResult({
        success: false,
        message: 'An error occurred while sending',
      });
    } finally {
      setSending(false);
    }
  };

  // Convert markdown preview
  const previewContent = content
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/\n/g, '<br>');

  return (
    <div className="space-y-6">
      {/* Recipients */}
      <div>
        <label className="block text-sm font-medium text-white mb-2">
          <Users className="h-4 w-4 inline-block mr-2" />
          Recipients
        </label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {RECIPIENT_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => setRecipientFilter(option.value)}
              className={`p-3 rounded-lg border text-left transition-all ${
                recipientFilter === option.value
                  ? 'border-[#22D3EE] bg-[rgba(34,211,238,0.1)]'
                  : 'border-[rgba(255,255,255,0.1)] bg-[#1a1a1a] hover:border-[rgba(34,211,238,0.3)]'
              }`}
            >
              <p className="font-medium text-white text-sm">{option.label}</p>
              <p className="text-xs text-[#737373]">{option.description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Priority */}
      <div>
        <label className="block text-sm font-medium text-white mb-2">
          Priority
        </label>
        <div className="flex gap-2">
          {PRIORITY_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => setPriority(option.value)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all ${
                priority === option.value
                  ? 'border-[#22D3EE] bg-[rgba(34,211,238,0.1)]'
                  : 'border-[rgba(255,255,255,0.1)] bg-[#1a1a1a] hover:border-[rgba(34,211,238,0.3)]'
              } ${option.color}`}
            >
              {option.icon}
              <span className="text-sm">{option.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Subject */}
      <div>
        <label className="block text-sm font-medium text-white mb-2">
          Subject
        </label>
        <input
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Enter email subject..."
          className="w-full bg-[#0a0a0a] border border-[rgba(34,211,238,0.3)] rounded-lg px-4 py-3 text-white placeholder-[#525252] focus:border-[#22D3EE] focus:outline-none focus:ring-2 focus:ring-[#22D3EE]/20"
        />
      </div>

      {/* Content */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-white">
            Message
          </label>
          <div className="flex items-center gap-1">
            <button
              onClick={() => insertFormatting('**', '**')}
              className="p-1.5 rounded hover:bg-[rgba(255,255,255,0.1)] text-[#a3a3a3] hover:text-white"
              title="Bold"
            >
              <Bold className="h-4 w-4" />
            </button>
            <button
              onClick={() => insertFormatting('*', '*')}
              className="p-1.5 rounded hover:bg-[rgba(255,255,255,0.1)] text-[#a3a3a3] hover:text-white"
              title="Italic"
            >
              <Italic className="h-4 w-4" />
            </button>
            <button
              onClick={() => insertFormatting('\n- ', '')}
              className="p-1.5 rounded hover:bg-[rgba(255,255,255,0.1)] text-[#a3a3a3] hover:text-white"
              title="List"
            >
              <List className="h-4 w-4" />
            </button>
            <div className="w-px h-4 bg-[rgba(255,255,255,0.1)] mx-1" />
            <button
              onClick={() => setShowPreview(!showPreview)}
              className={`p-1.5 rounded hover:bg-[rgba(255,255,255,0.1)] ${
                showPreview ? 'text-[#22D3EE]' : 'text-[#a3a3a3] hover:text-white'
              }`}
              title="Preview"
            >
              <Eye className="h-4 w-4" />
            </button>
          </div>
        </div>

        {showPreview ? (
          <div className="min-h-[200px] bg-[#0a0a0a] border border-[rgba(34,211,238,0.3)] rounded-lg p-4 text-[#a3a3a3]">
            <div dangerouslySetInnerHTML={{ __html: previewContent || '<em>Nothing to preview</em>' }} />
          </div>
        ) : (
          <textarea
            id="email-content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Write your announcement here...

You can use **bold** and *italic* formatting."
            rows={8}
            className="w-full bg-[#0a0a0a] border border-[rgba(34,211,238,0.3)] rounded-lg px-4 py-3 text-white placeholder-[#525252] focus:border-[#22D3EE] focus:outline-none focus:ring-2 focus:ring-[#22D3EE]/20 resize-y"
          />
        )}
        <p className="text-xs text-[#525252] mt-1">
          Supports **bold** and *italic* formatting
        </p>
      </div>

      {/* Action Button (optional) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-white mb-2">
            <Link2 className="h-4 w-4 inline-block mr-2" />
            Button Text <span className="text-[#525252]">(optional)</span>
          </label>
          <input
            type="text"
            value={actionButtonText}
            onChange={(e) => setActionButtonText(e.target.value)}
            placeholder="e.g., View Schedule"
            className="w-full bg-[#0a0a0a] border border-[rgba(34,211,238,0.3)] rounded-lg px-4 py-3 text-white placeholder-[#525252] focus:border-[#22D3EE] focus:outline-none focus:ring-2 focus:ring-[#22D3EE]/20"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-white mb-2">
            Button URL <span className="text-[#525252]">(optional)</span>
          </label>
          <input
            type="url"
            value={actionButtonUrl}
            onChange={(e) => setActionButtonUrl(e.target.value)}
            placeholder="https://..."
            className="w-full bg-[#0a0a0a] border border-[rgba(34,211,238,0.3)] rounded-lg px-4 py-3 text-white placeholder-[#525252] focus:border-[#22D3EE] focus:outline-none focus:ring-2 focus:ring-[#22D3EE]/20"
          />
        </div>
      </div>

      {/* Result message */}
      {result && (
        <div
          className={`p-4 rounded-lg ${
            result.success
              ? 'bg-[rgba(34,197,94,0.1)] border border-[rgba(34,197,94,0.3)] text-[#22c55e]'
              : 'bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.3)] text-[#ef4444]'
          }`}
        >
          {result.message}
        </div>
      )}

      {/* Send button */}
      <div className="flex items-center justify-between pt-4 border-t border-[rgba(255,255,255,0.1)]">
        <p className="text-sm text-[#525252]">
          Sending to {recipientFilter === 'all' ? 'all members' : recipientFilter} of {leagueName}
        </p>
        <button
          onClick={handleSend}
          disabled={sending || !subject.trim() || !content.trim()}
          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#22D3EE] to-[#0891b2] text-black font-semibold rounded-lg hover:shadow-[0_0_20px_rgba(34,211,238,0.4)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {sending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Sending...
            </>
          ) : (
            <>
              <Send className="h-4 w-4" />
              Send Announcement
            </>
          )}
        </button>
      </div>
    </div>
  );
}
