"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ChevronDown, PlusCircle } from "lucide-react";
import { getUserLeagues, setActiveLeagueId, getActiveLeagueId } from "@/lib/auth/league-context";
import { toast } from "sonner";

export function LeagueSelector() {
  const [leagues, setLeagues] = useState<any[]>([]);
  const [activeLeagueId, setActiveLeagueIdState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function loadLeagues() {
      try {
        const [leaguesData, activeId] = await Promise.all([
          getUserLeagues(),
          getActiveLeagueId()
        ]);
        
        setLeagues(leaguesData.leagues || []);
        setActiveLeagueIdState(activeId);
      } catch (error) {
        console.error("Failed to load leagues:", error);
      } finally {
        setLoading(false);
      }
    }
    loadLeagues();
  }, []);

  const handleSwitch = async (leagueId: string) => {
    if (leagueId === activeLeagueId) return;
    
    const result = await setActiveLeagueId(leagueId);
    if (result.success) {
      setActiveLeagueIdState(leagueId);
      toast.success("Switched league successfully");
      // Redirect to the dashboard of the new league
      router.push("/dashboard");
      router.refresh();
    } else {
      toast.error(result.error || "Failed to switch league");
    }
  };

  const activeLeague = leagues.find(l => l.league_id === activeLeagueId)?.league;

  if (loading) {
    return <div className="h-9 w-[180px] animate-pulse bg-muted rounded-md" />;
  }

  if (leagues.length === 0) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2 px-3 h-9 border-border/50 hover:bg-accent transition-colors">
          <Avatar className="h-5 w-5 border border-border/50">
            <AvatarImage src={activeLeague?.logo_url} />
            <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
              {activeLeague?.name?.substring(0, 2).toUpperCase() || "L"}
            </AvatarFallback>
          </Avatar>
          <span className="max-w-[100px] truncate font-medium text-sm">
            {activeLeague?.name || "Select League"}
          </span>
          <ChevronDown className="h-3 w-3 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[240px]">
        <DropdownMenuLabel className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
          My Leagues
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {leagues.map((membership) => (
          <DropdownMenuItem 
            key={membership.league_id}
            onClick={() => handleSwitch(membership.league_id)}
            className="flex items-center gap-3 cursor-pointer py-2 px-3 focus:bg-accent"
          >
            <Avatar className="h-8 w-8 border border-border/50">
              <AvatarImage src={membership.league.logo_url} />
              <AvatarFallback className="text-xs bg-muted">
                {membership.league.name.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col gap-0.5 overflow-hidden">
              <span className={cn(
                "truncate text-sm font-medium",
                activeLeagueId === membership.league_id ? "text-primary font-bold" : "text-foreground"
              )}>
                {membership.league.name}
              </span>
              <span className="text-[10px] text-muted-foreground capitalize flex items-center gap-1">
                <span className="w-1 h-1 rounded-full bg-green-500" />
                {membership.role}
              </span>
            </div>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => router.push("/signup")} className="cursor-pointer py-2">
          <PlusCircle className="mr-2 h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Create New League</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(" ");
}
