'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@hockey-life/ui';
import { Users, Palette, Mail, MessageSquare, Send, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue } from '@/components/ui/select';
import { ColorPicker } from './ColorPicker';
import { submitTeamRegistrationRequest } from '@/lib/actions/team-registration-requests';
import {
  sendTeamRequestSubmittedEmail,
  notifyLeagueAdminsOfNewTeamRequest,
} from '@/lib/email/team-request-emails';
import { createClient } from '@/lib/supabase/client';

interface Division {
  id: string;
  name: string;
}

interface TeamRegistrationFormProps {
  leagueId: string;
  leagueName: string;
  divisions: Division[];
  locale: string;
}

export function TeamRegistrationForm({
  leagueId,
  leagueName,
  divisions,
  locale }: TeamRegistrationFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [teamName, setTeamName] = useState('');
  const [teamShortName, setTeamShortName] = useState('');
  const [teamPrimaryColor, setTeamPrimaryColor] = useState('#22D3EE');
  const [teamSecondaryColor, setTeamSecondaryColor] = useState('#070A0F');
  const [teamContactEmail, setTeamContactEmail] = useState('');
  const [teamContactPhone, setTeamContactPhone] = useState('');
  const [requestedDivisionId, setRequestedDivisionId] = useState('');
  const [message, setMessage] = useState('');
  const [preferredDivisionNotes, setPreferredDivisionNotes] = useState('');

  // Auto-generate short name
  const handleTeamNameChange = (name: string) => {
    setTeamName(name);
    if (!teamShortName || teamShortName === generateShortName(teamName)) {
      setTeamShortName(generateShortName(name));
    }
  };

  const generateShortName = (name: string): string => {
    return name
      .split(' ')
      .map((word) => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 4);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const result = await submitTeamRegistrationRequest({
        leagueId,
        teamName: teamName.trim(),
        teamShortName: teamShortName.trim(),
        teamPrimaryColor,
        teamSecondaryColor,
        teamContactEmail: teamContactEmail.trim() || undefined,
        teamContactPhone: teamContactPhone.trim() || undefined,
        requestedDivisionId: requestedDivisionId || undefined,
        message: message.trim() || undefined,
        preferredDivisionNotes: preferredDivisionNotes.trim() || undefined });

      if (result.success && result.data) {
        // Get current user info for email
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, email')
          .eq('id', user?.id ?? '')
          .single();

        // Send confirmation email to requester
        if (profile?.email) {
          await sendTeamRequestSubmittedEmail({
            to: profile.email,
            requesterName: profile.full_name || 'Team Manager',
            leagueName,
            teamName: teamName.trim(),
            teamShortName: teamShortName.trim(),
            requestedDivision: divisions.find((d) => d.id === requestedDivisionId)?.name,
            submittedAt: new Date(),
            requestId: result.data.id });
        }

        // Notify league admins of new team request
        try {
          const { data: adminMembers } = await supabase
            .from('league_memberships')
            .select('profiles!inner(id, full_name, email)')
            .eq('league_id', leagueId)
            .in('role', ['owner', 'admin']);

          if (adminMembers && adminMembers.length > 0) {
            const adminEmails = adminMembers
              .map((m) => {
                const p = m.profiles as unknown as { id: string; full_name: string | null; email: string | null };
                return p?.email ? { email: p.email, name: p.full_name || 'Admin' } : null;
              })
              .filter((a): a is { email: string; name: string } => a !== null);

            // Get pending request count for admin alert
            const { count: pendingCount } = await supabase
              .from('team_registration_requests')
              .select('*', { count: 'exact', head: true })
              .eq('league_id', leagueId)
              .eq('status', 'pending');

            if (adminEmails.length > 0) {
              await notifyLeagueAdminsOfNewTeamRequest({
                adminEmails,
                leagueName,
                requesterName: profile?.full_name || 'Team Manager',
                requesterEmail: profile?.email || '',
                teamName: teamName.trim(),
                teamShortName: teamShortName.trim(),
                teamContactEmail: teamContactEmail.trim() || undefined,
                requestedDivision: divisions.find((d) => d.id === requestedDivisionId)?.name,
                message: message.trim() || undefined,
                submittedAt: new Date(),
                pendingCount: pendingCount ?? 1,
                requestId: result.data.id,
                leagueId,
              });
            }
          }
        } catch (emailErr) {
          // Don't fail the submission if admin notification fails
          console.error('[TeamRegistration] Failed to notify admins:', emailErr);
        }

        setIsSuccess(true);
      } else {
        setError(result.error || 'Failed to submit request');
      }
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-8 text-center">
        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-white mb-2">Request Submitted!</h2>
        <p className="text-neutral-300 mb-6 max-w-md mx-auto">
          Your team registration request for <span className="font-medium text-white">&quot;{teamName}&quot;</span> has been submitted successfully.
          The league administrators will review your request and notify you via email.
        </p>
        <div className="flex justify-center gap-3">
          <Button
            onClick={() => router.push(`/${locale}/dashboard/leagues/${leagueId}/teams`)}
            className="bg-rink-500 text-black hover:bg-rink-600"
          >
            Back to Teams
          </Button>
          <Button
            onClick={() => router.push(`/${locale}/dashboard`)}
            variant="outline"
            className="bg-transparent border-neutral-700 text-neutral-300 hover:bg-neutral-800"
          >
            Go to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Error Display */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Team Information */}
      <div className="bg-white/[0.04] border border-white/10 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-rink-500/10 flex items-center justify-center">
            <Users className="w-5 h-5 text-rink-500" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Team Information</h2>
            <p className="text-sm text-neutral-400">Basic details about your team</p>
          </div>
        </div>

        <div className="grid gap-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="teamName" className="text-neutral-300">
                Team Name <span className="text-red-400">*</span>
              </Label>
              <Input
                id="teamName"
                value={teamName}
                onChange={(e) => handleTeamNameChange(e.target.value)}
                placeholder="e.g., Mighty Ducks"
                required
                className="bg-neutral-800 border-neutral-700 text-white placeholder:text-neutral-500"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="teamShortName" className="text-neutral-300">
                Short Name / Abbreviation <span className="text-red-400">*</span>
              </Label>
              <Input
                id="teamShortName"
                value={teamShortName}
                onChange={(e) => setTeamShortName(e.target.value.toUpperCase().slice(0, 4))}
                placeholder="e.g., DUCKS"
                maxLength={4}
                required
                className="bg-neutral-800 border-neutral-700 text-white placeholder:text-neutral-500 uppercase"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Team Colors */}
      <div className="bg-white/[0.04] border border-white/10 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-rink-500/10 flex items-center justify-center">
            <Palette className="w-5 h-5 text-rink-500" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Team Colors</h2>
            <p className="text-sm text-neutral-400">Choose your team&apos;s primary and secondary colors</p>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <ColorPicker
            label="Primary Color"
            value={teamPrimaryColor}
            onChange={setTeamPrimaryColor}
          />
          <ColorPicker
            label="Secondary Color"
            value={teamSecondaryColor}
            onChange={setTeamSecondaryColor}
          />
        </div>

        {/* Preview */}
        <div className="mt-4 p-4 bg-neutral-900/50 rounded-lg">
          <p className="text-xs text-neutral-500 mb-2">Preview</p>
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold"
              style={{ backgroundColor: teamPrimaryColor }}
            >
              {teamShortName.slice(0, 2) || 'TM'}
            </div>
            <div>
              <p className="font-bold text-white">{teamName || 'Team Name'}</p>
              <p className="text-sm text-neutral-500">{teamShortName || 'SHORT'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Contact Information */}
      <div className="bg-white/[0.04] border border-white/10 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-rink-500/10 flex items-center justify-center">
            <Mail className="w-5 h-5 text-rink-500" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Contact Information</h2>
            <p className="text-sm text-neutral-400">How can the league reach your team?</p>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="contactEmail" className="text-neutral-300">
              Team Contact Email
            </Label>
            <Input
              id="contactEmail"
              type="email"
              value={teamContactEmail}
              onChange={(e) => setTeamContactEmail(e.target.value)}
              placeholder="team@example.com"
              className="bg-neutral-800 border-neutral-700 text-white placeholder:text-neutral-500"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="contact" className="text-neutral-300">
              Team Contact</Label>
            <Input
              id="contact"
              type="tel"
              value={teamContactPhone}
              onChange={(e) => setTeamContactPhone(e.target.value)}
              placeholder="(555) 123-4567"
              className="bg-neutral-800 border-neutral-700 text-white placeholder:text-neutral-500"
            />
          </div>
        </div>
      </div>

      {/* Division Preference */}
      {divisions.length > 0 && (
        <div className="bg-white/[0.04] border border-white/10 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-rink-500/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-rink-500" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Division Preference</h2>
              <p className="text-sm text-neutral-400">Which division would you like to join?</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="division" className="text-neutral-300">
                Preferred Division
              </Label>
              <Select value={requestedDivisionId} onValueChange={setRequestedDivisionId}>
                <SelectTrigger className="bg-neutral-800 border-neutral-700 text-white">
                  <SelectValue placeholder="Select a division (optional)" />
                </SelectTrigger>
                <SelectContent className="bg-neutral-800 border-neutral-700">
                  {divisions.map((division) => (
                    <SelectItem
                      key={division.id}
                      value={division.id}
                      className="text-white hover:bg-neutral-700"
                    >
                      {division.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {requestedDivisionId && (
              <div className="space-y-2">
                <Label htmlFor="divisionNotes" className="text-neutral-300">
                  Division Preference Notes (Optional)
                </Label>
                <Textarea
                  id="divisionNotes"
                  value={preferredDivisionNotes}
                  onChange={(e) => setPreferredDivisionNotes(e.target.value)}
                  placeholder="Why is this division a good fit for your team?"
                  className="bg-neutral-800 border-neutral-700 text-white placeholder:text-neutral-500 resize-none"
                  rows={2}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Additional Message */}
      <div className="bg-white/[0.04] border border-white/10 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-rink-500/10 flex items-center justify-center">
            <MessageSquare className="w-5 h-5 text-rink-500" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Additional Information</h2>
            <p className="text-sm text-neutral-400">Anything else the league should know?</p>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="message" className="text-neutral-300">
            Message to League Administrators (Optional)
          </Label>
          <Textarea
            id="message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Tell the league about your team, experience level, or any special requests..."
            className="bg-neutral-800 border-neutral-700 text-white placeholder:text-neutral-500 resize-none"
            rows={4}
          />
        </div>
      </div>

      {/* Submit Button */}
      <div className="flex justify-end gap-3">
        <Button
          type="button"
          onClick={() => router.back()}
          variant="outline"
          className="bg-transparent border-neutral-700 text-neutral-300 hover:bg-neutral-800"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting || !teamName.trim() || !teamShortName.trim()}
          className={cn(
            'bg-gradient-to-r from-rink-500 to-arena-500 text-black font-semibold',
            'hover:shadow-lg hover:shadow-rink-500/20 transition-all',
            (isSubmitting || !teamName.trim() || !teamShortName.trim()) && 'opacity-50 cursor-not-allowed'
          )}
        >
          {isSubmitting ? (
            <>
              <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin mr-2" />
              Submitting...
            </>
          ) : (
            <>
              <Send className="w-4 h-4 mr-2" />
              Submit Registration Request
            </>
          )}
        </Button>
      </div>
    </form>
  );
}

export default TeamRegistrationForm;
