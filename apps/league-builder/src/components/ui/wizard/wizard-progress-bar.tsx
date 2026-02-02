import * as React from 'react';
import { Check } from 'lucide-react';
import { cn } from '@hockey-life/ui';

export interface WizardStep {
  number: number;
  title: string;
  description?: string;
}

export interface WizardProgressBarProps {
  steps: WizardStep[];
  currentStep: number;
  className?: string;
}

export function WizardProgressBar({
  steps,
  currentStep,
  className,
}: WizardProgressBarProps) {
  return (
    <nav aria-label="Progress" className={cn('w-full', className)}>
      <ol role="list" className="flex items-center justify-between">
        {steps.map((step, stepIdx) => {
          const isComplete = step.number < currentStep;
          const isCurrent = step.number === currentStep;
          const isUpcoming = step.number > currentStep;

          return (
            <li
              key={step.number}
              className={cn(
                'relative',
                stepIdx !== steps.length - 1 ? 'flex-1' : 'flex-none'
              )}
            >
              <div className="group flex items-center">
                <span className="flex items-center">
                  <span
                    className={cn(
                      'relative flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors',
                      isComplete &&
                        'border-primary bg-primary text-primary-foreground',
                      isCurrent &&
                        'border-primary bg-background text-primary',
                      isUpcoming && 'border-muted bg-background text-muted-foreground'
                    )}
                    aria-current={isCurrent ? 'step' : undefined}
                  >
                    {isComplete ? (
                      <Check className="h-5 w-5" aria-hidden="true" />
                    ) : (
                      <span className="text-sm font-semibold">
                        {step.number}
                      </span>
                    )}
                  </span>
                  <span className="ml-3 flex flex-col">
                    <span
                      className={cn(
                        'text-sm font-medium transition-colors',
                        isComplete && 'text-primary',
                        isCurrent && 'text-primary',
                        isUpcoming && 'text-muted-foreground'
                      )}
                    >
                      {step.title}
                    </span>
                    {step.description && (
                      <span className="text-xs text-muted-foreground">
                        {step.description}
                      </span>
                    )}
                  </span>
                </span>

                {stepIdx !== steps.length - 1 && (
                  <div
                    className="ml-4 mr-4 flex-1 h-0.5 bg-muted"
                    aria-hidden="true"
                  >
                    <div
                      className={cn(
                        'h-full bg-primary transition-all duration-500',
                        isComplete ? 'w-full' : 'w-0'
                      )}
                    />
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
