'use client';

import * as React from 'react';
import { useRef, useEffect, useCallback, useState } from 'react';
import SignaturePadLib from 'signature_pad';
import { RotateCcw, Check, Type, Pen } from 'lucide-react';
import { Button } from '@hockey-life/ui';
import { Input } from './input';
import { cn } from '@hockey-life/ui/lib/utils';

export interface SignaturePadProps {
  value?: string;
  onChange?: (data: string, type: 'drawn' | 'typed') => void;
  signedName?: string;
  onSignedNameChange?: (name: string) => void;
  width?: number;
  height?: number;
  penColor?: string;
  backgroundColor?: string;
  className?: string;
  disabled?: boolean;
}

export function SignaturePad({
  value,
  onChange,
  signedName = '',
  onSignedNameChange,
  width = 400,
  height = 200,
  penColor = '#22D3EE', // Gold
  backgroundColor = '#1a1a1a', // Dark background
  className,
  disabled = false,
}: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const signaturePadRef = useRef<SignaturePadLib | null>(null);
  const [mode, setMode] = useState<'draw' | 'type'>('draw');
  const [typedName, setTypedName] = useState('');
  const [isEmpty, setIsEmpty] = useState(true);

  // Initialize signature pad
  useEffect(() => {
    if (!canvasRef.current || mode !== 'draw') return;

    const canvas = canvasRef.current;
    const ratio = Math.max(window.devicePixelRatio || 1, 1);

    canvas.width = canvas.offsetWidth * ratio;
    canvas.height = canvas.offsetHeight * ratio;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.scale(ratio, ratio);
    }

    const signaturePad = new SignaturePadLib(canvas, {
      penColor,
      backgroundColor,
      minWidth: 1,
      maxWidth: 3,
    });

    signaturePadRef.current = signaturePad;

    // Listen for changes
    signaturePad.addEventListener('endStroke', () => {
      setIsEmpty(signaturePad.isEmpty());
    });

    // Load existing value
    if (value && value.startsWith('data:image')) {
      signaturePad.fromDataURL(value);
      setIsEmpty(false); // eslint-disable-line -- sync isEmpty state with loaded signature data
    }

    return () => {
      signaturePad.off();
    };
  }, [mode, penColor, backgroundColor]);

  // Handle resize
  useEffect(() => {
    const handleResize = () => {
      if (!canvasRef.current || !signaturePadRef.current || mode !== 'draw') return;

      const canvas = canvasRef.current;
      const ratio = Math.max(window.devicePixelRatio || 1, 1);
      const data = signaturePadRef.current.toData();

      canvas.width = canvas.offsetWidth * ratio;
      canvas.height = canvas.offsetHeight * ratio;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(ratio, ratio);
      }

      signaturePadRef.current.clear();
      signaturePadRef.current.fromData(data);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [mode]);

  const handleClear = useCallback(() => {
    if (mode === 'draw' && signaturePadRef.current) {
      signaturePadRef.current.clear();
      setIsEmpty(true);
      onChange?.('', 'drawn');
    } else {
      setTypedName('');
      onChange?.('', 'typed');
    }
  }, [mode, onChange]);

  const handleConfirm = useCallback(() => {
    if (mode === 'draw' && signaturePadRef.current) {
      if (signaturePadRef.current.isEmpty()) return;
      const dataUrl = signaturePadRef.current.toDataURL('image/png');
      onChange?.(dataUrl, 'drawn');
    } else if (mode === 'type' && typedName.trim()) {
      // Generate signature image from typed name
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = backgroundColor;
        ctx.fillRect(0, 0, width, height);
        ctx.fillStyle = penColor;
        ctx.font = 'italic 48px "Brush Script MT", cursive, Georgia, serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(typedName, width / 2, height / 2);
      }
      const dataUrl = canvas.toDataURL('image/png');
      onChange?.(dataUrl, 'typed');
    }
  }, [mode, typedName, onChange, width, height, backgroundColor, penColor]);

  const handleTypedNameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setTypedName(value);
      setIsEmpty(!value.trim());
    },
    []
  );

  const handleModeSwitch = useCallback((newMode: 'draw' | 'type') => {
    setMode(newMode);
    setIsEmpty(true);
    if (newMode === 'type') {
      setTypedName('');
    }
  }, []);

  return (
    <div className={cn('space-y-4', className)}>
      {/* Mode Toggle */}
      <div className="flex gap-2">
        <Button
          type="button"
          variant={mode === 'draw' ? 'default' : 'outline'}
          size="sm"
          onClick={() => handleModeSwitch('draw')}
          disabled={disabled}
        >
          <Pen className="mr-2 h-4 w-4" />
          Draw
        </Button>
        <Button
          type="button"
          variant={mode === 'type' ? 'default' : 'outline'}
          size="sm"
          onClick={() => handleModeSwitch('type')}
          disabled={disabled}
        >
          <Type className="mr-2 h-4 w-4" />
          Type
        </Button>
      </div>

      {/* Signature Area */}
      <div
        className={cn(
          'relative rounded-lg overflow-hidden border border-neutral-700',
          disabled && 'opacity-50 pointer-events-none'
        )}
        style={{ width: '100%', maxWidth: width, height }}
      >
        {mode === 'draw' ? (
          <>
            <canvas
              ref={canvasRef}
              className="w-full h-full touch-none"
              style={{
                backgroundColor,
                cursor: disabled ? 'not-allowed' : 'crosshair',
              }}
            />
            {/* Helper text */}
            {isEmpty && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <p className="text-neutral-500 text-sm">Sign here</p>
              </div>
            )}
          </>
        ) : (
          <div
            className="w-full h-full flex items-center justify-center"
            style={{ backgroundColor }}
          >
            {typedName ? (
              <p
                className="text-4xl italic"
                style={{
                  color: penColor,
                  fontFamily: '"Brush Script MT", cursive, Georgia, serif',
                }}
              >
                {typedName}
              </p>
            ) : (
              <p className="text-neutral-500 text-sm">Type your name below</p>
            )}
          </div>
        )}
      </div>

      {/* Type Mode Input */}
      {mode === 'type' && (
        <Input
          type="text"
          placeholder="Type your full legal name"
          value={typedName}
          onChange={handleTypedNameChange}
          disabled={disabled}
          className="max-w-md"
        />
      )}

      {/* Legal Name Confirmation */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-neutral-300">
          Full Legal Name
        </label>
        <Input
          type="text"
          placeholder="Enter your full legal name"
          value={signedName}
          onChange={(e) => onSignedNameChange?.(e.target.value)}
          disabled={disabled}
          className="max-w-md"
        />
        <p className="text-xs text-neutral-500">
          By signing, I confirm this is my legal name and the signature is binding.
        </p>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleClear}
          disabled={disabled || isEmpty}
        >
          <RotateCcw className="mr-2 h-4 w-4" />
          Clear
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={handleConfirm}
          disabled={disabled || isEmpty}
        >
          <Check className="mr-2 h-4 w-4" />
          Confirm Signature
        </Button>
      </div>

      {/* Preview */}
      {value && (
        <div className="space-y-2">
          <p className="text-sm text-neutral-400">Saved Signature:</p>
          <div
            className="inline-block rounded-lg overflow-hidden border border-rink-500/30"
            style={{ backgroundColor }}
          >
            <img
              src={value}
              alt="Signature preview"
              className="max-w-[200px] h-auto"
            />
          </div>
        </div>
      )}
    </div>
  );
}
