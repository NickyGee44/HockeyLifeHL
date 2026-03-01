'use client';

import { useState, useTransition, useRef, useEffect } from 'react';
import { Plus, Trash2, RotateCcw, Save } from 'lucide-react';
import { cn } from '@hockey-life/ui';
import { updatePenaltyRules, type PenaltyRuleConfig } from '@/lib/actions/league-settings';

/** Default NHL-style penalties — used as a reset template */
const DEFAULT_PENALTIES: PenaltyRuleConfig[] = [
  { type: 'Tripping', minutes: 2 },
  { type: 'Hooking', minutes: 2 },
  { type: 'Holding', minutes: 2 },
  { type: 'Slashing', minutes: 2 },
  { type: 'Interference', minutes: 2 },
  { type: 'High Sticking', minutes: 2 },
  { type: 'Roughing', minutes: 2 },
  { type: 'Cross-Checking', minutes: 2 },
  { type: 'Boarding', minutes: 2 },
  { type: 'Elbowing', minutes: 2 },
  { type: 'Charging', minutes: 2 },
  { type: 'Delay of Game', minutes: 2 },
  { type: 'Too Many Men', minutes: 2 },
  { type: 'Unsportsmanlike Conduct', minutes: 2 },
  { type: 'High Sticking (Double)', minutes: 4 },
  { type: 'Spearing', minutes: 5 },
  { type: 'Fighting', minutes: 5 },
  { type: 'Checking from Behind', minutes: 5 },
  { type: 'Match Penalty', minutes: 5 },
  { type: 'Game Misconduct', minutes: 10 },
];

const SEVERITY_COLORS: Record<number, string> = {
  2: 'border-yellow-500/30 bg-yellow-500/5',
  4: 'border-orange-500/30 bg-orange-500/5',
  5: 'border-red-500/30 bg-red-500/5',
  10: 'border-neutral-500/30 bg-neutral-500/5',
};

const SEVERITY_BADGE: Record<number, string> = {
  2: 'bg-yellow-500/20 text-yellow-400',
  4: 'bg-orange-500/20 text-orange-400',
  5: 'bg-red-500/20 text-red-400',
  10: 'bg-neutral-500/20 text-neutral-400',
};

interface GameRulesFormProps {
  leagueId: string;
  initialRules: PenaltyRuleConfig[];
}

