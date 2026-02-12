"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Season = {
  id: string;
  name: string;
  status: string;
};

type SeasonSelectorProps = {
  seasons: Season[];
  currentSeasonId?: string;
  activeSeason?: Season | null;
};

export function SeasonSelector({
  seasons,
  currentSeasonId,
  activeSeason
}: SeasonSelectorProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handleSeasonChange = (seasonId: string) => {
    const params = new URLSearchParams(searchParams.toString());

    if (seasonId === "current" && activeSeason) {
      params.delete("season");
    } else {
      params.set("season", seasonId);
    }
    router.push(params.toString() ? `${pathname}?${params.toString()}` : pathname);
  };

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-muted-foreground">Season:</span>
      <Select 
        value={currentSeasonId || "current"} 
        onValueChange={handleSeasonChange}
      >
        <SelectTrigger className="w-[250px]">
          <SelectValue placeholder="Select Season" />
        </SelectTrigger>
        <SelectContent>
          {activeSeason && (
            <SelectItem value="current">
              <div className="flex items-center gap-2">
                <Badge className="bg-green-600 text-[10px] px-1">Active</Badge>
                {activeSeason.name}
              </div>
            </SelectItem>
          )}
          {seasons.filter(s => s.id !== activeSeason?.id).map((season) => (
            <SelectItem key={season.id} value={season.id}>
              <div className="flex items-center gap-2">
                {season.status === "completed" && (
                  <Badge variant="outline" className="text-[10px] px-1">Past</Badge>
                )}
                {season.status === "playoffs" && (
                  <Badge className="bg-gold text-puck-black text-[10px] px-1">Playoffs</Badge>
                )}
                {season.name}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
