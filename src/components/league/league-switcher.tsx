"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronsUpDown, PlusCircle, Globe, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { getUserLeagues, setActiveLeagueId } from "@/lib/auth/league-context";
import type { LeagueMembership } from "@/lib/auth/league-context";

type LeagueOption = {
  id: string;
  name: string;
  slug: string;
  logo_url?: string;
  role: string;
};

export function LeagueSwitcher({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const [leagues, setLeagues] = useState<LeagueOption[]>([]);
  const [selectedLeague, setSelectedLeague] = useState<LeagueOption | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // Load user's leagues on mount
  useEffect(() => {
    async function loadLeagues() {
      try {
        const { leagues: userLeagues, error } = await getUserLeagues();

        if (error) {
          console.error("Error loading leagues:", error);
          toast.error("Failed to load leagues");
          setIsLoading(false);
          return;
        }

        if (userLeagues && userLeagues.length > 0) {
          const leagueOptions: LeagueOption[] = userLeagues.map((membership: LeagueMembership) => ({
            id: membership.league.id,
            name: membership.league.name,
            slug: membership.league.slug,
            logo_url: membership.league.logo_url,
            role: membership.role,
          }));

          setLeagues(leagueOptions);

          // Set the first league as selected (assumes it's the active one)
          setSelectedLeague(leagueOptions[0]);
        }

        setIsLoading(false);
      } catch (err: any) {
        console.error("Error in loadLeagues:", err);
        toast.error("Failed to load leagues");
        setIsLoading(false);
      }
    }

    loadLeagues();
  }, []);

  const handleLeagueSwitch = async (league: LeagueOption) => {
    try {
      const result = await setActiveLeagueId(league.id);

      if (result.error) {
        toast.error(`Failed to switch league: ${result.error}`);
        return;
      }

      setSelectedLeague(league);
      setOpen(false);
      toast.success(`Switched to ${league.name}`);

      // Refresh the page to reload with new league context
      router.refresh();
    } catch (err: any) {
      console.error("Error switching league:", err);
      toast.error("Failed to switch league");
    }
  };

  if (isLoading) {
    return (
      <Button variant="outline" className={cn("w-[200px] justify-between", className)} disabled>
        <Loader2 className="h-4 w-4 animate-spin" />
      </Button>
    );
  }

  if (!selectedLeague) {
    return (
      <Button variant="outline" className={cn("w-[200px] justify-between", className)} disabled>
        <span className="text-muted-foreground">No league</span>
      </Button>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-[200px] justify-between", className)}
        >
          <div className="flex items-center gap-2 truncate">
            <Avatar className="h-5 w-5">
              <AvatarImage src={selectedLeague.logo_url || "/logo.png"} alt={selectedLeague.name} />
              <AvatarFallback>{selectedLeague.name.substring(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <span className="truncate">{selectedLeague.name}</span>
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0">
        <Command>
          <CommandInput placeholder="Search league..." />
          <CommandList>
            <CommandEmpty>No league found.</CommandEmpty>
            <CommandGroup heading="My Leagues">
              {leagues.map((league) => (
                <CommandItem
                  key={league.id}
                  onSelect={() => handleLeagueSwitch(league)}
                  className="text-sm"
                >
                  <Avatar className="mr-2 h-5 w-5">
                    <AvatarImage src={league.logo_url || "/logo.png"} alt={league.name} />
                    <AvatarFallback>{league.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  {league.name}
                  <Check
                    className={cn(
                      "ml-auto h-4 w-4",
                      selectedLeague.id === league.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup>
              <CommandItem onSelect={() => router.push("/signup")}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Create League
              </CommandItem>
              <CommandItem onSelect={() => router.push("/")}>
                <Globe className="mr-2 h-4 w-4" />
                Marketing Site
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
