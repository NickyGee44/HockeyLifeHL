'use client';

import { useState, useEffect } from 'react';
import { cn } from '@hockey-life/ui';
import { Loader2 } from 'lucide-react';
import { useParams } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { createStaffMember, type StaffMember } from '@/lib/actions/staff';
import { sendAvailabilityRequestForRefereeStaffMember } from '@/lib/actions/staffing-availability';

// Re-export for consumers
export type { StaffMember } from '@/lib/actions/staff';

interface QuickAddStaffModalProps {
  leagueId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (staff: StaffMember) => void;
  defaultRole?: string;
}

const STAFF_ROLES = [
  { value: 'Owner', label: 'Owner' },
  { value: 'Admin', label: 'Admin' },
  { value: 'Scorekeeper', label: 'Scorekeeper' },
  { value: 'Referee', label: 'Referee' },
  { value: 'Operations', label: 'Operations' },
  { value: 'Coach', label: 'Coach' },
  { value: 'Manager', label: 'Manager' },
  { value: 'Other', label: 'Other' },
] as const;

export function QuickAddStaffModal({
  leagueId,
  open,
  onOpenChange,
  onSuccess,
  defaultRole,
}: QuickAddStaffModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const params = useParams();
  const locale = (params?.locale as string) || 'en';
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState(defaultRole || 'Admin');
  const [sendAvailabilityNow, setSendAvailabilityNow] = useState(true);

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      setName('');
      setEmail('');
      setPhone('');
      setRole(defaultRole || 'Admin');
      setSendAvailabilityNow(true);
      setError(null);
    }
  }, [open, defaultRole]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const result = await createStaffMember({
        leagueId,
        name: name.trim(),
        roleTitle: role,
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
      });

      if (!result.success) {
        setError(result.error || 'Failed to add staff member');
        return;
      }

      if (role === 'Referee' && email.trim() && sendAvailabilityNow && result.data?.id) {
        const requestResult = await sendAvailabilityRequestForRefereeStaffMember({
          leagueId,
          staffMemberId: result.data.id,
          locale,
        });

        if (!requestResult.success) {
          toast.error(requestResult.error || 'Referee added, but the availability request could not be sent.');
        } else {
          toast.success('Referee added and availability request sent.');
        }
      } else {
        toast.success('Staff member added.');
      }

      onOpenChange(false);
      if (result.data) {
        onSuccess?.(result.data);
      }
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] bg-neutral-900 border-white/10">
        <DialogHeader>
          <DialogTitle className="text-white">Add Staff Member</DialogTitle>
          <DialogDescription>
            Quickly add a new staff member to your league.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            {/* Name (required) */}
            <div className="space-y-2">
              <Label htmlFor="staff-name" className="text-neutral-300">
                Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="staff-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Full name"
                required
                autoFocus
                className="bg-neutral-800 border-neutral-700 text-white"
              />
            </div>

            {/* Role */}
            <div className="space-y-2">
              <Label htmlFor="staff-role" className="text-neutral-300">
                Role
              </Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger className="bg-neutral-800 border-neutral-700 text-white">
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent className="bg-neutral-800 border-neutral-700">
                  {STAFF_ROLES.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Email (optional) */}
            <div className="space-y-2">
              <Label htmlFor="staff-email" className="text-neutral-300">
                Email
              </Label>
              <Input
                id="staff-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@example.com"
                className="bg-neutral-800 border-neutral-700 text-white"
              />
            </div>

            {role === 'Referee' && (
              <label className="flex items-start gap-3 rounded-lg border border-neutral-700 bg-neutral-800/60 p-3 md:col-span-2">
                <input
                  type="checkbox"
                  checked={sendAvailabilityNow}
                  onChange={(event) => setSendAvailabilityNow(event.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-rink-500/30 bg-neutral-900 text-rink-500 focus:ring-rink-500"
                />
                <div>
                  <p className="text-sm font-medium text-white">Send weekly availability request</p>
                  <p className="text-xs text-neutral-400">
                    Email this referee a link to set the nights and time slots they can work so the auto-assigner can use them.
                  </p>
                </div>
              </label>
            )}

            {/* Phone (optional) */}
            <div className="space-y-2">
              <Label htmlFor="staff-phone" className="text-neutral-300">
                Phone
              </Label>
              <Input
                id="staff-phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(555) 123-4567"
                className="bg-neutral-800 border-neutral-700 text-white"
              />
            </div>

            {/* Error */}
            {error && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                {error}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="text-neutral-400 hover:text-white"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !name.trim()}
              className={cn(
                'bg-gradient-to-r from-rink-500 to-arena-500 text-black font-semibold',
                'hover:shadow-lg hover:shadow-rink-500/20 transition-all'
              )}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                'Add Staff'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
