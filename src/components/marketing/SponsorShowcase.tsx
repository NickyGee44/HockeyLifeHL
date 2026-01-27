"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { Sponsor } from "@/lib/sponsors/actions";
import { Card } from "@/components/ui/card";

interface SponsorShowcaseProps {
  sponsors: Sponsor[];
  title?: string;
  layout?: "grid" | "carousel";
}

export function SponsorShowcase({ 
  sponsors, 
  title = "Our Proud Sponsors", 
  layout = "carousel" 
}: SponsorShowcaseProps) {
  if (!sponsors || sponsors.length === 0) return null;

  // Split into tiers if needed, but for now just show all
  const sortedSponsors = [...sponsors].sort((a, b) => {
    const tiers = { 'platinum': 0, 'gold': 1, 'silver': 2, 'bronze': 3 };
    return (tiers[a.tier as keyof typeof tiers] || 99) - (tiers[b.tier as keyof typeof tiers] || 99);
  });

  if (layout === "carousel") {
    return (
      <section className="py-12 bg-white/50 border-y border-slate-100 overflow-hidden relative">
        <div className="container mx-auto px-4 mb-8">
          <h3 className="text-center text-xs font-bold uppercase tracking-[0.2em] text-slate-500">
            {title}
          </h3>
        </div>
        
        <div className="relative">
          <motion.div 
            animate={{ x: [0, -2000] }}
            transition={{ 
              duration: 40, 
              repeat: Infinity, 
              ease: "linear" 
            }}
            className="flex gap-12 items-center whitespace-nowrap"
          >
            {/* Double the sponsors for seamless looping */}
            {[...sortedSponsors, ...sortedSponsors, ...sortedSponsors].map((sponsor, i) => (
              <Link 
                key={`${sponsor.id}-${i}`} 
                href={sponsor.website_url} 
                target="_blank"
                className="flex-shrink-0 grayscale hover:grayscale-0 transition-all duration-300 opacity-40 hover:opacity-100"
              >
                {sponsor.logo_url?.trim() ? (
                  <div className="relative h-16 w-48">
                    <Image
                      src={sponsor.logo_url}
                      alt={sponsor.name}
                      fill
                      className="object-contain"
                    />
                  </div>
                ) : (
                  <span className="text-2xl font-bold font-display text-slate-400 hover:text-slate-900 transition-colors">
                    {sponsor.name}
                  </span>
                )}
              </Link>
            ))}
          </motion.div>
          
          {/* Fades for edges */}
          <div className="absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-white to-transparent pointer-events-none z-10" />
          <div className="absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-white to-transparent pointer-events-none z-10" />
        </div>
      </section>
    );
  }

  return (
    <section className="py-16 px-4">
      <div className="container mx-auto max-w-6xl">
        <h2 className="text-center mb-12">
          <span className="text-[#0B1220]">Our </span>
          <span className="text-gold-dark font-bold">Partners</span>
        </h2>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {sortedSponsors.map((sponsor) => (
            <motion.div
              key={sponsor.id}
              whileHover={{ y: -5 }}
              transition={{ duration: 0.2 }}
            >
              <Link href={sponsor.website_url} target="_blank">
                <Card className="p-6 h-32 flex items-center justify-center bg-white shadow-sm hover:shadow-md transition-all border-slate-100 group">
                  {sponsor.logo_url?.trim() ? (
                    <div className="relative h-full w-full">
                      <Image
                        src={sponsor.logo_url}
                        alt={sponsor.name}
                        fill
                        className="object-contain grayscale group-hover:grayscale-0 transition-all"
                      />
                    </div>
                  ) : (
                    <span className="text-xl font-bold text-center text-slate-400 group-hover:text-slate-900">
                      {sponsor.name}
                    </span>
                  )}
                </Card>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
