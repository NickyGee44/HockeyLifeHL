'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import type { TeamData, PlayerData } from '@/lib/actions/scorekeeper';
import type { GameSubmission } from '@/lib/scorekeeper/types';

interface SignatureCanvasProps {
  onSignatureChange: (dataUrl: string | null) => void;
  width?: number;
  height?: number;
  disabled?: boolean;
}

/**
 * SignatureCanvas - Touch-optimized signature drawing component
 * Works with iPad stylus and finger input
 */
function SignatureCanvas({
  onSignatureChange,
  width = 400,
  height = 150,
  disabled = false,
}: SignatureCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#22D3EE';
  }, []);

  const getCoordinates = (
    e: React.TouchEvent | React.MouseEvent
  ): { x: number; y: number } | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    if ('touches' in e) {
      const touch = e.touches[0];
      return {
        x: (touch.clientX - rect.left) * scaleX,
        y: (touch.clientY - rect.top) * scaleY,
      };
    } else {
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
      };
    }
  };

  const startDrawing = useCallback(
    (e: React.TouchEvent | React.MouseEvent) => {
      if (disabled) return;

      const coords = getCoordinates(e);
      if (!coords) return;

      const ctx = canvasRef.current?.getContext('2d');
      if (!ctx) return;

      setIsDrawing(true);
      ctx.beginPath();
      ctx.moveTo(coords.x, coords.y);
    },
    [disabled]
  );

  const draw = useCallback(
    (e: React.TouchEvent | React.MouseEvent) => {
      if (!isDrawing || disabled) return;

      e.preventDefault();
      const coords = getCoordinates(e);
      if (!coords) return;

      const ctx = canvasRef.current?.getContext('2d');
      if (!ctx) return;

      ctx.lineTo(coords.x, coords.y);
      ctx.stroke();
      setHasSignature(true);
    },
    [isDrawing, disabled]
  );

  const stopDrawing = useCallback(() => {
    if (!isDrawing) return;

    setIsDrawing(false);

    const canvas = canvasRef.current;
    if (canvas && hasSignature) {
      onSignatureChange(canvas.toDataURL('image/png'));
    }
  }, [isDrawing, hasSignature, onSignatureChange]);

  const clearSignature = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
    onSignatureChange(null);
  }, [onSignatureChange]);

  return (
    <div className="space-y-2">
      <div
        className={`relative rounded-xl overflow-hidden border-2 border-dashed ${
          disabled
            ? 'border-neutral-700 bg-neutral-900/50'
            : hasSignature
            ? 'border-[var(--league-primary,#d4af37)]/50 bg-neutral-950'
            : 'border-neutral-600 bg-neutral-950'
        }`}
      >
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          className={`w-full touch-none ${disabled ? 'cursor-not-allowed' : 'cursor-crosshair'}`}
          style={{ height: `${height}px` }}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />

        {/* Signature line */}
        <div className="absolute bottom-8 left-8 right-8 h-px bg-neutral-700" />

        {/* X marker */}
        {!hasSignature && !disabled && (
          <div className="absolute bottom-6 left-8 text-neutral-600 text-sm font-medium">
            X
          </div>
        )}

        {/* Instructions */}
        {!hasSignature && !disabled && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <p className="text-neutral-500 text-sm">Sign here</p>
          </div>
        )}
      </div>

      {/* Clear button */}
      {hasSignature && !disabled && (
        <button
          onClick={clearSignature}
          className="text-sm text-neutral-400 hover:text-white transition-colors"
        >
          Clear signature
        </button>
      )}
    </div>
  );
}

interface CaptainSignatureProps {
  team: TeamData;
  captain?: PlayerData;
  existingSignature?: string;
  signedAt?: string;
  onSign: (signature: string) => Promise<void>;
  isSubmitting?: boolean;
  disabled?: boolean;
}

/**
 * CaptainSignature - Individual captain signature collection
 */
export function CaptainSignature({
  team,
  captain,
  existingSignature,
  signedAt,
  onSign,
  isSubmitting = false,
  disabled = false,
}: CaptainSignatureProps) {
  const [signature, setSignature] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const teamColor = team.primaryColor || '#22D3EE';
  const isSigned = !!existingSignature || !!signedAt;

  const handleSubmit = async () => {
    if (!signature) {
      setError('Please provide a signature');
      return;
    }

    try {
      setError(null);
      await onSign(signature);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit signature');
    }
  };

  return (
    <div
      className={`bg-neutral-900 border rounded-2xl p-6 ${
        isSigned ? 'border-emerald-500/30' : 'border-white/10'
      }`}
    >
      {/* Header */}
      <div className="flex items-center gap-4 mb-4">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: `${teamColor}20` }}
        >
          <span className="text-xl font-black" style={{ color: teamColor }}>
            {team.shortName?.[0] || team.name[0]}
          </span>
        </div>
        <div>
          <h3 className="font-semibold text-white">{team.name}</h3>
          <p className="text-sm text-neutral-400">
            {captain ? `Captain: #${captain.jerseyNumber} ${captain.fullName}` : 'Captain'}
          </p>
        </div>

        {isSigned && (
          <div className="ml-auto flex items-center gap-2 text-emerald-400">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
            </svg>
            <span className="text-sm font-medium">Signed</span>
          </div>
        )}
      </div>

      {/* Signature Canvas or Display */}
      {isSigned ? (
        <div className="space-y-2">
          {existingSignature && (
            <div className="bg-neutral-950 rounded-xl p-4 border border-neutral-800">
              <Image
                src={existingSignature}
                alt="Captain signature"
                className="max-h-24 mx-auto"
                width={200}
                height={96}
                unoptimized
              />
            </div>
          )}
          {signedAt && (
            <p className="text-xs text-neutral-500 text-center">
              Signed {new Date(signedAt).toLocaleString()}
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <SignatureCanvas
            onSignatureChange={setSignature}
            disabled={disabled || isSubmitting}
          />

          {error && (
            <p className="text-sm text-red-400">{error}</p>
          )}

          <button
            onClick={handleSubmit}
            disabled={!signature || isSubmitting || disabled}
            className={`w-full py-3 px-4 rounded-xl font-semibold transition-all touch-manipulation ${
              signature && !isSubmitting
                ? 'bg-[var(--league-primary,#d4af37)] text-black hover:shadow-lg hover:shadow-[var(--league-primary,#d4af37)]/20'
                : 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
            }`}
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Submitting...
              </span>
            ) : (
              'Confirm & Sign'
            )}
          </button>
        </div>
      )}
    </div>
  );
}

