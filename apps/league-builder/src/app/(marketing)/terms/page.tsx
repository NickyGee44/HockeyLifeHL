import Link from 'next/link';

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-neutral-950 py-12">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-4xl font-bold text-gold-500 mb-8">
          Terms of Service
        </h1>

        <div className="prose prose-invert max-w-none">
          <p className="text-sm text-neutral-500 mb-8">
            Last Updated: January 30, 2026
          </p>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-neutral-100 mb-4">
              1. Acceptance of Terms
            </h2>
            <p className="text-neutral-300 mb-4">
              By accessing and using HockeyLife (&quot;the Service&quot;), you accept and agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the Service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-neutral-100 mb-4">
              2. Description of Service
            </h2>
            <p className="text-neutral-300 mb-4">
              HockeyLife is a software-as-a-service (SaaS) platform that provides hockey league management tools, including:
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
              <li>Violate the intellectual property rights of HockeyLife or others</li>
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
              <strong className="text-gold-500">Free Platform:</strong> HockeyLife is free to use. All core features including league creation, team management, scheduling, statistics, and player registration are available at no cost.
            </p>
            <p className="text-neutral-300 mb-4">
              <strong className="text-gold-500">Transaction Fee:</strong> When you process payments through HockeyLife (e.g., player registration fees), we charge a 2.99% fee on each transaction. This covers Stripe payment processing, fraud protection, and platform operating costs.
            </p>
            <p className="text-neutral-300 mb-4">
              <strong className="text-gold-500">Payment Processing:</strong> All payments are processed securely through Stripe Connect. League administrators receive funds directly to their connected Stripe account, minus the 2.99% transaction fee.
            </p>
            <p className="text-neutral-300 mb-4">
              <strong className="text-gold-500">Optional Add-ons:</strong> Additional services such as custom domain setup and historic data import are available for a custom fee. Contact us for pricing on these add-on services.
            </p>
            <p className="text-neutral-300 mb-4">
              <strong className="text-gold-500">Fee Changes:</strong> We reserve the right to change the transaction fee percentage with 30 days&apos; notice.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-neutral-100 mb-4">
              6. Intellectual Property
            </h2>
            <p className="text-neutral-300 mb-4">
              The Service, including its design, code, graphics, and content, is owned by HockeyLife and protected by copyright, trademark, and other intellectual property laws.
            </p>
            <p className="text-neutral-300 mb-4">
              <strong className="text-gold-500">License:</strong> We grant you a limited, non-exclusive, non-transferable license to access and use the Service for your internal league management purposes.
            </p>
            <p className="text-neutral-300 mb-4">
              <strong className="text-gold-500">Your Content:</strong> You retain ownership of content you upload (team names, player rosters, game stats). By uploading content, you grant us a license to use, store, and display it as necessary to provide the Service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-neutral-100 mb-4">
              7. Data and Privacy
            </h2>
            <p className="text-neutral-300 mb-4">
              Your use of the Service is also governed by our{' '}
              <Link href="/privacy" className="text-gold-500 hover:text-gold-400 hover:underline transition-colors">
                Privacy Policy
              </Link>
              , which describes how we collect, use, and protect your personal information.
            </p>
            <p className="text-neutral-300 mb-4">
              You are responsible for ensuring you have the necessary rights and consents to upload player and league data to the Service.
            </p>
          </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-neutral-100 mb-4">
            8. Service Availability and Support
          </h2>
          <p className="text-neutral-300 mb-4">
            <strong className="text-gold-500">Uptime:</strong> We strive for 99.9% uptime but do not guarantee uninterrupted service. Scheduled maintenance will be announced in advance when possible.
          </p>
          <p className="text-neutral-300 mb-4">
            <strong className="text-gold-500">Support:</strong> We provide email support for all paid subscribers. Response times vary by plan tier.
          </p>
          <p className="text-neutral-300 mb-4">
            <strong className="text-gold-500">Service Modifications:</strong> We may modify, suspend, or discontinue features of the Service with reasonable notice.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-neutral-100 mb-4">
            9. Termination
          </h2>
          <p className="text-neutral-300 mb-4">
            <strong className="text-gold-500">By You:</strong> You may terminate your account at any time through your account settings.
          </p>
          <p className="text-neutral-300 mb-4">
            <strong className="text-gold-500">By Us:</strong> We may suspend or terminate your account if you violate these Terms, fail to pay subscription fees, or engage in fraudulent activity.
          </p>
          <p className="text-neutral-300 mb-4">
            <strong className="text-gold-500">Effect of Termination:</strong> Upon termination, your access to the Service will cease. We will retain your data for 30 days (grace period) before permanent deletion, unless required by law to retain it longer.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-neutral-100 mb-4">
            10. Disclaimers
          </h2>
          <p className="text-neutral-300 mb-4 uppercase font-semibold">
            THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, OR NON-INFRINGEMENT.
          </p>
          <p className="text-neutral-300 mb-4">
            We do not warrant that the Service will be error-free, secure, or uninterrupted. You use the Service at your own risk.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-neutral-100 mb-4">
            11. Limitation of Liability
          </h2>
          <p className="text-neutral-300 mb-4 uppercase font-semibold">
            TO THE MAXIMUM EXTENT PERMITTED BY LAW, HOCKEYLIFE SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS, REVENUE, DATA, OR USE, ARISING OUT OF OR RELATED TO YOUR USE OF THE SERVICE.
          </p>
          <p className="text-neutral-300 mb-4">
            Our total liability to you for any claim arising from the Service shall not exceed the amount you paid us in the 12 months preceding the claim.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-neutral-100 mb-4">
            12. Indemnification
          </h2>
          <p className="text-neutral-300 mb-4">
            You agree to indemnify and hold harmless HockeyLife from any claims, damages, losses, or expenses (including legal fees) arising from:
          </p>
          <ul className="list-disc list-inside text-neutral-300 mb-4 space-y-2">
            <li>Your use of the Service</li>
            <li>Your violation of these Terms</li>
            <li>Your violation of any third-party rights</li>
            <li>Content you upload to the Service</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-neutral-100 mb-4">
            13. Dispute Resolution
          </h2>
          <p className="text-neutral-300 mb-4">
            <strong className="text-gold-500">Governing Law:</strong> These Terms are governed by the laws of [Your Jurisdiction], without regard to conflict of law principles.
          </p>
          <p className="text-neutral-300 mb-4">
            <strong className="text-gold-500">Arbitration:</strong> Any disputes arising from these Terms or the Service shall be resolved through binding arbitration, except you may bring claims in small claims court if eligible.
          </p>
          <p className="text-neutral-300 mb-4">
            <strong className="text-gold-500">Class Action Waiver:</strong> You agree to resolve disputes individually and waive the right to participate in class actions.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-neutral-100 mb-4">
            14. Changes to Terms
          </h2>
          <p className="text-neutral-300 mb-4">
            We may update these Terms from time to time. We will notify you of significant changes by email or through the Service. Continued use after changes constitutes acceptance of the updated Terms.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-neutral-100 mb-4">
            15. Miscellaneous
          </h2>
          <p className="text-neutral-300 mb-4">
            <strong className="text-gold-500">Entire Agreement:</strong> These Terms, together with our Privacy Policy, constitute the entire agreement between you and HockeyLife.
          </p>
          <p className="text-neutral-300 mb-4">
            <strong className="text-gold-500">Severability:</strong> If any provision of these Terms is found invalid, the remaining provisions remain in effect.
          </p>
          <p className="text-neutral-300 mb-4">
            <strong className="text-gold-500">No Waiver:</strong> Failure to enforce any right or provision does not constitute a waiver.
          </p>
          <p className="text-neutral-300 mb-4">
            <strong className="text-gold-500">Assignment:</strong> You may not assign these Terms without our consent. We may assign these Terms without restriction.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-neutral-100 mb-4">
            16. Contact Us
          </h2>
          <p className="text-neutral-300 mb-4">
            If you have questions about these Terms:
          </p>
          <ul className="list-none text-neutral-300 mb-4 space-y-2">
            <li><strong className="text-gold-500">Email:</strong> legal@hockeylife.com</li>
            <li><strong className="text-gold-500">Support:</strong> support@hockeylife.com</li>
          </ul>
        </section>
        </div>
      </div>
    </div>
  );
}
