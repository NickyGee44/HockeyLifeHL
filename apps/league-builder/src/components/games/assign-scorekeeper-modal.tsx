'use client';

import { useState } from 'react';
import { cn } from '@hockey-life/ui';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Mail, MessageSquare, Loader2, CheckCircle, UserPlus, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';
import type { Game } from '@/lib/actions/games';
import { assignScorekeeperToGame } from '@/lib/actions/scorekeeper-admin';

interface AssignScorekeeperModalProps {
  game: Game;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

type AssignmentState = 'form' | 'success';

export function AssignScorekeeperModal({
  game,
  open,
  onOpenChange,
  onSuccess,
}: AssignScorekeeperModalProps) {
  const [loading, setLoading] = useState(false);
  const [state, setState] = useState<AssignmentState>('form');
  const [scorekeeperName, setScorekeeperName] = useState('');
  const [scorekeeperEmail, setScorekeeperEmail] = useState('');
  const [token, setToken] = useState('');
  const [accessLink, setAccessLink] = useState('');
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!scorekeeperEmail.trim()) {
      toast.error('Email is required');
      return;
    }

    setLoading(true);

    try {
      const result = await assignScorekeeperToGame({
        gameId: game.id,
        scorekeeperName: scorekeeperName.trim() || undefined,
        scorekeeperEmail: scorekeeperEmail.trim(),
        sendEmail: true,
      });

      if (!result.success) {
        toast.error(result.error || 'Failed to assign scorekeeper');
        return;
      }

      // Store token and link for display
      setToken(result.token || '');
      setAccessLink(result.accessLink || '');
      setState('success');
      toast.success('Scorekeeper assigned successfully!');
      onSuccess?.();
    } catch (error) {
      console.error('Error assigning scorekeeper:', error);
      toast.error('Failed to assign scorekeeper');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyToken = async () => {
    await navigator.clipboard.writeText(token);
    setCopied(true);
    toast.success('Token copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(accessLink);
    toast.success('Link copied to clipboard!');
  };

  const handleClose = () => {
    onOpenChange(false);
    // Reset form after a short delay
    setTimeout(() => {
      setState('form');
      setScorekeeperName('');
      setScorekeeperEmail('');
      setToken('');
      setAccessLink('');
      setCopied(false);
    }, 300);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-neutral-800 border-white/10 max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <UserPlus className="w-5 h-5 text-rink-500" />
            {state === 'form' ? 'Assign Scorekeeper' : 'Scorekeeper Assigned'}
          </DialogTitle>
          <DialogDescription className="text-neutral-400">
            {state === 'form'
              ? 'Assign a scorekeeper to track stats for this game.'
              : 'Share the access token with your scorekeeper.'}
          </DialogDescription>
        </DialogHeader>

        {state === 'form' ? (
          <form onSubmit={handleSubmit} className="space-y-5 mt-4">
            {/* Game Details */}
            <div className="flex items-center justify-between p-4 rounded-xl bg-neutral-900/50 border border-white/[0.06]">
              <div className="flex items-center gap-2">
                <div
                  className="w-8 h-8 rounded-lg"
                  style={{ backgroundColor: game.home_team?.primary_color || '#22D3EE' }}
                />
                <span className="font-medium text-white text-sm">
                  {game.home_team?.name}
                </span>
              </div>
              <span className="text-neutral-500 font-medium text-sm">vs</span>
              <div className="flex items-center gap-2">
                <span className="font-medium text-white text-sm">
                  {game.away_team?.name}
                </span>
                <div
                  className="w-8 h-8 rounded-lg"
                  style={{ backgroundColor: game.away_team?.primary_color || '#3B82F6' }}
                />
              </div>
            </div>

            {/* Scorekeeper Name */}
            <div className="space-y-2">
              <Label htmlFor="scorekeeperName" className="text-neutral-300">
                Scorekeeper Name <span className="text-neutral-500 text-xs">(optional)</span>
              </Label>
              <Input
                id="scorekeeperName"
                value={scorekeeperName}
                onChange={(e) => setScorekeeperName(e.target.value)}
                placeholder="John Doe"
                className="bg-neutral-900 border-white/10 text-white focus:ring-rink-500 focus:border-rink-500"
              />
              <p className="text-xs text-neutral-500">
                Optional: Used for tracking who was assigned.
              </p>
            </div>

            {/* Scorekeeper Email */}
            <div className="space-y-2">
              <Label htmlFor="scorekeeperEmail" className="text-neutral-300">
                Scorekeeper Email <span className="text-red-500">*</span>
              </Label>
              <Input
                id="scorekeeperEmail"
                type="email"
                value={scorekeeperEmail}
                onChange={(e) => setScorekeeperEmail(e.target.value)}
                placeholder="scorekeeper@example.com"
                required
                className="bg-neutral-900 border-white/10 text-white focus:ring-rink-500 focus:border-rink-500"
              />
              <p className="text-xs text-neutral-500">
                An email with the access token will be sent automatically.
              </p>
            </div>

            {/* Info Box */}
            <div className="flex items-start gap-3 p-4 rounded-xl bg-rink-500/10 border border-rink-500/20">
              <Mail className="w-5 h-5 text-rink-500 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-rink-400">
                  Email Delivery
                </p>
                <p className="text-xs text-neutral-400">
                  The scorekeeper will receive an email with a secure access token and link to the scorekeeper interface.
                </p>
              </div>
            </div>

            <DialogFooter className="gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={loading}
                className="border-neutral-600 text-neutral-300 hover:bg-neutral-700"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="bg-gradient-to-r from-rink-500 to-arena-500 text-black hover:shadow-lg hover:shadow-rink-500/20"
              >
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Assign & Send Email
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <div className="space-y-5 mt-4">
            {/* Success Message */}
            <div className="flex items-start gap-3 p-4 rounded-xl bg-green-500/10 border border-green-500/20">
              <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-green-400">
                  Scorekeeper Assigned Successfully
                </p>
                <p className="text-xs text-neutral-400">
                  Email sent to {scorekeeperEmail}. You can also share the token manually.
                </p>
              </div>
            </div>

            {/* Access Token */}
            <div className="space-y-2">
              <Label className="text-neutral-300">
                Access Token
              </Label>
              <div className="flex items-center gap-2">
                <div className="flex-1 p-4 rounded-xl bg-neutral-900 border border-white/[0.06] font-mono text-2xl font-bold text-center text-rink-500 tracking-wider">
                  {token}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={handleCopyToken}
                  className="border-neutral-600 hover:border-rink-500 hover:text-rink-500"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
              <p className="text-xs text-neutral-500">
                16-character code valid for 24 hours. Share this with your scorekeeper.
              </p>
            </div>

            {/* Access Link */}
            <div className="space-y-2">
              <Label className="text-neutral-300">
                Direct Access Link
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  value={accessLink}
                  readOnly
                  className="bg-neutral-900 border-white/10 text-white font-mono text-xs"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={handleCopyLink}
                  className="border-neutral-600 hover:border-rink-500 hover:text-rink-500"
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-xs text-neutral-500">
                Scorekeeper can use this link to access the interface directly.
              </p>
            </div>

            {/* Sharing Options */}
            <div className="grid grid-cols-2 gap-3">
              <a
                href={`mailto:${scorekeeperEmail}?subject=Scorekeeper Access for ${game.home_team?.name} vs ${game.away_team?.name}&body=Your scorekeeper token: ${token}%0A%0AAccess link: ${accessLink}`}
                className={cn(
                  'flex items-center justify-center gap-2 px-4 py-3 rounded-xl border transition-colors',
                  'bg-neutral-900 border-white/10 text-neutral-300 hover:bg-neutral-800 hover:border-rink-500/40'
                )}
              >
                <Mail className="w-4 h-4" />
                <span className="text-sm font-medium">Email</span>
              </a>
              <a
                href={`sms:?&body=Your scorekeeper token: ${token}. Access link: ${accessLink}`}
                className={cn(
                  'flex items-center justify-center gap-2 px-4 py-3 rounded-xl border transition-colors',
                  'bg-neutral-900 border-white/10 text-neutral-300 hover:bg-neutral-800 hover:border-rink-500/40'
                )}
              >
                <MessageSquare className="w-4 h-4" />
                <span className="text-sm font-medium">SMS</span>
              </a>
            </div>

            <DialogFooter className="pt-4">
              <Button
                type="button"
                onClick={handleClose}
                className="bg-gradient-to-r from-rink-500 to-arena-500 text-black hover:shadow-lg hover:shadow-rink-500/20 w-full"
              >
                Done
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
