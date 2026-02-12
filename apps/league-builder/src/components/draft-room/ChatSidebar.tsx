'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, MessageCircle, Info } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@hockey-life/ui/lib/utils';
import type { DraftMessage } from './types';

interface ChatSidebarProps {
  messages: DraftMessage[];
  onSendMessage: (message: string) => void;
  currentUserId: string;
  currentTeamName?: string;
  canSend: boolean;
}

function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function ChatSidebar({
  messages,
  onSendMessage,
  currentUserId,
  currentTeamName,
  canSend,
}: ChatSidebarProps) {
  const t = useTranslations('draft');
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && canSend) {
      onSendMessage(input.trim());
      setInput('');
    }
  };

  return (
    <div className="flex h-full flex-col rounded-lg border bg-card">
      {/* Header */}
      <div className="border-b p-4">
        <div className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5 text-rink-500" />
          <h2 className="text-lg font-semibold">{t('captainChat')}</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          {t('messagesCount', { count: messages.length })}
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <MessageCircle className="h-12 w-12 text-muted-foreground/50" />
            <p className="mt-2 text-sm text-muted-foreground">
              {t('noMessages')}
            </p>
            <p className="text-xs text-muted-foreground">
              {t('beFirstToChat')}
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isOwnMessage = msg.user_id === currentUserId;
            const isSystemMessage = msg.message_type === 'system';

            if (isSystemMessage) {
              return (
                <div
                  key={msg.id}
                  className="flex items-center justify-center gap-2 py-2"
                >
                  <Info className="h-3 w-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    {msg.message}
                  </span>
                </div>
              );
            }

            return (
              <div
                key={msg.id}
                className={cn(
                  'flex flex-col',
                  isOwnMessage ? 'items-end' : 'items-start'
                )}
              >
                {/* Sender info */}
                <div className="mb-1 flex items-center gap-2 text-xs">
                  <span className="font-medium text-muted-foreground">
                    {isOwnMessage ? t('you') : msg.user_name || 'Captain'}
                  </span>
                  {msg.team_name && (
                    <span className="text-muted-foreground/70">
                      ({msg.team_name})
                    </span>
                  )}
                  <span className="text-muted-foreground/50">
                    {msg.created_at ? formatTimestamp(msg.created_at) : ''}
                  </span>
                </div>

                {/* Message bubble */}
                <div
                  className={cn(
                    'max-w-[85%] rounded-2xl px-4 py-2 text-sm',
                    isOwnMessage
                      ? 'bg-rink-500 text-black rounded-br-sm'
                      : 'bg-muted rounded-bl-sm'
                  )}
                >
                  {msg.message}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="border-t p-3">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={canSend ? t('typeMessage') : t('captainsOnly')}
            disabled={!canSend}
            maxLength={500}
            className={cn(
              'flex-1 rounded-lg border bg-background px-3 py-2 text-sm',
              'focus:outline-none focus:ring-2 focus:ring-rink-500',
              !canSend && 'cursor-not-allowed opacity-50'
            )}
          />
          <button
            type="submit"
            disabled={!canSend || !input.trim()}
            className={cn(
              'rounded-lg bg-rink-500 p-2 text-black transition-colors',
              'hover:bg-rink-600 disabled:cursor-not-allowed disabled:opacity-50'
            )}
          >
            <Send className="h-5 w-5" />
          </button>
        </div>
        {currentTeamName && (
          <p className="mt-1 text-xs text-muted-foreground">
            {t('sendingAs', { team: currentTeamName })}
          </p>
        )}
      </form>
    </div>
  );
}
