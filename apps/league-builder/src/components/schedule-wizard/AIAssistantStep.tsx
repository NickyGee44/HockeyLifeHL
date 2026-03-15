'use client';

/**
 * AI Assistant Step
 *
 * Chat interface where league owners describe their scheduling constraints
 * in natural language. The AI translates their needs into ScheduleConfig
 * updates and constraint objects.
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { cn } from '@hockey-life/ui/lib/utils';
import { Send, Bot, User, Loader2, Sparkles, SkipForward, Settings2 } from 'lucide-react';
import type { ScheduleConfig, ScheduleConstraint, ScheduleConstraintConfig } from '@/lib/schedule/types';
import { extractConfigPatch, applyConfigPatch, normalizeConstraints, type ConfigPatch } from '@/lib/schedule/ai-config-parser';

interface AIAssistantStepProps {
  leagueId: string;
  seasonId: string;
  config: ScheduleConfig;
  setConfig: React.Dispatch<React.SetStateAction<ScheduleConfig>>;
  onConstraintsFromAI: (constraints: ScheduleConstraint[], constraintConfig: Partial<ScheduleConstraintConfig>) => void;
  onSkip: () => void;
  onSwitchToAdvanced: () => void;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  patch?: ConfigPatch | null;
}

const MAX_MESSAGES = 20;

const INITIAL_GREETING = `Hey! I'm here to help fine-tune your schedule. You can tell me things like:

• **"No games after 10pm"** — I'll set late night limits
• **"Skip the week of March Break"** — I'll add a blackout
• **"We play at Canlan Ice Sports"** — I'll set the venue
• **"Add bye weeks"** — I'll configure rest weeks
• **"Best of 3 playoffs with top 8 teams"** — I'll set up playoffs

Or just say **"Looks good!"** if the basic setup is all you need.`;

export function AIAssistantStep({
  leagueId,
  seasonId,
  config,
  setConfig,
  onConstraintsFromAI,
  onSkip,
  onSwitchToAdvanced,
}: AIAssistantStepProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'assistant', content: INITIAL_GREETING },
  ]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [accumulatedConstraints, setAccumulatedConstraints] = useState<ScheduleConstraint[]>([]);
  const [accumulatedConstraintConfig, setAccumulatedConstraintConfig] = useState<Partial<ScheduleConstraintConfig>>({});
  const [changesSummary, setChangesSummary] = useState<string[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const sendMessage = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || isStreaming) return;
    if (messages.length >= MAX_MESSAGES) return;

    const userMessage: ChatMessage = { role: 'user', content: trimmed };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput('');
    setIsStreaming(true);

    // Build conversation history for API (skip the initial greeting)
    const apiMessages = updatedMessages
      .map((m) => ({ role: m.role, content: m.content }));

    try {
      const response = await fetch('/api/ai/schedule-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leagueId,
          seasonId,
          messages: apiMessages,
          currentConfig: {
            ...config,
            startDate: config.startDate instanceof Date ? config.startDate.toISOString() : config.startDate,
            endDate: config.endDate instanceof Date ? config.endDate.toISOString() : config.endDate,
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Request failed (${response.status})`);
      }

      // Stream the response
      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let fullText = '';

      // Add placeholder assistant message
      const assistantMessage: ChatMessage = { role: 'assistant', content: '' };
      setMessages((prev) => [...prev, assistantMessage]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        fullText += chunk;

        // Update the last message with streamed content
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = { ...updated[updated.length - 1], content: fullText };
          return updated;
        });
      }

      // Parse config patch from the complete response
      const patch = extractConfigPatch(fullText);
      if (patch) {
        // Apply config updates
        if (patch.configUpdates && Object.keys(patch.configUpdates).length > 0) {
          setConfig((prev) => applyConfigPatch(prev, patch));
        }

        // Accumulate constraints
        if (patch.newConstraints && patch.newConstraints.length > 0) {
          const normalized = normalizeConstraints(patch.newConstraints);
          setAccumulatedConstraints((prev) => [...prev, ...normalized]);
          onConstraintsFromAI(
            [...accumulatedConstraints, ...normalized],
            { ...accumulatedConstraintConfig, ...(patch.constraintConfig ?? {}) }
          );
        }

        // Accumulate constraint config
        if (patch.constraintConfig && Object.keys(patch.constraintConfig).length > 0) {
          setAccumulatedConstraintConfig((prev) => ({ ...prev, ...patch.constraintConfig }));
          onConstraintsFromAI(accumulatedConstraints, {
            ...accumulatedConstraintConfig,
            ...patch.constraintConfig,
          });
        }

        // Track changes
        if (patch.summary) {
          setChangesSummary((prev) => [...prev, patch.summary]);
        }

        // Update the message with the patch
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = { ...updated[updated.length - 1], patch };
          return updated;
        });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Something went wrong';
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `Sorry, I ran into an issue: ${errorMessage}. Please try again.` },
      ]);
    } finally {
      setIsStreaming(false);
      inputRef.current?.focus();
    }
  }, [input, isStreaming, messages, leagueId, seasonId, config, setConfig, onConstraintsFromAI, accumulatedConstraints, accumulatedConstraintConfig]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const atMessageLimit = messages.length >= MAX_MESSAGES;

  return (
    <div className="flex flex-col h-full min-h-[400px]">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-lg font-medium text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-rink-500" />
            AI Schedule Assistant
          </h3>
          <p className="text-sm text-neutral-400">
            Describe your constraints or say &quot;Looks good!&quot; to continue.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onSwitchToAdvanced}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-neutral-400 border border-neutral-700 rounded-lg hover:text-white hover:border-neutral-600 transition-colors"
          >
            <Settings2 className="w-3.5 h-3.5" />
            Advanced
          </button>
          <button
            onClick={onSkip}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-neutral-400 border border-neutral-700 rounded-lg hover:text-white hover:border-neutral-600 transition-colors"
          >
            <SkipForward className="w-3.5 h-3.5" />
            Skip
          </button>
        </div>
      </div>

      {/* Changes summary bar */}
      {changesSummary.length > 0 && (
        <div className="mb-3 px-3 py-2 bg-rink-500/10 border border-rink-500/20 rounded-lg">
          <p className="text-xs font-medium text-rink-400 mb-1">Configuration updated:</p>
          <ul className="text-xs text-rink-400/80 space-y-0.5">
            {changesSummary.map((s, i) => (
              <li key={i}>• {s}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Chat messages */}
      <div className="flex-1 overflow-y-auto space-y-3 mb-3 min-h-0">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={cn(
              'flex gap-2.5',
              msg.role === 'user' ? 'justify-end' : 'justify-start'
            )}
          >
            {msg.role === 'assistant' && (
              <div className="flex-shrink-0 w-7 h-7 rounded-full bg-rink-500/20 flex items-center justify-center mt-0.5">
                <Bot className="w-4 h-4 text-rink-500" />
              </div>
            )}
            <div
              className={cn(
                'max-w-[80%] rounded-xl px-3.5 py-2.5 text-sm',
                msg.role === 'user'
                  ? 'bg-rink-500 text-black'
                  : 'bg-neutral-800 text-neutral-200'
              )}
            >
              <div className="whitespace-pre-wrap break-words [&_strong]:font-semibold">
                {/* Strip JSON code blocks from display */}
                {msg.content.replace(/```json[\s\S]*?```/g, '').trim() || (
                  isStreaming && idx === messages.length - 1 ? (
                    <span className="inline-flex items-center gap-1 text-neutral-400">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Thinking...
                    </span>
                  ) : null
                )}
              </div>
              {msg.patch && (
                <div className="mt-1.5 pt-1.5 border-t border-white/10 text-xs text-rink-400">
                  ✓ Config updated
                </div>
              )}
            </div>
            {msg.role === 'user' && (
              <div className="flex-shrink-0 w-7 h-7 rounded-full bg-neutral-700 flex items-center justify-center mt-0.5">
                <User className="w-4 h-4 text-neutral-300" />
              </div>
            )}
          </div>
        ))}
        <div ref={chatEndRef} />
      </div>

      {/* Input */}
      <div className="flex-shrink-0">
        {atMessageLimit ? (
          <p className="text-center text-sm text-neutral-500 py-2">
            Message limit reached. Click <strong>Next</strong> to proceed.
          </p>
        ) : (
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="e.g., No games after 10pm, add 2 bye weeks..."
              disabled={isStreaming}
              className="flex-1 px-4 py-2.5 bg-neutral-800 border border-neutral-700 rounded-xl text-white text-sm placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-rink-500 disabled:opacity-50"
            />
            <button
              onClick={sendMessage}
              disabled={isStreaming || !input.trim()}
              className="p-2.5 bg-rink-500 text-black rounded-xl hover:bg-rink-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isStreaming ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
