'use client';

import { forwardRef } from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Card style variant */
  variant?: 'default' | 'glass' | 'strong' | 'gradient' | 'elevated';
  /** Enable hover lift effect */
  hover?: boolean;
  /** Enable glow effect on hover */
  glow?: boolean;
  /** Custom glow color (uses league primary by default) */
  glowColor?: string;
  /** Add padding */
  padding?: 'none' | 'sm' | 'md' | 'lg';
  /** Border radius size */
  radius?: 'sm' | 'md' | 'lg' | 'xl';
}

const paddingClasses = {
  none: '',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
};

const radiusClasses = {
  sm: 'rounded-lg',
  md: 'rounded-xl',
  lg: 'rounded-2xl',
  xl: 'rounded-3xl',
};

/**
 * Premium Card component with glass morphism, gradient borders, and hover effects.
 * Supports league color theming through CSS variables.
 */
export const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    {
      children,
      className = '',
      variant = 'default',
      hover = true,
      glow = false,
      glowColor,
      padding = 'md',
      radius = 'lg',
      style,
      ...props
    },
    ref
  ) => {
    const baseClasses = `
      relative overflow-hidden
      transition-all duration-300 ease-out
      ${paddingClasses[padding]}
      ${radiusClasses[radius]}
    `;

    const variantClasses = {
      default: `
        glass-card
      `,
      glass: `
        glass-card
      `,
      strong: `
        glass-card-strong
      `,
      gradient: `
        glass-card
        before:absolute before:inset-0 before:-z-10
        before:rounded-[inherit] before:p-[1px]
        before:bg-gradient-to-br before:from-[var(--league-primary)] before:via-transparent before:to-[var(--league-primary)]/30
        before:content-[''] before:pointer-events-none
        ${hover ? 'hover:before:opacity-100 before:opacity-60' : ''}
      `,
      elevated: `
        glass-card-strong
      `,
    };

    const hoverClasses = hover
      ? 'hover:-translate-y-1 hover:scale-[1.01] cursor-pointer'
      : '';

    const glowStyles = glow
      ? {
          boxShadow: `0 0 0 rgba(var(--league-primary-rgb, 22, 119, 255), 0)`,
        }
      : {};

    return (
      <div
        ref={ref}
        className={`
          ${baseClasses}
          ${variantClasses[variant]}
          ${hoverClasses}
          ${glow ? 'group' : ''}
          ${className}
        `}
        style={{
          ...glowStyles,
          ...style,
        }}
        {...props}
      >
        {/* Glow effect overlay */}
        {glow && (
          <div
            className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none -z-10 blur-xl"
            style={{
              background: glowColor || 'var(--league-primary)',
              transform: 'scale(0.8)',
            }}
          />
        )}

        {/* Content */}
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

/**
 * Card Header component for consistent header styling
 */
export interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Header title */
  title?: string;
  /** Show accent line */
  accent?: boolean;
}

export const CardHeader = forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ children, title, accent = false, className = '', ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`
          relative mb-4 pb-4
          ${accent ? 'border-b border-[var(--color-border)]' : ''}
          ${className}
        `}
        {...props}
      >
        {accent && (
          <div
            className="absolute bottom-0 left-0 w-12 h-[2px]"
            style={{ background: 'var(--league-primary)' }}
          />
        )}
        {title && (
          <h3 className="font-bold text-lg text-[var(--color-text-primary)]">
            {title}
          </h3>
        )}
        {children}
      </div>
    );
  }
);

CardHeader.displayName = 'CardHeader';

/**
 * Card Content component for consistent content padding
 */
export const CardContent = forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ children, className = '', ...props }, ref) => {
  return (
    <div ref={ref} className={`${className}`} {...props}>
      {children}
    </div>
  );
});

CardContent.displayName = 'CardContent';

/**
 * Card Footer component for consistent footer styling
 */
export const CardFooter = forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ children, className = '', ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={`
        mt-4 pt-4 border-t border-[var(--color-border)]
        ${className}
      `}
      {...props}
    >
      {children}
    </div>
  );
});

CardFooter.displayName = 'CardFooter';

export default Card;
