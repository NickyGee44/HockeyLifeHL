import Link from "next/link";
import Image from "next/image";
import { platformConfig } from "@/lib/league-config";

export default function AuthLayout({
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
      <div className="min-h-screen flex flex-col relative z-10">
        {/* Simple Header */}
        <header className="p-4">
          <Link href="/" className="flex items-center gap-2 w-fit">
            <Image
              src={platformConfig.logo}
              alt={platformConfig.name}
              width={32}
              height={32}
              className="h-8 w-auto"
              style={{ width: "auto", height: "2rem" }}
              priority
            />
            <span className="font-display text-xl font-bold" style={{ color: platformConfig.colors.rinkBlue }}>
              {platformConfig.name}
            </span>
          </Link>
        </header>

        {/* Content */}
        <main className="flex-1 flex items-center justify-center p-4">
          {children}
        </main>

        {/* Simple Footer */}
        <footer className="p-4 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} {platformConfig.name}. {platformConfig.slogan}
        </footer>
      </div>
    </div>
  );
}
