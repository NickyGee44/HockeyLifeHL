'use client';

import * as React from 'react';
import { useState, useRef, useEffect } from 'react';
import { X, ChevronDown, Check, ScrollText } from 'lucide-react';
import { Button } from '@hockey-life/ui';
import { SignaturePad } from './signature-pad';
import { cn } from '@hockey-life/ui/lib/utils';

export interface WaiverModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSign: (data: {
    signatureData: string;
    signatureType: 'drawn' | 'typed';
    signedName: string;
    waiverContentHash: string;
  }) => void;
  title: string;
  content: string;
  version: string;
  contentHash: string;
  leagueName?: string;
  className?: string;
}

export function WaiverModal({
  isOpen,
  onClose,
  onSign,
  title,
  content,
  version,
  contentHash,
  leagueName,
  className,
}: WaiverModalProps) {
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const [signatureData, setSignatureData] = useState('');
  const [signatureType, setSignatureType] = useState<'drawn' | 'typed'>('drawn');
  const [signedName, setSignedName] = useState('');
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setHasScrolledToBottom(false);
      setSignatureData('');
      setSignedName('');
    }
  }, [isOpen]);

  // Check scroll position
  const handleScroll = () => {
    if (!scrollContainerRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    const isAtBottom = scrollTop + clientHeight >= scrollHeight - 20;

    if (isAtBottom && !hasScrolledToBottom) {
      setHasScrolledToBottom(true);
    }
  };

  const handleSignatureChange = (data: string, type: 'drawn' | 'typed') => {
    setSignatureData(data);
    setSignatureType(type);
  };

  const handleSign = () => {
    if (!signatureData || !signedName.trim()) return;

    onSign({
      signatureData,
      signatureType,
      signedName,
      waiverContentHash: contentHash,
    });
  };

  const scrollToBottom = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: scrollContainerRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  };

  const canSign = hasScrolledToBottom && signatureData && signedName.trim().length >= 2;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className={cn(
        'fixed inset-4 md:inset-8 lg:inset-16 z-50',
        'flex flex-col bg-neutral-900 rounded-2xl overflow-hidden',
        'border border-neutral-700',
        className
      )}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-700 bg-neutral-900/80 backdrop-blur">
          <div className="flex items-center gap-3">
            <ScrollText className="h-6 w-6 text-gold-500" />
            <div>
              <h2 className="text-lg font-semibold text-white">{title}</h2>
              {leagueName && (
                <p className="text-sm text-neutral-400">{leagueName}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs text-neutral-500">Version {version}</span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onClose}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
          {/* Waiver Text */}
          <div className="flex-1 flex flex-col min-h-0">
            <div
              ref={scrollContainerRef}
              onScroll={handleScroll}
              className="flex-1 overflow-y-auto p-6 prose prose-invert max-w-none"
            >
              {/* Render markdown-like content */}
              <div
                className="text-neutral-300 leading-relaxed"
                dangerouslySetInnerHTML={{
                  __html: content
                    .replace(/^### (.+)$/gm, '<h3 class="text-lg font-semibold text-white mt-6 mb-3">$1</h3>')
                    .replace(/^## (.+)$/gm, '<h2 class="text-xl font-bold text-white mt-8 mb-4">$1</h2>')
                    .replace(/^# (.+)$/gm, '<h1 class="text-2xl font-bold text-gold-500 mb-6">$1</h1>')
                    .replace(/^- (.+)$/gm, '<li class="ml-4 text-neutral-300">$1</li>')
                    .replace(/\n\n/g, '</p><p class="my-4">')
                    .replace(/\*\*(.+?)\*\*/g, '<strong class="text-white">$1</strong>'),
                }}
              />
            </div>

            {/* Scroll Indicator */}
            {!hasScrolledToBottom && (
              <div className="px-6 py-3 border-t border-neutral-700 bg-neutral-800/50">
                <button
                  type="button"
                  onClick={scrollToBottom}
                  className="w-full flex items-center justify-center gap-2 text-gold-500 hover:text-gold-400 transition-colors"
                >
                  <span className="text-sm">Please read the entire waiver</span>
                  <ChevronDown className="h-4 w-4 animate-bounce" />
                </button>
              </div>
            )}
          </div>

          {/* Signature Panel */}
          <div className="w-full md:w-[450px] border-t md:border-t-0 md:border-l border-neutral-700 bg-neutral-800/30 p-6 overflow-y-auto">
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">
                  Your Signature
                </h3>
                <p className="text-sm text-neutral-400 mb-4">
                  {hasScrolledToBottom
                    ? 'Please sign below to acknowledge that you have read and agree to this waiver.'
                    : 'Please scroll down and read the entire waiver before signing.'}
                </p>
              </div>

              <div className={cn(
                'transition-opacity duration-300',
                !hasScrolledToBottom && 'opacity-50 pointer-events-none'
              )}>
                <SignaturePad
                  value={signatureData}
                  onChange={handleSignatureChange}
                  signedName={signedName}
                  onSignedNameChange={setSignedName}
                  width={380}
                  height={150}
                  disabled={!hasScrolledToBottom}
                />
              </div>

              {/* Agreement Checkbox */}
              <div className={cn(
                'flex items-start gap-3 p-4 rounded-lg border transition-colors',
                canSign
                  ? 'border-gold-500/50 bg-gold-500/10'
                  : 'border-neutral-700 bg-neutral-800/50'
              )}>
                {canSign ? (
                  <Check className="h-5 w-5 text-gold-500 mt-0.5 flex-shrink-0" />
                ) : (
                  <div className="h-5 w-5 rounded border border-neutral-600 mt-0.5 flex-shrink-0" />
                )}
                <p className="text-sm text-neutral-300">
                  I have read this waiver, understand its contents, and voluntarily
                  agree to its terms. I understand that by signing, I am giving up
                  certain legal rights.
                </p>
              </div>

              {/* Submit Button */}
              <Button
                type="button"
                onClick={handleSign}
                disabled={!canSign}
                className="w-full"
                size="lg"
              >
                {canSign ? (
                  <>
                    <Check className="mr-2 h-5 w-5" />
                    Sign & Accept Waiver
                  </>
                ) : (
                  'Complete steps above to sign'
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Simpler inline waiver component for embedding in forms
export interface InlineWaiverProps {
  content: string;
  signatureData: string;
  onSignatureChange: (data: string, type: 'drawn' | 'typed') => void;
  signedName: string;
  onSignedNameChange: (name: string) => void;
  hasAgreed: boolean;
  onAgreeChange: (agreed: boolean) => void;
  className?: string;
}

export function InlineWaiver({
  content,
  signatureData,
  onSignatureChange,
  signedName,
  onSignedNameChange,
  hasAgreed,
  onAgreeChange,
  className,
}: InlineWaiverProps) {
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const handleScroll = () => {
    if (!scrollContainerRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    const isAtBottom = scrollTop + clientHeight >= scrollHeight - 20;

    if (isAtBottom && !hasScrolledToBottom) {
      setHasScrolledToBottom(true);
    }
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Waiver Content */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-neutral-300">
          Liability Waiver
        </label>
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="h-64 overflow-y-auto p-4 rounded-lg border border-neutral-700 bg-neutral-800/50 prose prose-invert prose-sm max-w-none"
        >
          <div
            className="text-neutral-300 text-sm leading-relaxed"
            dangerouslySetInnerHTML={{
              __html: content
                .replace(/^### (.+)$/gm, '<h4 class="text-sm font-semibold text-white mt-4 mb-2">$1</h4>')
                .replace(/^## (.+)$/gm, '<h3 class="text-base font-bold text-white mt-6 mb-3">$1</h3>')
                .replace(/^# (.+)$/gm, '<h2 class="text-lg font-bold text-gold-500 mb-4">$1</h2>')
                .replace(/^- (.+)$/gm, '<li class="ml-4 text-neutral-300 text-sm">$1</li>')
                .replace(/\n\n/g, '</p><p class="my-3">')
                .replace(/\*\*(.+?)\*\*/g, '<strong class="text-white">$1</strong>'),
            }}
          />
        </div>
        {!hasScrolledToBottom && (
          <p className="text-xs text-gold-500 flex items-center gap-1">
            <ChevronDown className="h-3 w-3 animate-bounce" />
            Please scroll to read the entire waiver
          </p>
        )}
      </div>

      {/* Signature */}
      <div className={cn(
        'transition-opacity duration-300',
        !hasScrolledToBottom && 'opacity-50 pointer-events-none'
      )}>
        <SignaturePad
          value={signatureData}
          onChange={onSignatureChange}
          signedName={signedName}
          onSignedNameChange={onSignedNameChange}
          width={400}
          height={150}
          disabled={!hasScrolledToBottom}
        />
      </div>

      {/* Agreement Checkbox */}
      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={hasAgreed}
          onChange={(e) => onAgreeChange(e.target.checked)}
          disabled={!hasScrolledToBottom || !signatureData || !signedName}
          className="mt-1 h-4 w-4 rounded border-neutral-600 bg-neutral-800 text-gold-500 focus:ring-gold-500 focus:ring-offset-neutral-900 disabled:opacity-50"
        />
        <span className="text-sm text-neutral-300">
          I have read this waiver, understand its contents, and voluntarily agree to
          its terms. I understand that by signing, I am giving up certain legal rights.
        </span>
      </label>
    </div>
  );
}
