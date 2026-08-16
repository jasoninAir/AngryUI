import { useState, useRef, useEffect } from 'react';
import { useLanguage, LANGUAGE_OPTIONS, SupportedLanguage } from '@/context/LanguageContext';
import { Languages, Check } from 'lucide-react';

export function LanguageMenu({ dropUp = true }: { dropUp?: boolean }) {
  const { language, setLanguage, t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleSelectLanguage = (code: SupportedLanguage) => {
    setLanguage(code);
    setIsOpen(false);
  };

  return (
    <div className="relative inline-block" ref={menuRef}>
      {/* Minimal "aA" Language Switcher Icon Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        title={t('language')}
        aria-label={t('language')}
        className={`p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors cursor-pointer flex items-center justify-center ${
          isOpen ? 'bg-accent text-foreground shadow-2xs' : ''
        }`}
      >
        <Languages className="w-4 h-4" />
      </button>

      {/* Floating Language Options Popover */}
      {isOpen && (
        <div
          className={`absolute left-0 z-50 w-44 rounded-xl border border-border bg-popover/95 backdrop-blur-md p-1.5 shadow-xl animate-in fade-in zoom-in-95 duration-150 ${
            dropUp ? 'bottom-full mb-2' : 'top-full mt-2'
          }`}
        >
          <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
            {t('language')}
          </div>
          <div className="space-y-0.5">
            {LANGUAGE_OPTIONS.map((opt) => {
              const isSelected = language === opt.code;
              return (
                <button
                  key={opt.code}
                  type="button"
                  onClick={() => handleSelectLanguage(opt.code)}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer text-left ${
                    isSelected
                      ? 'bg-primary/10 text-primary font-medium'
                      : 'text-foreground/80 hover:bg-accent hover:text-foreground'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span>{opt.flag}</span>
                    <span>{opt.nativeName}</span>
                  </span>
                  {isSelected && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
