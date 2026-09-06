import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service | Beer League Hockey',
  description: 'Terms and conditions for using BeerLeagueHockey.ca.',
};

export default function TermsOfServicePage() {
  return (
    <main
      className="league-site-shell relative isolate min-h-screen overflow-hidden text-[var(--color-text-primary)]"
      data-blh-design-foundation="glass-v1"
    >
      <div className="league-atmosphere" aria-hidden="true">
        <span className="league-atmosphere__rink" />
      </div>
      <div className="relative z-10 mx-auto max-w-3xl px-4 py-10 sm:px-6 md:py-16">
        <article className="glass-card-strong overflow-hidden p-6 sm:p-8 md:p-10">
        {/* Header */}
        <div className="mb-12">
          <h1
            className="text-4xl font-bold mb-3"
            style={{ color: 'var(--color-text-primary)' }}
          >
            Terms of Service
          </h1>
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            Last updated: March 1, 2026
          </p>
          <p className="mt-4" style={{ color: 'var(--color-text-secondary)' }}>
            These Terms of Service govern your use of <strong style={{ color: 'var(--color-text-primary)' }}>BeerLeagueHockey.ca</strong> and our mobile app, operated by{' '}
            <strong style={{ color: 'var(--color-text-primary)' }}>Bridg3 Inc.</strong>, incorporated in Ontario, Canada.
            By using our platform, you agree to these terms.
          </p>
        </div>

        <div className="glass-control mb-10 rounded-2xl border border-[var(--blh-glass-border)] p-6">
          <div>
            <p style={{ color: 'var(--color-text-secondary)' }}>
              If you do not agree with these terms, please do not use the platform. Questions? Contact us at{' '}
              <a
                href="mailto:support@beerleaguehockey.ca"
                style={{ color: 'var(--color-accent)' }}
              >
                support@beerleaguehockey.ca
              </a>
              .
            </p>
          </div>
        </div>

        {/* Sections */}
        <div className="space-y-10">

          <section>
            <h2 className="text-2xl font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>
              1. About the Service
            </h2>
            <p style={{ color: 'var(--color-text-secondary)' }}>
              BeerLeagueHockey.ca (&ldquo;BLH&rdquo;, &ldquo;the platform&rdquo;) is a hockey league management platform for
              recreational leagues. It enables league administrators to manage schedules, rosters, standings,
              and stats, and provides players with a way to view their league information, check in to games,
              and connect with other players.
            </p>
          </section>

          <hr style={{ borderColor: 'var(--color-border-muted)' }} />

          <section>
            <h2 className="text-2xl font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>
              2. Acceptable Use
            </h2>
            <p className="mb-4" style={{ color: 'var(--color-text-secondary)' }}>
              You agree to use the platform in a respectful and lawful manner. The following are prohibited:
            </p>
            <ul className="space-y-3" style={{ color: 'var(--color-text-secondary)' }}>
              <li className="flex gap-3">
                <span style={{ color: 'var(--color-accent)', flexShrink: 0 }}>—</span>
                <span><strong style={{ color: 'var(--color-text-primary)' }}>Harassment or abuse</strong> — targeting other players, admins, or BLH staff with threatening, abusive, or discriminatory behavior.</span>
              </li>
              <li className="flex gap-3">
                <span style={{ color: 'var(--color-accent)', flexShrink: 0 }}>—</span>
                <span><strong style={{ color: 'var(--color-text-primary)' }}>False or fraudulent stats</strong> — submitting or manipulating game data, stats, or scores dishonestly.</span>
              </li>
              <li className="flex gap-3">
                <span style={{ color: 'var(--color-accent)', flexShrink: 0 }}>—</span>
                <span><strong style={{ color: 'var(--color-text-primary)' }}>Impersonation</strong> — creating accounts or profiles that falsely represent another person or organization.</span>
              </li>
              <li className="flex gap-3">
                <span style={{ color: 'var(--color-accent)', flexShrink: 0 }}>—</span>
                <span><strong style={{ color: 'var(--color-text-primary)' }}>Unauthorized access</strong> — attempting to access accounts, data, or systems you are not authorized to use.</span>
              </li>
              <li className="flex gap-3">
                <span style={{ color: 'var(--color-accent)', flexShrink: 0 }}>—</span>
                <span><strong style={{ color: 'var(--color-text-primary)' }}>Spam or misuse</strong> — using the platform to send unsolicited communications or to disrupt others&apos; use of the service.</span>
              </li>
            </ul>
          </section>

          <hr style={{ borderColor: 'var(--color-border-muted)' }} />

          <section>
            <h2 className="text-2xl font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>
              3. League Administrators
            </h2>
            <p style={{ color: 'var(--color-text-secondary)' }}>
              League administrators are responsible for managing their own leagues on the platform. This includes:
            </p>
            <ul className="mt-4 space-y-3" style={{ color: 'var(--color-text-secondary)' }}>
              <li className="flex gap-3">
                <span style={{ color: 'var(--color-accent)', flexShrink: 0 }}>—</span>
                <span>Ensuring the accuracy of player data, rosters, schedules, and stats within their league.</span>
              </li>
              <li className="flex gap-3">
                <span style={{ color: 'var(--color-accent)', flexShrink: 0 }}>—</span>
                <span>Maintaining appropriate conduct standards for their league&apos;s players.</span>
              </li>
              <li className="flex gap-3">
                <span style={{ color: 'var(--color-accent)', flexShrink: 0 }}>—</span>
                <span>Complying with applicable laws when collecting or processing player information through the platform.</span>
              </li>
            </ul>
            <p className="mt-4" style={{ color: 'var(--color-text-secondary)' }}>
              BLH provides the tools; league admins are responsible for how they use them.
            </p>
          </section>

          <hr style={{ borderColor: 'var(--color-border-muted)' }} />

          <section>
            <h2 className="text-2xl font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>
              4. Limitation of Liability
            </h2>
            <p className="mb-4" style={{ color: 'var(--color-text-secondary)' }}>
              BeerLeagueHockey.ca is a software platform. We are not a hockey organization, referee body,
              or insurer. Accordingly:
            </p>
            <ul className="space-y-3" style={{ color: 'var(--color-text-secondary)' }}>
              <li className="flex gap-3">
                <span style={{ color: 'var(--color-accent)', flexShrink: 0 }}>—</span>
                <span>BLH is <strong style={{ color: 'var(--color-text-primary)' }}>not responsible</strong> for on-ice injuries, accidents, or disputes that occur during games or practices organized through the platform.</span>
              </li>
              <li className="flex gap-3">
                <span style={{ color: 'var(--color-accent)', flexShrink: 0 }}>—</span>
                <span>BLH is not responsible for disputes between players, teams, or league administrators.</span>
              </li>
              <li className="flex gap-3">
                <span style={{ color: 'var(--color-accent)', flexShrink: 0 }}>—</span>
                <span>We make no warranties about the availability, accuracy, or fitness for purpose of the platform. The service is provided &ldquo;as is.&rdquo;</span>
              </li>
            </ul>
            <p className="mt-4" style={{ color: 'var(--color-text-secondary)' }}>
              To the maximum extent permitted by applicable law, Bridg3 Inc.&apos;s liability to you for any
              claims arising out of or related to your use of the platform shall not exceed the amount you paid
              to us (if any) in the 12 months preceding the claim.
            </p>
          </section>

          <hr style={{ borderColor: 'var(--color-border-muted)' }} />

          <section>
            <h2 className="text-2xl font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>
              5. Payments &amp; Refunds
            </h2>
            <p style={{ color: 'var(--color-text-secondary)' }}>
              Payments on the platform (such as league registration fees) are processed securely via{' '}
              <strong style={{ color: 'var(--color-text-primary)' }}>Stripe</strong>. BLH does not store your
              payment card information.
            </p>
            <p className="mt-4" style={{ color: 'var(--color-text-secondary)' }}>
              Refund policies are set at the discretion of individual league administrators. If you have a
              dispute regarding a payment made through a league on BLH, please contact your league admin directly.
              For platform subscription disputes, contact{' '}
              <a href="mailto:support@beerleaguehockey.ca" style={{ color: 'var(--color-accent)' }}>
                support@beerleaguehockey.ca
              </a>
              .
            </p>
          </section>

          <hr style={{ borderColor: 'var(--color-border-muted)' }} />

          <section>
            <h2 className="text-2xl font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>
              6. Account Suspension &amp; Termination
            </h2>
            <p style={{ color: 'var(--color-text-secondary)' }}>
              We reserve the right to suspend or terminate accounts that violate these Terms of Service,
              engage in abusive behavior, or otherwise misuse the platform. We will make reasonable efforts
              to notify you before taking action, except in cases of severe or repeated violations.
            </p>
            <p className="mt-4" style={{ color: 'var(--color-text-secondary)' }}>
              You may also terminate your account at any time by contacting us at{' '}
              <a href="mailto:support@beerleaguehockey.ca" style={{ color: 'var(--color-accent)' }}>
                support@beerleaguehockey.ca
              </a>
              .
            </p>
          </section>

          <hr style={{ borderColor: 'var(--color-border-muted)' }} />

          <section>
            <h2 className="text-2xl font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>
              7. Intellectual Property
            </h2>
            <p style={{ color: 'var(--color-text-secondary)' }}>
              All platform content, branding, and software are the property of Bridg3 Inc. You may not
              reproduce, distribute, or create derivative works from any part of the platform without our
              express written permission. You retain ownership of any content you submit (profile info,
              photos) and grant us a limited license to display it within the platform.
            </p>
          </section>

          <hr style={{ borderColor: 'var(--color-border-muted)' }} />

          <section>
            <h2 className="text-2xl font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>
              8. Governing Law
            </h2>
            <p style={{ color: 'var(--color-text-secondary)' }}>
              These Terms of Service are governed by the laws of the Province of Ontario and the federal laws
              of Canada applicable therein, without regard to conflict of law principles. Any disputes arising
              under these terms shall be resolved in the courts of Ontario, Canada.
            </p>
          </section>

          <hr style={{ borderColor: 'var(--color-border-muted)' }} />

          <section>
            <h2 className="text-2xl font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>
              9. Contact Us
            </h2>
            <p style={{ color: 'var(--color-text-secondary)' }}>
              For questions about these Terms, or to report a violation:
            </p>
            <div
              className="glass-control mt-4 rounded-xl border border-[var(--blh-glass-border)] p-4"
            >
              <p style={{ color: 'var(--color-text-primary)' }}><strong>Bridg3 Inc.</strong></p>
              <p style={{ color: 'var(--color-text-secondary)' }}>Ontario, Canada</p>
              <p className="mt-2">
                <a href="mailto:support@beerleaguehockey.ca" style={{ color: 'var(--color-accent)' }}>
                  support@beerleaguehockey.ca
                </a>
              </p>
            </div>
          </section>

        </div>

        <div className="mt-16 pt-8" style={{ borderTop: '1px solid var(--color-border-muted)' }}>
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            We may update these Terms from time to time. Continued use of the platform after changes are
            posted constitutes your acceptance of the updated Terms. Effective date: March 1, 2026.
          </p>
        </div>
        </article>
      </div>
    </main>
  );
}
