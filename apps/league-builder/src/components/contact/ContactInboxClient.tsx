'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { cn } from '@hockey-life/ui';
import { Trash2, Mail, MailOpen, Inbox, ChevronDown, ChevronUp } from 'lucide-react';
import { markAsRead, markAsUnread, deleteSubmission } from '@/lib/actions/contact';

interface ContactSubmission {
  id: string;
  name: string;
  email: string;
  subject: string | null;
  message: string;
  is_read: boolean;
  created_at: string;
}

interface ContactInboxClientProps {
  leagueId: string;
  locale: string;
  submissions: ContactSubmission[];
}

export function ContactInboxClient({ leagueId, locale, submissions }: ContactInboxClientProps) {
  const t = useTranslations('contact');
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  async function handleMarkRead(submissionId: string) {
    startTransition(async () => {
      await markAsRead(submissionId);
      router.refresh();
    });
  }

  async function handleMarkUnread(submissionId: string) {
    startTransition(async () => {
      await markAsUnread(submissionId);
      router.refresh();
    });
  }

  async function handleDelete(submissionId: string) {
    if (!confirm(t('confirmDelete'))) return;

    startTransition(async () => {
      await deleteSubmission(submissionId);
      router.refresh();
    });
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  }

  const unreadCount = submissions.filter((s) => !s.is_read).length;

  return (
    <div>
      {/* Summary */}
      {submissions.length > 0 && (
        <div className="mb-6 text-sm text-neutral-400">
          {unreadCount > 0 ? (
            <span>{unreadCount} unread of {submissions.length} total messages</span>
          ) : (
            <span>{submissions.length} messages, all read</span>
          )}
        </div>
      )}

      {/* Messages List */}
      {submissions.length === 0 ? (
        <div className="text-center py-16">
          <Inbox className="w-16 h-16 mx-auto text-neutral-600 mb-4" />
          <p className="text-neutral-400">{t('noMessages')}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {submissions.map((submission) => (
            <div
              key={submission.id}
              className={cn(
                'bg-neutral-900 border rounded-xl overflow-hidden transition-colors',
                submission.is_read ? 'border-neutral-800' : 'border-rink-500/30 bg-rink-500/5'
              )}
            >
              {/* Header Row */}
              <div
                className="flex items-center gap-4 px-4 py-3 cursor-pointer hover:bg-neutral-800/50 transition-colors"
                onClick={() => {
                  setExpandedId(expandedId === submission.id ? null : submission.id);
                  if (!submission.is_read) {
                    handleMarkRead(submission.id);
                  }
                }}
              >
                {/* Read indicator */}
                <div className="shrink-0">
                  {submission.is_read ? (
                    <MailOpen className="w-4 h-4 text-neutral-500" />
                  ) : (
                    <Mail className="w-4 h-4 text-rink-400" />
                  )}
                </div>

                {/* Content preview */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className={cn(
                      'font-medium truncate',
                      submission.is_read ? 'text-neutral-300' : 'text-white'
                    )}>
                      {submission.name}
                    </span>
                    <span className="text-xs text-neutral-500 shrink-0">&lt;{submission.email}&gt;</span>
                  </div>
                  <p className={cn(
                    'text-sm truncate',
                    submission.is_read ? 'text-neutral-500' : 'text-neutral-300'
                  )}>
                    {submission.subject || '(No subject)'} - {submission.message}
                  </p>
                </div>

                {/* Date + expand */}
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-neutral-500">{formatDate(submission.created_at)}</span>
                  {expandedId === submission.id ? (
                    <ChevronUp className="w-4 h-4 text-neutral-500" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-neutral-500" />
                  )}
                </div>
              </div>

              {/* Expanded Message */}
              {expandedId === submission.id && (
                <div className="px-4 pb-4 border-t border-neutral-800">
                  <div className="py-3 space-y-2">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-neutral-500">{t('from')}:</span>{' '}
                        <span className="text-white">{submission.name}</span>
                      </div>
                      <div>
                        <span className="text-neutral-500">Email:</span>{' '}
                        <a href={`mailto:${submission.email}`} className="text-rink-400 hover:underline">
                          {submission.email}
                        </a>
                      </div>
                      <div>
                        <span className="text-neutral-500">{t('subject')}:</span>{' '}
                        <span className="text-white">{submission.subject || '(No subject)'}</span>
                      </div>
                      <div>
                        <span className="text-neutral-500">{t('date')}:</span>{' '}
                        <span className="text-white">{formatDate(submission.created_at)}</span>
                      </div>
                    </div>

                    <div className="mt-3 p-3 rounded-lg bg-neutral-800">
                      <p className="text-sm text-neutral-200 whitespace-pre-wrap">{submission.message}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    {submission.is_read ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMarkUnread(submission.id);
                        }}
                        disabled={isPending}
                        className="inline-flex items-center gap-1 text-xs text-neutral-400 hover:text-white transition-colors"
                      >
                        <Mail className="w-3.5 h-3.5" />
                        {t('markUnread')}
                      </button>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMarkRead(submission.id);
                        }}
                        disabled={isPending}
                        className="inline-flex items-center gap-1 text-xs text-neutral-400 hover:text-white transition-colors"
                      >
                        <MailOpen className="w-3.5 h-3.5" />
                        {t('markRead')}
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(submission.id);
                      }}
                      disabled={isPending}
                      className="inline-flex items-center gap-1 text-xs text-red-400 hover:text-red-300 transition-colors ml-auto"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      {t('delete')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
