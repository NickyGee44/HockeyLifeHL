'use client';

import { useLocale, useTranslations } from 'next-intl';
import { usePathname, useRouter } from '@/i18n/navigation';
import { Globe, Check } from 'lucide-react';
import { cn } from '@hockey-life/ui/lib/utils';
import { locales, localeNames, type Locale } from '@/i18n/config';
import * as React from 'react';

interface LanguageSwitcherProps {
  collapsed?: boolean;
}

export function LanguageSwitcher({ collapsed = false }: LanguageSwitcherProps) {
  const t = useTranslations('settings');
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLocaleChange = (newLocale: Locale) => {
    router.replace(pathname, { locale: newLocale });
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200',
          'text-neutral-400 hover:text-white hover:bg-neutral-800 border border-transparent',
          'group relative w-full'
        )}
        aria-label={t('language')}
      >
        <Globe
          className={cn(
            'w-5 h-5 flex-shrink-0',
            'text-neutral-500 group-hover:text-rink-500'
          )}
        />
        {!collapsed && (
          <>
            <span className="font-medium text-sm flex-1 text-left">
              {localeNames[locale]}
            </span>
            <span className="text-xs text-neutral-500 uppercase">
              {locale}
            </span>
          </>
        )}
        {collapsed && (
          <div className="absolute left-full ml-2 px-2 py-1 bg-neutral-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50">
            {t('language')}: {localeNames[locale]}
          </div>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div
          className={cn(
            'absolute z-50 mt-1 py-1 rounded-xl bg-neutral-800 border border-white/10 shadow-lg',
            collapsed ? 'left-full ml-2 bottom-0' : 'left-0 right-0'
          )}
        >
          {locales.map((loc) => (
            <button
              key={loc}
              onClick={() => handleLocaleChange(loc)}
              className={cn(
                'flex items-center gap-3 w-full px-3 py-2 text-left transition-colors',
                'hover:bg-neutral-700',
                locale === loc ? 'text-rink-500' : 'text-neutral-300'
              )}
            >
              <span className="flex-1 text-sm font-medium">
                {localeNames[loc]}
              </span>
              <span className="text-xs text-neutral-500 uppercase">
                {loc}
              </span>
              {locale === loc && (
                <Check className="w-4 h-4 text-rink-500" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
