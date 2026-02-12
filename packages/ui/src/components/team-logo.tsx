import * as React from 'react';
import { cn } from '../utils';

// ============================================================================
// TYPES
// ============================================================================

export interface TeamLogoProps {
  logoUrl: string | null;
  teamName: string;
  teamColor?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
  className?: string;
  /** Render a custom image element (e.g. next/image). If not provided, uses <img>. */
  renderImage?: (props: {
    src: string;
    alt: string;
    width: number;
    height: number;
    className: string;
  }) => React.ReactNode;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const sizeMap = {
  xs: 24,
  sm: 32,
  md: 48,
  lg: 64,
  xl: 96,
  '2xl': 128,
  '3xl': 160,
} as const;

const fontSizeMap = {
  xs: 'text-xs',
  sm: 'text-sm',
  md: 'text-lg',
  lg: 'text-2xl',
  xl: 'text-4xl',
  '2xl': 'text-5xl',
  '3xl': 'text-6xl',
} as const;

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * TeamLogo - Reusable team logo component with fallback to initials
 *
 * Displays the team logo image if available, otherwise shows the first
 * letter of the team name in a colored circle using the team's color
 * or the league primary color as fallback.
 */
export function TeamLogo({
  logoUrl,
  teamName,
  teamColor,
  size = 'md',
  className,
  renderImage,
}: TeamLogoProps) {
  const pixelSize = sizeMap[size];
  const initial = teamName.charAt(0).toUpperCase();

  if (logoUrl) {
    const imageProps = {
      src: logoUrl,
      alt: `${teamName} logo`,
      width: pixelSize,
      height: pixelSize,
      className: cn('rounded-lg object-cover', className),
    };

    if (renderImage) {
      return <>{renderImage(imageProps)}</>;
    }

    return (
      <img
        {...imageProps}
        style={{ width: pixelSize, height: pixelSize }}
      />
    );
  }

  // Fallback to team initial in colored circle
  return (
    <div
      className={cn(
        `flex items-center justify-center rounded-lg font-bold ${fontSizeMap[size]}`,
        className,
      )}
      style={{
        width: pixelSize,
        height: pixelSize,
        backgroundColor: teamColor || 'var(--league-primary)',
        color: 'var(--color-background)',
      }}
      aria-label={`${teamName} logo`}
    >
      {initial}
    </div>
  );
}
