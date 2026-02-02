import { getCurrentUser, getUserOrganizations } from '@/lib/actions/auth';
import { redirect } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@hockey-life/ui';
import { Palette, Upload, Eye } from 'lucide-react';

export default async function BrandingSettingsPage() {
  const userData = await getCurrentUser();

  if (!userData) {
    redirect('/login');
  }

  const organizations = await getUserOrganizations();
  const organization = organizations[0];

  if (!organization) {
    redirect('/dashboard');
  }

  return (
    <div className="space-y-6">
      {/* Color Scheme */}
      <Card className="bg-neutral-800/50 border-gold-500/20">
        <CardHeader>
          <CardTitle className="text-neutral-100">Color Scheme</CardTitle>
          <CardDescription className="text-neutral-400">
            Customize your organization's brand colors
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-2">
                Primary Color
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  disabled
                  defaultValue="#D4AF37"
                  className="w-16 h-10 rounded-lg cursor-not-allowed opacity-50 bg-neutral-900"
                />
                <input
                  type="text"
                  disabled
                  defaultValue="#D4AF37"
                  className="flex-1 px-4 py-2 bg-black/50 border border-gold-500/30 rounded-xl font-mono text-sm text-neutral-300 opacity-50 cursor-not-allowed"
                  placeholder="#D4AF37"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-2">
                Secondary Color
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  disabled
                  defaultValue="#C19A00"
                  className="w-16 h-10 rounded-lg cursor-not-allowed opacity-50 bg-neutral-900"
                />
                <input
                  type="text"
                  disabled
                  defaultValue="#C19A00"
                  className="flex-1 px-4 py-2 bg-black/50 border border-gold-500/30 rounded-xl font-mono text-sm text-neutral-300 opacity-50 cursor-not-allowed"
                  placeholder="#C19A00"
                />
              </div>
            </div>
          </div>

          <div className="bg-gold-500/10 border border-gold-500/30 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <Palette className="w-5 h-5 text-gold-500 mt-0.5" />
              <div>
                <h4 className="font-medium text-neutral-100 mb-1">
                  Color Customization Coming Soon
                </h4>
                <p className="text-sm text-neutral-400">
                  Full color customization will be available in the Pro plan. You'll be able to customize primary, secondary, and accent colors for your league websites.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Logos & Images */}
      <Card className="bg-neutral-800/50 border-gold-500/20">
        <CardHeader>
          <CardTitle className="text-neutral-100">Logos & Images</CardTitle>
          <CardDescription className="text-neutral-400">
            Upload your organization's visual assets
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Main Logo */}
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">
              Organization Logo
            </label>
            <div className="border-2 border-dashed border-gold-500/30 rounded-xl p-8 text-center bg-neutral-900/50">
              <Upload className="w-12 h-12 text-neutral-500 mx-auto mb-4" />
              <p className="text-sm text-neutral-400 mb-2">
                Drag and drop your logo here, or click to browse
              </p>
              <p className="text-xs text-neutral-500">
                Recommended: 500x500px PNG or SVG
              </p>
              <button
                disabled
                className="mt-4 px-4 py-2 bg-gradient-to-r from-gold-500 to-gold-600 text-black font-semibold rounded-xl opacity-50 cursor-not-allowed"
              >
                Upload Logo
              </button>
            </div>
          </div>

          {/* Favicon */}
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">
              Favicon
            </label>
            <div className="border-2 border-dashed border-gold-500/30 rounded-xl p-6 text-center bg-neutral-900/50">
              <Upload className="w-8 h-8 text-neutral-500 mx-auto mb-3" />
              <p className="text-sm text-neutral-400 mb-2">
                Upload your favicon
              </p>
              <p className="text-xs text-neutral-500">
                Recommended: 32x32px PNG or ICO
              </p>
              <button
                disabled
                className="mt-3 px-4 py-2 bg-gradient-to-r from-gold-500 to-gold-600 text-black font-semibold rounded-xl opacity-50 cursor-not-allowed text-sm"
              >
                Upload Favicon
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Typography */}
      <Card className="bg-neutral-800/50 border-gold-500/20">
        <CardHeader>
          <CardTitle className="text-neutral-100">Typography</CardTitle>
          <CardDescription className="text-neutral-400">
            Customize fonts for your league websites
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-2">
                Heading Font
              </label>
              <select
                disabled
                className="w-full px-4 py-3 bg-black/50 border border-gold-500/30 rounded-xl text-neutral-300 opacity-50 cursor-not-allowed"
              >
                <option>Inter</option>
                <option>Roboto</option>
                <option>Open Sans</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-2">
                Body Font
              </label>
              <select
                disabled
                className="w-full px-4 py-3 bg-black/50 border border-gold-500/30 rounded-xl text-neutral-300 opacity-50 cursor-not-allowed"
              >
                <option>Inter</option>
                <option>Roboto</option>
                <option>Open Sans</option>
              </select>
            </div>
          </div>

          <div className="mt-4 text-sm text-neutral-500">
            Custom fonts coming soon in the Pro plan
          </div>
        </CardContent>
      </Card>

      {/* Preview */}
      <Card className="bg-neutral-800/50 border-gold-500/20">
        <CardHeader>
          <CardTitle className="text-neutral-100">Brand Preview</CardTitle>
          <CardDescription className="text-neutral-400">
            See how your branding will look on league websites
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border border-gold-500/20 rounded-xl p-8 text-center bg-neutral-900/50">
            <Eye className="w-16 h-16 text-neutral-500 mx-auto mb-4" />
            <p className="text-neutral-400">
              Brand preview will appear here once you customize your colors and upload logos
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
