import Link from "next/link";
import Image from "next/image";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Users, Calendar, ExternalLink } from "lucide-react";

export type LeagueCardData = {
  id: string;
  name: string;
  slug: string;
  sport: string;
  description?: string;
  logoUrl?: string;
  bannerUrl?: string;
  primaryColor: string;
  secondaryColor: string;
  location?: string;
  distance?: number;
  teamCount?: number;
  playerCount?: number;
  status: "active" | "inactive" | "registration_open";
  nextGameDate?: string;
};

interface LeagueCardProps {
  league: LeagueCardData;
}

export function LeagueCard({ league }: LeagueCardProps) {
  const leagueUrl = league.slug
    ? `https://${league.slug}.beerleaguehockey.ca`
    : `/league/${league.id}`;

  return (
    <Card className="hover:shadow-lg transition-all duration-200 overflow-hidden group">
      {/* Banner Image */}
      {league.bannerUrl && (
        <div className="relative h-32 w-full overflow-hidden">
          <Image
            src={league.bannerUrl}
            alt={`${league.name} banner`}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-200"
          />
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.3) 100%)`,
            }}
          />
        </div>
      )}

      <CardHeader className="pb-3">
        <div className="flex items-start gap-4">
          {/* Logo */}
          {league.logoUrl && (
            <div className="shrink-0 relative w-16 h-16 rounded-lg overflow-hidden border-2 border-white shadow-md">
              <Image
                src={league.logoUrl}
                alt={league.name}
                fill
                className="object-cover"
              />
            </div>
          )}

          {/* League Name and Status */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-2">
              <CardTitle className="text-xl line-clamp-1">{league.name}</CardTitle>
              {league.status === "registration_open" && (
                <Badge className="bg-green-100 text-green-700 border-green-300 whitespace-nowrap">
                  Open
                </Badge>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant="secondary"
                className="text-xs"
                style={{
                  backgroundColor: `${league.primaryColor}20`,
                  color: league.primaryColor,
                  borderColor: `${league.primaryColor}40`,
                }}
              >
                {league.sport.charAt(0).toUpperCase() + league.sport.slice(1)}
              </Badge>
              {league.location && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  <span className="line-clamp-1">
                    {league.location}
                    {league.distance && ` • ${league.distance} km`}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Description */}
        {league.description && (
          <CardDescription className="line-clamp-2 mt-2">
            {league.description}
          </CardDescription>
        )}
      </CardHeader>

      <CardContent className="pt-0">
        {/* Stats */}
        <div className="flex items-center gap-4 mb-4 text-sm text-muted-foreground">
          {league.teamCount !== undefined && (
            <div className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              <span>{league.teamCount} teams</span>
            </div>
          )}
          {league.playerCount !== undefined && (
            <div className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              <span>{league.playerCount} players</span>
            </div>
          )}
          {league.nextGameDate && (
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              <span>
                Next game{" "}
                {new Date(league.nextGameDate).toLocaleDateString("en-CA", {
                  month: "short",
                  day: "numeric",
                })}
              </span>
            </div>
          )}
        </div>

        {/* Action Button */}
        <Button
          asChild
          className="w-full group/btn"
          style={{
            backgroundColor: league.primaryColor,
            color: "#fff",
          }}
        >
          <Link href={leagueUrl} target="_blank" rel="noopener noreferrer">
            View League
            <ExternalLink className="ml-2 h-4 w-4 group-hover/btn:translate-x-0.5 transition-transform" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

export function LeagueCardSkeleton() {
  return (
    <Card className="overflow-hidden">
      <div className="h-32 w-full bg-accent animate-pulse" />
      <CardHeader className="pb-3">
        <div className="flex items-start gap-4">
          <div className="shrink-0 w-16 h-16 rounded-lg bg-accent animate-pulse" />
          <div className="flex-1 space-y-2">
            <div className="h-6 bg-accent animate-pulse rounded w-3/4" />
            <div className="h-4 bg-accent animate-pulse rounded w-1/2" />
          </div>
        </div>
        <div className="h-10 bg-accent animate-pulse rounded mt-2" />
      </CardHeader>
      <CardContent className="pt-0">
        <div className="h-4 bg-accent animate-pulse rounded mb-4" />
        <div className="h-10 bg-accent animate-pulse rounded" />
      </CardContent>
    </Card>
  );
}
