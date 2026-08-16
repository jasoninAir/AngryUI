import { createContext, useContext, useState, useEffect, ReactNode, useCallback, useMemo } from 'react';
import { SupportedLanguage, translations, TranslationKey, LANGUAGE_OPTIONS } from '../i18n/translations';

interface LanguageContextType {
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => void;
  t: (key: TranslationKey, fallback?: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

function detectInitialLanguage(): SupportedLanguage {
  try {
    const saved = localStorage.getItem('angryui_language') as SupportedLanguage | null;
    if (saved && ['en', 'zh-CN', 'zh-TW', 'ja', 'es'].includes(saved)) {
      return saved;
    }
  } catch {}

  const browserLang = typeof navigator !== 'undefined' ? navigator.language.toLowerCase() : 'zh-cn';
  if (browserLang.startsWith('zh-tw') || browserLang.startsWith('zh-hk')) return 'zh-TW';
  if (browserLang.startsWith('zh')) return 'zh-CN';
  if (browserLang.startsWith('ja')) return 'ja';
  if (browserLang.startsWith('es')) return 'es';
  return 'zh-CN'; // Default to zh-CN
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

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = language;
    }
  }, [language]);

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
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}

export { LANGUAGE_OPTIONS };
