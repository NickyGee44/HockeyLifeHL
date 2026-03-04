import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { ArrowLeft } from 'lucide-react';

export default function TermsOfServicePage() {
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
          {t('termsTitle')}
        </h1>

        <div className="prose prose-invert max-w-none">
          <p className="text-sm text-neutral-500 mb-8">
            {t('lastUpdated', { date: 'January 30, 2026' })}
          </p>

          <p className="text-neutral-300 mb-8">
            {t('termsIntro')}
          </p>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-neutral-100 mb-4">
              1. Acceptance of Terms
            </h2>
            <p className="text-neutral-300 mb-4">
              By accessing and using Beer League Hockey (&quot;the Service&quot;), you accept and agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the Service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-neutral-100 mb-4">
              2. Description of Service
            </h2>
            <p className="text-neutral-300 mb-4">
              Beer League Hockey is a software-as-a-service (SaaS) platform that provides hockey league management tools, including:
            </p>
            <ul className="list-disc list-inside text-neutral-300 mb-4 space-y-2">
              <li>League creation and administration</li>
              <li>Team roster management</li>
              <li>Game scheduling and statistics tracking</li>
              <li>Player registration and profile management</li>
              <li>Payment processing for league fees</li>
              <li>Communication tools for league administrators and players</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-neutral-100 mb-4">
              3. Account Registration
            </h2>
            <p className="text-neutral-300 mb-4">
              To use certain features of the Service, you must register for an account. You agree to:
            </p>
            <ul className="list-disc list-inside text-neutral-300 mb-4 space-y-2">
              <li>Provide accurate, current, and complete information during registration</li>
              <li>Maintain and update your information to keep it accurate and current</li>
              <li>Keep your password secure and confidential</li>
              <li>Notify us immediately of any unauthorized use of your account</li>
              <li>Accept responsibility for all activities under your account</li>
            </ul>
            <p className="text-neutral-300 mb-4">
              You must be at least 13 years old to create an account. If you are under 18, you must have parental consent to use the Service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-neutral-100 mb-4">
              4. User Conduct
            </h2>
            <p className="text-neutral-300 mb-4">
              You agree NOT to:
            </p>
            <ul className="list-disc list-inside text-neutral-300 mb-4 space-y-2">
              <li>Use the Service for any illegal purpose or in violation of any laws</li>
              <li>Violate the intellectual property rights of Beer League Hockey or others</li>
              <li>Upload or transmit viruses, malware, or malicious code</li>
              <li>Harass, abuse, or harm other users</li>
              <li>Impersonate any person or entity</li>
              <li>Interfere with or disrupt the Service or servers</li>
              <li>Attempt to gain unauthorized access to the Service or user accounts</li>
              <li>Use automated systems (bots, scrapers) without permission</li>
              <li>Resell or redistribute the Service without authorization</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-neutral-100 mb-4">
              5. Pricing and Payment
            </h2>
            <p className="text-neutral-300 mb-4">
              <strong className="text-rink-500">Transaction Fee:</strong> When you process payments through Beer League Hockey (e.g., player registration fees), a 3.5% platform fee is applied to each transaction. This is separate from Stripe&apos;s own card processing fees.
            </p>
            <p className="text-neutral-300 mb-4">
              <strong className="text-rink-500">Payment Processing:</strong> All payments are processed securely through Stripe Connect. League administrators receive funds directly to their connected Stripe account.
            </p>
            <p className="text-neutral-300 mb-4">
              <strong className="text-rink-500">Fee Changes:</strong> We reserve the right to change fees with 30 days&apos; notice. Per-league fee agreements are honored for their agreed term.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-neutral-100 mb-4">
              6. Intellectual Property
            </h2>
            <p className="text-neutral-300 mb-4">
              The Service, including its design, code, graphics, and content, is owned by Beer League Hockey and protected by copyright, trademark, and other intellectual property laws.
            </p>
            <p className="text-neutral-300 mb-4">
              <strong className="text-rink-500">Your Content:</strong> You retain ownership of content you upload (team names, player rosters, game stats). By uploading content, you grant us a license to use, store, and display it as necessary to provide the Service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-neutral-100 mb-4">
              7. Data and Privacy
            </h2>
            <p className="text-neutral-300 mb-4">
              Your use of the Service is also governed by our{' '}
              <Link href="/privacy" className="text-rink-500 hover:text-rink-400 hover:underline transition-colors">
                Privacy Policy
              </Link>
              , which describes how we collect, use, and protect your personal information.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-neutral-100 mb-4">
              8. Limitation of Liability
            </h2>
            <p className="text-neutral-300 mb-4 uppercase font-semibold">
              THE SERVICE IS PROVIDED &quot;AS IS&quot; WITHOUT WARRANTIES OF ANY KIND. TO THE MAXIMUM EXTENT PERMITTED BY LAW, BEER LEAGUE HOCKEY SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, OR CONSEQUENTIAL DAMAGES.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-neutral-100 mb-4">
              9. Contact Us
            </h2>
            <p className="text-neutral-300 mb-4">
              {t('contactEmail', { email: 'legal@beerleaguehockey.ca' })}
            </p>
            <ul className="list-none text-neutral-300 mb-4 space-y-2">
              <li><strong className="text-rink-500">Email:</strong> legal@beerleaguehockey.ca</li>
              <li><strong className="text-rink-500">Support:</strong> support@beerleaguehockey.ca</li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
