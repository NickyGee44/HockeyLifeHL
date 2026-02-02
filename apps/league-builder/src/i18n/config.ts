// Internationalization configuration for Platform 1 (League Builder)
export const locales = ['en', 'fr'] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'en';

// Route translations for French Canadian
export const localizedRoutes: Record<Locale, Record<string, string>> = {
  en: {
    dashboard: 'dashboard',
    teams: 'teams',
    players: 'players',
    schedule: 'schedule',
    standings: 'standings',
    drafts: 'drafts',
    settings: 'settings',
    profile: 'profile',
    billing: 'billing',
    notifications: 'notifications',
    login: 'login',
    signup: 'signup',
  },
  fr: {
    dashboard: 'tableau-de-bord',
    teams: 'equipes',
    players: 'joueurs',
    schedule: 'calendrier',
    standings: 'classement',
    drafts: 'repechage',
    settings: 'parametres',
    profile: 'profil',
    billing: 'facturation',
    notifications: 'notifications',
    login: 'connexion',
    signup: 'inscription',
  },
};

// Locale display names
export const localeNames: Record<Locale, string> = {
  en: 'English',
  fr: 'Francais',
};

// Date/time formatting options per locale
export const dateTimeFormats: Record<Locale, Intl.DateTimeFormatOptions> = {
  en: {
    dateStyle: 'medium',
    timeStyle: 'short',
  },
  fr: {
    dateStyle: 'long',
    timeStyle: 'short',
  },
};
