"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { motion } from "framer-motion";

interface Team {
  id: string;
  name: string;
  short_name: string;
  primary_color: string;
  secondary_color: string;
  logo_url: string | null;
  captain: {
    id: string;
    full_name: string;
    email: string;
    avatar_url: string | null;
  };
}

interface DraftOrderAnimationProps {
  teams: Team[];
  onOrderAssigned: (order: Array<{ teamId: string; position: number }>) => void;
  onStartDraft: () => void;
}

export function DraftOrderAnimation({
  teams,
  onOrderAssigned,
  onStartDraft,
}: DraftOrderAnimationProps) {
  const [shuffling, setShuffling] = useState(false);
  const [finalOrder, setFinalOrder] = useState<Team[]>([]);
  const [showFinal, setShowFinal] = useState(false);

  // Shuffle teams with animation
  const shuffleTeams = () => {
    setShuffling(true);
    setShowFinal(false);

    // Create multiple shuffle iterations
    const iterations = 20;
    let currentTeams = [...teams];
    const shuffleInterval = setInterval(() => {
      // Random shuffle
      const shuffled = [...currentTeams];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      currentTeams = shuffled;
      setFinalOrder([...shuffled]);
    }, 100);

    // Final shuffle (Fisher-Yates)
    setTimeout(() => {
      clearInterval(shuffleInterval);
      const finalShuffled = [...teams];
      for (let i = finalShuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [finalShuffled[i], finalShuffled[j]] = [finalShuffled[j], finalShuffled[i]];
      }
      setFinalOrder(finalShuffled);
      setShuffling(false);
      setShowFinal(true);

      // Notify parent of final order
      const order = finalShuffled.map((team, index) => ({
        teamId: team.id,
        position: index + 1,
      }));
      onOrderAssigned(order);
    }, iterations * 100 + 500);
  };

  return (
    <Card className="border-2 border-gold">
      <CardContent className="p-8">
        <div className="text-center mb-6">
          <h2 className="text-3xl font-bold mb-2">🎲 Draft Order Assignment</h2>
          <p className="text-muted-foreground">
            Randomizing team positions for the draft
          </p>
        </div>

        <div className="flex justify-center items-center gap-4 flex-wrap mb-6">
          {finalOrder.length > 0 ? (
            finalOrder.map((team, index) => (
              <motion.div
                key={team.id}
                initial={{ opacity: 0, y: -50, scale: 0.8 }}
                animate={{
                  opacity: showFinal ? 1 : 0.7,
                  y: 0,
                  scale: showFinal ? 1 : 0.9,
                }}
                transition={{
                  delay: showFinal ? index * 0.1 : 0,
                  duration: 0.5,
                  type: "spring",
                }}
                className="relative"
              >
                <div
                  className="w-24 h-24 rounded-lg border-4 flex flex-col items-center justify-center p-2 transition-all"
                  style={{
                    backgroundColor: team.primary_color,
                    borderColor: team.secondary_color,
                    boxShadow: showFinal
                      ? `0 0 20px ${team.primary_color}40`
                      : "none",
                  }}
                >
                  {team.logo_url ? (
                    <img
                      src={team.logo_url}
                      alt={team.name}
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <span className="text-white font-bold text-sm text-center">
                      {team.short_name}
                    </span>
                  )}
                  <Badge
                    className="absolute -top-2 -right-2 w-8 h-8 rounded-full flex items-center justify-center font-bold"
                    style={{
                      backgroundColor: team.secondary_color,
                      color: team.primary_color,
                    }}
                  >
                    {index + 1}
                  </Badge>
                </div>
                <p className="text-xs text-center mt-1 font-medium">
                  {team.short_name}
                </p>
              </motion.div>
            ))
          ) : (
            teams.map((team) => (
              <div
                key={team.id}
                className="w-24 h-24 rounded-lg border-4 flex items-center justify-center opacity-50"
                style={{
                  backgroundColor: team.primary_color,
                  borderColor: team.secondary_color,
                }}
              >
                {team.logo_url ? (
                  <img
                    src={team.logo_url}
                    alt={team.name}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <span className="text-white font-bold text-sm">
                    {team.short_name}
                  </span>
                )}
              </div>
            ))
          )}
        </div>

        <div className="text-center">
          {!shuffling && finalOrder.length === 0 && (
            <Button
              onClick={shuffleTeams}
              className="bg-canada-red hover:bg-canada-red-dark text-lg px-8 py-6"
              size="lg"
            >
              🎲 Randomize Draft Order
            </Button>
          )}

          {shuffling && (
            <div className="space-y-4">
              <div className="text-2xl animate-pulse">🎲 Shuffling...</div>
              <div className="w-full bg-muted rounded-full h-2">
                <motion.div
                  className="bg-canada-red h-2 rounded-full"
                  initial={{ width: "0%" }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 2, ease: "easeInOut" }}
                />
              </div>
            </div>
          )}

          {showFinal && (
            <Button
              onClick={onStartDraft}
              className="bg-green-600 hover:bg-green-700 text-lg px-8 py-6 mt-4"
              size="lg"
            >
              ✅ Start Draft
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
