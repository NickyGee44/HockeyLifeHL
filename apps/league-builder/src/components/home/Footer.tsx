'use client';

import Image from 'next/image';
import { Instagram, Mail } from 'lucide-react';
import { useLocale } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { getHomeCopy } from './content';

export function Footer() {
  const locale = useLocale();
  const copy = getHomeCopy(locale);

  return (
    <footer className="border-t border-white/10 bg-neutral-950 px-6 py-12 lg:px-12">
      <div className="mx-auto max-w-7xl">
        <div className="mb-12 grid gap-8 md:grid-cols-[1.2fr_0.8fr_0.8fr_0.8fr]">
          <div>
            <div className="mb-4 flex items-center gap-3">
              <Image
                src="/logo.png"
                alt={copy.brand}
                width={40}
                height={40}
                className="h-10 w-10 object-contain"
              />
              <span className="font-bold text-white">
                Beer League <span className="text-gradient-rink">Hockey</span>
              </span>
            </div>
            <p className="max-w-sm text-sm leading-7 text-neutral-500">{copy.footer.tagline}</p>
            <div className="mt-5 flex items-center gap-4">
              <a
                href="https://instagram.com/beerleaguehq"
                target="_blank"
                rel="noopener noreferrer"
                className="text-neutral-500 transition-colors hover:text-rink-300"
                aria-label="Instagram"
              >
                <Instagram className="h-5 w-5" />
              </a>
              <a
                href="mailto:hello@beerleaguehockey.ca"
                className="text-neutral-500 transition-colors hover:text-rink-300"
                aria-label="Email"
              >
                <Mail className="h-5 w-5" />
              </a>
            </div>
          </div>

          <FooterColumn title={copy.footer.productTitle}>
            {copy.footer.productLinks.map((link) => (
              <FooterLink key={link.href} href={link.href} external={link.external}>
                {link.label}
              </FooterLink>
            ))}
          </FooterColumn>

          <FooterColumn title={copy.footer.resourcesTitle}>
            {copy.footer.resourceLinks.map((link) => (
              <FooterLink key={link.href} href={link.href} external={link.external}>
                {link.label}
              </FooterLink>
            ))}
          </FooterColumn>

          <FooterColumn title={copy.footer.legalTitle}>
            <FooterLink href="/privacy" external={false}>{copy.footer.privacyLabel}</FooterLink>
            <FooterLink href="/terms" external={false}>{copy.footer.termsLabel}</FooterLink>
          </FooterColumn>
        </div>

        <div className="flex flex-col gap-3 border-t border-white/10 pt-8 text-sm text-neutral-600 md:flex-row md:items-center md:justify-between">
          <p>
            &copy; {new Date().getFullYear()} Beer League Hockey. {copy.footer.rights}
          </p>
          <p>{copy.footer.madeWith}</p>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="mb-4 font-semibold text-white">{title}</h4>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function FooterLink({
  href,
  external,
  children,
}: {
  href: string;
  external: boolean;
  children: React.ReactNode;
}) {
  if (external || href.startsWith('#')) {
    return (
      <a
        href={href}
        target={external ? '_blank' : undefined}
        rel={external ? 'noopener noreferrer' : undefined}
        className="block text-sm text-neutral-400 transition-colors hover:text-white"
      >
        {children}
      </a>
    );
  }

  return (
    <Link href={href} className="block text-sm text-neutral-400 transition-colors hover:text-white">
      {children}
    </Link>
  );
}
