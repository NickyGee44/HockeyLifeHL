'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@hockey-life/ui';
import {
  Plus,
  Handshake,
  Trash2,
  Edit,
  X,
  Save,
  ExternalLink,
} from 'lucide-react';
import { LogoUploader } from '@/components/ui/logo-uploader';
import { uploadSponsorLogo, deleteSponsorLogo } from '@/lib/actions/image-upload';

interface Sponsor {
  id: string;
  league_id: string;
  name: string;
  logo_url: string | null;
  website_url: string | null;
  tier: string;
  is_active: boolean;
  description: string | null;
  display_order: number;
  created_at: string;
}

interface SponsorsClientProps {
  leagueId: string;
  initialSponsors: Sponsor[];
}

const TIER_OPTIONS = [
  { value: 'premier', label: 'Premier', color: 'text-amber-400 bg-amber-400/10 border-amber-400/30' },
  { value: 'gold', label: 'Gold', color: 'text-yellow-500 bg-yellow-500/10 border-yellow-500/30' },
  { value: 'silver', label: 'Silver', color: 'text-neutral-300 bg-neutral-300/10 border-neutral-300/30' },
  { value: 'bronze', label: 'Bronze', color: 'text-orange-600 bg-orange-600/10 border-orange-600/30' },
];

function getTierStyle(tier: string) {
  return TIER_OPTIONS.find(t => t.value === tier)?.color || 'text-neutral-400 bg-neutral-400/10 border-neutral-400/30';
}

