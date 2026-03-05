'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@hockey-life/ui';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setError(error.message);
        return;
      }

      router.push('/');
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      {/* Logo */}
      <div className="mb-8 text-center">
        <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-gold-400 to-gold-600 flex items-center justify-center">
          <svg
            className="w-12 h-12 text-black"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M13.5 5.5c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zM9.8 8.9L7 23h2.1l1.8-8 2.1 2v6h2v-7.5l-2.1-2 .6-3C14.8 12 16.8 13 19 13v-2c-1.9 0-3.5-1-4.3-2.4l-1-1.6c-.4-.6-1-1-1.7-1-.3 0-.5.1-.8.1L6 8.3V13h2V9.6l1.8-.7" />
          </svg>
        </div>
        <h1 className="text-2xl font-black text-white">HockeyLifeHL</h1>
        <p className="text-neutral-400 mt-1">Player Companion</p>
      </div>

      {/* Login Form */}
      <form onSubmit={handleSubmit} className="w-full max-w-[360px] space-y-4">
        {error && (
          <div
            className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm"
            aria-live="polite"
          >
            {error}
          </div>
        )}

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-neutral-300 mb-1.5">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            spellCheck={false}
            className={cn(
              'w-full px-4 py-3 rounded-xl',
              'bg-neutral-850 border border-gold-500/20 text-white',
              'placeholder:text-neutral-500',
              'focus:outline-none focus:ring-2 focus:ring-gold-500/50 focus:border-transparent'
            )}
            placeholder="your@email.com"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-neutral-300 mb-1.5">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            className={cn(
              'w-full px-4 py-3 rounded-xl',
              'bg-neutral-850 border border-gold-500/20 text-white',
              'placeholder:text-neutral-500',
              'focus:outline-none focus:ring-2 focus:ring-gold-500/50 focus:border-transparent'
            )}
            placeholder="••••••••"
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className={cn(
            'w-full py-3 rounded-xl font-semibold text-base',
            'bg-gradient-to-r from-gold-500 to-gold-600 text-black',
            'hover:shadow-lg hover:shadow-gold-500/20 transition-[box-shadow,transform,opacity]',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            'active:scale-[0.98]'
          )}
        >
          {isLoading ? 'Signing in…' : 'Sign In'}
        </button>

        <div className="text-center pt-4">
          <Link
            href="/forgot-password"
            className="text-sm text-gold-500 hover:text-gold-400 transition-colors"
          >
            Forgot your password?
          </Link>
        </div>
      </form>

      {/* Footer */}
      <div className="mt-auto pt-8 pb-4 text-center">
        <p className="text-xs text-neutral-600">
          Don&apos;t have an account?{' '}
          <a href="https://hockeylifehl.com/signup" className="text-gold-500">
            Sign up
          </a>
        </p>
      </div>
    </div>
  );
}
