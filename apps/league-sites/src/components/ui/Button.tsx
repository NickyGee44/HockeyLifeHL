'use client';

import { forwardRef } from 'react';
import Link from 'next/link';

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Button style variant */
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline';
  /** Button size */
  size?: 'sm' | 'md' | 'lg';
  /** Show loading state */
  loading?: boolean;
  /** Enable glow effect on hover */
  glow?: boolean;
  /** Render as a link */
  href?: string;
  /** Full width button */
  fullWidth?: boolean;
  /** Icon to show before text */
  icon?: React.ReactNode;
  /** Icon to show after text */
  iconRight?: React.ReactNode;
}

const sizeClasses = {
  sm: 'px-3 py-1.5 text-sm gap-1.5',
  md: 'px-5 py-2.5 text-sm gap-2',
  lg: 'px-6 py-3 text-base gap-2.5',
};

const iconSizes = {
  sm: 'w-4 h-4',
  md: 'w-4 h-4',
  lg: 'w-5 h-5',
};

/**
 * Premium Button component with gradient, glow effects, and loading states.
 * Supports league color theming through CSS variables.
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      className = '',
      variant = 'primary',
      size = 'md',
      loading = false,
      glow = false,
      href,
      fullWidth = false,
      icon,
      iconRight,
      disabled,
      type = 'button',
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading;

    const baseClasses = `
      relative inline-flex items-center justify-center
      font-semibold rounded-lg
      transition-all duration-300 ease-out
      focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--league-primary-border)]
      ${sizeClasses[size]}
      ${fullWidth ? 'w-full' : ''}
      ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
    `;

    const variantClasses = {
      primary: `
        text-[var(--league-on-primary)]
        bg-gradient-to-r from-[var(--league-primary-strong)] to-[var(--league-primary-hover)]
        border border-[var(--league-primary-border)]
        ${!isDisabled ? 'hover:scale-[1.02] hover:-translate-y-0.5 active:scale-[0.98]' : ''}
        ${glow && !isDisabled ? 'hover:shadow-[0_0_30px_var(--league-glow-color)]' : ''}
      `,
      secondary: `
        text-[var(--color-accent)]
        bg-transparent
        border border-[var(--league-primary-border)]
        hover:border-[var(--league-primary-strong)]
        hover:bg-[var(--league-primary-muted)]
        ${!isDisabled ? 'hover:scale-[1.02] active:scale-[0.98]' : ''}
      `,
      ghost: `
        text-[var(--color-text-secondary)]
        bg-transparent
        hover:text-[var(--color-text-primary)]
        hover:bg-[var(--color-surface-hover)]
        ${!isDisabled ? 'active:scale-[0.98]' : ''}
      `,
      outline: `
        text-[var(--color-text-primary)]
        bg-transparent
        border border-[var(--color-border)]
        hover:border-[var(--color-border-emphasis)]
        hover:bg-[var(--color-surface)]
        ${!isDisabled ? 'hover:scale-[1.02] active:scale-[0.98]' : ''}
      `,
    };

    const content = (
      <>
        {/* Loading spinner */}
        {loading && (
          <span className="absolute inset-0 flex items-center justify-center">
            <Spinner className={iconSizes[size]} />
          </span>
        )}

        {/* Button content */}
        <span
          className={`
            inline-flex items-center gap-inherit
            ${loading ? 'invisible' : ''}
          `}
        >
          {icon && <span className={iconSizes[size]}>{icon}</span>}
          {children}
          {iconRight && <span className={iconSizes[size]}>{iconRight}</span>}
        </span>

        {/* Glow effect overlay for primary variant */}
        {glow && variant === 'primary' && !isDisabled && (
          <span
            className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-500 pointer-events-none -z-10 blur-xl rounded-lg"
            style={{ background: 'var(--league-primary-strong)' }}
          />
        )}
      </>
    );

    const classes = `${baseClasses} ${variantClasses[variant]} ${className}`;

    // Render as link if href is provided
    if (href && !isDisabled) {
      return (
        <Link href={href} className={classes}>
          {content}
        </Link>
      );
    }

    return (
      <button
        ref={ref}
        type={type}
        disabled={isDisabled}
        className={classes}
        {...props}
      >
        {content}
      </button>
    );
  }
);

Button.displayName = 'Button';

/**
 * Animated spinner component for loading states
 */
function Spinner({ className = '' }: { className?: string }) {
  return (
    <svg
      className={`animate-spin ${className}`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

/**
 * Button group for grouping multiple buttons
 */
export interface ButtonGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Orientation of the button group */
  orientation?: 'horizontal' | 'vertical';
}

export const ButtonGroup = forwardRef<HTMLDivElement, ButtonGroupProps>(
  ({ children, className = '', orientation = 'horizontal', ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`
          inline-flex
          ${orientation === 'vertical' ? 'flex-col' : 'flex-row'}
          ${className}
        `}
        role="group"
        {...props}
      >
        {children}
      </div>
    );
  }
);

ButtonGroup.displayName = 'ButtonGroup';

/**
 * Icon-only button variant
 */
export interface IconButtonProps
  extends Omit<ButtonProps, 'icon' | 'iconRight' | 'children'> {
  /** Icon to display */
  icon: React.ReactNode;
  /** Accessible label */
  'aria-label': string;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ icon, size = 'md', className = '', ...props }, ref) => {
    const sizeClasses = {
      sm: 'w-8 h-8',
      md: 'w-10 h-10',
      lg: 'w-12 h-12',
    };

    return (
      <Button
        ref={ref}
        size={size}
        className={`!p-0 ${sizeClasses[size]} ${className}`}
        {...props}
      >
        {icon}
      </Button>
    );
  }
);

IconButton.displayName = 'IconButton';

export default Button;
