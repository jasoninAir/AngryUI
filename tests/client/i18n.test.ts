import { describe, it, expect } from 'vitest';
import { translations, LANGUAGE_OPTIONS, SupportedLanguage } from '../../src/i18n/translations';

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
});
