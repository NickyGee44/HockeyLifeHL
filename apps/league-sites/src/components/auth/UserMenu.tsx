'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { User, LogOut, ChevronDown, CreditCard, FileText, LayoutDashboard, Shield } from 'lucide-react';
import { useUser } from '@/hooks/useUser';
import { usePlayerProfile } from '@/hooks/usePlayerProfile';
import { signOut } from '@/lib/supabase/auth';

interface UserMenuProps {
  leagueSlug: string;
  leagueId?: string;
}

export function UserMenu({ leagueSlug, leagueId }: UserMenuProps) {
  const { user, isLoading } = useUser();
  const { profile, currentTeam } = usePlayerProfile(leagueId);
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
      <div className="w-8 h-8 rounded-full bg-[var(--color-surface-hover)] animate-pulse" />
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
        className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-[var(--color-surface-hover)] transition-colors"
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
        <div className="absolute right-0 mt-2 w-64 bg-[var(--color-background-elevated)] border border-[var(--color-border)] rounded-xl shadow-xl overflow-hidden z-50">
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
              <div className="mt-3 flex items-center gap-2 p-2 bg-[var(--color-surface-hover)] rounded-lg">
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
              href={`/${leagueSlug}/me`}
              icon={<LayoutDashboard className="w-4 h-4" />}
              label="My Dashboard"
              onClick={() => setIsOpen(false)}
            />
            {(currentTeam?.is_captain || currentTeam?.is_alternate) && (
              <MenuItem
                href={`/${leagueSlug}/captain`}
                icon={<Shield className="w-4 h-4" />}
                label="Captain Dashboard"
                onClick={() => setIsOpen(false)}
              />
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
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-red-400 hover:bg-red-500/10 transition-colors"
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
      className="flex items-center gap-3 px-3 py-2 rounded-lg text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)] transition-colors"
    >
      {icon}
      <span className="text-sm">{label}</span>
    </Link>
  );
}
