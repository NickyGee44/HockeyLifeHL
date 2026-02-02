import * as React from 'react';
import { cn } from '@hockey-life/ui';

export interface WizardStepContainerProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
  className?: string;
}

export function WizardStepContainer({
  children,
  title,
  description,
  className,
}: WizardStepContainerProps) {
  return (
    <div className={cn('space-y-6', className)}>
      {(title || description) && (
        <div className="space-y-2">
          {title && (
            <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
          )}
          {description && (
            <p className="text-muted-foreground">{description}</p>
          )}
        </div>
      )}
      <div className="space-y-4">{children}</div>
    </div>
  );
}

export interface WizardStepProps {
  step: number;
  isActive: boolean;
  children: React.ReactNode;
}

export function WizardStep({ step, isActive, children }: WizardStepProps) {
  if (!isActive) {
    return null;
  }

  return (
    <div
      role="tabpanel"
      aria-labelledby={`step-${step}-tab`}
      id={`step-${step}-panel`}
      className="animate-in fade-in duration-300"
    >
      {children}
    </div>
  );
}
