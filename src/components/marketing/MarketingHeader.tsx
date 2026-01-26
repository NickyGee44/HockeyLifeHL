"use client";

import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { platformConfig } from "@/lib/league-config";

export function MarketingHeader() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-[#E6EBF2] bg-white/95 backdrop-blur-md shadow-sm">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-3 group">
          <Image
            src={platformConfig.icon}
            alt={platformConfig.name}
            width={40}
            height={40}
            className="h-10 w-auto drop-shadow-sm"
          />
          <span className="font-display text-xl font-bold text-[#0B1220] group-hover:text-[#1F4FD8] transition-all">
            Beer League Hockey
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-8">
          <Link href="#features" className="text-sm font-bold text-slate-600 hover:text-[#1F4FD8] transition-colors uppercase tracking-wide">
            Features
          </Link>
          <Link href="#pricing" className="text-sm font-bold text-slate-600 hover:text-[#1F4FD8] transition-colors uppercase tracking-wide">
            Pricing
          </Link>
          <Link href="https://pilot.beerleaguehockey.ca" className="text-sm font-bold text-slate-600 hover:text-[#1F4FD8] transition-colors uppercase tracking-wide">
            Demo League
          </Link>
        </nav>

        <div className="flex items-center gap-4">
          <Button variant="ghost" asChild>
            <Link href="/login">Sign In</Link>
          </Button>
          <Button className="bg-[#1F4FD8] hover:bg-[#1F4FD8]/90 text-white" asChild>
            <Link href="/signup">Start Your League</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
