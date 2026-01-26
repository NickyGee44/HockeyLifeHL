import Link from "next/link";
import Image from "next/image";
import { platformConfig } from "@/lib/league-config";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-arena flex flex-col">
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
  );
}
