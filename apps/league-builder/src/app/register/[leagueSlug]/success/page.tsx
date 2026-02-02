import Link from 'next/link';
import { Check, Mail, Calendar, Users, ArrowRight } from 'lucide-react';

interface SuccessPageProps {
  params: { leagueSlug: string };
  searchParams: { id?: string };
}

export default function RegistrationSuccessPage({
  params,
  searchParams,
}: SuccessPageProps) {
  return (
    <div className="min-h-screen bg-neutral-950 flex items-center justify-center p-4">
      <div className="max-w-lg w-full">
        {/* Success Card */}
        <div className="bg-neutral-900 rounded-2xl border border-gold-500/30 p-8 text-center">
          {/* Success Icon */}
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-500/20 flex items-center justify-center">
            <Check className="w-10 h-10 text-green-400" />
          </div>

          <h1 className="text-3xl font-bold text-white mb-3">
            Registration Submitted!
          </h1>

          <p className="text-neutral-400 mb-8">
            Your registration has been submitted successfully. You'll receive a
            confirmation email shortly.
          </p>

          {/* What's Next */}
          <div className="text-left space-y-4 mb-8 p-4 rounded-xl bg-neutral-800/50">
            <h2 className="font-semibold text-white text-sm uppercase tracking-wide">
              What happens next?
            </h2>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                <Mail className="w-4 h-4 text-blue-400" />
              </div>
              <div>
                <p className="text-white font-medium">Confirmation Email</p>
                <p className="text-sm text-neutral-400">
                  Check your inbox for a registration confirmation
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                <Calendar className="w-4 h-4 text-amber-400" />
              </div>
              <div>
                <p className="text-white font-medium">Admin Review</p>
                <p className="text-sm text-neutral-400">
                  League admins will review your registration (1-2 business days)
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                <Users className="w-4 h-4 text-green-400" />
              </div>
              <div>
                <p className="text-white font-medium">Approval Notification</p>
                <p className="text-sm text-neutral-400">
                  You'll receive an email when your registration is approved
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <Link
              href="/dashboard"
              className="flex items-center justify-center gap-2 w-full px-6 py-3 rounded-lg bg-gold-500 text-black font-semibold hover:bg-gold-400 transition-colors"
            >
              Go to Dashboard
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              href={`/register/${params.leagueSlug}`}
              className="flex items-center justify-center w-full px-6 py-3 rounded-lg border border-neutral-700 text-neutral-300 font-medium hover:bg-neutral-800 transition-colors"
            >
              Register Another Player
            </Link>
          </div>
        </div>

        {/* Contact Info */}
        <p className="text-center text-sm text-neutral-500 mt-6">
          Questions? Contact the league administrator or check your email for
          contact details.
        </p>
      </div>
    </div>
  );
}

export function generateMetadata() {
  return {
    title: 'Registration Submitted',
    description: 'Your player registration has been submitted successfully.',
  };
}
