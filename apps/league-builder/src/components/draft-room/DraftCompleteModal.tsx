'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Trophy,
  Download,
  X,
  Users,
  Clock,
  Zap,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { DraftCompleteModalProps } from './types';

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

// Confetti colors (gold theme)
const CONFETTI_COLORS = [
  '#22D3EE', // Cyan
  '#FFD700', // Bright Gold
  '#06b6d4', // Dark Cyan
  '#FFFFFF', // White
  '#F0E68C', // Khaki
  '#FFC107', // Amber
];

function Confetti() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    // Create initial particles
    const initialParticles: ConfettiParticle[] = [];
    for (let i = 0; i < 150; i++) {
      initialParticles.push({
        id: i,
        x: Math.random() * window.innerWidth,
        y: Math.random() * -window.innerHeight,
        rotation: Math.random() * 360,
        scale: 0.5 + Math.random() * 0.5,
        color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
        velocityX: (Math.random() - 0.5) * 4,
        velocityY: 2 + Math.random() * 3,
        rotationSpeed: (Math.random() - 0.5) * 10,
      });
    }

    // Animation loop
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

        ctx.restore();
      });

      // Continue if any particles are still visible
      if (currentParticles.some((p) => p.y < canvas.height + 50)) {
        animationId = requestAnimationFrame(animate);
      }
    };

    animate();

    return () => {
      cancelAnimationFrame(animationId);
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

export function DraftCompleteModal({
  isOpen,
  draft,
  picks,
  teams,
  onClose,
}: DraftCompleteModalProps) {
  const t = useTranslations('draft');
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setShowConfetti(true); // eslint-disable-line -- trigger confetti animation when modal opens
      // Stop confetti after 5 seconds
      const timer = setTimeout(() => setShowConfetti(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Calculate stats
  const totalPicks = picks.length;
  const autoPicks = picks.filter((p) => p.auto_picked).length;
  const avgPickTime = picks.reduce((acc, p) => acc + (p.pick_time_ms || 0), 0) / totalPicks / 1000;

  // Get team stats
  const teamStats = teams.map((team) => {
    const teamPicks = picks.filter((p) => p.team_id === team.id);
    return {
      ...team,
      totalPicks: teamPicks.length,
      autoPicks: teamPicks.filter((p) => p.auto_picked).length,
    };
  });

  return (
    <>
      {showConfetti && <Confetti />}

      <div className="fixed inset-0 z-40 flex items-center justify-center">
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

        {/* Modal */}
        <div className="relative z-10 w-full max-w-2xl rounded-2xl border border-rink-500/30 bg-neutral-900 p-8 shadow-2xl">
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute right-4 top-4 rounded-lg p-2 text-neutral-400 transition-colors hover:bg-neutral-800 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Header with Trophy */}
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-rink-400 to-rink-600 shadow-[0_0_40px_rgba(34,211,238,0.4)]">
              <Trophy className="h-10 w-10 text-black" />
            </div>
            <h2 className="text-3xl font-bold text-white">{t('draftCompleteTitle')}</h2>
            <p className="mt-2 text-neutral-400">
              {t('draftFinished', { name: draft.name, count: totalPicks })}
            </p>
          </div>

          {/* Stats Grid */}
          <div className="mb-8 grid grid-cols-3 gap-4">
            <div className="rounded-xl border border-white/10 bg-rink-500/5 p-4 text-center">
              <Users className="mx-auto mb-2 h-6 w-6 text-rink-500" />
              <p className="text-2xl font-bold text-white">{teams.length}</p>
              <p className="text-xs text-neutral-400">{t('teamsLabel')}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-rink-500/5 p-4 text-center">
              <Clock className="mx-auto mb-2 h-6 w-6 text-rink-500" />
              <p className="text-2xl font-bold text-white">{avgPickTime.toFixed(1)}s</p>
              <p className="text-xs text-neutral-400">{t('avgPickTime')}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-rink-500/5 p-4 text-center">
              <Zap className="mx-auto mb-2 h-6 w-6 text-rink-500" />
              <p className="text-2xl font-bold text-white">{autoPicks}</p>
              <p className="text-xs text-neutral-400">{t('autoPicksLabel')}</p>
            </div>
          </div>

          {/* Team Results Preview */}
          <div className="mb-8">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-400">
              {t('teamResults')}
            </h3>
            <div className="max-h-48 space-y-2 overflow-y-auto">
              {teamStats.map((team, index) => (
                <div
                  key={team.id}
                  className="flex items-center justify-between rounded-lg bg-neutral-800/50 px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-rink-500/20 text-sm font-bold text-rink-500">
                      {index + 1}
                    </span>
                    <span className="font-medium text-white">{team.name}</span>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-neutral-400">
                      {t('teamPicksCount', { count: team.totalPicks })}
                    </span>
                    {team.autoPicks > 0 && (
                      <span className="flex items-center gap-1 text-yellow-500">
                        <Zap className="h-3 w-3" />
                        {team.autoPicks}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Export Note */}
          <div className="rounded-xl border border-neutral-700 bg-neutral-800/30 p-4 text-center">
            <p className="text-sm text-neutral-400">
              {t('exportNote')}
            </p>
          </div>

          {/* Actions */}
          <div className="mt-8 flex items-center justify-end gap-3">
            <button
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-neutral-400 transition-colors hover:text-white"
            >
              {t('close')}
            </button>
            <button
              onClick={onClose}
              className="flex items-center gap-2 rounded-lg bg-rink-500 px-6 py-2 font-semibold text-black transition-all hover:bg-rink-600 hover:shadow-[0_0_20px_rgba(34,211,238,0.3)]"
            >
              <Download className="h-4 w-4" />
              {t('viewFullResults')}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
