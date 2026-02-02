'use client';

import * as React from 'react';
import { Loader2, Save, Check } from 'lucide-react';
import { cn } from '@hockey-life/ui';

export interface WizardProgressProps {
  currentStep: number;
  totalSteps: number;
  isSaving?: boolean;
  className?: string;
}

export function WizardProgress({
  currentStep,
  totalSteps,
  isSaving = false,
  className,
}: WizardProgressProps) {
  const [showSaved, setShowSaved] = React.useState(false);
  const previousSaving = React.useRef(isSaving);

  // Show "Saved" indicator briefly when saving completes
  React.useEffect(() => {
    if (previousSaving.current && !isSaving) {
      setShowSaved(true);
      const timeout = setTimeout(() => setShowSaved(false), 2000);
      return () => clearTimeout(timeout);
    }
    previousSaving.current = isSaving;
  }, [isSaving]);

  return (
    <div className={cn('flex items-center justify-between', className)}>
      {/* Step counter */}
      <div className="text-sm text-muted-foreground">
        Step {currentStep} of {totalSteps}
      </div>

      {/* Save status indicator */}
      <div className="flex items-center gap-2 text-sm">
        {isSaving ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            <span className="text-muted-foreground">Saving draft...</span>
          </>
        ) : showSaved ? (
          <>
            <Check className="h-4 w-4 text-green-600" />
            <span className="text-green-600">Draft saved</span>
          </>
        ) : (
          <span className="text-muted-foreground">
            {currentStep < totalSteps ? 'Auto-saving enabled' : 'Ready to create'}
          </span>
        )}
      </div>
    </div>
  );
}
