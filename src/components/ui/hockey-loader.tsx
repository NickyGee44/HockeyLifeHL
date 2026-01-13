"use client";

import { cn } from "@/lib/utils";

interface HockeyLoaderProps {
  size?: "sm" | "md" | "lg";
  className?: string;
  text?: string;
}

export function HockeyLoader({ size = "md", className, text }: HockeyLoaderProps) {
  const sizeClasses = {
    sm: "w-12 h-12",
    md: "w-20 h-20",
    lg: "w-32 h-32",
  };

  const puckSizes = {
    sm: "w-4 h-4",
    md: "w-8 h-8",
    lg: "w-12 h-12",
  };

  const stickSizes = {
    sm: { handle: "w-0.5 h-4", blade: "w-2 h-1" },
    md: { handle: "w-1 h-8", blade: "w-3 h-2" },
    lg: { handle: "w-1.5 h-12", blade: "w-4 h-3" },
  };

  return (
    <div className={cn("flex flex-col items-center justify-center gap-4", className)}>
      <div className={cn("relative", sizeClasses[size])}>
        {/* Ice Rink Background */}
        <div className="absolute inset-0 rounded-full border-4 border-blue-200/30 dark:border-blue-500/20 bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-900/20 dark:to-blue-800/30 animate-pulse" />
        
        {/* Puck */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative">
            {/* Puck shadow */}
            <div className="absolute inset-0 bg-black/20 dark:bg-black/40 rounded-full blur-sm" />
            {/* Puck */}
            <div className={cn("relative bg-gradient-to-b from-gray-800 to-black dark:from-gray-900 dark:to-black rounded-full shadow-lg", puckSizes[size])}>
              {/* Puck highlight */}
              <div className="absolute top-1 left-2 w-2 h-2 bg-white/30 rounded-full" />
              {/* Puck animation - sliding back and forth */}
              <div className="absolute inset-0 animate-puck-slide">
                <div className="w-full h-full bg-gradient-to-r from-transparent via-white/10 to-transparent rounded-full" />
              </div>
            </div>
          </div>
        </div>

        {/* Hockey Stick (rotating around puck) */}
        <div className="absolute inset-0 animate-stick-rotate">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 origin-bottom">
            {/* Stick handle */}
            <div className={cn("bg-gradient-to-b from-amber-700 to-amber-900 dark:from-amber-800 dark:to-amber-950 rounded-full shadow-md", stickSizes[size].handle)} />
            {/* Stick blade */}
            <div className={cn("absolute bottom-0 left-1/2 -translate-x-1/2 bg-gradient-to-br from-amber-600 to-amber-800 dark:from-amber-700 dark:to-amber-900 rounded-sm transform -rotate-12", stickSizes[size].blade)} />
          </div>
        </div>

        {/* Ice particles */}
        <div className="absolute inset-0">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-white/60 dark:bg-blue-300/60 rounded-full animate-ice-particle"
              style={{
                left: `${20 + i * 15}%`,
                top: `${15 + (i % 3) * 30}%`,
                animationDelay: `${i * 0.2}s`,
              }}
            />
          ))}
        </div>
      </div>

      {/* Loading Text */}
      {text && (
        <p className="text-sm font-medium text-muted-foreground animate-pulse">
          {text}
        </p>
      )}
    </div>
  );
}

// Full page loader
export function HockeyPageLoader({ text = "Loading..." }: { text?: string }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-6">
        <HockeyLoader size="lg" text={text} />
        <div className="flex items-center gap-2 text-muted-foreground">
          <span className="text-sm font-medium">HockeyLifeHL</span>
          <span className="text-xs">•</span>
          <span className="text-xs">For Fun, For Beers, For Glory</span>
        </div>
      </div>
    </div>
  );
}

// Inline loader (for buttons, cards, etc.)
export function HockeyInlineLoader({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center justify-center p-4", className)}>
      <HockeyLoader size="sm" />
    </div>
  );
}
