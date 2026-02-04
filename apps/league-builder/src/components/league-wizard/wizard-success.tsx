'use client';

import * as React from 'react';
import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import {
  Trophy,
  Calendar,
  Users,
  Share2,
  ExternalLink,
  LayoutDashboard,
  Check,
  Copy,
  CheckCircle2,
  Clock,
  MapPin,
  Rocket,
  ArrowRight,
} from 'lucide-react';
import { Button, Card, CardContent, cn } from '@hockey-life/ui';
import { toast } from 'sonner';

// Confetti particle type
interface ConfettiParticle {
  id: number;
  x: number;
  y: number;
  rotation: number;
  scale: number;
  color: string;
  velocityX: number;
  velocityY: number;
  rotationSpeed: number;
}

// Confetti colors (hockey/sports theme - blues and whites with gold accents)
const CONFETTI_COLORS = [
  '#1E40AF', // Primary blue
  '#3B82F6', // Bright blue
  '#60A5FA', // Light blue
  '#FFFFFF', // White
  '#22D3EE', // Gold
  '#FFD700', // Bright gold
  '#93C5FD', // Pale blue
];

function Confetti() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    // Create initial particles
    const initialParticles: ConfettiParticle[] = [];
    for (let i = 0; i < 200; i++) {
      initialParticles.push({
        id: i,
        x: Math.random() * window.innerWidth,
        y: Math.random() * -window.innerHeight,
        rotation: Math.random() * 360,
        scale: 0.5 + Math.random() * 0.5,
        color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
        velocityX: (Math.random() - 0.5) * 6,
        velocityY: 3 + Math.random() * 4,
        rotationSpeed: (Math.random() - 0.5) * 12,
      });
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    let animationId: number;
    let currentParticles = initialParticles;

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      currentParticles = currentParticles.map((p) => ({
        ...p,
        x: p.x + p.velocityX,
        y: p.y + p.velocityY,
        rotation: p.rotation + p.rotationSpeed,
        velocityY: p.velocityY + 0.05, // gravity
        velocityX: p.velocityX * 0.99, // air resistance
      }));

      currentParticles.forEach((p) => {
        if (p.y > canvas.height + 50) return;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.scale(p.scale, p.scale);

        // Draw rectangle confetti
        ctx.fillStyle = p.color;
        ctx.fillRect(-5, -10, 10, 20);

        // Draw some as circles for variety
        if (p.id % 3 === 0) {
          ctx.beginPath();
          ctx.arc(0, 0, 5, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();
      });

      // Continue if any particles are still visible
      if (currentParticles.some((p) => p.y < canvas.height + 50)) {
        animationId = requestAnimationFrame(animate);
      }
    };

    animate();

    // Handle resize
    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-50"
      style={{ width: '100vw', height: '100vh' }}
    />
  );
}

export interface WizardSuccessProps {
  leagueId: string;
  leagueName: string;
  leagueSlug: string;
  subdomain?: string;
  seasonName?: string;
  seasonStartDate?: string;
  seasonEndDate?: string;
  teamCount?: number;
  location?: string;
}

