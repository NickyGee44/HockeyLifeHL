"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, Pause, CheckCircle2, Clock } from "lucide-react";
import { toast } from "sonner";
import { checkInToGame, completeGameStatEntry } from "@/lib/scorekeepers/actions";

interface GameClockProps {
  gameId: string;
  assignmentId: string;
  gameStatus: string;
  checkedInAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
}

export function GameClock({
  gameId,
  assignmentId,
  gameStatus,
  checkedInAt,
  startedAt,
  completedAt,
}: GameClockProps) {
  const [isCheckedIn, setIsCheckedIn] = useState(!!checkedInAt);
  const [isStarted, setIsStarted] = useState(!!startedAt);
  const [isCompleted, setIsCompleted] = useState(!!completedAt);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  // Calculate elapsed time
  useEffect(() => {
    if (isStarted && !isCompleted && startedAt) {
      const interval = setInterval(() => {
        const start = new Date(startedAt).getTime();
        const now = new Date().getTime();
        const elapsed = Math.floor((now - start) / 1000); // seconds
        setElapsedTime(elapsed);
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [isStarted, isCompleted, startedAt]);

  const handleCheckIn = async () => {
    setIsLoading(true);
    try {
      const result = await checkInToGame(assignmentId);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Checked in successfully");
        setIsCheckedIn(true);
        setIsStarted(true);
      }
    } catch (error) {
      toast.error("Failed to check in");
    } finally {
      setIsLoading(false);
    }
  };

  const handleComplete = async () => {
    if (!confirm("Mark game as complete? You won't be able to add more stats.")) {
      return;
    }

    setIsLoading(true);
    try {
      const result = await completeGameStatEntry(assignmentId);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Game completed successfully");
        setIsCompleted(true);
      }
    } catch (error) {
      toast.error("Failed to complete game");
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
    return `${minutes}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <Card className="border-2">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Clock className="h-8 w-8" />
            <div>
              <p className="text-sm text-muted-foreground">Game Time</p>
              {isStarted && !isCompleted ? (
                <p className="text-3xl font-mono font-bold">{formatTime(elapsedTime)}</p>
              ) : (
                <p className="text-xl font-medium text-muted-foreground">Not Started</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Status Badges */}
            {isCompleted && (
              <Badge variant="outline" className="h-10 px-4">
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Completed
              </Badge>
            )}

            {isStarted && !isCompleted && (
              <Badge variant="default" className="h-10 px-4 bg-green-500">
                <Play className="h-4 w-4 mr-2" />
                Live
              </Badge>
            )}

            {/* Action Buttons - Large for iPad */}
            {!isCheckedIn && !isCompleted && (
              <Button
                onClick={handleCheckIn}
                disabled={isLoading}
                className="h-14 px-6 text-lg"
              >
                <Play className="h-5 w-5 mr-2" />
                Check In & Start
              </Button>
            )}

            {isStarted && !isCompleted && (
              <Button
                onClick={handleComplete}
                disabled={isLoading}
                variant="outline"
                className="h-14 px-6 text-lg"
              >
                <CheckCircle2 className="h-5 w-5 mr-2" />
                Complete Game
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
