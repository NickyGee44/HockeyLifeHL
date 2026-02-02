'use client';

import { useEffect, useState, useRef } from 'react';
import {
  Trophy,
  Download,
  FileText,
  Table,
  X,
  Users,
  Clock,
  Zap,
  CheckCircle,
} from 'lucide-react';
import { cn } from '@hockey-life/ui/lib/utils';
import type { DraftCompleteModalProps, DraftPick } from './types';

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
  '#D4AF37', // Gold
  '#FFD700', // Bright Gold
  '#C19A00', // Dark Gold
  '#FFFFFF', // White
  '#F0E68C', // Khaki
  '#FFC107', // Amber
];

function Confetti() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [particles, setParticles] = useState<ConfettiParticle[]>([]);

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
    setParticles(initialParticles);

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
  onExport,
}: DraftCompleteModalProps) {
  const [showConfetti, setShowConfetti] = useState(false);
  const [selectedExport, setSelectedExport] = useState<'csv' | 'pdf' | null>(null);

  useEffect(() => {
    if (isOpen) {
      setShowConfetti(true);
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
        <div className="relative z-10 w-full max-w-2xl rounded-2xl border border-gold-500/30 bg-neutral-900 p-8 shadow-2xl">
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute right-4 top-4 rounded-lg p-2 text-neutral-400 transition-colors hover:bg-neutral-800 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Header with Trophy */}
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-gold-400 to-gold-600 shadow-[0_0_40px_rgba(212,175,55,0.4)]">
              <Trophy className="h-10 w-10 text-black" />
            </div>
            <h2 className="text-3xl font-bold text-white">Draft Complete!</h2>
            <p className="mt-2 text-neutral-400">
              {draft.name} has finished with {totalPicks} picks
            </p>
          </div>

          {/* Stats Grid */}
          <div className="mb-8 grid grid-cols-3 gap-4">
            <div className="rounded-xl border border-gold-500/20 bg-gold-500/5 p-4 text-center">
              <Users className="mx-auto mb-2 h-6 w-6 text-gold-500" />
              <p className="text-2xl font-bold text-white">{teams.length}</p>
              <p className="text-xs text-neutral-400">Teams</p>
            </div>
            <div className="rounded-xl border border-gold-500/20 bg-gold-500/5 p-4 text-center">
              <Clock className="mx-auto mb-2 h-6 w-6 text-gold-500" />
              <p className="text-2xl font-bold text-white">{avgPickTime.toFixed(1)}s</p>
              <p className="text-xs text-neutral-400">Avg Pick Time</p>
            </div>
            <div className="rounded-xl border border-gold-500/20 bg-gold-500/5 p-4 text-center">
              <Zap className="mx-auto mb-2 h-6 w-6 text-gold-500" />
              <p className="text-2xl font-bold text-white">{autoPicks}</p>
              <p className="text-xs text-neutral-400">Auto-Picks</p>
            </div>
          </div>

          {/* Team Results Preview */}
          <div className="mb-8">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-400">
              Team Results
            </h3>
            <div className="max-h-48 space-y-2 overflow-y-auto">
              {teamStats.map((team, index) => (
                <div
                  key={team.id}
                  className="flex items-center justify-between rounded-lg bg-neutral-800/50 px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gold-500/20 text-sm font-bold text-gold-500">
                      {index + 1}
                    </span>
                    <span className="font-medium text-white">{team.name}</span>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-neutral-400">
                      {team.totalPicks} picks
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

          {/* Export Options */}
          <div>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-400">
              Export Results
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => {
                  setSelectedExport('csv');
                  onExport('csv');
                }}
                className={cn(
                  'flex items-center justify-center gap-3 rounded-xl border-2 p-4 transition-all',
                  selectedExport === 'csv'
                    ? 'border-green-500 bg-green-500/10'
                    : 'border-neutral-700 bg-neutral-800/50 hover:border-neutral-600'
                )}
              >
                <Table
                  className={cn(
                    'h-6 w-6',
                    selectedExport === 'csv' ? 'text-green-500' : 'text-neutral-400'
                  )}
                />
                <div className="text-left">
                  <p className="font-semibold text-white">CSV Spreadsheet</p>
                  <p className="text-xs text-neutral-400">Excel, Google Sheets</p>
                </div>
                {selectedExport === 'csv' && (
                  <CheckCircle className="ml-auto h-5 w-5 text-green-500" />
                )}
              </button>

              <button
                onClick={() => {
                  setSelectedExport('pdf');
                  onExport('pdf');
                }}
                className={cn(
                  'flex items-center justify-center gap-3 rounded-xl border-2 p-4 transition-all',
                  selectedExport === 'pdf'
                    ? 'border-green-500 bg-green-500/10'
                    : 'border-neutral-700 bg-neutral-800/50 hover:border-neutral-600'
                )}
              >
                <FileText
                  className={cn(
                    'h-6 w-6',
                    selectedExport === 'pdf' ? 'text-green-500' : 'text-neutral-400'
                  )}
                />
                <div className="text-left">
                  <p className="font-semibold text-white">PDF Document</p>
                  <p className="text-xs text-neutral-400">Print-ready format</p>
                </div>
                {selectedExport === 'pdf' && (
                  <CheckCircle className="ml-auto h-5 w-5 text-green-500" />
                )}
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-8 flex items-center justify-end gap-3">
            <button
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-neutral-400 transition-colors hover:text-white"
            >
              Close
            </button>
            <button
              onClick={onClose}
              className="flex items-center gap-2 rounded-lg bg-gold-500 px-6 py-2 font-semibold text-black transition-all hover:bg-gold-600 hover:shadow-[0_0_20px_rgba(212,175,55,0.3)]"
            >
              <Download className="h-4 w-4" />
              View Full Results
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
