'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@hockey-life/ui';
import { Input } from '@/components/ui/input';
import { ColorPicker, LogoUploader } from '@/components/teams';
import { updateTeam, deleteTeam, uploadTeamLogo, type TeamStatus } from '@/lib/actions/teams';
import {
  Save,
  Loader2,
  AlertCircle,
  Trash2,
  CheckCircle,
  Info,
  Palette,
  MapPin,
  Users,
  Shield,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

interface Team {
  id: string;
  name: string;
  short_name: string;
  logo_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  status: string | null;
  max_roster_size: number | null;
  division_id: string | null;
  home_venue_id: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  notes: string | null;
  league_id: string;
}

interface Division {
  id: string;
  name: string;
}

interface Venue {
  id: string;
  name: string;
}

interface TeamSettingsClientProps {
  team: Team;
  divisions: Division[];
  venues: Venue[];
}

export default function TeamSettingsClient({
  team,
  divisions,
  venues,
}: TeamSettingsClientProps) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: team.name,
    shortName: team.short_name,
    primaryColor: team.primary_color || '#D4AF37',
    secondaryColor: team.secondary_color || '#000000',
    status: (team.status || 'active') as TeamStatus,
    maxRosterSize: team.max_roster_size || 20,
    divisionId: team.division_id || '',
    homeVenueId: team.home_venue_id || '',
    contactEmail: team.contact_email || '',
    contactPhone: team.contact_phone || '',
    notes: team.notes || '',
  });

  const updateField = (field: string, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setSuccess(null);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await updateTeam({
        teamId: team.id,
        name: formData.name,
        shortName: formData.shortName,
        primaryColor: formData.primaryColor,
        secondaryColor: formData.secondaryColor,
        status: formData.status,
        maxRosterSize: formData.maxRosterSize,
        divisionId: formData.divisionId || null,
        homeVenueId: formData.homeVenueId || null,
        contactEmail: formData.contactEmail || null,
        contactPhone: formData.contactPhone || null,
        notes: formData.notes || null,
      });

      if (result.error) {
        setError(result.error);
        return;
      }

      setSuccess('Team settings saved successfully');
      router.refresh();
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogoUpload = async (file: File) => {
    try {
      const result = await uploadTeamLogo(team.id, file);
      if (result.error) {
        return { error: result.error };
      }
      router.refresh();
      return { success: true, data: result.data };
    } catch (err) {
      return { error: 'Failed to upload logo' };
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    setError(null);

    try {
      const result = await deleteTeam(team.id);

      if (result.error) {
        setError(result.error);
        setShowDeleteDialog(false);
        return;
      }

      router.push('/dashboard/teams');
    } catch (err) {
      setError('An unexpected error occurred');
      setShowDeleteDialog(false);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Success Message */}
      {success && (
        <div className="flex items-center gap-2 p-4 rounded-xl bg-green-500/10 border border-green-500/20">
          <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
          <p className="text-sm text-green-400">{success}</p>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-2 p-4 rounded-xl bg-red-500/10 border border-red-500/20">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Basic Info Section */}
      <section className="bg-neutral-900 border border-gold-500/20 rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-gold-500/10">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gold-500/10">
              <Info className="w-5 h-5 text-gold-500" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Basic Information</h2>
              <p className="text-sm text-neutral-400">Team name and identification</p>
            </div>
          </div>
        </div>
        <div className="p-6 space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-2">
                Team Name
              </label>
              <Input
                value={formData.name}
                onChange={(e) => updateField('name', e.target.value)}
                placeholder="e.g., Boston Bruins"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-2">
                Short Name
              </label>
              <Input
                value={formData.shortName}
                onChange={(e) => updateField('shortName', e.target.value.toUpperCase())}
                placeholder="e.g., BOS"
                maxLength={5}
                className="uppercase"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">
              Team Status
            </label>
            <select
              value={formData.status}
              onChange={(e) => updateField('status', e.target.value)}
              className={cn(
                'w-full h-10 rounded-md border border-neutral-700 bg-neutral-800 px-3',
                'text-sm text-white focus:border-gold-500 focus:ring-2 focus:ring-gold-500/20'
              )}
            >
              <option value="active">Active</option>
              <option value="pending">Pending</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
      </section>

      {/* Branding Section */}
      <section className="bg-neutral-900 border border-gold-500/20 rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-gold-500/10">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gold-500/10">
              <Palette className="w-5 h-5 text-gold-500" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Branding</h2>
              <p className="text-sm text-neutral-400">Logo and team colors</p>
            </div>
          </div>
        </div>
        <div className="p-6 space-y-6">
          <LogoUploader
            currentLogo={team.logo_url}
            teamName={formData.name}
            primaryColor={formData.primaryColor}
            onUpload={handleLogoUpload}
          />

          <div className="grid gap-6 md:grid-cols-2">
            <ColorPicker
              label="Primary Color"
              value={formData.primaryColor}
              onChange={(color) => updateField('primaryColor', color)}
            />
            <ColorPicker
              label="Secondary Color"
              value={formData.secondaryColor}
              onChange={(color) => updateField('secondaryColor', color)}
            />
          </div>
        </div>
      </section>

      {/* Organization Section */}
      <section className="bg-neutral-900 border border-gold-500/20 rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-gold-500/10">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gold-500/10">
              <Shield className="w-5 h-5 text-gold-500" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Organization</h2>
              <p className="text-sm text-neutral-400">Division and home venue</p>
            </div>
          </div>
        </div>
        <div className="p-6 space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {divisions.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">
                  Division
                </label>
                <select
                  value={formData.divisionId}
                  onChange={(e) => updateField('divisionId', e.target.value)}
                  className={cn(
                    'w-full h-10 rounded-md border border-neutral-700 bg-neutral-800 px-3',
                    'text-sm text-white focus:border-gold-500 focus:ring-2 focus:ring-gold-500/20'
                  )}
                >
                  <option value="">No division</option>
                  {divisions.map((div) => (
                    <option key={div.id} value={div.id}>
                      {div.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {venues.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">
                  Home Venue
                </label>
                <select
                  value={formData.homeVenueId}
                  onChange={(e) => updateField('homeVenueId', e.target.value)}
                  className={cn(
                    'w-full h-10 rounded-md border border-neutral-700 bg-neutral-800 px-3',
                    'text-sm text-white focus:border-gold-500 focus:ring-2 focus:ring-gold-500/20'
                  )}
                >
                  <option value="">No home venue</option>
                  {venues.map((venue) => (
                    <option key={venue.id} value={venue.id}>
                      {venue.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Roster Section */}
      <section className="bg-neutral-900 border border-gold-500/20 rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-gold-500/10">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gold-500/10">
              <Users className="w-5 h-5 text-gold-500" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Roster Settings</h2>
              <p className="text-sm text-neutral-400">Roster size and limits</p>
            </div>
          </div>
        </div>
        <div className="p-6">
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">
              Maximum Roster Size
            </label>
            <Input
              type="number"
              min={1}
              max={50}
              value={formData.maxRosterSize}
              onChange={(e) => updateField('maxRosterSize', parseInt(e.target.value) || 20)}
            />
            <p className="mt-1 text-xs text-neutral-500">
              Maximum number of players allowed on the roster
            </p>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="bg-neutral-900 border border-gold-500/20 rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-gold-500/10">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gold-500/10">
              <MapPin className="w-5 h-5 text-gold-500" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Contact Information</h2>
              <p className="text-sm text-neutral-400">Team contact details</p>
            </div>
          </div>
        </div>
        <div className="p-6 space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-2">
                Contact Email
              </label>
              <Input
                type="email"
                value={formData.contactEmail}
                onChange={(e) => updateField('contactEmail', e.target.value)}
                placeholder="team@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-2">
                Contact Phone
              </label>
              <Input
                type="tel"
                value={formData.contactPhone}
                onChange={(e) => updateField('contactPhone', e.target.value)}
                placeholder="(555) 123-4567"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => updateField('notes', e.target.value)}
              placeholder="Any additional notes about the team..."
              rows={3}
              className={cn(
                'w-full rounded-md border border-neutral-700 bg-neutral-800 px-3 py-2',
                'text-sm text-white placeholder:text-neutral-500',
                'focus:border-gold-500 focus:ring-2 focus:ring-gold-500/20'
              )}
            />
          </div>
        </div>
      </section>

      {/* Save Button */}
      <div className="flex items-center justify-between pt-4 border-t border-neutral-800">
        <button
          onClick={() => setShowDeleteDialog(true)}
          className={cn(
            'inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium',
            'text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors'
          )}
        >
          <Trash2 className="w-4 h-4" />
          Delete Team
        </button>

        <button
          onClick={handleSave}
          disabled={isSaving}
          className={cn(
            'inline-flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-sm',
            'bg-gradient-to-r from-gold-500 to-gold-600 text-black',
            'hover:shadow-lg hover:shadow-gold-500/20 transition-all',
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
        >
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Save Changes
            </>
          )}
        </button>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="bg-neutral-900 border-gold-500/20">
          <DialogHeader>
            <DialogTitle className="text-white">Delete Team</DialogTitle>
            <DialogDescription className="text-neutral-400">
              Are you sure you want to delete <strong>{team.name}</strong>? This action will
              set the team to inactive. Teams with active roster members cannot be deleted.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-3">
            <button
              onClick={() => setShowDeleteDialog(false)}
              disabled={isDeleting}
              className="px-4 py-2 text-sm font-medium text-neutral-300 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className={cn(
                'inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold',
                'bg-red-500 text-white hover:bg-red-600 transition-colors',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  Delete Team
                </>
              )}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
