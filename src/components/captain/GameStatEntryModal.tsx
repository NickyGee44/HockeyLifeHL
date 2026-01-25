// @ts-nocheck
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { TeamLogo } from "@/components/ui/team-logo";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { getGameForStatEntry, submitCompleteGameStats, verifyGameStats } from "@/lib/stats/actions";

type Player = {
  id: string;
  full_name: string | null;
  jersey_number: number | null;
  position: string | null;
  avatar_url: string | null;
};

type RosterEntry = {
  id: string;
  is_goalie: boolean;
  player: Player;
};

type Team = {
  id: string;
  name: string;
  short_name: string;
  logo_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  captain_id: string | null;
};

type GameData = {
  game: any;
  homeRoster: RosterEntry[];
  awayRoster: RosterEntry[];
  existingPlayerStats: any[];
  existingGoalieStats: any[];
  userTeamId: string;
  isHomeCaptain: boolean;
  isAwayCaptain: boolean;
  isOwner: boolean;
  isFirstSubmission: boolean;
  canEditScore: boolean;
};

interface GameStatEntryModalProps {
  gameId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function GameStatEntryModal({ gameId, isOpen, onClose, onSuccess }: GameStatEntryModalProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [gameData, setGameData] = useState<GameData | null>(null);
  const [homeScore, setHomeScore] = useState(0);
  const [awayScore, setAwayScore] = useState(0);
  const [playerStats, setPlayerStats] = useState<Record<string, { goals: number; assists: number }>>({});
  const [selectedGoalie, setSelectedGoalie] = useState<string | null>(null);
  const [goalieSaves, setGoalieSaves] = useState(0);
  const [activeTab, setActiveTab] = useState<"home" | "away">("home");

  useEffect(() => {
    if (isOpen && gameId) {
      loadGameData();
    }
  }, [isOpen, gameId]);

  async function loadGameData() {
    setLoading(true);
    const result = await getGameForStatEntry(gameId);
    
    if (result.error) {
      toast.error(result.error);
      onClose();
      return;
    }

    setGameData(result as GameData);

    // Set initial scores
    const game = result.game;
    setHomeScore(game.home_score || 0);
    setAwayScore(game.away_score || 0);

    // Initialize player stats
    const initialStats: Record<string, { goals: number; assists: number }> = {};
    
    // Combine both rosters
    [...(result.homeRoster || []), ...(result.awayRoster || [])].forEach((r: any) => {
      if (!r.is_goalie && r.player) {
        initialStats[r.player.id] = { goals: 0, assists: 0 };
      }
    });

    // Load existing stats
    (result.existingPlayerStats || []).forEach((stat: any) => {
      initialStats[stat.player_id] = {
        goals: stat.goals || 0,
        assists: stat.assists || 0,
      };
    });

    setPlayerStats(initialStats);

    // Set active tab based on user's team
    if (result.isHomeCaptain) {
      setActiveTab("home");
    } else if (result.isAwayCaptain) {
      setActiveTab("away");
    }

    // Find user's team goalie
    const userRoster = result.isHomeCaptain ? result.homeRoster : result.awayRoster;
    const goalieEntry = userRoster?.find((r: any) => r.is_goalie);
    const goaliePlayer = (goalieEntry?.player as unknown) as Player | undefined;
    if (goaliePlayer?.id) {
      setSelectedGoalie(goaliePlayer.id);
      // Load existing goalie stats
      const existingGoalie = (result.existingGoalieStats || []).find(
        (g: any) => g.player_id === goaliePlayer.id
      );
      if (existingGoalie) {
        setGoalieSaves(existingGoalie.saves || 0);
      }
    }

    setLoading(false);
  }

  function updatePlayerStat(playerId: string, field: "goals" | "assists", delta: number) {
    setPlayerStats(prev => ({
      ...prev,
      [playerId]: {
        ...prev[playerId],
        [field]: Math.max(0, (prev[playerId]?.[field] || 0) + delta),
      },
    }));
  }

  function setPlayerStatValue(playerId: string, field: "goals" | "assists", value: number) {
    setPlayerStats(prev => ({
      ...prev,
      [playerId]: {
        ...prev[playerId],
        [field]: Math.max(0, value),
      },
    }));
  }

  async function handleSubmit() {
    if (!gameData) return;

    setSaving(true);

    // Get user's team roster
    const userTeamId = gameData.userTeamId;
    const isHome = gameData.isHomeCaptain;
    const userRoster = isHome ? gameData.homeRoster : gameData.awayRoster;

    // Build player stats for user's team only
    const teamPlayerStats = userRoster
      .filter(r => !r.is_goalie)
      .map(r => ({
        playerId: r.player.id,
        goals: playerStats[r.player.id]?.goals || 0,
        assists: playerStats[r.player.id]?.assists || 0,
      }));

    // Calculate goals against from opponent's score
    const goalsAgainst = isHome ? awayScore : homeScore;

    const result = await submitCompleteGameStats(gameId, userTeamId, {
      homeScore,
      awayScore,
      playerStats: teamPlayerStats,
      goalieStats: selectedGoalie ? {
        goalieId: selectedGoalie,
        saves: goalieSaves,
        goalsAgainst,
      } : undefined,
    });

    setSaving(false);

    if (result.error) {
      toast.error(result.error);
      return;
    }

    toast.success(
      result.isFirstSubmission 
        ? "Stats submitted! Waiting for opponent verification." 
        : "Stats verified!"
    );
    onSuccess();
    onClose();
  }

  async function handleVerifyOnly() {
    if (!gameData) return;

    setSaving(true);
    const result = await verifyGameStats(gameId, gameData.userTeamId);
    setSaving(false);

    if (result.error) {
      toast.error(result.error);
      return;
    }

    toast.success("Game stats verified!");
    onSuccess();
    onClose();
  }

  const getInitials = (name: string | null) => {
    if (!name) return "??";
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {gameData?.isFirstSubmission ? "Enter Game Stats" : "Review & Verify Stats"}
          </DialogTitle>
          <DialogDescription>
            {gameData?.game && (
              <>
                {new Date(gameData.game.scheduled_at).toLocaleDateString("en-CA", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
                {gameData.game.location && ` • ${gameData.game.location}`}
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-12 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-canada-red mx-auto" />
            <p className="mt-4 text-muted-foreground">Loading game data...</p>
          </div>
        ) : gameData ? (
          <div className="space-y-6">
            {/* Score Section */}
            <div className="bg-muted/50 rounded-lg p-4 md:p-6">
              <h3 className="text-xs font-semibold text-muted-foreground mb-4 text-center tracking-wider">
                {gameData.canEditScore ? "FINAL SCORE" : "FINAL SCORE (Locked)"}
              </h3>
              <div className="flex flex-col md:flex-row items-center justify-center gap-6 md:gap-12">
                {/* Home Team */}
                <div className="flex flex-row md:flex-col items-center gap-4 md:gap-2 w-full md:w-auto justify-between md:justify-center">
                  <div className="flex items-center gap-3 md:flex-col md:gap-2">
                    <TeamLogo team={gameData.game.home_team} size="lg" />
                    <div className="text-left md:text-center">
                      <p className="font-bold">{gameData.game.home_team?.name}</p>
                      {gameData.isHomeCaptain && (
                        <Badge className="bg-canada-red text-[10px] h-4 px-1">Your Team</Badge>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {gameData.canEditScore ? (
                      <>
                        <Button
                          variant="outline"
                          size="icon-lg"
                          onClick={() => setHomeScore(Math.max(0, homeScore - 1))}
                          className="h-10 w-10 text-xl font-bold"
                        >
                          -
                        </Button>
                        <Input
                          type="number"
                          min="0"
                          value={homeScore}
                          onChange={(e) => setHomeScore(Math.max(0, parseInt(e.target.value) || 0))}
                          className="w-16 h-12 text-center text-2xl font-bold bg-background"
                        />
                        <Button
                          variant="outline"
                          size="icon-lg"
                          onClick={() => setHomeScore(homeScore + 1)}
                          className="h-10 w-10 text-xl font-bold"
                        >
                          +
                        </Button>
                      </>
                    ) : (
                      <span className="text-4xl font-bold min-w-[3rem] text-center">{homeScore}</span>
                    )}
                  </div>
                </div>

                {/* VS Divider */}
                <div className="flex items-center gap-4 w-full md:w-auto">
                  <div className="h-px bg-border flex-1 md:hidden" />
                  <div className="text-sm font-bold text-muted-foreground">VS</div>
                  <div className="h-px bg-border flex-1 md:hidden" />
                </div>

                {/* Away Team */}
                <div className="flex flex-row md:flex-col items-center gap-4 md:gap-2 w-full md:w-auto justify-between md:justify-center">
                  <div className="flex items-center gap-3 md:flex-col md:gap-2 md:order-first order-last">
                    <div className="text-right md:text-center">
                      <p className="font-bold">{gameData.game.away_team?.name}</p>
                      {gameData.isAwayCaptain && (
                        <Badge className="bg-canada-red text-[10px] h-4 px-1">Your Team</Badge>
                      )}
                    </div>
                    <TeamLogo team={gameData.game.away_team} size="lg" />
                  </div>

                  <div className="flex items-center gap-2">
                    {gameData.canEditScore ? (
                      <>
                        <Button
                          variant="outline"
                          size="icon-lg"
                          onClick={() => setAwayScore(Math.max(0, awayScore - 1))}
                          className="h-10 w-10 text-xl font-bold"
                        >
                          -
                        </Button>
                        <Input
                          type="number"
                          min="0"
                          value={awayScore}
                          onChange={(e) => setAwayScore(Math.max(0, parseInt(e.target.value) || 0))}
                          className="w-16 h-12 text-center text-2xl font-bold bg-background"
                        />
                        <Button
                          variant="outline"
                          size="icon-lg"
                          onClick={() => setAwayScore(awayScore + 1)}
                          className="h-10 w-10 text-xl font-bold"
                        >
                          +
                        </Button>
                      </>
                    ) : (
                      <span className="text-4xl font-bold min-w-[3rem] text-center">{awayScore}</span>
                    )}
                  </div>
                </div>
              </div>

              {!gameData.canEditScore && (
                <p className="text-center text-xs text-muted-foreground mt-6 bg-background/50 py-2 rounded">
                  Score was set by the other captain. You can only edit your team&apos;s player stats.
                </p>
              )}
            </div>

            {/* Player Stats Tabs */}
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "home" | "away")}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="home" className="flex items-center gap-2">
                  <TeamLogo team={gameData.game.home_team} size="sm" />
                  {gameData.game.home_team?.short_name || "Home"}
                  {gameData.isHomeCaptain && <Badge variant="outline" className="ml-1 text-xs">You</Badge>}
                </TabsTrigger>
                <TabsTrigger value="away" className="flex items-center gap-2">
                  <TeamLogo team={gameData.game.away_team} size="sm" />
                  {gameData.game.away_team?.short_name || "Away"}
                  {gameData.isAwayCaptain && <Badge variant="outline" className="ml-1 text-xs">You</Badge>}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="home" className="mt-4">
                <PlayerStatsList
                  roster={gameData.homeRoster}
                  playerStats={playerStats}
                  canEdit={gameData.isHomeCaptain || gameData.isOwner}
                  onUpdateStat={updatePlayerStat}
                  onSetStatValue={setPlayerStatValue}
                  team={gameData.game.home_team}
                  selectedGoalie={gameData.isHomeCaptain ? selectedGoalie : null}
                  goalieSaves={goalieSaves}
                  onSelectGoalie={gameData.isHomeCaptain ? setSelectedGoalie : undefined}
                  onGoalieSavesChange={gameData.isHomeCaptain ? setGoalieSaves : undefined}
                  goalsAgainst={awayScore}
                />
              </TabsContent>

              <TabsContent value="away" className="mt-4">
                <PlayerStatsList
                  roster={gameData.awayRoster}
                  playerStats={playerStats}
                  canEdit={gameData.isAwayCaptain || gameData.isOwner}
                  onUpdateStat={updatePlayerStat}
                  onSetStatValue={setPlayerStatValue}
                  team={gameData.game.away_team}
                  selectedGoalie={gameData.isAwayCaptain ? selectedGoalie : null}
                  goalieSaves={goalieSaves}
                  onSelectGoalie={gameData.isAwayCaptain ? setSelectedGoalie : undefined}
                  onGoalieSavesChange={gameData.isAwayCaptain ? setGoalieSaves : undefined}
                  goalsAgainst={homeScore}
                />
              </TabsContent>
            </Tabs>

            {/* Stats Summary */}
            <div className="bg-muted/30 rounded-lg p-4">
              <h4 className="font-medium mb-2">Stats Summary</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">{gameData.game.home_team?.name}</p>
                  <p>
                    Goals from stats:{" "}
                    <span className="font-bold">
                      {gameData.homeRoster
                        .filter(r => !r.is_goalie)
                        .reduce((sum, r) => sum + (playerStats[r.player.id]?.goals || 0), 0)}
                    </span>
                    {" / "}Score: <span className="font-bold">{homeScore}</span>
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">{gameData.game.away_team?.name}</p>
                  <p>
                    Goals from stats:{" "}
                    <span className="font-bold">
                      {gameData.awayRoster
                        .filter(r => !r.is_goalie)
                        .reduce((sum, r) => sum + (playerStats[r.player.id]?.goals || 0), 0)}
                    </span>
                    {" / "}Score: <span className="font-bold">{awayScore}</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          
          {!gameData?.isFirstSubmission && !gameData?.canEditScore && (
            <Button
              onClick={handleVerifyOnly}
              disabled={saving}
              className="bg-green-600 hover:bg-green-700"
            >
              {saving ? "Verifying..." : "✓ Verify Stats"}
            </Button>
          )}
          
          <Button
            onClick={handleSubmit}
            disabled={saving || loading}
            className="bg-canada-red hover:bg-canada-red-dark"
          >
            {saving ? "Submitting..." : gameData?.isFirstSubmission ? "Submit Stats" : "Submit My Stats"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Player stats list component
function PlayerStatsList({
  roster,
  playerStats,
  canEdit,
  onUpdateStat,
  onSetStatValue,
  team,
  selectedGoalie,
  goalieSaves,
  onSelectGoalie,
  onGoalieSavesChange,
  goalsAgainst,
}: {
  roster: RosterEntry[];
  playerStats: Record<string, { goals: number; assists: number }>;
  canEdit: boolean;
  onUpdateStat: (playerId: string, field: "goals" | "assists", delta: number) => void;
  onSetStatValue: (playerId: string, field: "goals" | "assists", value: number) => void;
  team: Team;
  selectedGoalie: string | null;
  goalieSaves: number;
  onSelectGoalie?: (id: string) => void;
  onGoalieSavesChange?: (saves: number) => void;
  goalsAgainst: number;
}) {
  const players = roster.filter(r => !r.is_goalie);
  const goalies = roster.filter(r => r.is_goalie);

  const getInitials = (name: string | null) => {
    if (!name) return "??";
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  return (
    <div className="space-y-4">
      {/* Players */}
      <div className="space-y-2">
        <h4 className="font-medium text-sm text-muted-foreground">SKATERS</h4>
        {players.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">No skaters on roster</p>
        ) : (
          players
            .sort((a, b) => (a.player.jersey_number || 99) - (b.player.jersey_number || 99))
            .map((entry) => {
              const stats = playerStats[entry.player.id] || { goals: 0, assists: 0 };
              return (
                <div
                  key={entry.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-muted/30 rounded-lg gap-3"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={entry.player.avatar_url || ""} />
                      <AvatarFallback
                        style={{
                          backgroundColor: team.primary_color || "#3b82f6",
                          color: team.secondary_color || "#ffffff",
                        }}
                        className="text-xs"
                      >
                        {getInitials(entry.player.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="font-bold text-sm truncate">
                        {entry.player.full_name || "Unknown"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        #{entry.player.jersey_number ?? "-"} • {entry.player.position || "F"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-2 md:gap-4 border-t sm:border-0 pt-2 sm:pt-0">
                    {/* Goals */}
                    <div className="flex flex-col items-center">
                      <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Goals</p>
                      <div className="flex items-center gap-1">
                        {canEdit ? (
                          <>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => onUpdateStat(entry.player.id, "goals", -1)}
                              className="h-9 w-9 p-0 font-bold"
                              disabled={stats.goals === 0}
                            >
                              -
                            </Button>
                            <Input
                              type="number"
                              min="0"
                              value={stats.goals}
                              onChange={(e) => onSetStatValue(entry.player.id, "goals", parseInt(e.target.value) || 0)}
                              className="w-12 h-9 text-center text-sm p-0 bg-background font-bold"
                            />
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => onUpdateStat(entry.player.id, "goals", 1)}
                              className="h-9 w-9 p-0 font-bold"
                            >
                              +
                            </Button>
                          </>
                        ) : (
                          <span className="font-bold text-xl w-12 text-center">{stats.goals}</span>
                        )}
                      </div>
                    </div>

                    {/* Assists */}
                    <div className="flex flex-col items-center">
                      <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Assists</p>
                      <div className="flex items-center gap-1">
                        {canEdit ? (
                          <>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => onUpdateStat(entry.player.id, "assists", -1)}
                              className="h-9 w-9 p-0 font-bold"
                              disabled={stats.assists === 0}
                            >
                              -
                            </Button>
                            <Input
                              type="number"
                              min="0"
                              value={stats.assists}
                              onChange={(e) => onSetStatValue(entry.player.id, "assists", parseInt(e.target.value) || 0)}
                              className="w-12 h-9 text-center text-sm p-0 bg-background font-bold"
                            />
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => onUpdateStat(entry.player.id, "assists", 1)}
                              className="h-9 w-9 p-0 font-bold"
                            >
                              +
                            </Button>
                          </>
                        ) : (
                          <span className="font-bold text-xl w-12 text-center">{stats.assists}</span>
                        )}
                      </div>
                    </div>

                    {/* Points */}
                    <div className="flex flex-col items-center min-w-[3rem]">
                      <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Pts</p>
                      <span className="font-bold text-xl text-gold">{stats.goals + stats.assists}</span>
                    </div>
                  </div>
                </div>
              );
            })
        )}
      </div>

      {/* Goalies */}
      {goalies.length > 0 && (
        <div className="space-y-3 pt-4 border-t">
          <h4 className="font-bold text-xs text-muted-foreground uppercase tracking-widest">GOALTENDER</h4>
          {goalies.map((entry) => (
            <div
              key={entry.id}
              className={`flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg gap-3 ${
                selectedGoalie === entry.player.id ? "bg-rink-blue/10 border border-rink-blue/50" : "bg-muted/30"
              }`}
            >
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={entry.player.avatar_url || ""} />
                  <AvatarFallback
                    className="text-xs bg-rink-blue text-white font-bold"
                  >
                    {getInitials(entry.player.full_name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-bold text-sm">
                    {entry.player.full_name || "Unknown"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    #{entry.player.jersey_number ?? "-"} • G
                  </p>
                </div>
              </div>

              {canEdit && onGoalieSavesChange ? (
                <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-0 pt-2 sm:pt-0">
                  {/* Goals Against */}
                  <div className="flex flex-col items-center px-2">
                    <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">GA</p>
                    <span className="font-bold text-xl">{goalsAgainst}</span>
                  </div>

                  {/* Saves */}
                  <div className="flex flex-col items-center">
                    <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Saves</p>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => onGoalieSavesChange(Math.max(0, goalieSaves - 1))}
                        className="h-9 w-9 p-0 font-bold"
                        disabled={goalieSaves === 0}
                      >
                        -
                      </Button>
                      <Input
                        type="number"
                        min="0"
                        value={goalieSaves}
                        onChange={(e) => onGoalieSavesChange(Math.max(0, parseInt(e.target.value) || 0))}
                        className="w-16 h-9 text-center text-sm p-0 bg-background font-bold"
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => onGoalieSavesChange(goalieSaves + 1)}
                        className="h-9 w-9 p-0 font-bold"
                      >
                        +
                      </Button>
                    </div>
                  </div>

                  {/* Save % */}
                  <div className="flex flex-col items-center min-w-[3.5rem]">
                    <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">SV%</p>
                    <span className="font-bold text-sm text-rink-blue">
                      {goalieSaves + goalsAgainst > 0
                        ? ((goalieSaves / (goalieSaves + goalsAgainst)) * 100).toFixed(1) + "%"
                        : "-"}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-6 text-sm">
                  <div className="text-center">
                    <p className="text-[10px] uppercase font-bold text-muted-foreground">GA</p>
                    <span className="font-bold text-lg">{goalsAgainst}</span>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] uppercase font-bold text-muted-foreground">Saves</p>
                    <span className="font-bold text-lg">{goalieSaves}</span>
                  </div>
                </div>
              )}
            </div>
          ))}
          
          {canEdit && (
            <p className="text-xs text-muted-foreground">
              * Goals against is automatically calculated from the opponent&apos;s score. Saves are optional.
            </p>
          )}
        </div>
      )}

      {!canEdit && (
        <p className="text-sm text-muted-foreground text-center py-4 bg-yellow-500/10 rounded-lg">
          You can only view this team&apos;s stats. Switch to your team&apos;s tab to edit.
        </p>
      )}
    </div>
  );
}
