'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { cn } from '@hockey-life/ui';
import { Plus, Trash2, Pencil, X, UserCircle, Check, XCircle } from 'lucide-react';
import { createStaffMember, updateStaffMember, deleteStaffMember } from '@/lib/actions/staff';
import { LogoUploader } from '@/components/ui/logo-uploader';
import { uploadStaffPhoto, deleteStaffPhoto } from '@/lib/actions/image-upload';

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

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [roleTitle, setRoleTitle] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [bio, setBio] = useState('');

  function resetForm() {
    setName('');
    setRoleTitle('');
    setEmail('');
    setPhone('');
    setPhotoUrl('');
    setBio('');
    setShowForm(false);
    setEditingId(null);
  }

  function startEditing(member: StaffMember) {
    setName(member.name);
    setRoleTitle(member.role_title);
    setEmail(member.email || '');
    setPhone(member.phone || '');
    setPhotoUrl(member.photo_url || '');
    setBio(member.bio || '');
    setEditingId(member.id);
    setShowForm(true);
  }

  async function handleSave() {
    if (!name.trim() || !roleTitle.trim()) return;

    startTransition(async () => {
      if (editingId) {
        await updateStaffMember(editingId, {
          name: name.trim(),
          roleTitle: roleTitle.trim(),
          email: email.trim() || undefined,
          phone: phone.trim() || undefined,
          photoUrl: photoUrl.trim() || undefined,
          bio: bio.trim() || undefined });
      } else {
        await createStaffMember({
          leagueId,
          name: name.trim(),
          roleTitle: roleTitle.trim(),
          email: email.trim() || undefined,
          phone: phone.trim() || undefined,
          photoUrl: photoUrl.trim() || undefined,
          bio: bio.trim() || undefined });
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
      {/* Actions */}
      <div className="mb-6">
        {!showForm ? (
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
        ) : (
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 space-y-4">
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
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-1">{t('roleTitle')}</label>
                <input
                  type="text"
                  value={roleTitle}
                  onChange={(e) => setRoleTitle(e.target.value)}
                  className="w-full rounded-lg bg-neutral-800 border border-neutral-700 px-4 py-2 text-white focus:ring-2 focus:ring-rink-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-1">{t('email')}</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
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
                disabled={isPending || !name.trim() || !roleTitle.trim()}
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
      </div>

      {/* Staff List */}
      {staff.length === 0 ? (
        <div className="text-center py-16">
          <UserCircle className="w-16 h-16 mx-auto text-neutral-600 mb-4" />
          <p className="text-neutral-400">{t('noStaff')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {staff.map((member) => (
            <div
              key={member.id}
              className={cn(
                'bg-neutral-900 border rounded-xl p-4 hover:border-neutral-700 transition-colors',
                member.is_active ? 'border-neutral-800' : 'border-neutral-800/50 opacity-60'
              )}
            >
              <div className="flex items-center gap-4">
                {/* Photo */}
                <div className="w-12 h-12 rounded-full bg-neutral-800 overflow-hidden shrink-0">
                  {member.photo_url ? (
                    <Image
                      src={member.photo_url}
                      alt={member.name}
                      width={48}
                      height={48}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <UserCircle className="w-8 h-8 text-neutral-600" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-white font-semibold">{member.name}</h3>
                    <span className={cn(
                      'text-xs px-2 py-0.5 rounded-full',
                      member.is_active ? 'bg-emerald-500/10 text-emerald-400' : 'bg-neutral-700 text-neutral-400'
                    )}>
                      {member.is_active ? t('active') : t('inactive')}
                    </span>
                  </div>
                  <p className="text-sm text-neutral-400">{member.role_title}</p>
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
          ))}
        </div>
      )}
    </div>
  );
}
