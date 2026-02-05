'use client';

import * as React from 'react';
import { cn } from '@hockey-life/ui';
import { Trophy } from 'lucide-react';

export interface LeagueLogoProps {
  /** URL to the league's logo image */
  logoUrl?: string | null;
  /** League name - used for alt text and fallback initials */
  leagueName?: string;
  /** Primary color - used for fallback background */
  primaryColor?: string;
  /** Size preset or custom dimensions */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | number;
  /** Shape of the container */
  shape?: 'square' | 'circle';
  /** Additional CSS classes */
  className?: string;
  /** Whether to show a border */
  bordered?: boolean;
  /** Custom fallback content instead of initials */
  fallback?: React.ReactNode;
}

const sizeMap = {
  xs: 24,
  sm: 32,
  md: 48,
  lg: 64,
  xl: 96,
};

/**
 * Generate initials from league name
 * - Takes first letter of first 2 words
 * - Falls back to first 2 letters if single word
 */
function getInitials(name: string): string {
  if (!name) return 'HL';

  const words = name.trim().split(/\s+/);

  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }

  return name.substring(0, 2).toUpperCase();
}

/**
 * LeagueLogo component displays a league's logo with automatic fallback
 * to initials or an icon when no logo is available.
 *
 * Features:
 * - Displays logo image with proper scaling
 * - Falls back to initials derived from league name
 * - Uses primary color as fallback background
 * - Supports multiple sizes and shapes
 */
export function LeagueLogo({
  logoUrl,
  leagueName = '',
  primaryColor = '#22D3EE',
  size = 'md',
  shape = 'square',
  className,
  bordered = false,
  fallback,
}: LeagueLogoProps) {
  const [imageError, setImageError] = React.useState(false);

  // Reset error state when URL changes
  React.useEffect(() => {
    setImageError(false);
  }, [logoUrl]);

  // Calculate dimensions
  const dimension = typeof size === 'number' ? size : sizeMap[size];

  // Calculate icon/font sizes based on dimension
  const iconSize = Math.max(dimension * 0.4, 12);
  const fontSize = Math.max(dimension * 0.35, 10);

  const containerClasses = cn(
    'relative overflow-hidden flex items-center justify-center',
    shape === 'circle' ? 'rounded-full' : 'rounded-xl',
    bordered && 'border-2 border-white/10',
    className
  );

  const containerStyle: React.CSSProperties = {
    width: dimension,
    height: dimension,
    minWidth: dimension,
    minHeight: dimension,
  };

  // If we have a valid logo URL and no error, show the image
  if (logoUrl && !imageError) {
    return (
      <div className={containerClasses} style={containerStyle}>
        <div className="absolute inset-0 bg-neutral-800/50" />
        <img
          src={logoUrl}
          alt={leagueName ? `${leagueName} logo` : 'League logo'}
          className="relative w-full h-full object-contain p-1"
          onError={() => setImageError(true)}
          loading="lazy"
        />
      </div>
    );
  }

  // Fallback display
  return (
    <div
      className={containerClasses}
      style={{
        ...containerStyle,
        backgroundColor: primaryColor,
      }}
    >
      {fallback ? (
        fallback
      ) : leagueName ? (
        <span
          className="font-bold text-white"
          style={{ fontSize }}
        >
          {getInitials(leagueName)}
        </span>
      ) : (
        <Trophy
          className="text-white/80"
          style={{ width: iconSize, height: iconSize }}
        />
      )}
    </div>
  );
}

/**
 * LeagueLogoSkeleton for loading states
 */
export function LeagueLogoSkeleton({
  size = 'md',
  shape = 'square',
  className,
}: Pick<LeagueLogoProps, 'size' | 'shape' | 'className'>) {
  const dimension = typeof size === 'number' ? size : sizeMap[size];

  return (
    <div
      className={cn(
        'animate-pulse bg-neutral-700/50',
        shape === 'circle' ? 'rounded-full' : 'rounded-xl',
        className
      )}
      style={{
        width: dimension,
        height: dimension,
        minWidth: dimension,
        minHeight: dimension,
      }}
    />
  );
}
