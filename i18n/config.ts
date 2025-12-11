export const locales = ['en', 'zh'] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'en';

export const localeNames: Record<Locale, string> = {
  en: 'English',
  zh: '中文',
};

// Locale detection settings
export const localeDetection = {
  lookupFromPathIndex: 0,
  lookupFromCookie: 'NEXT_LOCALE',
  lookupFromHeader: true,
};
