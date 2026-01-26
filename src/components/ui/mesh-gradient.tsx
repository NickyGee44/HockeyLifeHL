"use client";

import { cn } from "@/lib/utils";
import React from "react";

interface MeshGradientProps {
  className?: string;
  children?: React.ReactNode;
}

export const MeshGradient = ({ className, children }: MeshGradientProps) => {
  return (
    <div className={cn("relative overflow-hidden bg-white dark:bg-puck-black", className)}>
      <div className="absolute inset-0 z-0 opacity-30 blur-[100px] pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-canada-red rounded-full animate-mesh-1" />
        <div className="absolute top-[20%] right-[-10%] w-[40%] h-[40%] bg-rink-blue rounded-full animate-mesh-2" />
        <div className="absolute bottom-[-10%] left-[20%] w-[60%] h-[50%] bg-gold/50 rounded-full animate-mesh-3" />
      </div>
      <div className="relative z-10">{children}</div>
    </div>
  );
};
