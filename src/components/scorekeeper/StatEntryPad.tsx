"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Target, User, Shield, Clock, X, Check, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { submitStatEntry, deleteStatEntry } from "@/lib/scorekeepers/stat-actions";
import { addToOfflineQueue } from "@/lib/scorekeeper/offline-queue";
import { validateStatEntry, checkRateLimit } from "@/lib/scorekeeper/stat-validation";

interface Player {
  id: string;
  jersey_number: number;
  position: string;
  player: {
    id: string;
    full_name: string;
  };
}

interface StatEntryPadProps {
  gameId: string;
  homeTeamId: string;
  awayTeamId: string;
  homeTeamName: string;
  awayTeamName: string;
  homeRoster: Player[];
  awayRoster: Player[];
}

export function StatEntryPad({
  gameId,
  homeTeamId,
  awayTeamId,
  homeTeamName,
  awayTeamName,
  homeRoster,
  awayRoster,
}: StatEntryPadProps) {
  const [selectedTeam, setSelectedTeam] = useState<"home" | "away">("home");
  const [period, setPeriod] = useState<number>(1);
  const [jerseyNumber, setJerseyNumber] = useState("");
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [isOnline, setIsOnline] = useState(true);
  const [lastEntry, setLastEntry] = useState<any>(null);
  const [lastStatId, setLastStatId] = useState<string | null>(null);
  const [lastEntryTime, setLastEntryTime] = useState<number | null>(null);
  const [currentStats, setCurrentStats] = useState({
    homeGoals: 0,
    awayGoals: 0,
    homeShots: 0,
    awayShots: 0,
    homePIM: 0,
    awayPIM: 0,
  });

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    setIsOnline(navigator.onLine);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Memoize current roster and team ID to prevent unnecessary re-computations
  const currentRoster = useMemo(
    () => (selectedTeam === "home" ? homeRoster : awayRoster),
    [selectedTeam, homeRoster, awayRoster]
  );

  const currentTeamId = useMemo(
    () => (selectedTeam === "home" ? homeTeamId : awayTeamId),
    [selectedTeam, homeTeamId, awayTeamId]
  );

  // Create a lookup map for faster jersey number search (O(1) instead of O(n))
  const playerLookup = useMemo(() => {
    const lookup = new Map<string, Player>();
    currentRoster.forEach((player) => {
      lookup.set(player.jersey_number.toString(), player);
    });
    return lookup;
  }, [currentRoster]);

  // Jersey number autocomplete with debouncing
  useEffect(() => {
    // Debounce timer to prevent excessive lookups while typing
    const timeoutId = setTimeout(() => {
      if (jerseyNumber) {
        const player = playerLookup.get(jerseyNumber);
        setSelectedPlayer(player || null);
      } else {
        setSelectedPlayer(null);
      }
    }, 150); // 150ms debounce - fast enough to feel instant, reduces lookups

    return () => clearTimeout(timeoutId);
  }, [jerseyNumber, playerLookup]);

  // Memoize updateLocalStats to prevent re-creation on every render
  const updateLocalStats = useCallback((statType: string, team: 'home' | 'away', pimValue?: number) => {
    setCurrentStats(prev => {
      const newStats = { ...prev };

      if (statType === 'Goal') {
        if (team === 'home') newStats.homeGoals++;
        else newStats.awayGoals++;
      } else if (statType === 'Shot') {
        if (team === 'home') newStats.homeShots++;
        else newStats.awayShots++;
      } else if (statType === 'PIM') {
        const minutes = pimValue || 2;
        if (team === 'home') newStats.homePIM += minutes;
        else newStats.awayPIM += minutes;
      }

      return newStats;
    });
  }, []);

  // Memoize handleStatEntry to prevent re-creation on every render
  const handleStatEntry = useCallback(async (statType: string, pimValue?: number) => {
    if (!selectedPlayer) {
      toast.error("Select a player first");
      return;
    }

    // Rate limiting check (prevent rapid duplicate entries)
    const rateLimitCheck = checkRateLimit(lastEntryTime, 1000);
    if (!rateLimitCheck.valid) {
      toast.error(rateLimitCheck.error);
      return;
    }

    // Validate stat entry
    const validation = validateStatEntry({
      statType,
      period,
      playerPosition: selectedPlayer.position,
      teamType: selectedTeam,
      currentStats,
      pimValue,
    });

    if (!validation.valid) {
      toast.error(validation.error);
      return;
    }

    const statData = {
      gameId,
      playerId: selectedPlayer.player.id,
      teamId: currentTeamId,
      statType,
      period,
      timestamp: new Date().toISOString(),
      jerseyNumber: selectedPlayer.jersey_number,
      playerName: selectedPlayer.player.full_name,
    };

    try {
      if (isOnline) {
        // Submit directly
        const result = await submitStatEntry(statData);
        if (result.error) {
          toast.error(result.error);
        } else {
          toast.success(`${statType} recorded for #${selectedPlayer.jersey_number}`);
          setLastEntry(statData);
          setLastStatId(result.statId || null); // Store stat ID for undo functionality
          setLastEntryTime(Date.now());
          setJerseyNumber("");
          setSelectedPlayer(null);

          // Update local stats for validation
          updateLocalStats(statType, selectedTeam, pimValue);
        }
      } else {
        // Add to offline queue
        await addToOfflineQueue(statData);
        toast.success(`${statType} queued (offline)`, {
          description: "Will sync when online",
        });
        setLastEntry(statData);
        setLastStatId(null); // Cannot undo offline entries until synced
        setLastEntryTime(Date.now());
        setJerseyNumber("");
        setSelectedPlayer(null);

        // Update local stats for validation
        updateLocalStats(statType, selectedTeam, pimValue);
      }
    } catch (error) {
      console.error('Stat entry error:', error);
      toast.error("Failed to record stat");
    }
  }, [selectedPlayer, lastEntryTime, period, selectedTeam, currentStats, gameId, currentTeamId, isOnline, updateLocalStats]);

  // Memoize handleUndoLast to prevent re-creation on every render
  const handleUndoLast = useCallback(async () => {
    if (!lastEntry || !lastStatId) {
      toast.error("No entry to undo");
      return;
    }

    try {
      // Can only undo if online
      if (!isOnline) {
        toast.error("Cannot undo while offline. Go online to undo recent entries.");
        return;
      }

      // Delete the stat entry from database
      const result = await deleteStatEntry(lastStatId);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Last entry undone");

        // Reverse the local stats update
        if (lastEntry.statType === 'Goal') {
          setCurrentStats(prev => ({
            ...prev,
            homeGoals: selectedTeam === 'home' ? Math.max(0, prev.homeGoals - 1) : prev.homeGoals,
            awayGoals: selectedTeam === 'away' ? Math.max(0, prev.awayGoals - 1) : prev.awayGoals,
          }));
        } else if (lastEntry.statType === 'Shot') {
          setCurrentStats(prev => ({
            ...prev,
            homeShots: selectedTeam === 'home' ? Math.max(0, prev.homeShots - 1) : prev.homeShots,
            awayShots: selectedTeam === 'away' ? Math.max(0, prev.awayShots - 1) : prev.awayShots,
          }));
        }

        setLastEntry(null);
        setLastStatId(null);
      }
    } catch (error) {
      console.error('Undo error:', error);
      toast.error("Failed to undo");
    }
  }, [lastEntry, lastStatId, isOnline, selectedTeam]);

  return (
    <Card className="border-2">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle>Stat Entry</CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant={isOnline ? "default" : "destructive"}>
              {isOnline ? "Online" : "Offline"}
            </Badge>
            {lastEntry && lastStatId && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleUndoLast}
                disabled={!isOnline}
                title={!isOnline ? "Must be online to undo" : "Undo last entry"}
              >
                <Undo2 className="h-4 w-4 mr-1" />
                Undo
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Team Selection - Large Buttons for iPad */}
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant={selectedTeam === "home" ? "default" : "outline"}
            className="h-16 text-lg font-bold"
            onClick={() => {
              setSelectedTeam("home");
              setJerseyNumber("");
            }}
          >
            {homeTeamName}
          </Button>
          <Button
            variant={selectedTeam === "away" ? "default" : "outline"}
            className="h-16 text-lg font-bold"
            onClick={() => {
              setSelectedTeam("away");
              setJerseyNumber("");
            }}
          >
            {awayTeamName}
          </Button>
        </div>

        {/* Period Selection */}
        <div className="grid grid-cols-4 gap-2">
          {[1, 2, 3, "OT"].map((p) => (
            <Button
              key={p}
              variant={period === (typeof p === 'number' ? p : 4) ? "default" : "outline"}
              className="h-14 text-base font-semibold"
              onClick={() => setPeriod(typeof p === 'number' ? p : 4)}
            >
              {p === "OT" ? "OT" : `P${p}`}
            </Button>
          ))}
        </div>

        {/* Jersey Number Input - Large for iPad */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Jersey Number</label>
          <Input
            type="number"
            placeholder="#"
            value={jerseyNumber}
            onChange={(e) => setJerseyNumber(e.target.value)}
            className="h-16 text-2xl text-center font-bold"
            autoFocus
          />
          {selectedPlayer && (
            <div className="flex items-center justify-center gap-2 p-3 bg-primary/10 rounded-lg">
              <Check className="h-5 w-5 text-green-500" />
              <span className="font-medium">
                #{selectedPlayer.jersey_number} - {selectedPlayer.player.full_name}
              </span>
              <Badge variant="secondary">{selectedPlayer.position}</Badge>
            </div>
          )}
        </div>

        {/* Stat Type Buttons - LARGE for iPad - Minimum 60px height */}
        <div className="grid grid-cols-2 gap-3">
          {/* Goal */}
          <Button
            className="h-20 text-lg font-bold bg-green-600 hover:bg-green-700"
            onClick={() => handleStatEntry("Goal")}
            disabled={!selectedPlayer}
          >
            <Target className="h-6 w-6 mr-2" />
            GOAL
          </Button>

          {/* Assist */}
          <Button
            className="h-20 text-lg font-bold bg-blue-600 hover:bg-blue-700"
            onClick={() => handleStatEntry("Assist")}
            disabled={!selectedPlayer}
          >
            <User className="h-6 w-6 mr-2" />
            ASSIST
          </Button>

          {/* PIM */}
          <Button
            className="h-20 text-lg font-bold bg-red-600 hover:bg-red-700"
            onClick={() => handleStatEntry("PIM")}
            disabled={!selectedPlayer}
          >
            <X className="h-6 w-6 mr-2" />
            PENALTY
          </Button>

          {/* Shot */}
          <Button
            className="h-20 text-lg font-bold bg-purple-600 hover:bg-purple-700"
            onClick={() => handleStatEntry("Shot")}
            disabled={!selectedPlayer}
          >
            <Target className="h-6 w-6 mr-2" />
            SHOT
          </Button>

          {/* Save (for goalies) */}
          <Button
            className="h-20 text-lg font-bold bg-orange-600 hover:bg-orange-700"
            onClick={() => handleStatEntry("Save")}
            disabled={!selectedPlayer || selectedPlayer.position !== "G"}
          >
            <Shield className="h-6 w-6 mr-2" />
            SAVE
          </Button>

          {/* Goalie goal allowed */}
          <Button
            className="h-20 text-lg font-bold bg-gray-600 hover:bg-gray-700"
            onClick={() => handleStatEntry("Goal Against")}
            disabled={!selectedPlayer || selectedPlayer.position !== "G"}
          >
            <Shield className="h-6 w-6 mr-2" />
            GOAL AGAINST
          </Button>
        </div>

        {/* Quick Player Select (Alternative to jersey number) */}
        <details className="border rounded-lg p-3">
          <summary className="cursor-pointer font-medium">
            Or select player from list
          </summary>
          <div className="mt-3 max-h-60 overflow-y-auto space-y-1">
            {currentRoster.map((player) => (
              <Button
                key={player.id}
                variant={selectedPlayer?.id === player.id ? "default" : "outline"}
                className="w-full justify-start h-12"
                onClick={() => {
                  setSelectedPlayer(player);
                  setJerseyNumber(player.jersey_number.toString());
                }}
              >
                <span className="font-bold mr-2">#{player.jersey_number}</span>
                {player.player.full_name}
                <Badge variant="secondary" className="ml-auto">{player.position}</Badge>
              </Button>
            ))}
          </div>
        </details>
      </CardContent>
    </Card>
  );
}