export function WizardSuccess({
  leagueId,
  leagueName,
  leagueSlug,
  subdomain,
  seasonName,
  seasonStartDate,
  seasonEndDate,
  teamCount = 0,
  location,
}: WizardSuccessProps) {
  const [showConfetti, setShowConfetti] = useState(true);
  const [copied, setCopied] = useState(false);

  // Stop confetti after 6 seconds
  useEffect(() => {
    const timer = setTimeout(() => setShowConfetti(false), 6000);
    return () => clearTimeout(timer);
  }, []);

  // Generate the registration link
  const registrationLink = subdomain
    ? `https://${subdomain}.beerleaguehockey.ca/register`
    : `https://beerleaguehockey.ca/leagues/${leagueSlug}/register`;

  // Generate the public website link
  const websiteLink = subdomain
    ? `https://${subdomain}.beerleaguehockey.ca`
    : `https://beerleaguehockey.ca/leagues/${leagueSlug}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(registrationLink);
      setCopied(true);
      toast.success('Registration link copied to clipboard!');
      setTimeout(() => setCopied(false), 3000);
    } catch {
      toast.error('Failed to copy link');
    }
  };

  const formatDate = (dateString?: string): string => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  return (
    <>
      {showConfetti && <Confetti />}

      <div className="container mx-auto py-8 px-4 max-w-4xl">
        <div className="text-center mb-8">
          {/* Trophy Icon with Animation */}
          <div className="relative inline-block mb-6">
            <div className="absolute inset-0 animate-ping bg-primary/20 rounded-full" />
            <div className="relative bg-gradient-to-br from-primary to-primary/80 rounded-full p-6 shadow-lg shadow-primary/30">
              <Trophy className="h-12 w-12 text-primary-foreground" />
            </div>
          </div>

          {/* Success Message */}
          <h1 className="text-4xl font-bold mb-3">Your League is Ready!</h1>
          <p className="text-xl text-muted-foreground">
            Congratulations! <span className="font-semibold text-foreground">{leagueName}</span> has been created.
          </p>
        </div>

        {/* League Stats Summary */}
        <Card className="mb-8 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
          <CardContent className="pt-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatItem
                icon={<Trophy className="h-5 w-5" />}
                label="League"
                value={leagueName}
                truncate
              />
              {seasonName && (
                <StatItem
                  icon={<Calendar className="h-5 w-5" />}
                  label="Season"
                  value={seasonName}
                  truncate
                />
              )}
              {(seasonStartDate || seasonEndDate) && (
                <StatItem
                  icon={<Clock className="h-5 w-5" />}
                  label="Dates"
                  value={`${formatDate(seasonStartDate)} - ${formatDate(seasonEndDate)}`}
                />
              )}
              {location && (
                <StatItem
                  icon={<MapPin className="h-5 w-5" />}
                  label="Location"
                  value={location}
                  truncate
                />
              )}
              <StatItem
                icon={<Users className="h-5 w-5" />}
                label="Teams"
                value={teamCount > 0 ? `${teamCount} teams` : 'No teams yet'}
              />
            </div>
          </CardContent>
        </Card>

        {/* Quick Action Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <QuickActionCard
            icon={<Calendar className="h-6 w-6" />}
            title="Generate Schedule"
            description="Create your game schedule for the season"
            href={`/dashboard/leagues/${leagueId}/schedule`}
          />

          <QuickActionCard
            icon={<Users className="h-6 w-6" />}
            title="Invite Team Captains"
            description="Send invitations to manage their teams"
            href={`/dashboard/leagues/${leagueId}/teams`}
          />

          <QuickActionCard
            icon={<Share2 className="h-6 w-6" />}
            title="Share Registration Link"
            description="Copy the link for players to register"
            onClick={handleCopyLink}
            actionLabel={copied ? 'Copied!' : 'Copy Link'}
            actionIcon={copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          />

          <QuickActionCard
            icon={<ExternalLink className="h-6 w-6" />}
            title="Preview Your Website"
            description="See your league's public website"
            href={websiteLink}
            external
          />
        </div>

        {/* Recommended Next Steps Checklist */}
        <Card className="mb-8">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-4">
              <Rocket className="h-5 w-5 text-primary" />
              <h2 className="font-semibold text-lg">Recommended Next Steps</h2>
            </div>

            <div className="space-y-3">
              <NextStepItem
                completed={teamCount > 0}
                title="Add teams to your league"
                description="Create team profiles for each team that will participate"
                href={`/dashboard/leagues/${leagueId}/teams`}
              />

              <NextStepItem
                completed={false}
                title="Configure your venues"
                description="Add ice rinks and arenas where games will be played"
                href={`/dashboard/leagues/${leagueId}/venues`}
              />

              <NextStepItem
                completed={false}
                title="Set up your game schedule"
                description="Use the schedule wizard to generate your season schedule"
                href={`/dashboard/leagues/${leagueId}/schedule`}
              />

              <NextStepItem
                completed={false}
                title="Invite players and captains"
                description="Send registration links to players and captain invites to team managers"
                href={`/dashboard/leagues/${leagueId}/players`}
              />

              <NextStepItem
                completed={false}
                title="Customize your website"
                description="Add your logo, update content, and configure your public league page"
                href={`/dashboard/leagues/${leagueId}/settings`}
              />
            </div>
          </CardContent>
        </Card>

        {/* Dashboard Button */}
        <div className="text-center">
          <Button asChild size="lg" className="min-w-[200px]">
            <Link href="/dashboard">
              <LayoutDashboard className="mr-2 h-5 w-5" />
              Go to Dashboard
            </Link>
          </Button>

          <p className="mt-4 text-sm text-muted-foreground">
            You can always access your league settings from the dashboard.
          </p>
        </div>
      </div>
    </>
  );
}

// Helper Components
interface StatItemProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  truncate?: boolean;
}

function StatItem({ icon, label, value, truncate }: StatItemProps) {
  return (
    <div className="text-center p-3">
      <div className="flex justify-center mb-2 text-primary">{icon}</div>
      <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
        {label}
      </p>
      <p className={cn('text-sm font-semibold', truncate && 'truncate')} title={value}>
        {value}
      </p>
    </div>
  );
}

interface QuickActionCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  href?: string;
  onClick?: () => void;
  actionLabel?: string;
  actionIcon?: React.ReactNode;
  external?: boolean;
}

function QuickActionCard({
  icon,
  title,
  description,
  href,
  onClick,
  actionLabel,
  actionIcon,
  external,
}: QuickActionCardProps) {
  const content = (
    <Card className="h-full transition-all hover:border-primary/50 hover:shadow-md cursor-pointer">
      <CardContent className="pt-6 h-full flex flex-col">
        <div className="flex items-start gap-4">
          <div className="bg-primary/10 rounded-lg p-3 text-primary shrink-0">
            {icon}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold mb-1 flex items-center gap-2">
              {title}
              {external && <ExternalLink className="h-3 w-3 text-muted-foreground" />}
            </h3>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
        </div>

        {(actionLabel || onClick) && (
          <div className="mt-4 pt-4 border-t flex justify-end">
            <span className="text-sm font-medium text-primary flex items-center gap-1">
              {actionIcon}
              {actionLabel || 'Get Started'}
              {!actionIcon && <ArrowRight className="h-4 w-4" />}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );

  if (onClick) {
    return (
      <button onClick={onClick} className="text-left w-full">
        {content}
      </button>
    );
  }

  if (href) {
    if (external) {
      return (
        <a href={href} target="_blank" rel="noopener noreferrer" className="block">
          {content}
        </a>
      );
    }
    return (
      <Link href={href} className="block">
        {content}
      </Link>
    );
  }

  return content;
}

interface NextStepItemProps {
  completed: boolean;
  title: string;
  description: string;
  href: string;
}

function NextStepItem({ completed, title, description, href }: NextStepItemProps) {
  return (
    <Link
      href={href}
      className={cn(
        'flex items-start gap-3 p-3 rounded-lg border transition-all',
        completed
          ? 'bg-green-50 border-green-200 dark:bg-green-900/10 dark:border-green-800/30'
          : 'hover:bg-muted/50 hover:border-muted-foreground/20'
      )}
    >
      <div
        className={cn(
          'w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5',
          completed
            ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'
            : 'bg-muted text-muted-foreground'
        )}
      >
        {completed ? (
          <CheckCircle2 className="h-4 w-4" />
        ) : (
          <span className="text-xs font-medium">?</span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn('font-medium text-sm', completed && 'text-green-700 dark:text-green-400')}>
          {title}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
      <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
    </Link>
  );
}
