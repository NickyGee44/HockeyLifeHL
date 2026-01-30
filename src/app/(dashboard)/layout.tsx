"use client";

import Image from "next/image";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#F7FAFC] flex flex-col text-[#0B1220] relative overflow-hidden">
      {/* Background Ice Texture Image - same as homepage */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <Image
          src="/web-bg2.jpg"
          alt=""
          fill
          className="object-cover opacity-[0.15]"
          priority
          quality={90}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-white/60 via-transparent to-white/80" />
      </div>

      {/* Content */}
      <div className="flex min-h-screen flex-col relative z-10">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-6">{children}</main>
        <Footer />
      </div>
    </div>
  );
}
