// @ts-nocheck
import * as React from 'react';
import { Label } from './label';
import { cn } from '../utils';

export interface FormFieldProps {
  label?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
  htmlFor?: string;
  className?: string;
}

const FormField = React.forwardRef<HTMLDivElement, FormFieldProps>(
  ({ label, error, hint, required, children, htmlFor, className }, ref) => {
    const errorId = htmlFor ? `${htmlFor}-error` : undefined;
    const hintId = htmlFor ? `${htmlFor}-hint` : undefined;

    return (
      <div ref={ref} className={cn('space-y-2', className)}>
        {label && (
          <Label htmlFor={htmlFor}>
            {label}
            {required && <span className="text-destructive ml-1">*</span>}
          </Label>
        )}
        <div className="relative">
          {React.cloneElement(children as React.ReactElement, {
            id: htmlFor,
            'aria-invalid': error ? 'true' : undefined,
            'aria-describedby': cn(
              error && errorId,
              hint && hintId
            ) || undefined,
          } as any)}
        </div>
        {hint && !error && (
          <p id={hintId} className="text-sm text-muted-foreground">
            {hint}
          </p>
        )}
        {error && (
          <p id={errorId} className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }
);
FormField.displayName = 'FormField';

export { FormField };
