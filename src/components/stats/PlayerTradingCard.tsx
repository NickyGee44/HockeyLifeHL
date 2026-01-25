"use client";

import { motion } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { currentLeague } from "@/lib/league-config";
import { cn } from "@/lib/utils";

interface PlayerTradingCardProps {
  player: any;
  totals: any;
  isGoalie: boolean;
}

export function PlayerTradingCard({ player, totals, isGoalie }: PlayerTradingCardProps) {
  const playerRating = totals?.games >= 5 ? "A" : totals?.games >= 3 ? "B" : totals?.games >= 1 ? "C" : "D";
  
  const getInitials = (name: string | null) => {
    if (!name) return "??";
    return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ y: -10, rotateY: 5, rotateX: -5 }}
      transition={{ duration: 0.5, type: "spring", stiffness: 100 }}
      className="relative w-full max-w-sm aspect-[2.5/3.5] mx-auto group perspective-1000"
    >
      {/* Card Border & Background */}
      <div className={cn(
        "absolute inset-0 rounded-[2rem] p-1 overflow-hidden transition-all duration-500",
        "bg-gradient-to-br from-gold via-gold/50 to-gold shadow-[0_0_40px_rgba(255,215,0,0.2)]",
        "group-hover:shadow-[0_0_60px_rgba(255,215,0,0.4)]"
      )}>
        {/* Holographic Overlays */}
        <div className="absolute inset-0 opacity-10 group-hover:opacity-30 transition-opacity duration-1000 pointer-events-none bg-[linear-gradient(135deg,transparent_25%,rgba(255,215,0,0.4)_50%,transparent_75%)] bg-[length:250%_250%] animate-[shimmer_3s_infinite_linear]" />
        
        <div className="absolute inset-0 bg-puck-dark rounded-[1.9rem] overflow-hidden flex flex-col">
          {/* Top Banner - Team/League Info */}
          <div className="h-16 bg-gradient-to-b from-white/10 to-transparent flex items-center justify-between px-6 border-b border-white/10">
            <span className="font-display font-bold text-gold tracking-widest text-xs uppercase">{currentLeague.shortName} PRO SERIES</span>
            <Badge variant="outline" className="border-gold/50 text-gold text-[10px] uppercase font-black">2025 EDITION</Badge>
          </div>

          {/* Player Image Area */}
          <div className="flex-1 relative bg-gradient-to-b from-puck-dark via-puck-black to-puck-dark flex flex-col items-center justify-center p-6">
            <div className="relative">
              <motion.div 
                whileHover={{ scale: 1.1 }}
                className="relative z-10"
              >
                <Avatar className="h-48 w-48 border-4 border-gold shadow-[0_0_30px_rgba(255,215,0,0.3)]">
                  <AvatarImage src={player.avatar_url || ""} />
                  <AvatarFallback className="bg-canada-red text-white text-5xl font-display">
                    {getInitials(player.full_name)}
                  </AvatarFallback>
                </Avatar>
              </motion.div>
              
              {/* Floating Jersey Number */}
              <div className="absolute -bottom-4 -right-4 z-20 bg-gold text-puck-black rounded-2xl px-4 py-2 font-display font-black text-3xl shadow-xl border-2 border-puck-black">
                #{player.jersey_number ?? "--"}
              </div>

              {/* Position Badge */}
              <div className="absolute -top-4 -left-4 z-20 bg-canada-red text-white rounded-xl px-3 py-1 font-display font-bold text-sm shadow-xl border border-white/20">
                {isGoalie ? "GOALIE" : player.position || "PLAYER"}
              </div>
            </div>

            {/* Name Section */}
            <div className="mt-12 text-center w-full">
              <h2 className="text-3xl font-display font-black text-white tracking-tight uppercase leading-none drop-shadow-md">
                {player.full_name?.split(" ")[0]}
              </h2>
              <h3 className="text-4xl font-display font-black text-gold tracking-tighter uppercase leading-none drop-shadow-lg">
                {player.full_name?.split(" ")[1] || ""}
              </h3>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="h-24 bg-gradient-to-t from-gold/20 to-transparent flex items-center justify-around px-2 border-t border-white/10">
             {isGoalie ? (
                <>
                  <StatItem label="GAA" value={totals.gaa.toFixed(2)} />
                  <StatDivider />
                  <StatItem label="SV%" value={`${totals.savePercentage.toFixed(1)}%`} />
                  <StatDivider />
                  <StatItem label="SO" value={totals.shutouts} gold />
                </>
             ) : (
                <>
                  <StatItem label="GP" value={totals.games} />
                  <StatDivider />
                  <StatItem label="G" value={totals.goals} red />
                  <StatDivider />
                  <StatItem label="A" value={totals.assists} />
                  <StatDivider />
                  <StatItem label="PTS" value={totals.points} gold />
                </>
             )}
          </div>

          {/* Footer - Rating */}
          <div className="h-12 bg-gold flex items-center justify-between px-6">
            <span className="text-puck-black font-black text-xs uppercase tracking-tighter">Performance Rating</span>
            <span className="text-puck-black font-display font-black text-2xl">{playerRating}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function StatItem({ label, value, gold, red }: { label: string, value: string | number, gold?: boolean, red?: boolean }) {
  return (
    <div className="text-center">
      <div className={cn(
        "text-2xl font-display font-black leading-none",
        gold ? "text-gold" : red ? "text-canada-red" : "text-white"
      )}>
        {value}
      </div>
      <div className="text-[9px] uppercase font-bold text-muted-foreground tracking-widest mt-1">
        {label}
      </div>
    </div>
  );
}

function StatDivider() {
  return <div className="h-8 w-px bg-white/10" />;
}
