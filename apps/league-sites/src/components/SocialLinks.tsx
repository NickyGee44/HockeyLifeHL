'use client';

import { Facebook, Twitter, Instagram, Youtube } from 'lucide-react';
import type { WebsiteSettings } from '@/lib/types';

// TikTok icon is not available in lucide-react, so we create a custom one
function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
    </svg>
  );
}

interface SocialLinksProps {
  settings?: WebsiteSettings | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showLabels?: boolean;
}

interface SocialLink {
  url: string;
  icon: React.ReactNode;
  label: string;
}

export function SocialLinks({
  settings,
  size = 'md',
  className = '',
  showLabels = false,
}: SocialLinksProps) {
  if (!settings) return null;

  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  const buttonSizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
  };

  const iconSize = sizeClasses[size];
  const buttonSize = buttonSizeClasses[size];

  // Build list of social links that have values
  const socialLinks: SocialLink[] = [];

  if (settings.socialFacebook) {
    socialLinks.push({
      url: settings.socialFacebook,
      icon: <Facebook className={iconSize} />,
      label: 'Facebook',
    });
  }

  if (settings.socialTwitter) {
    socialLinks.push({
      url: settings.socialTwitter,
      icon: <Twitter className={iconSize} />,
      label: 'Twitter / X',
    });
  }

  if (settings.socialInstagram) {
    socialLinks.push({
      url: settings.socialInstagram,
      icon: <Instagram className={iconSize} />,
      label: 'Instagram',
    });
  }

  if (settings.socialYoutube) {
    socialLinks.push({
      url: settings.socialYoutube,
      icon: <Youtube className={iconSize} />,
      label: 'YouTube',
    });
  }

  if (settings.socialTiktok) {
    socialLinks.push({
      url: settings.socialTiktok,
      icon: <TikTokIcon className={iconSize} />,
      label: 'TikTok',
    });
  }

  // If no social links are configured, don't render anything
  if (socialLinks.length === 0) return null;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {socialLinks.map((link) => (
        <a
          key={link.label}
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={link.label}
          title={link.label}
          className={`
            ${buttonSize}
            inline-flex items-center justify-center
            rounded-full
            bg-[var(--color-surface)]
             text-[var(--color-text-secondary)]
             hover:bg-[var(--league-primary)]
             hover:text-[var(--color-accent-text)]
             transition-all duration-300
            border border-[var(--color-border)]
            hover:border-[var(--league-primary)]
            hover:scale-110
          `}
        >
          {link.icon}
          {showLabels && (
            <span className="ml-2 text-sm">{link.label}</span>
          )}
        </a>
      ))}
    </div>
  );
}

/**
 * Extracts social links from league settings for easier access
 */
export function getSocialLinksFromSettings(settings?: { website?: WebsiteSettings } | null): WebsiteSettings | null {
  if (!settings?.website) return null;

  const { socialFacebook, socialTwitter, socialInstagram, socialYoutube, socialTiktok } = settings.website;

  // Check if any social link exists
  if (!socialFacebook && !socialTwitter && !socialInstagram && !socialYoutube && !socialTiktok) {
    return null;
  }

  return settings.website;
}
