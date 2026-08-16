import { createContext, useContext, useState, ReactNode, useCallback, useMemo } from 'react';
import { SupportedLanguage, translations, TranslationKey, LANGUAGE_OPTIONS } from '../i18n/translations';

export { LANGUAGE_OPTIONS };
export type { SupportedLanguage };

interface LanguageContextType {
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => void;
  t: (key: TranslationKey, fallback?: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

/**
 * Match a list of browser locales against supported languages.
 * Defaults to 'en' if no candidate matches.
 */
export function matchSupportedLanguage(locales: (string | undefined | null)[]): SupportedLanguage {
  for (const raw of locales) {
    if (!raw) continue;
    const l = raw.toLowerCase().trim();

    // 1. Traditional Chinese (Taiwan, Hong Kong, Macau, Hant script)
    if (
      l.startsWith('zh-tw') ||
      l.startsWith('zh-hk') ||
      l.startsWith('zh-mo') ||
      l.includes('hant') ||
      l === 'zh-cht'
    ) {
      return 'zh-TW';
    }

    // 2. Simplified Chinese (Mainland China, Singapore, Hans script, or general zh)
    if (
      l.startsWith('zh-cn') ||
      l.startsWith('zh-sg') ||
      l.includes('hans') ||
      l === 'zh-chs' ||
      l === 'zh' ||
      l.startsWith('zh-')
    ) {
      return 'zh-CN';
    }

    // 3. Japanese
    if (l.startsWith('ja')) {
      return 'ja';
    }

    // 4. Spanish
    if (l.startsWith('es')) {
      return 'es';
    }

    // 5. English
    if (l.startsWith('en')) {
      return 'en';
    }
  }

  // Fallback to English if device language cannot be matched
  return 'en';
}

export function detectInitialLanguage(): SupportedLanguage {
  // 1. Prioritize user's explicitly saved preference in localStorage
  try {
    const saved = localStorage.getItem('angryui_language') as SupportedLanguage | null;
    if (saved && ['en', 'zh-CN', 'zh-TW', 'ja', 'es'].includes(saved)) {
      return saved;
    }
  } catch {}

  // 2. Detect user's device/browser language
  try {
    const candidateLocales: string[] = [];
    if (typeof navigator !== 'undefined') {
      if (Array.isArray(navigator.languages) && navigator.languages.length > 0) {
        candidateLocales.push(...navigator.languages);
      }
      if (navigator.language) {
        candidateLocales.push(navigator.language);
      }
    }
    return matchSupportedLanguage(candidateLocales);
  } catch {
    return 'en';
  }
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<SupportedLanguage>(detectInitialLanguage);

  const setLanguage = useCallback((lang: SupportedLanguage) => {
    setLanguageState(lang);
    try {
      localStorage.setItem('angryui_language', lang);
    } catch {}
  }, []);

  const t = useCallback(
    (key: TranslationKey, fallback?: string): string => {
      const langDict = translations[language];
      if (langDict && key in langDict) {
        return (langDict as any)[key];
      }
      const fallbackDict = translations.en;
      if (fallbackDict && key in fallbackDict) {
        return (fallbackDict as any)[key];
      }
      return fallback || key;
    },
    [language]
  );

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      t
    }),
    [language, setLanguage, t]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return ctx;
}
