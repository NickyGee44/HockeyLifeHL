'use client';

import { forwardRef } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

export interface ErrorCardProps {
  /** Error message to display */
  message?: string;
  /** Optional title for the error */
  title?: string;
  /** Callback function for retry button */
  onRetry?: () => void;
  /** Whether retry is in progress */
  isRetrying?: boolean;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Additional CSS classes */
  className?: string;
}

const sizeClasses = {
  sm: {
    container: 'p-4',
    icon: 'w-5 h-5',
    title: 'text-sm font-medium',
    message: 'text-xs',
    button: 'px-3 py-1.5 text-xs',
  },
  md: {
    container: 'p-6',
    icon: 'w-6 h-6',
    title: 'text-base font-semibold',
    message: 'text-sm',
    button: 'px-4 py-2 text-sm',
  },
  lg: {
    container: 'p-8',
    icon: 'w-8 h-8',
    title: 'text-lg font-bold',
    message: 'text-base',
    button: 'px-5 py-2.5 text-sm',
  },
};

/**
 * Error display card with retry functionality.
 * Matches the dark theme styling of league-sites.
 */
export const ErrorCard = forwardRef<HTMLDivElement, ErrorCardProps>(
  (
    {
      message = 'Something went wrong. Please try again.',
      title = 'Error',
      onRetry,
      isRetrying = false,
      size = 'md',
      className = '',
    },
    ref
  ) => {
    const classes = sizeClasses[size];

    return (
      <div
        ref={ref}
        className={`
          bg-red-500/10
          border border-red-500/20
          rounded-xl
          ${classes.container}
          ${className}
        `}
      >
        <div className="flex flex-col items-center text-center space-y-3">
          {/* Icon */}
          <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
            <AlertCircle className={`${classes.icon} text-red-400`} />
          </div>

          {/* Title */}
          <h3 className={`${classes.title} text-red-300`}>
            {title}
          </h3>

          {/* Message */}
          <p className={`${classes.message} text-red-400/80 max-w-md`}>
            {message}
          </p>

          {/* Retry Button */}
          {onRetry && (
            <button
              onClick={onRetry}
              disabled={isRetrying}
              className={`
                ${classes.button}
                inline-flex items-center gap-2
                bg-red-500/20
                hover:bg-red-500/30
                text-red-300
                rounded-lg
                font-medium
                transition-all
                disabled:opacity-50
                disabled:cursor-not-allowed
                focus:outline-none
                focus:ring-2
                focus:ring-red-500/50
              `}
            >
              <RefreshCw
                className={`w-4 h-4 ${isRetrying ? 'animate-spin' : ''}`}
              />
              {isRetrying ? 'Retrying...' : 'Try Again'}
            </button>
          )}
        </div>
      </div>
    );
  }
);

ErrorCard.displayName = 'ErrorCard';

/**
 * Inline error message component for smaller error displays
 */
export interface InlineErrorProps {
  message: string;
  className?: string;
}

export function InlineError({ message, className = '' }: InlineErrorProps) {
  return (
    <div className={`flex items-center gap-2 text-red-400 text-sm ${className}`}>
      <AlertCircle className="w-4 h-4 flex-shrink-0" />
      <span>{message}</span>
    </div>
  );
}

export default ErrorCard;
