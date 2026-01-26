"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Check, ChevronsUpDown, PlusCircle, Globe } from "lucide-react";
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
import { currentLeague } from "@/lib/league-config";

// Mock data until Agent 2 provides API
const MOCK_LEAGUES = [
  {
    id: "1",
    name: "HockeyLifeHL",
    slug: "hockeylifehl",
    logo: "/logo.png",
    role: "owner"
  },
  {
    id: "2",
    name: "Sunday Beer League",
    slug: "sunday-beer",
    logo: "",
    role: "player"
  }
];

export function LeagueSwitcher({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const [selectedLeague, setSelectedLeague] = useState(MOCK_LEAGUES[0]);
  const router = useRouter();

  // In real implementation, this would come from useLeague() hook
  const handleLeagueSwitch = (league: typeof MOCK_LEAGUES[0]) => {
    setSelectedLeague(league);
    setOpen(false);
    toast.success(`Switched to ${league.name}`);
    // Agent 2 will provide the actual switch logic (cookies/session)
    // router.push(`/leagues/${league.slug}`);
    router.refresh();
  };

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
              <AvatarImage src={selectedLeague.logo} alt={selectedLeague.name} />
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
              {MOCK_LEAGUES.map((league) => (
                <CommandItem
                  key={league.id}
                  onSelect={() => handleLeagueSwitch(league)}
                  className="text-sm"
                >
                  <Avatar className="mr-2 h-5 w-5">
                    <AvatarImage src={league.logo} alt={league.name} />
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
