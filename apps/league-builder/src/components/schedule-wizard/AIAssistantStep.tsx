'use client';

/**
 * AI Assistant Step
 *
 * Optional helper where league owners can describe scheduling needs in plain
 * English, review the proposed changes, and explicitly apply them.
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { cn } from '@hockey-life/ui/lib/utils';
import {
  Send,
  Bot,
  User,
  Loader2,
  Sparkles,
  SkipForward,
  CheckCircle2,
} from 'lucide-react';
import type {
  ConfigPatch,
  ScheduleAssistantResponse,
  ScheduleConfig,
  ScheduleConstraint,
  ScheduleConstraintConfig,
} from '@/lib/schedule/types';
import { applyConfigPatch, normalizeConstraints } from '@/lib/schedule/ai-config-parser';
import { formatScheduleAssistantError } from '@/lib/schedule/ai-chat-error';

interface AIAssistantStepProps {
  leagueId: string;
  seasonId: string;
  config: ScheduleConfig;
  setConfig: React.Dispatch<React.SetStateAction<ScheduleConfig>>;
  onConstraintsFromAI: (
    constraints: ScheduleConstraint[],
    constraintConfig: Partial<ScheduleConstraintConfig>
  ) => void;
  onSkip?: () => void;
  showSkipButton?: boolean;
  title?: string;
  description?: string;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  patch?: ConfigPatch | null;
  questions?: string[];
  applied?: boolean;
}

const MAX_MESSAGES = 20;

const INITIAL_GREETING = `Describe the schedule in plain English if you want help tightening it up.

Examples:
- "No games after 10pm"
- "Use Tuesdays and Thursdays only"
- "Skip March Break"
- "Give each team one bye week"

You can also skip this and keep going with the manual setup.`;

export function AIAssistantStep({
  leagueId,
  seasonId,
  config,
  setConfig,
  onConstraintsFromAI,
  onSkip,
  showSkipButton = true,
  title = 'Optional schedule helper',
  description = 'Describe your preferences in plain English and choose whether to apply the suggested changes.',
}: AIAssistantStepProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'assistant', content: INITIAL_GREETING },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [accumulatedConstraints, setAccumulatedConstraints] = useState<ScheduleConstraint[]>([]);
  const [accumulatedConstraintConfig, setAccumulatedConstraintConfig] = useState<
    Partial<ScheduleConstraintConfig>
  >({});
  const [changesSummary, setChangesSummary] = useState<string[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const sendMessage = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;
    if (messages.length >= MAX_MESSAGES) return;

    const userMessage: ChatMessage = { role: 'user', content: trimmed };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/ai/schedule-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leagueId,
          seasonId,
          messages: updatedMessages.map((message) => ({
            role: message.role,
            content: message.content,
          })),
          currentConfig: {
            ...config,
            startDate:
              config.startDate instanceof Date ? config.startDate.toISOString() : config.startDate,
            endDate: config.endDate instanceof Date ? config.endDate.toISOString() : config.endDate,
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Request failed (${response.status})`);
      }

      const data = (await response.json()) as ScheduleAssistantResponse;

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: data.reply,
          patch: data.patch,
          questions: data.questions,
        },
      ]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: formatScheduleAssistantError(error) },
      ]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  }, [input, isLoading, messages, leagueId, seasonId, config]);

  const applySuggestion = useCallback(
    (messageIndex: number, patch: ConfigPatch) => {
      if (Object.keys(patch.configUpdates).length > 0) {
        setConfig((prev) => applyConfigPatch(prev, patch));
      }

      const normalizedConstraints = normalizeConstraints(patch.newConstraints).map((constraint) => ({
        ...constraint,
        seasonId,
        leagueId,
      }));

      setAccumulatedConstraints((prevConstraints) => {
        const mergedConstraints = [...prevConstraints, ...normalizedConstraints];

        setAccumulatedConstraintConfig((prevConfig) => {
          const mergedConfig = { ...prevConfig, ...patch.constraintConfig };
          onConstraintsFromAI(mergedConstraints, mergedConfig);
          return mergedConfig;
        });

        return mergedConstraints;
      });

      if (patch.summary) {
        setChangesSummary((prev) => [...prev, patch.summary]);
      }

      setMessages((prev) =>
        prev.map((message, index) =>
          index === messageIndex ? { ...message, applied: true } : message
        )
      );
    },
    [leagueId, seasonId, onConstraintsFromAI, setConfig]
  );

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  };

  const atMessageLimit = messages.length >= MAX_MESSAGES;

  return (
    <div className="flex min-h-[400px] flex-col">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="flex items-center gap-2 text-lg font-medium text-white">
            <Sparkles className="h-5 w-5 text-rink-500" />
            {title}
          </h3>
          <p className="text-sm text-neutral-400">{description}</p>
        </div>
        {showSkipButton && onSkip && (
          <button
            onClick={onSkip}
            className="flex items-center gap-1.5 rounded-lg border border-neutral-700 px-3 py-1.5 text-xs font-medium text-neutral-400 transition-colors hover:border-neutral-600 hover:text-white"
          >
            <SkipForward className="h-3.5 w-3.5" />
            Skip
          </button>
        )}
      </div>

      {changesSummary.length > 0 && (
        <div className="mb-3 rounded-lg border border-rink-500/20 bg-rink-500/10 px-3 py-2">
          <p className="mb-1 text-xs font-medium text-rink-400">Applied changes:</p>
          <ul className="space-y-0.5 text-xs text-rink-400/80">
            {changesSummary.map((summary, index) => (
              <li key={`${summary}-${index}`}>• {summary}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="mb-3 min-h-0 flex-1 space-y-3 overflow-y-auto">
        {messages.map((message, index) => (
          <div
            key={`${message.role}-${index}`}
            className={cn(
              'flex gap-2.5',
              message.role === 'user' ? 'justify-end' : 'justify-start'
            )}
          >
            {message.role === 'assistant' && (
              <div className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-rink-500/20">
                <Bot className="h-4 w-4 text-rink-500" />
              </div>
            )}

            <div
              className={cn(
                'max-w-[80%] rounded-xl px-3.5 py-2.5 text-sm',
                message.role === 'user'
                  ? 'bg-rink-500 text-black'
                  : 'bg-neutral-800 text-neutral-200'
              )}
            >
              <div className="whitespace-pre-wrap break-words">
                {message.content.trim() ||
                  (isLoading && index === messages.length - 1 ? (
                    <span className="inline-flex items-center gap-1 text-neutral-400">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Thinking...
                    </span>
                  ) : null)}
              </div>

              {message.questions && message.questions.length > 0 && (
                <div className="mt-3 space-y-1 border-t border-white/10 pt-2 text-xs text-neutral-300">
                  {message.questions.map((question) => (
                    <div key={question}>• {question}</div>
                  ))}
                </div>
              )}

              {message.patch && (
                <div className="mt-3 space-y-2 border-t border-white/10 pt-2 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={cn(
                        'text-rink-400',
                        message.applied && 'text-emerald-400'
                      )}
                    >
                      {message.applied ? 'Changes applied' : 'Suggested changes ready'}
                    </span>
                    {!message.applied && (
                      <button
                        onClick={() => applySuggestion(index, message.patch!)}
                        className="inline-flex items-center gap-1 rounded-md border border-rink-500/40 bg-rink-500/10 px-2 py-1 font-medium text-rink-300 transition-colors hover:bg-rink-500/20"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Apply changes
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {message.role === 'user' && (
              <div className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-neutral-700">
                <User className="h-4 w-4 text-neutral-300" />
              </div>
            )}
          </div>
        ))}
        <div ref={chatEndRef} />
      </div>

      <div className="flex-shrink-0">
        {atMessageLimit ? (
          <p className="py-2 text-center text-sm text-neutral-500">
            Message limit reached. Continue with the wizard when you’re ready.
          </p>
        ) : (
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="e.g., No games after 10pm, add 2 bye weeks..."
              disabled={isLoading}
              className="flex-1 rounded-xl border border-neutral-700 bg-neutral-800 px-4 py-2.5 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-rink-500 disabled:opacity-50"
            />
            <button
              onClick={sendMessage}
              disabled={isLoading || !input.trim()}
              className="rounded-xl bg-rink-500 p-2.5 text-black transition-colors hover:bg-rink-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
