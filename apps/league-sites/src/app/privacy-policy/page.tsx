import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy | Beer League Hockey',
  description: 'How BeerLeagueHockey.ca collects, uses, and protects your personal information.',
};

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen" style={{ background: 'var(--color-background)' }}>
      <div className="max-w-3xl mx-auto px-6 py-16">
        {/* Header */}
        <div className="mb-12">
          <h1
            className="text-4xl font-bold mb-3"
            style={{ color: 'var(--color-text-primary)' }}
          >
            Privacy Policy
          </h1>
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            Last updated: March 1, 2026
          </p>
          <p className="mt-4" style={{ color: 'var(--color-text-secondary)' }}>
            This Privacy Policy describes how <strong style={{ color: 'var(--color-text-primary)' }}>Bridg3 Inc.</strong> (&ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;our&rdquo;), operating{' '}
            <strong style={{ color: 'var(--color-text-primary)' }}>BeerLeagueHockey.ca</strong>, collects, uses, and protects
            your personal information. We are incorporated in Ontario, Canada.
          </p>
        </div>

        <div
          className="rounded-xl p-px mb-10"
          style={{ background: 'var(--color-border)' }}
        >
          <div
            className="rounded-xl p-6"
            style={{ background: 'var(--color-surface)' }}
          >
            <p style={{ color: 'var(--color-text-secondary)' }}>
              By using BeerLeagueHockey.ca or our mobile app, you agree to the collection and use
              of information as described in this policy. Questions? Contact us at{' '}
              <a
                href="mailto:privacy@beerleaguehockey.ca"
                style={{ color: 'var(--color-accent)' }}
              >
                privacy@beerleaguehockey.ca
              </a>
              .
            </p>
          </div>
        </div>

        {/* Sections */}
        <div className="space-y-10">

          <section>
            <h2 className="text-2xl font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>
              1. Information We Collect
            </h2>
            <p className="mb-4" style={{ color: 'var(--color-text-secondary)' }}>
              We collect information you provide directly and information generated through your use of the platform:
            </p>
            <ul className="space-y-3" style={{ color: 'var(--color-text-secondary)' }}>
              <li className="flex gap-3">
                <span style={{ color: 'var(--color-accent)', flexShrink: 0 }}>—</span>
                <span><strong style={{ color: 'var(--color-text-primary)' }}>Name &amp; email address</strong> — used to create and identify your account.</span>
              </li>
              <li className="flex gap-3">
                <span style={{ color: 'var(--color-accent)', flexShrink: 0 }}>—</span>
                <span><strong style={{ color: 'var(--color-text-primary)' }}>Profile photo</strong> — displayed on your public player profile within leagues you join.</span>
              </li>
              <li className="flex gap-3">
                <span style={{ color: 'var(--color-accent)', flexShrink: 0 }}>—</span>
                <span><strong style={{ color: 'var(--color-text-primary)' }}>Hockey stats</strong> — goals, assists, games played, and other performance data entered by league admins.</span>
              </li>
              <li className="flex gap-3">
                <span style={{ color: 'var(--color-accent)', flexShrink: 0 }}>—</span>
                <span><strong style={{ color: 'var(--color-text-primary)' }}>Approximate location</strong> — used only for league discovery (nearby leagues). We do not store your precise GPS coordinates.</span>
              </li>
              <li className="flex gap-3">
                <span style={{ color: 'var(--color-accent)', flexShrink: 0 }}>—</span>
                <span><strong style={{ color: 'var(--color-text-primary)' }}>Device push token</strong> — used to send game reminders and league notifications. You can opt out at any time in Notification Settings.</span>
              </li>
            </ul>
          </section>

          <hr style={{ borderColor: 'var(--color-border-muted)' }} />

          <section>
            <h2 className="text-2xl font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>
              2. How We Use Your Information
            </h2>
            <ul className="space-y-3" style={{ color: 'var(--color-text-secondary)' }}>
              <li className="flex gap-3">
                <span style={{ color: 'var(--color-accent)', flexShrink: 0 }}>—</span>
                <span>Display your profile and stats within leagues you are a member of.</span>
              </li>
              <li className="flex gap-3">
                <span style={{ color: 'var(--color-accent)', flexShrink: 0 }}>—</span>
                <span>Match you with other players and leagues in your area.</span>
              </li>
              <li className="flex gap-3">
                <span style={{ color: 'var(--color-accent)', flexShrink: 0 }}>—</span>
                <span>Send game reminders, schedule updates, and important league notifications.</span>
              </li>
              <li className="flex gap-3">
                <span style={{ color: 'var(--color-accent)', flexShrink: 0 }}>—</span>
                <span>Improve and maintain the platform (analytics, bug fixes, performance monitoring).</span>
              </li>
              <li className="flex gap-3">
                <span style={{ color: 'var(--color-accent)', flexShrink: 0 }}>—</span>
                <span>Comply with legal obligations.</span>
              </li>
            </ul>
            <p className="mt-4" style={{ color: 'var(--color-text-secondary)' }}>
              We do <strong style={{ color: 'var(--color-text-primary)' }}>not</strong> sell your personal information to third parties.
            </p>
          </section>

          <hr style={{ borderColor: 'var(--color-border-muted)' }} />

          <section>
            <h2 className="text-2xl font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>
              3. Third-Party Services
            </h2>
            <p className="mb-4" style={{ color: 'var(--color-text-secondary)' }}>
              We use the following trusted third-party providers to operate the platform:
            </p>
            <div className="space-y-3">
              {[
                {
                  name: 'Supabase',
                  desc: "Hosts our database and authentication infrastructure. Your data is stored on Supabase's servers.",
                  link: 'https://supabase.com/privacy',
                  linkText: 'Supabase Privacy Policy',
                },
                {
                  name: 'Stripe',
                  desc: 'Processes payments on behalf of league admins (e.g. registration fees). Stripe handles all payment card data — we do not store credit card information.',
                  link: 'https://stripe.com/privacy',
                  linkText: 'Stripe Privacy Policy',
                },
                {
                  name: 'Expo / Apple Push Notification Service',
                  desc: 'Delivers push notifications to your mobile device. Your push token is shared with Expo solely for notification delivery.',
                  link: null,
                  linkText: null,
                },
              ].map((provider) => (
                <div
                  key={provider.name}
                  className="rounded-lg p-4"
                  style={{ background: 'var(--color-background-elevated)', border: '1px solid var(--color-border-muted)' }}
                >
                  <p className="font-semibold mb-1" style={{ color: 'var(--color-text-primary)' }}>{provider.name}</p>
                  <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
                    {provider.desc}{' '}
                    {provider.link && (
                      <a href={provider.link} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-accent)' }}>
                        {provider.linkText}
                      </a>
                    )}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <hr style={{ borderColor: 'var(--color-border-muted)' }} />

          <section>
            <h2 className="text-2xl font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>
              4. Your Rights &amp; Choices
            </h2>
            <ul className="space-y-3" style={{ color: 'var(--color-text-secondary)' }}>
              <li className="flex gap-3">
                <span style={{ color: 'var(--color-accent)', flexShrink: 0 }}>—</span>
                <span><strong style={{ color: 'var(--color-text-primary)' }}>Delete your account</strong> — request deletion of your account and associated data by emailing us. We will process requests within 30 days.</span>
              </li>
              <li className="flex gap-3">
                <span style={{ color: 'var(--color-accent)', flexShrink: 0 }}>—</span>
                <span><strong style={{ color: 'var(--color-text-primary)' }}>Data export</strong> — request a copy of your personal data in a portable format.</span>
              </li>
              <li className="flex gap-3">
                <span style={{ color: 'var(--color-accent)', flexShrink: 0 }}>—</span>
                <span><strong style={{ color: 'var(--color-text-primary)' }}>Opt out of notifications</strong> — manage push notification preferences under Profile → Notification Settings, or through your device settings.</span>
              </li>
              <li className="flex gap-3">
                <span style={{ color: 'var(--color-accent)', flexShrink: 0 }}>—</span>
                <span><strong style={{ color: 'var(--color-text-primary)' }}>Access &amp; correction</strong> — view and update your profile information at any time within the app.</span>
              </li>
            </ul>
          </section>

          <hr style={{ borderColor: 'var(--color-border-muted)' }} />

          <section>
            <h2 className="text-2xl font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>
              5. Data Retention
            </h2>
            <p style={{ color: 'var(--color-text-secondary)' }}>
              We retain your personal information for as long as your account is active or as needed to provide
              the service. If you delete your account, we will delete or anonymize your data within 30 days,
              except where required by law.
            </p>
          </section>

          <hr style={{ borderColor: 'var(--color-border-muted)' }} />

          <section>
            <h2 className="text-2xl font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>
              6. Security
            </h2>
            <p style={{ color: 'var(--color-text-secondary)' }}>
              We take reasonable technical and organizational measures to protect your information against
              unauthorized access, alteration, or disclosure. All data is transmitted over encrypted connections
              (HTTPS). No method of internet transmission is 100% secure, and we cannot guarantee absolute security.
            </p>
          </section>

          <hr style={{ borderColor: 'var(--color-border-muted)' }} />

          <section>
            <h2 className="text-2xl font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>
              7. Contact Us
            </h2>
            <p style={{ color: 'var(--color-text-secondary)' }}>
              For questions or concerns about this Privacy Policy or how your data is handled:
            </p>
            <div
              className="mt-4 rounded-lg p-4"
              style={{ background: 'var(--color-background-elevated)', border: '1px solid var(--color-border-muted)' }}
            >
              <p style={{ color: 'var(--color-text-primary)' }}><strong>Bridg3 Inc.</strong></p>
              <p style={{ color: 'var(--color-text-secondary)' }}>Ontario, Canada</p>
              <p className="mt-2">
                <a href="mailto:privacy@beerleaguehockey.ca" style={{ color: 'var(--color-accent)' }}>
                  privacy@beerleaguehockey.ca
                </a>
              </p>
            </div>
          </section>

        </div>

        <div className="mt-16 pt-8" style={{ borderTop: '1px solid var(--color-border-muted)' }}>
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            This policy may be updated periodically. We will notify you of significant changes via email
            or in-app notification. Continued use of the platform after changes constitutes acceptance of
            the updated policy.
          </p>
        </div>
      </div>
    </main>
  );
}
