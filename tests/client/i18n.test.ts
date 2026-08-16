import { describe, it, expect } from 'vitest';
import { translations, LANGUAGE_OPTIONS, SupportedLanguage } from '../../src/i18n/translations';
import { matchSupportedLanguage } from '../../src/context/LanguageContext';

describe('i18n translations', () => {
  const languages: SupportedLanguage[] = ['en', 'zh-CN', 'zh-TW', 'ja', 'es'];

  it('contains all 5 language options with flags and names', () => {
    expect(LANGUAGE_OPTIONS.length).toBe(5);
    const codes = LANGUAGE_OPTIONS.map((l) => l.code);
    expect(codes).toEqual(['en', 'zh-CN', 'zh-TW', 'ja', 'es']);
  });

  it('has identical keys across all 5 language dictionaries', () => {
    const enKeys = Object.keys(translations.en).sort();

    for (const lang of languages) {
      const langKeys = Object.keys(translations[lang]).sort();
      expect(langKeys).toEqual(enKeys);
    }
  });

  it('contains non-empty translations for critical UI elements', () => {
    for (const lang of languages) {
      const dict = translations[lang];
      expect(dict.brandTitle).toBe('AngryUI');
      expect(dict.safeMode.length).toBeGreaterThan(0);
      expect(dict.autoApproveMode.length).toBeGreaterThan(0);
      expect(dict.send.length).toBeGreaterThan(0);
      expect(dict.settings.length).toBeGreaterThan(0);
    }
  });

  describe('device/browser language auto-detection', () => {
    it('matches Simplified Chinese variants to zh-CN', () => {
      expect(matchSupportedLanguage(['zh-CN'])).toBe('zh-CN');
      expect(matchSupportedLanguage(['zh-SG'])).toBe('zh-CN');
      expect(matchSupportedLanguage(['zh-Hans'])).toBe('zh-CN');
      expect(matchSupportedLanguage(['zh'])).toBe('zh-CN');
    });

    it('matches Traditional Chinese variants to zh-TW', () => {
      expect(matchSupportedLanguage(['zh-TW'])).toBe('zh-TW');
      expect(matchSupportedLanguage(['zh-HK'])).toBe('zh-TW');
      expect(matchSupportedLanguage(['zh-MO'])).toBe('zh-TW');
      expect(matchSupportedLanguage(['zh-Hant'])).toBe('zh-TW');
    });

    it('matches Japanese variants to ja', () => {
      expect(matchSupportedLanguage(['ja-JP'])).toBe('ja');
      expect(matchSupportedLanguage(['ja'])).toBe('ja');
    });

    it('matches Spanish variants to es', () => {
      expect(matchSupportedLanguage(['es-ES'])).toBe('es');
      expect(matchSupportedLanguage(['es-MX'])).toBe('es');
      expect(matchSupportedLanguage(['es-US'])).toBe('es');
      expect(matchSupportedLanguage(['es'])).toBe('es');
    });

    it('matches English variants to en', () => {
      expect(matchSupportedLanguage(['en-US'])).toBe('en');
      expect(matchSupportedLanguage(['en-GB'])).toBe('en');
      expect(matchSupportedLanguage(['en'])).toBe('en');
    });

    it('defaults to English when device language is unsupported or empty', () => {
      expect(matchSupportedLanguage(['fr-FR'])).toBe('en');
      expect(matchSupportedLanguage(['de-DE'])).toBe('en');
      expect(matchSupportedLanguage(['ru-RU'])).toBe('en');
      expect(matchSupportedLanguage(['ko-KR'])).toBe('en');
      expect(matchSupportedLanguage([])).toBe('en');
      expect(matchSupportedLanguage([undefined, null])).toBe('en');
    });
  });
});
