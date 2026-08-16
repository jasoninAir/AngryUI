import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { SupportedLanguage, translations, TranslationKey, LANGUAGE_OPTIONS } from '../i18n/translations';

interface LanguageContextType {
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => void;
  t: (key: TranslationKey, fallback?: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

function detectInitialLanguage(): SupportedLanguage {
  const saved = localStorage.getItem('angryui_language') as SupportedLanguage | null;
  if (saved && ['en', 'zh-CN', 'zh-TW', 'ja', 'es'].includes(saved)) {
    return saved;
  }

  const browserLang = navigator.language.toLowerCase();
  if (browserLang.startsWith('zh-tw') || browserLang.startsWith('zh-hk')) return 'zh-TW';
  if (browserLang.startsWith('zh')) return 'zh-CN';
  if (browserLang.startsWith('ja')) return 'ja';
  if (browserLang.startsWith('es')) return 'es';
  return 'zh-CN'; // Default to zh-CN
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<SupportedLanguage>(detectInitialLanguage);

  const setLanguage = (lang: SupportedLanguage) => {
    setLanguageState(lang);
    localStorage.setItem('angryui_language', lang);
  };

  const t = (key: TranslationKey, fallback?: string): string => {
    const langDict = translations[language];
    if (langDict && key in langDict) {
      return (langDict as any)[key];
    }
    const fallbackDict = translations.en;
    if (fallbackDict && key in fallbackDict) {
      return (fallbackDict as any)[key];
    }
    return fallback || key;
  };

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}

export { LANGUAGE_OPTIONS };
