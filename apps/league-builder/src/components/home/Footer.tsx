'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import Image from 'next/image';
import { Twitter, Instagram, Mail } from 'lucide-react';

const footerLinks = {
  product: [
    { href: '/signup', key: 'footer.product.signup' },
    { href: '/login', key: 'footer.product.login' },
    { href: 'https://demo.beerleaguehockey.ca', key: 'footer.product.demo', external: true },
  ],
  resources: [
    { href: '/help', key: 'footer.resources.help' },
    { href: '/contact', key: 'footer.resources.contact' },
    { href: '/blog', key: 'footer.resources.blog' },
  ],
  legal: [
    { href: '/privacy', key: 'footer.legal.privacy' },
    { href: '/terms', key: 'footer.legal.terms' },
  ],
};

export function Footer() {
  const t = useTranslations('homepage');

  return (
    <footer className="px-6 py-12 lg:px-12 bg-neutral-950 border-t border-white/10">
      <div className="max-w-6xl mx-auto">
        {/* Main Footer Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          {/* Brand Column */}
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <Image
                src="/logo.png"
                alt="Beer League Hockey"
                width={40}
                height={40}
                className="w-10 h-10 object-contain"
              />
              <span className="font-bold text-white">
                Beer League <span className="text-gradient-rink">Hockey</span>
              </span>
            </div>
            <p className="text-sm text-neutral-500 mb-4">
              {t('footer.tagline')}
            </p>
            {/* Social Links */}
            <div className="flex items-center gap-4">
              <a
                href="https://twitter.com/beerleaguehq"
                target="_blank"
                rel="noopener noreferrer"
                className="text-neutral-500 hover:text-rink-400 transition-colors"
                aria-label="Twitter"
              >
                <Twitter className="w-5 h-5" />
              </a>
              <a
                href="https://instagram.com/beerleaguehq"
                target="_blank"
                rel="noopener noreferrer"
                className="text-neutral-500 hover:text-rink-400 transition-colors"
                aria-label="Instagram"
              >
                <Instagram className="w-5 h-5" />
              </a>
              <a
                href="mailto:hello@beerleaguehockey.ca"
                className="text-neutral-500 hover:text-rink-400 transition-colors"
                aria-label="Email"
              >
                <Mail className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Product Links */}
          <div>
            <h4 className="font-semibold text-white mb-4">{t('footer.product.title')}</h4>
            <ul className="space-y-3">
              {footerLinks.product.map((link) => (
                <li key={link.key}>
                  {link.external ? (
                    <a
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-neutral-400 hover:text-white transition-colors"
                    >
                      {t(link.key)}
                    </a>
                  ) : (
                    <Link
                      href={link.href}
                      className="text-sm text-neutral-400 hover:text-white transition-colors"
                    >
                      {t(link.key)}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Resources Links */}
          <div>
            <h4 className="font-semibold text-white mb-4">{t('footer.resources.title')}</h4>
            <ul className="space-y-3">
              {footerLinks.resources.map((link) => (
                <li key={link.key}>
                  <Link
                    href={link.href}
                    className="text-sm text-neutral-400 hover:text-white transition-colors"
                  >
                    {t(link.key)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal Links */}
          <div>
            <h4 className="font-semibold text-white mb-4">{t('footer.legal.title')}</h4>
            <ul className="space-y-3">
              {footerLinks.legal.map((link) => (
                <li key={link.key}>
                  <Link
                    href={link.href}
                    className="text-sm text-neutral-400 hover:text-white transition-colors"
                  >
                    {t(link.key)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-neutral-500">
            &copy; {new Date().getFullYear()} Beer League Hockey. {t('footer.rights')}
          </p>
          <p className="text-sm text-neutral-600">
            {t('footer.madeWith')}
          </p>
        </div>
      </div>
    </footer>
  );
}
