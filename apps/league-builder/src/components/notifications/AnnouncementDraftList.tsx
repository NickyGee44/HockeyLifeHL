'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  FileText,
  Trash2,
  Send,
  Clock,
  Loader2,
  Edit3,
} from 'lucide-react';
import {
  getAnnouncementDrafts,
  deleteAnnouncementDraft,
  sendAnnouncementDraft,
} from '@/lib/notifications/actions';
import type { AnnouncementDraft } from '@/lib/notifications/actions';

interface AnnouncementDraftListProps {
  leagueId: string;
  onEditDraft?: (draft: AnnouncementDraft) => void;
  refreshKey?: number;
}

const STATUS_BADGES: Record<string, { label: string; className: string }> = {
  draft: { label: 'Draft', className: 'bg-[rgba(255,255,255,0.1)] text-[#a3a3a3]' },
  pending_approval: { label: 'Pending Approval', className: 'bg-[rgba(245,158,11,0.15)] text-[#f59e0b]' },
  scheduled: { label: 'Scheduled', className: 'bg-[rgba(34,211,238,0.15)] text-[#22D3EE]' },
};

export function AnnouncementDraftList({ leagueId, onEditDraft, refreshKey }: AnnouncementDraftListProps) {
  const [drafts, setDrafts] = useState<AnnouncementDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadDrafts = useCallback(async () => {
    setLoading(true);
    const result = await getAnnouncementDrafts(leagueId);
    setDrafts(result.data);
    setLoading(false);
  }, [leagueId]);

  useEffect(() => {
    loadDrafts();
  }, [loadDrafts, refreshKey]);

  const handleDelete = async (draftId: string) => {
    setActionLoading(draftId);
    await deleteAnnouncementDraft(draftId);
    setDrafts((prev) => prev.filter((d) => d.id !== draftId));
    setActionLoading(null);
  };

  const handleSendNow = async (draftId: string) => {
    setActionLoading(draftId);
    const result = await sendAnnouncementDraft(draftId);
    if (result.success) {
      setDrafts((prev) => prev.filter((d) => d.id !== draftId));
    }
    setActionLoading(null);
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-[#525252] py-4">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading drafts...
      </div>
    );
  }

  if (drafts.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-white flex items-center gap-2">
        <FileText className="h-4 w-4 text-[#22D3EE]" />
        Saved Drafts ({drafts.length})
      </h3>

      <div className="space-y-2">
        {drafts.map((draft) => {
          const badge = STATUS_BADGES[draft.status] || STATUS_BADGES.draft;
          const isActioning = actionLoading === draft.id;

          return (
            <div
              key={draft.id}
              className="flex items-center justify-between p-3 rounded-lg border border-[rgba(255,255,255,0.1)] bg-[#1a1a1a] hover:border-[rgba(34,211,238,0.2)] transition-colors"
            >
              <div className="flex-1 min-w-0 mr-4">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-sm font-medium text-white truncate">
                    {draft.subject || 'Untitled'}
                  </p>
                  <span className={`px-2 py-0.5 text-xs rounded-full ${badge.className}`}>
                    {badge.label}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-[#525252]">
                  <span>To: {draft.recipientFilter}</span>
                  <span>Priority: {draft.priority}</span>
                  {draft.scheduledAt && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(draft.scheduledAt).toLocaleString()}
                    </span>
                  )}
                  <span>
                    Updated {new Date(draft.updatedAt).toLocaleDateString()}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1">
                {onEditDraft && (
                  <button
                    onClick={() => onEditDraft(draft)}
                    disabled={isActioning}
                    className="p-2 rounded-lg text-[#a3a3a3] hover:text-white hover:bg-[rgba(255,255,255,0.1)] transition-colors disabled:opacity-50"
                    title="Edit"
                  >
                    <Edit3 className="h-4 w-4" />
                  </button>
                )}
                <button
                  onClick={() => handleSendNow(draft.id)}
                  disabled={isActioning}
                  className="p-2 rounded-lg text-[#22D3EE] hover:bg-[rgba(34,211,238,0.1)] transition-colors disabled:opacity-50"
                  title="Send Now"
                >
                  {isActioning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </button>
                <button
                  onClick={() => handleDelete(draft.id)}
                  disabled={isActioning}
                  className="p-2 rounded-lg text-[#ef4444] hover:bg-[rgba(239,68,68,0.1)] transition-colors disabled:opacity-50"
                  title="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
