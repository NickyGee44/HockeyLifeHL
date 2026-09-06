'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { User, LogOut, ChevronDown, CreditCard, FileText, Shield, ClipboardCheck, Goal } from 'lucide-react';
import { useUser } from '@/hooks/useUser';
import { usePlayerProfile } from '@/hooks/usePlayerProfile';
import { useLeague } from '@/hooks/useLeague';
import { signOut } from '@/lib/supabase/auth';

interface UserMenuProps {
  leagueSlug: string;
  leagueId?: string;
}

export function UserMenu({ leagueSlug, leagueId }: UserMenuProps) {
  const { user, isLoading } = useUser();
  const { league } = useLeague();
  const { profile, currentTeam } = usePlayerProfile(
    leagueId,
    league?.current_season_id
  );
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    await signOut();
    setIsOpen(false);
    window.location.reload();
  };

  if (isLoading) {
    return (
      <div className="glass-control h-11 w-11 animate-pulse rounded-full" aria-label="Loading account" />
    );
  }

  if (!user) {
    return null;
  }

  // Parse full_name into display name and initials
  const displayName = profile?.full_name || user.email?.split('@')[0] || 'Player';

  const initials = (() => {
    if (profile?.full_name) {
      const parts = profile.full_name.trim().split(/\s+/);
      if (parts.length >= 2) {
        return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
      }
      return profile.full_name.charAt(0).toUpperCase();
    }
    return displayName.charAt(0).toUpperCase();
  })();

  return (
    <div ref={menuRef} className="relative">
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        className="glass-control flex min-h-11 items-center gap-2 rounded-xl border border-transparent p-1.5 transition-colors hover:border-[var(--blh-glass-border)] hover:bg-[var(--color-surface-hover)]"
      >
        {/* Avatar */}
        {profile?.avatar_url ? (
          <Image
            src={profile.avatar_url}
            alt={displayName}
            width={32}
            height={32}
            className="rounded-full"
          />
        ) : (
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
            style={{
              backgroundColor: 'var(--league-primary)',
              color: 'var(--color-background)',
            }}
          >
            {initials}
          </div>
        )}

        {/* Name (hidden on mobile) */}
        <span className="hidden sm:inline text-sm font-medium max-w-[120px] truncate">
          {displayName}
        </span>

        <ChevronDown className={`w-4 h-4 text-[var(--color-text-muted)] transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div role="menu" className="glass-card-strong absolute right-0 z-50 mt-2 max-h-[calc(100dvh-120px)] w-64 overflow-y-auto rounded-2xl">
          {/* User Info Header */}
          <div className="p-4 border-b border-[var(--color-border)]">
            <div className="flex items-center gap-3">
              {profile?.avatar_url ? (
                <Image
                  src={profile.avatar_url}
                  alt={displayName}
                  width={40}
                  height={40}
                  className="rounded-full"
                />
              ) : (
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold"
                  style={{
                    backgroundColor: 'var(--league-primary)',
                    color: 'var(--color-background)',
                  }}
                >
                  {initials}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">{displayName}</p>
                <p className="text-xs text-[var(--color-text-muted)] truncate">
                  {user.email}
                </p>
              </div>
            </div>

            {/* Team Badge */}
            {currentTeam && (
              <div className="glass-control mt-3 flex items-center gap-2 rounded-xl border border-[var(--blh-glass-border)] p-2">
                {currentTeam.team?.logo && (
                  <Image
                    src={currentTeam.team.logo}
                    alt={currentTeam.team.name}
                    width={24}
                    height={24}
                    className="rounded"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{currentTeam.team?.name}</p>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    #{currentTeam.jersey_number || '-'} {currentTeam.position || ''}
                  </p>
                </div>
                {currentTeam.is_captain && (
                  <span className="text-xs bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded font-medium">
                    C
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Menu Items */}
          <div className="p-2">
            <MenuItem
              href={`/${leagueSlug}/players/${profile?.id}`}
              icon={
                profile?.avatar_url ? (
                  <Image
                    src={profile.avatar_url}
                    alt="My Page"
                    width={16}
                    height={16}
                    className="w-4 h-4 rounded-full object-cover"
                  />
                ) : (
                  <User className="w-4 h-4" />
                )
              }
              label="My Page"
              onClick={() => setIsOpen(false)}
            />
            <MenuItem
              href={`/${leagueSlug}/checkin`}
              icon={<ClipboardCheck className="w-4 h-4" />}
              label="Game Check-In"
              onClick={() => setIsOpen(false)}
            />
            {(currentTeam?.is_captain || currentTeam?.is_alternate) && (
              <>
                <MenuItem
                  href={`/${leagueSlug}/captain`}
                  icon={<Shield className="w-4 h-4" />}
                  label="Captain Dashboard"
                  onClick={() => setIsOpen(false)}
                />
                <MenuItem
                  href={`/${leagueSlug}/captain/goalies`}
                  icon={<Goal className="w-4 h-4" />}
                  label="Goalie Marketplace"
                  onClick={() => setIsOpen(false)}
                />
              </>
            )}
            <MenuItem
              href={`/${leagueSlug}/me/payments`}
              icon={<CreditCard className="w-4 h-4" />}
              label="Payments"
              onClick={() => setIsOpen(false)}
            />
            <MenuItem
              href={`/${leagueSlug}/me/waivers`}
              icon={<FileText className="w-4 h-4" />}
              label="Waivers"
              onClick={() => setIsOpen(false)}
            />
            <MenuItem
              href={`/${leagueSlug}/me/profile`}
              icon={<User className="w-4 h-4" />}
              label="Edit Profile"
              onClick={() => setIsOpen(false)}
            />

            <div className="my-2 border-t border-[var(--color-border)]" />

            <button
              onClick={handleSignOut}
              className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-red-300 transition-colors hover:bg-red-500/10"
            >
              <LogOut className="w-4 h-4" />
              <span className="text-sm">Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function MenuItem({
  href,
  icon,
  label,
  onClick,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      role="menuitem"
      className="flex min-h-11 items-center gap-3 rounded-xl px-3 py-2 text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text-primary)]"
    >
      {icon}
      <span className="text-sm">{label}</span>
    </Link>
  );
}
