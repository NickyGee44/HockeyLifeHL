export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-neutral-950 py-12">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-4xl font-bold text-rink-500 mb-8">
          Privacy Policy
        </h1>

        <div className="prose prose-invert max-w-none">
          <p className="text-sm text-neutral-500 mb-8">
            Last Updated: January 30, 2026
          </p>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-neutral-100 mb-4">
              1. Information We Collect
            </h2>
            <p className="text-neutral-300 mb-4">
              We collect information that you provide directly to us when you create an account, use our services, or communicate with us.
            </p>

            <h3 className="text-xl font-medium text-neutral-100 mb-2">
              Personal Information
            </h3>
            <ul className="list-disc list-inside text-neutral-300 mb-4 space-y-2">
              <li><strong className="text-rink-500">Account Information:</strong> Name, email address, password (encrypted)</li>
              <li><strong className="text-rink-500">Profile Information:</strong> Player position, skill level, availability preferences, profile photo</li>
              <li><strong className="text-rink-500">Organization Information:</strong> Organization name, league details</li>
              <li><strong className="text-rink-500">Optional Contact Information:</strong> Phone number (only if you choose to provide it)</li>
            </ul>

            <h3 className="text-xl font-medium text-neutral-100 mb-2">
              Technical Information
            </h3>
            <ul className="list-disc list-inside text-neutral-300 mb-4 space-y-2">
              <li><strong className="text-rink-500">Session Data:</strong> IP address, browser type, device information (retained for 14 days)</li>
              <li><strong className="text-rink-500">Usage Analytics:</strong> How you use our platform (only if you consent to analytics)</li>
              <li><strong className="text-rink-500">Security Logs:</strong> Login attempts, account changes (retained for 1 year for security purposes)</li>
            </ul>
          </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-neutral-100 mb-4">
            2. How We Use Your Information
          </h2>
          <p className="text-neutral-300 mb-4">
            We use the information we collect to:
          </p>
          <ul className="list-disc list-inside text-neutral-300 mb-4 space-y-2">
            <li>Provide, maintain, and improve our services</li>
            <li>Create and manage your account</li>
            <li>Facilitate league and team management</li>
            <li>Send you important service notifications</li>
            <li>Send you marketing communications (only if you opt-in)</li>
            <li>Detect and prevent fraud and abuse</li>
            <li>Comply with legal obligations</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-neutral-100 mb-4">
            3. Legal Basis for Processing (GDPR)
          </h2>
          <p className="text-neutral-300 mb-4">
            We process your personal data based on the following legal grounds:
          </p>
          <ul className="list-disc list-inside text-neutral-300 mb-4 space-y-2">
            <li><strong className="text-rink-500">Contract:</strong> To provide our services (account creation, league management)</li>
            <li><strong className="text-rink-500">Consent:</strong> For marketing emails and analytics (you can withdraw anytime)</li>
            <li><strong className="text-rink-500">Legitimate Interest:</strong> To improve our services and prevent fraud</li>
            <li><strong className="text-rink-500">Legal Obligation:</strong> To comply with tax and financial regulations</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-neutral-100 mb-4">
            4. Data Sharing and Third Parties
          </h2>
          <p className="text-neutral-300 mb-4">
            We share your information with the following third-party service providers:
          </p>
          <ul className="list-disc list-inside text-neutral-300 mb-4 space-y-2">
            <li><strong className="text-rink-500">Supabase:</strong> Database and authentication (GDPR-compliant, SOC 2 certified)</li>
            <li><strong className="text-rink-500">Stripe:</strong> Payment processing (PCI-DSS Level 1 certified)</li>
            <li><strong className="text-rink-500">Resend:</strong> Transactional email delivery</li>
            <li><strong className="text-rink-500">Analytics Provider:</strong> Platform analytics (only if you consent, with pseudonymized data)</li>
          </ul>
          <p className="text-neutral-300 mb-4">
            <strong className="text-rink-500">We do NOT sell your personal information to anyone.</strong>
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-neutral-100 mb-4">
            5. Data Retention
          </h2>
          <p className="text-neutral-300 mb-4">
            We retain your information for different periods based on the type of data:
          </p>
          <ul className="list-disc list-inside text-neutral-300 mb-4 space-y-2">
            <li><strong className="text-rink-500">Account Data:</strong> Until you delete your account (+ 30-day grace period)</li>
            <li><strong className="text-rink-500">Session Data:</strong> 14 days</li>
            <li><strong className="text-rink-500">Security Logs:</strong> 1 year</li>
            <li><strong className="text-rink-500">Payment Records:</strong> 7 years (legal requirement for tax compliance)</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-neutral-100 mb-4">
            6. Your Rights
          </h2>
          <p className="text-neutral-300 mb-4">
            You have the following rights regarding your personal data:
          </p>
          <ul className="list-disc list-inside text-neutral-300 mb-4 space-y-2">
            <li><strong className="text-rink-500">Right to Access:</strong> Request a copy of your data</li>
            <li><strong className="text-rink-500">Right to Rectification:</strong> Update incorrect information</li>
            <li><strong className="text-rink-500">Right to Erasure:</strong> Delete your account and data</li>
            <li><strong className="text-rink-500">Right to Data Portability:</strong> Download your data in JSON format</li>
            <li><strong className="text-rink-500">Right to Object:</strong> Opt-out of marketing or analytics</li>
            <li><strong className="text-rink-500">Right to Withdraw Consent:</strong> Change your consent preferences anytime</li>
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
            7. Security
          </h2>
          <p className="text-neutral-300 mb-4">
            We implement industry-standard security measures to protect your data:
          </p>
          <ul className="list-disc list-inside text-neutral-300 mb-4 space-y-2">
            <li>Encryption in transit (HTTPS/TLS)</li>
            <li>Encryption at rest for database storage</li>
            <li>Row-level security policies to prevent unauthorized access</li>
            <li>Regular security audits and monitoring</li>
            <li>Secure password hashing (bcrypt)</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-neutral-100 mb-4">
            8. Cookies and Tracking
          </h2>
          <p className="text-neutral-300 mb-4">
            We use the following types of cookies:
          </p>
          <ul className="list-disc list-inside text-neutral-300 mb-4 space-y-2">
            <li><strong className="text-rink-500">Essential Cookies:</strong> Required for authentication and core functionality</li>
            <li><strong className="text-rink-500">Analytics Cookies:</strong> Used to understand usage (only with your consent)</li>
          </ul>
          <p className="text-neutral-300 mb-4">
            You can manage your cookie preferences in your browser settings.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-neutral-100 mb-4">
            9. Children&apos;s Privacy
          </h2>
          <p className="text-neutral-300 mb-4">
            Our services are not intended for children under 13. We do not knowingly collect personal information from children under 13. If you believe we have collected information from a child under 13, please contact us immediately.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-neutral-100 mb-4">
            10. International Data Transfers
          </h2>
          <p className="text-neutral-300 mb-4">
            Your data may be transferred to and processed in countries outside your country of residence, including the United States. We ensure appropriate safeguards are in place through:
          </p>
          <ul className="list-disc list-inside text-neutral-300 mb-4 space-y-2">
            <li>Standard Contractual Clauses (SCCs) with our service providers</li>
            <li>GDPR-compliant data processing agreements</li>
            <li>SOC 2 certified infrastructure providers</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-neutral-100 mb-4">
            11. Changes to This Policy
          </h2>
          <p className="text-neutral-300 mb-4">
            We may update this Privacy Policy from time to time. We will notify you of significant changes by email or through the platform. Continued use of our services after changes constitutes acceptance of the updated policy.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-neutral-100 mb-4">
            12. Contact Us
          </h2>
          <p className="text-neutral-300 mb-4">
            If you have questions about this Privacy Policy or how we handle your data:
          </p>
          <ul className="list-none text-neutral-300 mb-4 space-y-2">
            <li><strong className="text-rink-500">Email:</strong> privacy@beerleaguehockey.ca</li>
            <li><strong className="text-rink-500">Data Protection Officer:</strong> dpo@beerleaguehockey.ca</li>
            <li><strong className="text-rink-500">Security Concerns:</strong> security@beerleaguehockey.ca</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-neutral-100 mb-4">
            13. Regulatory Information
          </h2>
          <p className="text-neutral-300 mb-4">
            <strong className="text-rink-500">For EU/UK Users (GDPR):</strong> You have the right to lodge a complaint with your local data protection authority if you believe we have not complied with data protection laws.
          </p>
          <p className="text-neutral-300 mb-4">
            <strong className="text-rink-500">For California Users (CCPA/CPRA):</strong> You have additional rights under California law. We do not sell your personal information. You may request disclosure of data we collect, delete your data, or opt-out of certain processing activities.
          </p>
        </section>
        </div>
      </div>
    </div>
  );
}
