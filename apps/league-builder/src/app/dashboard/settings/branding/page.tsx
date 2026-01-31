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
      <Card>
        <CardHeader>
          <CardTitle>Color Scheme</CardTitle>
          <CardDescription>
            Customize your organization's brand colors
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Primary Color
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  disabled
                  defaultValue="#3B82F6"
                  className="w-16 h-10 rounded cursor-not-allowed opacity-50"
                />
                <input
                  type="text"
                  disabled
                  defaultValue="#3B82F6"
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md font-mono text-sm opacity-50 cursor-not-allowed"
                  placeholder="#3B82F6"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Secondary Color
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  disabled
                  defaultValue="#10B981"
                  className="w-16 h-10 rounded cursor-not-allowed opacity-50"
                />
                <input
                  type="text"
                  disabled
                  defaultValue="#10B981"
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md font-mono text-sm opacity-50 cursor-not-allowed"
                  placeholder="#10B981"
                />
              </div>
            </div>
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md p-4">
            <div className="flex items-start gap-3">
              <Palette className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white mb-1">
                  Color Customization Coming Soon
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Full color customization will be available in the Pro plan. You'll be able to customize primary, secondary, and accent colors for your league websites.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Logos & Images */}
      <Card>
        <CardHeader>
          <CardTitle>Logos & Images</CardTitle>
          <CardDescription>
            Upload your organization's visual assets
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Main Logo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Organization Logo
            </label>
            <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center">
              <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                Drag and drop your logo here, or click to browse
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Recommended: 500x500px PNG or SVG
              </p>
              <button
                disabled
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md opacity-50 cursor-not-allowed"
              >
                Upload Logo
              </button>
            </div>
          </div>

          {/* Favicon */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Favicon
            </label>
            <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center">
              <Upload className="w-8 h-8 text-gray-400 mx-auto mb-3" />
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                Upload your favicon
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Recommended: 32x32px PNG or ICO
              </p>
              <button
                disabled
                className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-md opacity-50 cursor-not-allowed text-sm"
              >
                Upload Favicon
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Typography */}
      <Card>
        <CardHeader>
          <CardTitle>Typography</CardTitle>
          <CardDescription>
            Customize fonts for your league websites
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Heading Font
              </label>
              <select
                disabled
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md opacity-50 cursor-not-allowed"
              >
                <option>Inter</option>
                <option>Roboto</option>
                <option>Open Sans</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Body Font
              </label>
              <select
                disabled
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md opacity-50 cursor-not-allowed"
              >
                <option>Inter</option>
                <option>Roboto</option>
                <option>Open Sans</option>
              </select>
            </div>
          </div>

          <div className="mt-4 text-sm text-gray-500 dark:text-gray-400">
            Custom fonts coming soon in the Pro plan
          </div>
        </CardContent>
      </Card>

      {/* Preview */}
      <Card>
        <CardHeader>
          <CardTitle>Brand Preview</CardTitle>
          <CardDescription>
            See how your branding will look on league websites
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-8 text-center bg-gray-50 dark:bg-gray-800/50">
            <Eye className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">
              Brand preview will appear here once you customize your colors and upload logos
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
