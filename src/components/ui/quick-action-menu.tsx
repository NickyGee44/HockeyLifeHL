"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Plus, X, Pencil, Users, Trophy, Target } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";

export function QuickActionMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const { user, isCaptain, isOwner } = useAuth();

  if (!user) return null;

  const actions = [
    { 
      label: "My Stats", 
      icon: <Trophy className="w-5 h-5" />, 
      href: "/dashboard/stats", 
      color: "bg-gold text-puck-black",
      show: true 
    },
    { 
      label: "Check In", 
      icon: <Target className="w-5 h-5" />, 
      href: "/dashboard", 
      color: "bg-rink-blue text-white",
      show: true 
    },
    { 
      label: "Enter Stats", 
      icon: <Pencil className="w-5 h-5" />, 
      href: "/captain/stats", 
      color: "bg-canada-red text-white",
      show: isCaptain || isOwner 
    },
    { 
      label: "Manage Team", 
      icon: <Users className="w-5 h-5" />, 
      href: "/captain/team", 
      color: "bg-puck-gray text-white",
      show: isCaptain || isOwner 
    },
  ].filter(a => a.show);

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <AnimatePresence>
        {isOpen && (
          <div className="flex flex-col gap-3 mb-4 items-end">
            {actions.map((action, i) => (
              <motion.div
                key={action.label}
                initial={{ opacity: 0, scale: 0.8, x: 20 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.8, x: 20 }}
                transition={{ delay: i * 0.05 }}
              >
                <Link href={action.href} onClick={() => setIsOpen(false)}>
                  <Button 
                    className={`${action.color} rounded-full shadow-xl flex items-center gap-2 px-6 py-6 h-12 hover:scale-105 transition-transform`}
                  >
                    {action.icon}
                    <span className="font-bold text-sm uppercase tracking-tighter">{action.label}</span>
                  </Button>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-colors duration-300",
          isOpen ? "bg-puck-black text-white rotate-0" : "bg-canada-red text-white"
        )}
      >
        {isOpen ? <X className="w-6 h-6" /> : <Plus className="w-6 h-6" />}
      </motion.button>
    </div>
  );
}

// Utility for merging classes since I don't have direct access to lib/utils in this block
function cn(...classes: any[]) {
  return classes.filter(Boolean).join(" ");
}
