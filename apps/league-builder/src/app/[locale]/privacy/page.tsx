import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { ArrowLeft } from 'lucide-react';

export default function PrivacyPolicyPage() {
  const t = useTranslations('legal');

  return (
    <div className="min-h-screen bg-neutral-950 py-12">
      <div className="max-w-4xl mx-auto px-4">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-neutral-400 hover:text-rink-500 transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          {t('backToHome')}
        </Link>

        <h1 className="text-4xl font-bold text-rink-500 mb-4">
          {t('privacyTitle')}
        </h1>

        <div className="prose prose-invert max-w-none">
          <p className="text-sm text-neutral-500 mb-8">
            {t('lastUpdated', { date: 'January 30, 2026' })}
          </p>

          <p className="text-neutral-300 mb-8">
            {t('privacyIntro')}
          </p>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-neutral-100 mb-4">
              1. Information We Collect
            </h2>

            <h3 className="text-xl font-medium text-neutral-100 mb-2">
              Personal Information
            </h3>
            <ul className="list-disc list-inside text-neutral-300 mb-4 space-y-2">
              <li><strong className="text-rink-500">Account Information:</strong> Name, email address, password (encrypted)</li>
              <li><strong className="text-rink-500">Profile Information:</strong> Player position, skill level, availability preferences, profile photo</li>
              <li><strong className="text-rink-500">Organization Information:</strong> Organization name, league details</li>
            </ul>

            <h3 className="text-xl font-medium text-neutral-100 mb-2">
              Technical Information
            </h3>
            <ul className="list-disc list-inside text-neutral-300 mb-4 space-y-2">
              <li><strong className="text-rink-500">Session Data:</strong> IP address, browser type, device information (retained for 14 days)</li>
              <li><strong className="text-rink-500">Security Logs:</strong> Login attempts, account changes (retained for 1 year)</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-neutral-100 mb-4">
              2. How We Use Your Information
            </h2>
            <ul className="list-disc list-inside text-neutral-300 mb-4 space-y-2">
              <li>Provide, maintain, and improve our services</li>
              <li>Create and manage your account</li>
              <li>Facilitate league and team management</li>
              <li>Send you important service notifications</li>
              <li>Detect and prevent fraud and abuse</li>
              <li>Comply with legal obligations</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-neutral-100 mb-4">
              3. Data Sharing and Third Parties
            </h2>
            <ul className="list-disc list-inside text-neutral-300 mb-4 space-y-2">
              <li><strong className="text-rink-500">Supabase:</strong> Database and authentication (GDPR-compliant, SOC 2 certified)</li>
              <li><strong className="text-rink-500">Stripe:</strong> Payment processing (PCI-DSS Level 1 certified)</li>
              <li><strong className="text-rink-500">Resend:</strong> Transactional email delivery</li>
            </ul>
            <p className="text-neutral-300 mb-4">
              <strong className="text-rink-500">We do NOT sell your personal information to anyone.</strong>
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-neutral-100 mb-4">
              4. Your Rights
            </h2>
            <ul className="list-disc list-inside text-neutral-300 mb-4 space-y-2">
              <li><strong className="text-rink-500">Right to Access:</strong> Request a copy of your data</li>
              <li><strong className="text-rink-500">Right to Rectification:</strong> Update incorrect information</li>
              <li><strong className="text-rink-500">Right to Erasure:</strong> Delete your account and data</li>
              <li><strong className="text-rink-500">Right to Data Portability:</strong> Download your data in JSON format</li>
            </ul>
            <p className="text-neutral-300 mb-4">
              To exercise these rights, visit your account settings or contact us at{' '}
              <a href="mailto:privacy@beerleaguehockey.ca" className="text-rink-500 hover:text-rink-400 hover:underline transition-colors">
                privacy@beerleaguehockey.ca
              </a>
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-neutral-100 mb-4">
              5. Security
            </h2>
            <ul className="list-disc list-inside text-neutral-300 mb-4 space-y-2">
              <li>Encryption in transit (HTTPS/TLS)</li>
              <li>Encryption at rest for database storage</li>
              <li>Row-level security policies to prevent unauthorized access</li>
              <li>Regular security audits and monitoring</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-neutral-100 mb-4">
              6. Contact Us
            </h2>
            <p className="text-neutral-300 mb-4">
              {t('contactEmail', { email: 'privacy@beerleaguehockey.ca' })}
            </p>
            <ul className="list-none text-neutral-300 mb-4 space-y-2">
              <li><strong className="text-rink-500">Email:</strong> privacy@beerleaguehockey.ca</li>
              <li><strong className="text-rink-500">Data Protection Officer:</strong> dpo@beerleaguehockey.ca</li>
              <li><strong className="text-rink-500">Security Concerns:</strong> security@beerleaguehockey.ca</li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