interface GameSignatureVerificationProps {
  gameId: string;
  homeTeam: TeamData;
  awayTeam: TeamData;
  homeCaptain?: PlayerData;
  awayCaptain?: PlayerData;
  submission?: GameSubmission;
  onSubmitSignature: (
    teamType: 'home' | 'away',
    signature: string
  ) => Promise<void>;
  onFinalSubmit: () => Promise<void>;
  isSubmitting?: boolean;
}

/**
 * GameSignatureVerification - Full game verification flow
 * Collects signatures from both team captains before final submission
 */
export function GameSignatureVerification({
  homeTeam,
  awayTeam,
  homeCaptain,
  awayCaptain,
  submission,
  onSubmitSignature,
  onFinalSubmit,
  isSubmitting = false,
}: GameSignatureVerificationProps) {
  const homeIsSigned = !!submission?.home_captain_signed_at;
  const awayIsSigned = !!submission?.away_captain_signed_at;
  const bothSigned = homeIsSigned && awayIsSigned;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white mb-2">Game Verification</h2>
        <p className="text-neutral-400">
          Both team captains must sign to verify the game sheet
        </p>
      </div>

      {/* Progress */}
      <div className="flex items-center justify-center gap-4">
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
            homeIsSigned
              ? 'bg-emerald-500 text-white'
              : 'bg-neutral-800 text-neutral-400'
          }`}
        >
          {homeIsSigned ? (
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
            </svg>
          ) : (
            '1'
          )}
        </div>

        <div
          className={`flex-1 h-1 rounded-full max-w-[100px] ${
            homeIsSigned ? 'bg-emerald-500' : 'bg-neutral-800'
          }`}
        />

        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
            awayIsSigned
              ? 'bg-emerald-500 text-white'
              : homeIsSigned
              ? 'bg-[var(--league-primary,#d4af37)] text-black'
              : 'bg-neutral-800 text-neutral-400'
          }`}
        >
          {awayIsSigned ? (
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
            </svg>
          ) : (
            '2'
          )}
        </div>

        <div
          className={`flex-1 h-1 rounded-full max-w-[100px] ${
            awayIsSigned ? 'bg-emerald-500' : 'bg-neutral-800'
          }`}
        />

        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
            bothSigned
              ? 'bg-[var(--league-primary,#d4af37)] text-black'
              : 'bg-neutral-800 text-neutral-400'
          }`}
        >
          3
        </div>
      </div>

      {/* Signature Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        <CaptainSignature
          team={homeTeam}
          captain={homeCaptain}
          existingSignature={submission?.home_captain_signature}
          signedAt={submission?.home_captain_signed_at}
          onSign={(sig) => onSubmitSignature('home', sig)}
          isSubmitting={isSubmitting}
          disabled={homeIsSigned}
        />

        <CaptainSignature
          team={awayTeam}
          captain={awayCaptain}
          existingSignature={submission?.away_captain_signature}
          signedAt={submission?.away_captain_signed_at}
          onSign={(sig) => onSubmitSignature('away', sig)}
          isSubmitting={isSubmitting}
          disabled={awayIsSigned || !homeIsSigned}
        />
      </div>

      {/* Final Submit */}
      {bothSigned && (
        <div className="pt-4">
          <button
            onClick={onFinalSubmit}
            disabled={isSubmitting}
            className={`w-full py-4 px-6 rounded-xl font-bold text-lg bg-[var(--league-primary,#d4af37)] text-black hover:shadow-lg hover:shadow-[var(--league-primary,#d4af37)]/30 transition-all touch-manipulation ${
              isSubmitting ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="w-6 h-6 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Submitting game...
              </span>
            ) : (
              'Submit Verified Game'
            )}
          </button>
          <p className="text-center text-xs text-neutral-500 mt-2">
            This game will be marked as officially verified
          </p>
        </div>
      )}
    </div>
  );
}

export { SignatureCanvas };
