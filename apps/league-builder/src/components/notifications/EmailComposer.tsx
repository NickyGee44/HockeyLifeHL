'use client';

/**
 * EmailComposer Component
 *
 * Multi-step email composer for league announcements:
 * Compose → Preview → Send Options → Send
 */

import { useState } from 'react';
import DOMPurify from 'isomorphic-dompurify';
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
  Save,
  ArrowLeft,
  Clock,
  FileText,
} from 'lucide-react';
import {
  sendLeagueAnnouncement,
  saveAnnouncementDraft,
  renderAnnouncementPreview,
  sendAnnouncementDraft,
} from '@/lib/notifications/actions';
import type { AnnouncementDraft } from '@/lib/notifications/actions';

type Priority = 'low' | 'normal' | 'high' | 'urgent';
type RecipientFilter = 'all' | 'captains' | 'players' | 'admins';
type ComposerStep = 'compose' | 'preview' | 'send-options';

interface EmailComposerProps {
  leagueId: string;
  leagueName: string;
  onSuccess?: () => void;
  /** Load an existing draft for editing */
  editDraft?: AnnouncementDraft;
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

export function EmailComposer({ leagueId, leagueName, onSuccess, editDraft }: EmailComposerProps) {
  const [subject, setSubject] = useState(editDraft?.subject || '');
  const [content, setContent] = useState(editDraft?.content || '');
  const [priority, setPriority] = useState<Priority>(editDraft?.priority || 'normal');
  const [recipientFilter, setRecipientFilter] = useState<RecipientFilter>(editDraft?.recipientFilter || 'all');
  const [actionButtonText, setActionButtonText] = useState(editDraft?.actionButtonText || '');
  const [actionButtonUrl, setActionButtonUrl] = useState(editDraft?.actionButtonUrl || '');
  const [scheduledAt, setScheduledAt] = useState(editDraft?.scheduledAt || '');
  const [showInlinePreview, setShowInlinePreview] = useState(false);
  const [sending, setSending] = useState(false);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const [draftId, setDraftId] = useState<string | null>(editDraft?.id || null);
  const [step, setStep] = useState<ComposerStep>('compose');
  const [previewHtml, setPreviewHtml] = useState<string>('');
  const [previewLoading, setPreviewLoading] = useState(false);

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

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(
        start + before.length,
        end + before.length
      );
    }, 0);
  };

  // Save draft
  const handleSaveDraft = async () => {
    if (!subject.trim() || !content.trim()) {
      setResult({ success: false, message: 'Please fill in subject and message' });
      return;
    }

    setSaving(true);
    setResult(null);

    try {
      const response = await saveAnnouncementDraft({
        leagueId,
        draftId: draftId || undefined,
        subject,
        content,
        priority,
        recipientFilter,
        actionButtonText: actionButtonText || undefined,
        actionButtonUrl: actionButtonUrl || undefined,
        scheduledAt: scheduledAt || undefined,
      });

      if (response.success) {
        setDraftId(response.draftId || null);
        setResult({ success: true, message: 'Draft saved' });
      } else {
        setResult({ success: false, message: response.error || 'Failed to save draft' });
      }
    } catch {
      setResult({ success: false, message: 'An error occurred while saving' });
    } finally {
      setSaving(false);
    }
  };

  // Show email preview
  const handleShowPreview = async () => {
    if (!subject.trim() || !content.trim()) {
      setResult({ success: false, message: 'Please fill in subject and message' });
      return;
    }

    setPreviewLoading(true);
    setResult(null);

    try {
      const response = await renderAnnouncementPreview({
        leagueId,
        subject,
        content,
        priority,
        actionButtonText: actionButtonText || undefined,
        actionButtonUrl: actionButtonUrl || undefined,
      });

      if (response.error) {
        setResult({ success: false, message: response.error });
      } else {
        setPreviewHtml(response.html);
        setStep('preview');
      }
    } catch {
      setResult({ success: false, message: 'Failed to generate preview' });
    } finally {
      setPreviewLoading(false);
    }
  };

  // Send immediately
  const handleSend = async () => {
    setSending(true);
    setResult(null);

    try {
      let response;

      if (draftId) {
        response = await sendAnnouncementDraft(draftId);
      } else {
        response = await sendLeagueAnnouncement({
          leagueId,
          subject,
          content,
          priority,
          recipientFilter,
          actionButtonText: actionButtonText || undefined,
          actionButtonUrl: actionButtonUrl || undefined,
        });
      }

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
        setScheduledAt('');
        setDraftId(null);
        setStep('compose');
        onSuccess?.();
      } else {
        setResult({
          success: false,
          message: response.error || 'Failed to send announcement',
        });
      }
    } catch {
      setResult({ success: false, message: 'An error occurred while sending' });
    } finally {
      setSending(false);
    }
  };

  // Schedule for later
  const handleSchedule = async () => {
    if (!scheduledAt) {
      setResult({ success: false, message: 'Please select a send date and time' });
      return;
    }

    setSaving(true);
    setResult(null);

    try {
      // Save as draft first if not saved, then update status to scheduled
      const response = await saveAnnouncementDraft({
        leagueId,
        draftId: draftId || undefined,
        subject,
        content,
        priority,
        recipientFilter,
        actionButtonText: actionButtonText || undefined,
        actionButtonUrl: actionButtonUrl || undefined,
        scheduledAt,
      });

      if (response.success) {
        setResult({ success: true, message: `Announcement scheduled for ${new Date(scheduledAt).toLocaleString()}` });
        setSubject('');
        setContent('');
        setPriority('normal');
        setActionButtonText('');
        setActionButtonUrl('');
        setScheduledAt('');
        setDraftId(null);
        setStep('compose');
        onSuccess?.();
      } else {
        setResult({ success: false, message: response.error || 'Failed to schedule' });
      }
    } catch {
      setResult({ success: false, message: 'An error occurred' });
    } finally {
      setSaving(false);
    }
  };

  // Inline markdown preview
  const inlinePreviewContent = content
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/\n/g, '<br>');

  // =========================================================================
  // Preview Step
  // =========================================================================
  if (step === 'preview') {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setStep('compose')}
            className="flex items-center gap-2 text-sm text-[#a3a3a3] hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Editor
          </button>
          <span className="text-sm text-[#525252]">Email Preview</span>
        </div>

        <div className="rounded-lg overflow-hidden border border-[rgba(34,211,238,0.3)]" style={{ height: '500px' }}>
          <iframe
            srcDoc={previewHtml}
            title="Email Preview"
            className="w-full h-full bg-white"
            sandbox="allow-same-origin"
          />
        </div>

        <p className="text-xs text-[#525252]">
          This is exactly how recipients will see the email
        </p>

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

        <div className="flex items-center gap-3 pt-4 border-t border-[rgba(255,255,255,0.1)]">
          <button
            onClick={() => setStep('send-options')}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#22D3EE] to-[#0891b2] text-black font-semibold rounded-lg hover:shadow-[0_0_20px_rgba(34,211,238,0.4)] transition-all"
          >
            <Send className="h-4 w-4" />
            Send Options
          </button>
          <button
            onClick={handleSend}
            disabled={sending}
            className="flex items-center gap-2 px-6 py-3 bg-[#1a1a1a] border border-[rgba(255,255,255,0.1)] text-white font-medium rounded-lg hover:border-[rgba(34,211,238,0.3)] transition-all disabled:opacity-50"
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Send Now
          </button>
        </div>
      </div>
    );
  }

  // =========================================================================
  // Send Options Step
  // =========================================================================
  if (step === 'send-options') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setStep('preview')}
            className="flex items-center gap-2 text-sm text-[#a3a3a3] hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Preview
          </button>
          <span className="text-sm text-[#525252]">Send Options</span>
        </div>

        {/* Summary */}
        <div className="p-4 rounded-lg border border-[rgba(255,255,255,0.1)] bg-[#1a1a1a]">
          <h3 className="font-medium text-white mb-2">{subject}</h3>
          <p className="text-sm text-[#a3a3a3]">
            To: {recipientFilter === 'all' ? 'All members' : recipientFilter} of {leagueName}
          </p>
          <p className="text-sm text-[#525252]">
            Priority: {priority}
          </p>
        </div>

        {/* Schedule */}
        <div>
          <label className="block text-sm font-medium text-white mb-2">
            <Clock className="h-4 w-4 inline-block mr-2" />
            Schedule for Later <span className="text-[#525252]">(optional)</span>
          </label>
          <input
            type="datetime-local"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
            min={new Date().toISOString().slice(0, 16)}
            className="w-full bg-[#0a0a0a] border border-[rgba(34,211,238,0.3)] rounded-lg px-4 py-3 text-white focus:border-[#22D3EE] focus:outline-none focus:ring-2 focus:ring-[#22D3EE]/20"
          />
          <p className="text-xs text-[#525252] mt-1">
            Leave empty to send immediately
          </p>
        </div>

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

        <div className="flex items-center gap-3 pt-4 border-t border-[rgba(255,255,255,0.1)]">
          {scheduledAt ? (
            <button
              onClick={handleSchedule}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#22D3EE] to-[#0891b2] text-black font-semibold rounded-lg hover:shadow-[0_0_20px_rgba(34,211,238,0.4)] transition-all disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Clock className="h-4 w-4" />}
              Schedule Send
            </button>
          ) : (
            <button
              onClick={handleSend}
              disabled={sending}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#22D3EE] to-[#0891b2] text-black font-semibold rounded-lg hover:shadow-[0_0_20px_rgba(34,211,238,0.4)] transition-all disabled:opacity-50"
            >
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Send Now
            </button>
          )}
        </div>
      </div>
    );
  }

  // =========================================================================
  // Compose Step (default)
  // =========================================================================
  return (
    <div className="space-y-6">
      {/* Draft indicator */}
      {draftId && (
        <div className="flex items-center gap-2 text-xs text-[#525252]">
          <FileText className="h-3 w-3" />
          Draft saved
        </div>
      )}

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
              onClick={() => setShowInlinePreview(!showInlinePreview)}
              className={`p-1.5 rounded hover:bg-[rgba(255,255,255,0.1)] ${
                showInlinePreview ? 'text-[#22D3EE]' : 'text-[#a3a3a3] hover:text-white'
              }`}
              title="Preview"
            >
              <Eye className="h-4 w-4" />
            </button>
          </div>
        </div>

        {showInlinePreview ? (
          <div className="min-h-[200px] bg-[#0a0a0a] border border-[rgba(34,211,238,0.3)] rounded-lg p-4 text-[#a3a3a3]">
            <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(inlinePreviewContent) || '<em>Nothing to preview</em>' }} />
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

      {/* Action buttons */}
      <div className="flex items-center justify-between pt-4 border-t border-[rgba(255,255,255,0.1)]">
        <p className="text-sm text-[#525252]">
          Sending to {recipientFilter === 'all' ? 'all members' : recipientFilter} of {leagueName}
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSaveDraft}
            disabled={saving || !subject.trim() || !content.trim()}
            className="flex items-center gap-2 px-4 py-3 bg-[#1a1a1a] border border-[rgba(255,255,255,0.1)] text-white font-medium rounded-lg hover:border-[rgba(34,211,238,0.3)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Draft
          </button>
          <button
            onClick={handleShowPreview}
            disabled={previewLoading || !subject.trim() || !content.trim()}
            className="flex items-center gap-2 px-4 py-3 bg-[#1a1a1a] border border-[rgba(255,255,255,0.1)] text-white font-medium rounded-lg hover:border-[rgba(34,211,238,0.3)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {previewLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
            Preview Email
          </button>
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
                Send Now
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
