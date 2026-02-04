'use client';

import { useState } from 'react';
import { Button } from '@hockey-life/ui';
import { updateOrganizationProfile } from '@/lib/actions/organization';
import { Building2, Upload } from 'lucide-react';

interface OrganizationProfileFormProps {
  organization: {
    id: string;
    name: string;
    slug: string;
    logo_url?: string | null;
  };
}

export function OrganizationProfileForm({ organization }: OrganizationProfileFormProps) {
  const [name, setName] = useState(organization.name);
  const [slug, setSlug] = useState(organization.slug);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const formData = new FormData();
      formData.append('organizationId', organization.id);
      formData.append('name', name);
      formData.append('slug', slug);

      const result = await updateOrganizationProfile(formData);

      if (result?.error) {
        setError(result.error);
      } else {
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  }

  function generateSlug(name: string) {
    const newSlug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    setSlug(newSlug);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Organization Name */}
      <div>
        <label
          htmlFor="name"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
        >
          Organization Name
        </label>
        <input
          type="text"
          id="name"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (!slug || slug === organization.slug) {
              generateSlug(e.target.value);
            }
          }}
          required
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
          placeholder="My Hockey Organization"
        />
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          The public name of your organization
        </p>
      </div>

      {/* Organization Slug */}
      <div>
        <label
          htmlFor="slug"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
        >
          Organization Slug
        </label>
        <div className="flex items-center gap-2">
          <input
            type="text"
            id="slug"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            required
            pattern="[a-z0-9-]+"
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white font-mono text-sm"
            placeholder="my-hockey-org"
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => generateSlug(name)}
          >
            Generate
          </Button>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Used in URLs and league subdomains. Lowercase letters, numbers, and hyphens only.
        </p>
      </div>

      {/* Branding Link */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          League Branding
        </label>
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center border border-gray-200 dark:border-gray-700">
            <Building2 className="w-8 h-8 text-gray-400" />
          </div>
          <div className="flex-1">
            <a
              href="/dashboard/settings/branding"
              className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              <Upload className="w-4 h-4" />
              Manage League Branding
            </a>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              Upload logos and customize colors for each league in the Branding settings
            </p>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-3">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Success Message */}
      {success && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md p-3">
          <p className="text-sm text-green-600 dark:text-green-400">
            Organization profile updated successfully
          </p>
        </div>
      )}

      {/* Submit Button */}
      <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
        <Button type="submit" disabled={loading}>
          {loading ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </form>
  );
}
