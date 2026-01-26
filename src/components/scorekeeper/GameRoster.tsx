"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Player {
  id: string;
  jersey_number: number;
  position: string;
  player: {
    id: string;
    full_name: string;
  };
}

interface GameRosterProps {
  homeTeam: string;
  awayTeam: string;
  homeRoster: Player[];
  awayRoster: Player[];
}

export function GameRoster({
  homeTeam,
  awayTeam,
  homeRoster,
  awayRoster,
}: GameRosterProps) {
  const RosterList = ({ roster }: { roster: Player[] }) => (
    <ScrollArea className="h-[400px]">
      <div className="space-y-1 pr-4">
        {roster.map((player) => (
          <div
            key={player.id}
            className="flex items-center justify-between p-2 rounded-lg hover:bg-accent"
          >
            <div className="flex items-center gap-3">
              <span className="font-bold text-lg w-8">#{player.jersey_number}</span>
              <span className="font-medium">{player.player.full_name}</span>
            </div>
            <Badge variant="secondary">{player.position}</Badge>
          </div>
        ))}
      </div>
    </ScrollArea>
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Team Rosters</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="home">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="home">{homeTeam}</TabsTrigger>
            <TabsTrigger value="away">{awayTeam}</TabsTrigger>
          </TabsList>
          <TabsContent value="home" className="mt-4">
            <RosterList roster={homeRoster} />
          </TabsContent>
          <TabsContent value="away" className="mt-4">
            <RosterList roster={awayRoster} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
