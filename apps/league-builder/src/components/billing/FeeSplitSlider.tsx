'use client';

import { useState, useRef, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { updateLeagueFeeShare } from '@/lib/actions/fees';

interface FeeSplitSliderProps {
  leagueId: string;
  platformFeeBps: number;
  initialSharePercent: number;
  pricingTier: string;
}

function formatDollars(cents: number): string {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
  }).format(cents / 100);
}

export function FeeSplitSlider({
  leagueId,
  platformFeeBps,
  initialSharePercent,
  pricingTier,
}: FeeSplitSliderProps) {
  const t = useTranslations('billing.feeSplit');
  const [sharePercent, setSharePercent] = useState(initialSharePercent);
  const [saving, setSaving] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Don't render for small tier (flat fee, no percentage)
  if (pricingTier === 'small') return null;

  const feePercent = (platformFeeBps / 100).toFixed(2);

  // Preview calculation for a $100 registration (10000 cents)
  const baseAmountCents = 10000;
  const totalFeeCents = Math.round((baseAmountCents * platformFeeBps) / 10000);
  const playerShareCents = Math.round(totalFeeCents * sharePercent / 100);
  const playerPaysCents = baseAmountCents + playerShareCents;
  const leagueReceivesCents = baseAmountCents - (totalFeeCents - playerShareCents);

  const debouncedSave = useCallback(
    (value: number) => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      debounceRef.current = setTimeout(async () => {
        setSaving(true);
        const result = await updateLeagueFeeShare(leagueId, value);
        setSaving(false);
        if (result.success) {
          toast.success(t('saved'));
        } else {
          toast.error(t('saveFailed'), { description: result.error });
        }
      }, 500);
    },
    [leagueId, t]
  );

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = Number(e.target.value);
    setSharePercent(value);
    debouncedSave(value);
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{t('title')}</CardTitle>
        <CardDescription>
          {t('description', { percent: feePercent })}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Slider */}
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm font-medium text-muted-foreground">
              {t('leagueAbsorbs')}
            </span>
            <span className="text-sm font-medium text-muted-foreground">
              {t('playersPay')}
            </span>
          </div>
          <div className="relative">
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={sharePercent}
              onChange={handleChange}
              className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-primary"
            />
          </div>
          <div className="flex items-center justify-center">
            <span className="text-sm font-semibold tabular-nums">
              {sharePercent}%
            </span>
            {saving && (
              <span className="ml-2 text-xs text-muted-foreground animate-pulse">
                Saving...
              </span>
            )}
          </div>
        </div>

        {/* Preview */}
        <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
          <p className="text-sm font-medium">{t('previewTitle')}</p>
          <div className="grid grid-cols-2 gap-y-1.5 text-sm">
            <span className="text-muted-foreground">{t('playerCharge')}</span>
            <span className="text-right font-semibold tabular-nums">
              {formatDollars(playerPaysCents)}
            </span>
            <span className="text-muted-foreground">{t('leagueReceives')}</span>
            <span className="text-right font-semibold tabular-nums">
              {formatDollars(leagueReceivesCents)}
            </span>
            <span className="text-muted-foreground">{t('platformGets')}</span>
            <span className="text-right font-semibold tabular-nums">
              {formatDollars(totalFeeCents)}{' '}
              <span className="text-xs text-muted-foreground">{t('always')}</span>
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
