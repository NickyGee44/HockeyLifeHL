import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

type TeamLogoProps = {
  team: {
    id: string;
    name: string;
    short_name: string;
    logo_url?: string | null;
    primary_color?: string | null;
    secondary_color?: string | null;
  };
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  showName?: boolean;
  clickable?: boolean;
  className?: string;
  nameClassName?: string;
};

const sizeClasses = {
  xs: "w-4 h-4 text-[8px]",
  sm: "w-6 h-6 text-xs",
  md: "w-8 h-8 text-sm",
  lg: "w-12 h-12 text-base",
  xl: "w-16 h-16 text-xl",
};

const imageSizes = {
  xs: 16,
  sm: 24,
  md: 32,
  lg: 48,
  xl: 64,
};

export function TeamLogo({
  team,
  size = "md",
  showName = false,
  clickable = true,
  className,
  nameClassName,
}: TeamLogoProps) {
  const logoElement = team.logo_url ? (
    <Image
      src={team.logo_url}
      alt={`${team.name} logo`}
      width={imageSizes[size]}
      height={imageSizes[size]}
      className={cn(
        "rounded object-contain",
        sizeClasses[size].split(" ").slice(0, 2).join(" "),
        className
      )}
    />
  ) : (
    <div
      className={cn(
        "rounded flex items-center justify-center font-bold",
        sizeClasses[size],
        className
      )}
      style={{
        backgroundColor: team.primary_color || "#3b82f6",
        color: team.secondary_color || "#ffffff",
      }}
    >
      {team.short_name}
    </div>
  );

  const content = showName ? (
    <div className="flex items-center gap-2">
      {logoElement}
      <span className={cn("font-medium", nameClassName)}>{team.name}</span>
    </div>
  ) : (
    logoElement
  );

  if (clickable) {
    return (
      <Link
        href={`/teams/${team.id}`}
        className="hover:opacity-80 transition-opacity"
      >
        {content}
      </Link>
    );
  }

  return content;
}

// Convenience component for displaying team matchups
type TeamMatchupProps = {
  homeTeam: TeamLogoProps["team"] | null;
  awayTeam: TeamLogoProps["team"] | null;
  homeScore?: number | null;
  awayScore?: number | null;
  showScores?: boolean;
  size?: TeamLogoProps["size"];
};

export function TeamMatchup({
  homeTeam,
  awayTeam,
  homeScore,
  awayScore,
  showScores = false,
  size = "sm",
}: TeamMatchupProps) {
  return (
    <div className="flex items-center gap-4">
      <div className="flex-1 flex items-center justify-end gap-2">
        {homeTeam ? (
          <TeamLogo team={homeTeam} size={size} showName />
        ) : (
          <span className="font-semibold">TBD</span>
        )}
      </div>

      <div className="text-center min-w-[60px]">
        {showScores && homeScore !== null && awayScore !== null ? (
          <div className="font-mono font-bold">
            {homeScore} - {awayScore}
          </div>
        ) : (
          <div className="text-muted-foreground">vs</div>
        )}
      </div>

      <div className="flex-1 flex items-center gap-2">
        {awayTeam ? (
          <TeamLogo team={awayTeam} size={size} showName />
        ) : (
          <span className="font-semibold">TBD</span>
        )}
      </div>
    </div>
  );
}