export function GameRulesForm({ leagueId, initialRules }: GameRulesFormProps) {
  const [rules, setRules] = useState<PenaltyRuleConfig[]>(
    initialRules.length > 0 ? initialRules : []
  );
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const isCustomized = rules.length > 0;

  function addRule() {
    setRules(prev => [...prev, { type: '', minutes: 2 }]);
  }

  function removeRule(index: number) {
    setRules(prev => prev.filter((_, i) => i !== index));
  }

  function updateRule(index: number, field: 'type' | 'minutes', value: string | number) {
    setRules(prev =>
      prev.map((r, i) => (i === index ? { ...r, [field]: value } : r))
    );
  }

  function resetToDefaults() {
    setRules([...DEFAULT_PENALTIES]);
  }

  function clearCustomRules() {
    setRules([]);
  }

  function handleSave() {
    setMessage(null);
    startTransition(async () => {
      const result = await updatePenaltyRules(leagueId, rules);
      if (result.success) {
        setMessage({ type: 'success', text: rules.length > 0 ? 'Penalty rules saved' : 'Reset to default penalties' });
      } else {
        setMessage({ type: 'error', text: result.error || 'Failed to save' });
      }
    });
  }

  // Group rules by minutes for visual organization
  const grouped = isCustomized
    ? [2, 4, 5, 10]
        .map(mins => ({
          minutes: mins,
          label:
            mins === 2 ? 'Minor (2 min)' :
            mins === 4 ? 'Double Minor (4 min)' :
            mins === 5 ? 'Major (5 min)' :
            'Misconduct (10 min)',
          items: rules.map((r, i) => ({ ...r, index: i })).filter(r => r.minutes === mins),
        }))
        .filter(g => g.items.length > 0)
    : [];

  // Any rules with non-standard minutes
  const otherRules = isCustomized
    ? rules
        .map((r, i) => ({ ...r, index: i }))
        .filter(r => ![2, 4, 5, 10].includes(r.minutes))
    : [];

  return (
    <div className="space-y-6">
      {/* Info Card */}
      <div className="bg-white/[0.04] border border-white/10 rounded-xl p-5">
        <h3 className="font-semibold text-white mb-2">Penalty Configuration</h3>
        <p className="text-sm text-neutral-400">
          {isCustomized
            ? `You have ${rules.length} custom penalty types configured. Scorekeepers will see these instead of the default NHL-style list.`
            : 'Using default NHL-style penalties. Add custom rules below to override the defaults for your league.'}
        </p>
      </div>

      {/* Custom Rules */}
      {isCustomized && (
        <div className="space-y-4">
          {grouped.map(group => (
            <div key={group.minutes} className="space-y-2">
              <div className="flex items-center gap-2">
                <span className={cn('text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded',
                  SEVERITY_BADGE[group.minutes] || 'bg-neutral-500/20 text-neutral-400'
                )}>
                  {group.label}
                </span>
              </div>
              {group.items.map(rule => (
                <RuleRow
                  key={rule.index}
                  rule={rule}
                  onUpdate={(field, value) => updateRule(rule.index, field, value)}
                  onRemove={() => removeRule(rule.index)}
                  severityColor={SEVERITY_COLORS[rule.minutes] || ''}
                />
              ))}
            </div>
          ))}

          {otherRules.length > 0 && (
            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                Custom Duration
              </span>
              {otherRules.map(rule => (
                <RuleRow
                  key={rule.index}
                  rule={rule}
                  onUpdate={(field, value) => updateRule(rule.index, field, value)}
                  onRemove={() => removeRule(rule.index)}
                  severityColor=""
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={addRule}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-rink-500/20 text-rink-500 border border-rink-500/30 hover:bg-rink-500/30 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Penalty
        </button>

        {!isCustomized && (
          <button
            onClick={resetToDefaults}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-neutral-800 text-neutral-300 hover:bg-neutral-700 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Start from NHL Defaults
          </button>
        )}

        {isCustomized && (
          <button
            onClick={clearCustomRules}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-neutral-800 text-neutral-300 hover:bg-neutral-700 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Reset to Defaults
          </button>
        )}
      </div>

      {/* Save */}
      <div className="flex items-center gap-4 pt-4 border-t border-white/10">
        <button
          onClick={handleSave}
          disabled={isPending}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold bg-rink-500 text-black hover:bg-rink-400 transition-colors disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {isPending ? 'Saving...' : 'Save Rules'}
        </button>

        {message && (
          <p className={cn(
            'text-sm font-medium',
            message.type === 'success' ? 'text-green-400' : 'text-red-400'
          )}>
            {message.text}
          </p>
        )}
      </div>
    </div>
  );
}

function RuleRow({
  rule,
  onUpdate,
  onRemove,
  severityColor,
}: {
  rule: PenaltyRuleConfig;
  onUpdate: (field: 'type' | 'minutes', value: string | number) => void;
  onRemove: () => void;
  severityColor: string;
}) {
  // Keep a local draft for the minutes input so typing doesn't immediately
  // regroup the row (which would unmount the input and lose focus).
  // The parent state (and grouping) updates after a short delay.
  const [draftMinutes, setDraftMinutes] = useState(rule.minutes);
  const minutesTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // If the parent resets the value externally (e.g. reset to defaults), sync it.
  useEffect(() => {
    setDraftMinutes(rule.minutes);
  }, [rule.minutes]);

  // Clear the timer on unmount to avoid stale updates.
  useEffect(() => {
    return () => {
      if (minutesTimerRef.current) clearTimeout(minutesTimerRef.current);
    };
  }, []);

  const handleMinutesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value) || 1;
    setDraftMinutes(val);
    if (minutesTimerRef.current) clearTimeout(minutesTimerRef.current);
    // Wait 1.5 s before committing to parent — prevents the row from jumping
    // groups while the user is still typing or clicking the spinner.
    minutesTimerRef.current = setTimeout(() => {
      onUpdate('minutes', val);
    }, 1500);
  };

  return (
    <div className={cn(
      'flex items-center gap-3 p-3 rounded-xl border transition-colors',
      severityColor || 'border-white/10 bg-white/[0.02]'
    )}>
      <input
        type="text"
        value={rule.type}
        onChange={e => onUpdate('type', e.target.value)}
        placeholder="Penalty name (e.g. Tripping)"
        className="flex-1 bg-transparent text-white text-sm placeholder-neutral-500 outline-none border-b border-white/10 focus:border-rink-500/50 pb-1 transition-colors"
      />
      <div className="flex items-center gap-1.5">
        <input
          type="number"
          min={1}
          max={60}
          value={draftMinutes}
          onChange={handleMinutesChange}
          className="w-16 bg-neutral-800 text-white text-sm text-center rounded-lg px-2 py-1.5 border border-white/10 focus:border-rink-500/50 outline-none"
        />
        <span className="text-xs text-neutral-400">min</span>
      </div>
      <button
        onClick={onRemove}
        className="p-1.5 rounded-lg text-neutral-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
        aria-label="Remove penalty"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}
