import { getCurrentUser, getUserOrganizations } from '@/lib/actions/auth';
import { redirect } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@hockey-life/ui';
import { Bell, Mail, MessageSquare } from 'lucide-react';

export default async function NotificationSettingsPage() {
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
      {/* Email Notifications */}
      <Card>
        <CardHeader>
          <CardTitle>Email Notifications</CardTitle>
          <CardDescription>
            Control which emails you receive from HockeyLife
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <NotificationToggle
            icon={<Mail className="w-5 h-5" />}
            title="League Updates"
            description="Receive emails about league changes, new features, and important updates"
            defaultChecked={true}
          />

          <NotificationToggle
            icon={<Bell className="w-5 h-5" />}
            title="Team Member Activity"
            description="Get notified when team members join, leave, or change roles"
            defaultChecked={true}
          />

          <NotificationToggle
            icon={<MessageSquare className="w-5 h-5" />}
            title="System Messages"
            description="Important system notifications and security alerts"
            defaultChecked={true}
            disabled={true}
            note="Cannot be disabled"
          />

          <NotificationToggle
            icon={<Mail className="w-5 h-5" />}
            title="Marketing & Promotions"
            description="Tips, tricks, and promotional offers from HockeyLife"
            defaultChecked={false}
          />

          <NotificationToggle
            icon={<Bell className="w-5 h-5" />}
            title="Weekly Digest"
            description="Summary of your organization's activity each week"
            defaultChecked={true}
          />
        </CardContent>
      </Card>

      {/* League Notifications */}
      <Card>
        <CardHeader>
          <CardTitle>League Notifications</CardTitle>
          <CardDescription>
            Configure notifications for league-specific events
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <NotificationToggle
            icon={<Bell className="w-5 h-5" />}
            title="New Game Scheduled"
            description="Get notified when new games are added to your leagues"
            defaultChecked={true}
          />

          <NotificationToggle
            icon={<Bell className="w-5 h-5" />}
            title="Score Updates"
            description="Real-time notifications for game scores"
            defaultChecked={false}
          />

          <NotificationToggle
            icon={<Bell className="w-5 h-5" />}
            title="Player Registrations"
            description="Alert when new players register for your leagues"
            defaultChecked={true}
          />

          <NotificationToggle
            icon={<MessageSquare className="w-5 h-5" />}
            title="Team Messages"
            description="Notifications for team communications"
            defaultChecked={true}
          />
        </CardContent>
      </Card>

      {/* Billing Notifications */}
      <Card>
        <CardHeader>
          <CardTitle>Billing Notifications</CardTitle>
          <CardDescription>
            Stay informed about your subscription and payments
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <NotificationToggle
            icon={<Mail className="w-5 h-5" />}
            title="Payment Receipts"
            description="Receive receipts for all successful payments"
            defaultChecked={true}
            disabled={true}
            note="Cannot be disabled"
          />

          <NotificationToggle
            icon={<Bell className="w-5 h-5" />}
            title="Payment Failures"
            description="Alert when payment attempts fail"
            defaultChecked={true}
            disabled={true}
            note="Cannot be disabled"
          />

          <NotificationToggle
            icon={<Bell className="w-5 h-5" />}
            title="Subscription Reminders"
            description="Reminders about upcoming renewals and trial expirations"
            defaultChecked={true}
          />

          <NotificationToggle
            icon={<Mail className="w-5 h-5" />}
            title="Usage Alerts"
            description="Notifications when approaching plan limits"
            defaultChecked={true}
          />
        </CardContent>
      </Card>

      {/* Notification Channels */}
      <Card>
        <CardHeader>
          <CardTitle>Notification Channels</CardTitle>
          <CardDescription>
            Choose how you want to receive notifications
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-blue-600" />
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white">Email</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {userData.user.email}
                  </p>
                </div>
              </div>
              <span className="px-3 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
                Active
              </span>
            </div>

            <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg opacity-50">
              <div className="flex items-center gap-3">
                <MessageSquare className="w-5 h-5 text-gray-400" />
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white">SMS</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Coming soon
                  </p>
                </div>
              </div>
              <span className="px-3 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400">
                Not Available
              </span>
            </div>

            <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg opacity-50">
              <div className="flex items-center gap-3">
                <Bell className="w-5 h-5 text-gray-400" />
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white">Push Notifications</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Coming soon
                  </p>
                </div>
              </div>
              <span className="px-3 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400">
                Not Available
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

interface NotificationToggleProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  defaultChecked?: boolean;
  disabled?: boolean;
  note?: string;
}

function NotificationToggle({
  icon,
  title,
  description,
  defaultChecked = false,
  disabled = false,
  note,
}: NotificationToggleProps) {
  return (
    <div className="flex items-start justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
      <div className="flex items-start gap-3 flex-1">
        <div className="text-gray-600 dark:text-gray-400 mt-0.5">
          {icon}
        </div>
        <div className="flex-1">
          <h4 className="font-medium text-gray-900 dark:text-white mb-1">
            {title}
          </h4>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {description}
          </p>
          {note && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 italic">
              {note}
            </p>
          )}
        </div>
      </div>
      <label className="relative inline-flex items-center cursor-pointer">
        <input
          type="checkbox"
          defaultChecked={defaultChecked}
          disabled={disabled}
          className="sr-only peer"
        />
        <div className={`w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600 ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}></div>
      </label>
    </div>
  );
}
