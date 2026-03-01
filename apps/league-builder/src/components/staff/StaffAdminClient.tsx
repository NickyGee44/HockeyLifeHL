'use client';

import { useState, useEffect, useTransition, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  cn,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@hockey-life/ui';
import { Plus, Trash2, Pencil, X, UserCircle, Check, XCircle, Filter } from 'lucide-react';
import { createStaffMember, updateStaffMember, deleteStaffMember } from '@/lib/actions/staff';
import { LogoUploader } from '@/components/ui/logo-uploader';
import { uploadStaffPhoto, deleteStaffPhoto } from '@/lib/actions/image-upload';

// --- Standard staff roles with color coding ---

const STANDARD_ROLES = [
  { value: 'Owner', bg: 'bg-amber-500/10', text: 'text-amber-400' },
  { value: 'Admin', bg: 'bg-purple-500/10', text: 'text-purple-400' },
  { value: 'Scorekeeper', bg: 'bg-emerald-500/10', text: 'text-emerald-400' },
  { value: 'Referee', bg: 'bg-blue-500/10', text: 'text-blue-400' },
  { value: 'Operations', bg: 'bg-orange-500/10', text: 'text-orange-400' },
  { value: 'Coach', bg: 'bg-rose-500/10', text: 'text-rose-400' },
  { value: 'Manager', bg: 'bg-cyan-500/10', text: 'text-cyan-400' },
  { value: 'Other', bg: 'bg-neutral-500/10', text: 'text-neutral-400' },
] as const;

const STANDARD_ROLE_VALUES = STANDARD_ROLES.map((r) => r.value);

function getRoleBadgeStyle(roleTitle: string): { bg: string; text: string } {
  const match = STANDARD_ROLES.find(
    (r) => r.value.toLowerCase() === roleTitle.toLowerCase()
  );
  // Fallback for legacy/custom roles that don't match a standard role
  return match ?? { bg: 'bg-neutral-500/10', text: 'text-neutral-400' };
}

/** Determine whether a role_title is a standard role or a custom "Other" value */
function parseRole(roleTitle: string): { selected: string; customText: string } {
  const isStandard = STANDARD_ROLE_VALUES.some(
    (v) => v.toLowerCase() === roleTitle.toLowerCase()
  );
  if (isStandard && roleTitle.toLowerCase() !== 'other') {
    return { selected: roleTitle, customText: '' };
  }
  // Any non-standard value is treated as "Other" with the original text preserved
  return { selected: 'Other', customText: roleTitle === 'Other' ? '' : roleTitle };
}

// --- Interfaces ---

interface StaffMember {
  id: string;
  name: string;
  role_title: string;
  email: string | null;
  phone: string | null;
  photo_url: string | null;
  bio: string | null;
  display_order: number;
  is_active: boolean;
}

interface StaffAdminClientProps {
  leagueId: string;
  locale?: string;
  staff: StaffMember[];
}

export function StaffAdminClient({ leagueId, locale: _locale, staff }: StaffAdminClientProps) {
  const t = useTranslations('staff');
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Mounted state to avoid Radix Select hydration mismatch
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [customRoleText, setCustomRoleText] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [bio, setBio] = useState('');

  // Filter state
  const [filterRole, setFilterRole] = useState('all');

  // Compute the effective role_title to save
  const effectiveRoleTitle =
    selectedRole === 'Other'
      ? customRoleText.trim() || 'Other'
      : selectedRole;

  // Determine if the form is valid
  const isFormValid = name.trim().length > 0 && selectedRole.length > 0;

  // Collect distinct roles present in staff for the filter dropdown
  const distinctRoles = useMemo(() => {
    const set = new Set<string>();
    for (const member of staff) {
      set.add(member.role_title);
    }
    return Array.from(set).sort();
  }, [staff]);

  // Filtered staff list
  const filteredStaff = useMemo(() => {
    if (filterRole === 'all') return staff;
    return staff.filter((m) => m.role_title === filterRole);
  }, [staff, filterRole]);

  function resetForm() {
    setName('');
    setSelectedRole('');
    setCustomRoleText('');
    setEmail('');
    setPhone('');
    setPhotoUrl('');
    setBio('');
    setShowForm(false);
    setEditingId(null);
  }

  function startEditing(member: StaffMember) {
    setName(member.name);
    const parsed = parseRole(member.role_title);
    setSelectedRole(parsed.selected);
    setCustomRoleText(parsed.customText);
    setEmail(member.email || '');
    setPhone(member.phone || '');
    setPhotoUrl(member.photo_url || '');
    setBio(member.bio || '');
    setEditingId(member.id);
    setShowForm(true);
  }

  async function handleSave() {
    if (!isFormValid) return;

    startTransition(async () => {
      if (editingId) {
        await updateStaffMember(editingId, {
          name: name.trim(),
          roleTitle: effectiveRoleTitle,
          email: email.trim() || undefined,
          phone: phone.trim() || undefined,
          photoUrl: photoUrl.trim() || undefined,
          bio: bio.trim() || undefined,
        });
      } else {
        await createStaffMember({
          leagueId,
          name: name.trim(),
          roleTitle: effectiveRoleTitle,
          email: email.trim() || undefined,
          phone: phone.trim() || undefined,
          photoUrl: photoUrl.trim() || undefined,
          bio: bio.trim() || undefined,
        });
      }
      resetForm();
      router.refresh();
    });
  }

  async function handleDelete(staffId: string) {
    if (!confirm(t('confirmDelete'))) return;

    startTransition(async () => {
      await deleteStaffMember(staffId);
      router.refresh();
    });
  }

  async function handleToggleActive(staffId: string, currentlyActive: boolean) {
    startTransition(async () => {
      await updateStaffMember(staffId, { isActive: !currentlyActive });
      router.refresh();
    });
  }

  return (
    <div>
      {/* Actions bar */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className={cn(
              'inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm',
              'bg-gradient-to-r from-rink-500 to-arena-500 text-black',
              'hover:shadow-lg hover:shadow-rink-500/20 transition-all'
            )}
          >
            <Plus className="w-4 h-4" />
            {t('addMember')}
          </button>
        )}

        {/* Role filter — only show when there are staff members */}
        {staff.length > 0 && mounted && (
          <div className="flex items-center gap-2 ml-auto">
            <Filter className="w-4 h-4 text-neutral-400" />
            <Select value={filterRole} onValueChange={setFilterRole}>
              <SelectTrigger className="w-[180px] bg-neutral-800 border-neutral-700 text-white text-sm">
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent className="bg-neutral-800 border-neutral-700">
                <SelectItem value="all" className="text-neutral-200">
                  All Roles
                </SelectItem>
                {distinctRoles.map((role) => (
                  <SelectItem key={role} value={role} className="text-neutral-200">
                    {role}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <div className="mb-6 bg-neutral-900 border border-neutral-800 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">
              {editingId ? t('editMember') : t('addMember')}
            </h3>
            <button onClick={resetForm} className="text-neutral-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-1">{t('name')}</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg bg-neutral-800 border border-neutral-700 px-4 py-2 text-white focus:ring-2 focus:ring-rink-500 focus:border-transparent"
              />
            </div>

            {/* Role selector */}
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-1">{t('roleTitle')}</label>
              {mounted ? (
                <Select value={selectedRole} onValueChange={(val) => {
                  setSelectedRole(val);
                  if (val !== 'Other') setCustomRoleText('');
                }}>
                  <SelectTrigger className="w-full bg-neutral-800 border-neutral-700 text-white">
                    <SelectValue placeholder="Select a role..." />
                  </SelectTrigger>
                  <SelectContent className="bg-neutral-800 border-neutral-700">
                    {STANDARD_ROLES.map((role) => (
                      <SelectItem key={role.value} value={role.value} className="text-neutral-200">
                        <span className="flex items-center gap-2">
                          <span className={cn('w-2 h-2 rounded-full', role.bg.replace('/10', ''), role.text.replace('text-', 'bg-'))} />
                          {role.value}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="w-full h-10 rounded-lg bg-neutral-800 border border-neutral-700 animate-pulse" />
              )}
            </div>

            {/* Custom role text — shown only when "Other" is selected */}
            {selectedRole === 'Other' && (
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-neutral-300 mb-1">Custom Role Title</label>
                <input
                  type="text"
                  value={customRoleText}
                  onChange={(e) => setCustomRoleText(e.target.value)}
                  placeholder="e.g. Statistician, Photographer..."
                  className="w-full rounded-lg bg-neutral-800 border border-neutral-700 px-4 py-2 text-white focus:ring-2 focus:ring-rink-500 focus:border-transparent"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-1">{t('email')}</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Link to user account (optional)"
                className="w-full rounded-lg bg-neutral-800 border border-neutral-700 px-4 py-2 text-white focus:ring-2 focus:ring-rink-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-1">{t('phone')}</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-lg bg-neutral-800 border border-neutral-700 px-4 py-2 text-white focus:ring-2 focus:ring-rink-500 focus:border-transparent"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-neutral-300 mb-1">{t('photoUrl')}</label>
              <LogoUploader
                value={photoUrl}
                onChange={(url) => setPhotoUrl(url)}
                onUpload={async (file) => {
                  const result = await uploadStaffPhoto(leagueId, file);
                  if (!result.success) throw new Error(result.error);
                  return result.data;
                }}
                onRemove={async () => {
                  if (photoUrl) {
                    await deleteStaffPhoto(leagueId, photoUrl);
                    setPhotoUrl('');
                  }
                }}
                maxSizeBytes={2 * 1024 * 1024}
                placeholder="Upload Photo"
                shape="circle"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-neutral-300 mb-1">{t('bio')}</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="w-full rounded-lg bg-neutral-800 border border-neutral-700 px-4 py-2 text-white focus:ring-2 focus:ring-rink-500 focus:border-transparent"
                rows={3}
              />
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleSave}
              disabled={isPending || !isFormValid}
              className="px-5 py-2 rounded-lg font-semibold text-sm bg-rink-500 text-black hover:bg-rink-400 transition-colors disabled:opacity-50"
            >
              {isPending ? 'Saving...' : editingId ? 'Save Changes' : 'Add Staff Member'}
            </button>
            <button
              onClick={resetForm}
              className="px-5 py-2 rounded-lg font-semibold text-sm text-neutral-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Staff List */}
      {staff.length === 0 ? (
        <div className="text-center py-16">
          <UserCircle className="w-16 h-16 mx-auto text-neutral-600 mb-4" />
          <p className="text-neutral-400">{t('noStaff')}</p>
        </div>
      ) : filteredStaff.length === 0 ? (
        <div className="text-center py-12">
          <Filter className="w-12 h-12 mx-auto text-neutral-600 mb-3" />
          <p className="text-neutral-400">No staff members match this filter.</p>
          <button
            onClick={() => setFilterRole('all')}
            className="mt-2 text-sm text-rink-400 hover:text-rink-300 transition-colors"
          >
            Clear filter
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredStaff.map((member) => {
            const badgeStyle = getRoleBadgeStyle(member.role_title);
            return (
              <div
                key={member.id}
                className={cn(
                  'bg-neutral-900 border rounded-xl p-4 hover:border-neutral-700 transition-colors',
                  member.is_active ? 'border-neutral-800' : 'border-neutral-800/50 opacity-60'
                )}
              >
                <div className="flex items-center gap-4">
                  {/* Photo */}
                  <div className="w-12 h-12 rounded-full overflow-hidden shrink-0">
                    <Image
                      src={member.photo_url || '/blank_player.png'}
                      alt={member.name}
                      width={48}
                      height={48}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-white font-semibold">{member.name}</h3>
                      {/* Role badge */}
                      <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', badgeStyle.bg, badgeStyle.text)}>
                        {member.role_title}
                      </span>
                      {/* Active/inactive status */}
                      <span className={cn(
                        'text-xs px-2 py-0.5 rounded-full',
                        member.is_active ? 'bg-emerald-500/10 text-emerald-400' : 'bg-neutral-700 text-neutral-400'
                      )}>
                        {member.is_active ? t('active') : t('inactive')}
                      </span>
                    </div>
                    <div className="flex gap-3 text-xs text-neutral-500 mt-1">
                      {member.email && <span>{member.email}</span>}
                      {member.phone && <span>{member.phone}</span>}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleToggleActive(member.id, member.is_active)}
                      disabled={isPending}
                      className="p-2 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
                      title={member.is_active ? 'Deactivate' : 'Activate'}
                    >
                      {member.is_active ? <XCircle className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => startEditing(member)}
                      disabled={isPending}
                      className="p-2 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(member.id)}
                      disabled={isPending}
                      className="p-2 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
