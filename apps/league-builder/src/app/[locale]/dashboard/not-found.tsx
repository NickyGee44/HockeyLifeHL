import { Link } from '@/i18n/navigation';
import { AlertTriangle, Home } from 'lucide-react';
import { useTranslations } from 'next-intl';

export default function DashboardNotFound() {
  const t = useTranslations();

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-yellow-500/10 text-yellow-500 mb-6">
          <AlertTriangle className="w-8 h-8" />
        </div>

        <h1 className="text-4xl font-bold text-white mb-4">{t('errors.notFound')}</h1>
        <p className="text-neutral-400 mb-8">
          {t('errorPages.notFoundDescription')}
        </p>

        <Link
          href="/dashboard"
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm bg-gradient-to-r from-rink-500 to-arena-500 text-black hover:shadow-lg hover:shadow-rink-500/20 transition-all"
        >
          <Home className="w-4 h-4" />
          {t('errorPages.goToDashboard')}
        </Link>
      </div>
    </div>
  );
}