export function SponsorsClient({ leagueId, initialSponsors }: SponsorsClientProps) {
  const router = useRouter();
  const [sponsors, setSponsors] = useState<Sponsor[]>(initialSponsors);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [tier, setTier] = useState('gold');
  const [description, setDescription] = useState('');
  const [displayOrder, setDisplayOrder] = useState(0);
  const [isActive, setIsActive] = useState(true);

  function resetForm() {
    setName('');
    setLogoUrl('');
    setWebsiteUrl('');
    setTier('gold');
    setDescription('');
    setDisplayOrder(sponsors.length);
    setIsActive(true);
    setEditingId(null);
    setError(null);
  }

  function openNewForm() {
    resetForm();
    setDisplayOrder(sponsors.length);
    setShowForm(true);
  }

  function openEditForm(sponsor: Sponsor) {
    setName(sponsor.name);
    setLogoUrl(sponsor.logo_url || '');
    setWebsiteUrl(sponsor.website_url || '');
    setTier(sponsor.tier || 'gold');
    setDescription(sponsor.description || '');
    setDisplayOrder(sponsor.display_order || 0);
    setIsActive(sponsor.is_active);
    setEditingId(sponsor.id);
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError('Sponsor name is required');
      return;
    }

    setSaving(true);
    setError(null);

    const supabase = createClient();

    const sponsorData = {
      league_id: leagueId,
      name: name.trim(),
      logo_url: logoUrl.trim() || null,
      website_url: websiteUrl.trim() || null,
      tier,
      description: description.trim() || null,
      display_order: displayOrder,
      is_active: isActive,
    };

    try {
      if (editingId) {
        const { error: updateError } = await (supabase
          .from('league_sponsors') as any)
          .update(sponsorData)
          .eq('id', editingId);

        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await (supabase
          .from('league_sponsors') as any)
          .insert(sponsorData);

        if (insertError) throw insertError;
      }

      setShowForm(false);
      resetForm();
      router.refresh();

      // Refresh sponsors list
      const { data: refreshed } = await (supabase
        .from('league_sponsors') as any)
        .select('*')
        .eq('league_id', leagueId)
        .order('display_order', { ascending: true });

      if (refreshed) setSponsors(refreshed);
    } catch (err: any) {
      setError(err.message || 'Failed to save sponsor');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(sponsorId: string) {
    if (!confirm('Are you sure you want to remove this sponsor?')) return;

    const supabase = createClient();
    const { error: deleteError } = await (supabase
      .from('league_sponsors') as any)
      .delete()
      .eq('id', sponsorId);

    if (!deleteError) {
      setSponsors(sponsors.filter(s => s.id !== sponsorId));
      router.refresh();
    }
  }

  return (
    <div>
      {/* Add Sponsor Button */}
      {!showForm && (
        <div className="mb-6">
          <button
            onClick={openNewForm}
            className={cn(
              'inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm',
              'bg-gradient-to-r from-rink-500 to-arena-500 text-black',
              'hover:shadow-lg hover:shadow-rink-500/20 transition-all'
            )}
          >
            <Plus className="w-4 h-4" />
            Add Sponsor
          </button>
        </div>
      )}

      {/* Form */}
      {showForm && (
        <div className="bg-white/[0.04] border border-white/10 backdrop-blur-xl rounded-2xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-white">
              {editingId ? 'Edit Sponsor' : 'Add Sponsor'}
            </h2>
            <button
              onClick={() => { setShowForm(false); resetForm(); }}
              className="p-2 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-red-400 text-sm mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-1.5">
                  Sponsor Name *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Company Name"
                  className="w-full px-4 py-2.5 bg-neutral-900 border border-white/10 rounded-xl text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-rink-500/50"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-1.5">
                  Tier
                </label>
                <select
                  value={tier}
                  onChange={(e) => setTier(e.target.value)}
                  className="w-full px-4 py-2.5 bg-neutral-900 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-rink-500/50"
                >
                  {TIER_OPTIONS.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-1.5">
                  Sponsor Logo
                </label>
                <LogoUploader
                  value={logoUrl}
                  onChange={(url) => setLogoUrl(url)}
                  onUpload={async (file) => {
                    const result = await uploadSponsorLogo(leagueId, file);
                    if (!result.success) throw new Error(result.error);
                    return result.data;
                  }}
                  onRemove={async () => {
                    if (logoUrl) {
                      await deleteSponsorLogo(leagueId, logoUrl);
                      setLogoUrl('');
                    }
                  }}
                  placeholder="Upload Logo"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-1.5">
                  Website URL
                </label>
                <input
                  type="url"
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  placeholder="https://example.com"
                  className="w-full px-4 py-2.5 bg-neutral-900 border border-white/10 rounded-xl text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-rink-500/50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-1.5">
                  Display Order
                </label>
                <input
                  type="number"
                  value={displayOrder}
                  onChange={(e) => setDisplayOrder(parseInt(e.target.value) || 0)}
                  min={0}
                  className="w-full px-4 py-2.5 bg-neutral-900 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-rink-500/50"
                />
              </div>

              <div className="flex items-center gap-3 pt-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="w-4 h-4 rounded border-white/20 bg-neutral-900 text-rink-500 focus:ring-rink-500/50"
                  />
                  <span className="text-sm text-neutral-300">Active</span>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-1.5">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief sponsor description..."
                rows={2}
                className="w-full px-4 py-2.5 bg-neutral-900 border border-white/10 rounded-xl text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-rink-500/50 resize-y"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => { setShowForm(false); resetForm(); }}
                className="px-4 py-2 rounded-xl text-sm text-neutral-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className={cn(
                  'inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm',
                  'bg-gradient-to-r from-rink-500 to-arena-500 text-black',
                  'hover:shadow-lg hover:shadow-rink-500/20 transition-all',
                  'disabled:opacity-50'
                )}
              >
                <Save className="w-4 h-4" />
                {saving ? 'Saving...' : (editingId ? 'Update Sponsor' : 'Add Sponsor')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Sponsors List */}
      {sponsors.length > 0 ? (
        <div className="space-y-3">
          {sponsors.map((sponsor) => (
            <div
              key={sponsor.id}
              className="bg-white/[0.04] border border-white/10 backdrop-blur-xl rounded-xl p-5 hover:border-white/20 transition-colors"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 min-w-0">
                  {sponsor.logo_url ? (
                    <img
                      src={sponsor.logo_url}
                      alt={sponsor.name}
                      className="w-12 h-12 object-contain rounded-lg bg-white/5 p-1"
                    />
                  ) : (
                    <div className="w-12 h-12 bg-white/5 rounded-lg flex items-center justify-center">
                      <Handshake className="w-6 h-6 text-neutral-500" />
                    </div>
                  )}

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-white truncate">{sponsor.name}</h3>
                      <span className={cn(
                        'px-2 py-0.5 text-xs font-semibold rounded-full border capitalize',
                        getTierStyle(sponsor.tier)
                      )}>
                        {sponsor.tier}
                      </span>
                      {!sponsor.is_active && (
                        <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-neutral-800 text-neutral-500 border border-neutral-700">
                          Inactive
                        </span>
                      )}
                    </div>
                    {sponsor.description && (
                      <p className="text-sm text-neutral-400 truncate">{sponsor.description}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {sponsor.website_url && (
                    <a
                      href={sponsor.website_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-lg text-neutral-400 hover:text-rink-500 hover:bg-rink-500/10 transition-colors"
                      title="Visit website"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                  <button
                    onClick={() => openEditForm(sponsor)}
                    className="p-2 rounded-lg text-neutral-400 hover:text-rink-500 hover:bg-rink-500/10 transition-colors"
                    title="Edit"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(sponsor.id)}
                    className="p-2 rounded-lg text-neutral-400 hover:text-red-500 hover:bg-red-500/10 transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        !showForm && (
          <div className="bg-white/[0.04] border border-white/10 backdrop-blur-xl rounded-2xl p-12 text-center">
            <Handshake className="w-12 h-12 text-rink-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">No Sponsors Yet</h3>
            <p className="text-neutral-400 mb-6">
              Add your first sponsor to showcase them on your league website!
            </p>
            <button
              onClick={openNewForm}
              className={cn(
                'inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm',
                'bg-gradient-to-r from-rink-500 to-arena-500 text-black',
                'hover:shadow-lg hover:shadow-rink-500/20 transition-all'
              )}
            >
              <Plus className="w-4 h-4" />
              Add Sponsor
            </button>
          </div>
        )
      )}
    </div>
  );
}
