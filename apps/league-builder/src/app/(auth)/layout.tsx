import Link from 'next/link';
import { Trophy } from 'lucide-react';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-neutral-950 aurora-bg">

      <div className="relative w-full max-w-md px-8">
        {/* Logo and Branding */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center justify-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-rink-500 to-arena-500 flex items-center justify-center shadow-lg shadow-rink-500/25">
              <Trophy className="w-7 h-7 text-black" />
            </div>
          </Link>
          <h1 className="text-3xl font-black text-white tracking-tight">
            Beer League Hockey
          </h1>
          <p className="text-sm text-neutral-400 mt-2">
            Run the league. Enjoy the game.
          </p>
        </div>

        {children}

        {/* Footer Links */}
        <div className="mt-8 text-center">
          <div className="flex items-center justify-center gap-4 text-xs text-neutral-500">
            <Link href="/privacy" className="hover:text-rink-500 transition-colors">
              Privacy Policy
            </Link>
            <span className="text-neutral-700">•</span>
            <Link href="/terms" className="hover:text-rink-500 transition-colors">
              Terms of Service
            </Link>
          </div>
          <p className="text-xs text-neutral-600 mt-4">
            © {new Date().getFullYear()} Beer League Hockey. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
