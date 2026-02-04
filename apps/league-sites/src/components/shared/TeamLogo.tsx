import Image from 'next/image';

interface TeamLogoProps {
  logoUrl: string | null;
  teamName: string;
  teamColor?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
}

const sizeMap = {
  xs: 24,
  sm: 32,
  md: 48,
  lg: 64,
  xl: 96,
} as const;

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
}: TeamLogoProps) {
  const pixelSize = sizeMap[size];
  const initial = teamName.charAt(0).toUpperCase();

  // Calculate font size based on container size (approximately 50% of container)
  const fontSizeMap = {
    xs: 'text-xs',
    sm: 'text-sm',
    md: 'text-lg',
    lg: 'text-2xl',
    xl: 'text-4xl',
  } as const;

  if (logoUrl) {
    return (
      <Image
        src={logoUrl}
        alt={`${teamName} logo`}
        width={pixelSize}
        height={pixelSize}
        className="rounded-lg object-cover"
        style={{ width: pixelSize, height: pixelSize }}
      />
    );
  }

  // Fallback to team initial in colored circle
  return (
    <div
      className={`flex items-center justify-center rounded-lg font-bold ${fontSizeMap[size]}`}
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

export default TeamLogo;
