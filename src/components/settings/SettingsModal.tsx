import { X, Settings } from 'lucide-react';
import { SettingsPanel } from '@/components/settings/SettingsPanel';
import { useLanguage } from '@/context/LanguageContext';

interface SettingsModalProps {
  isOpen?: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen = true, onClose }: SettingsModalProps) {
  const { t } = useLanguage();
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl max-h-[85vh] bg-card border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-card">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 text-primary rounded-xl">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-card-foreground">{t('settingsTitle')}</h3>
              <p className="text-xs text-muted-foreground">{t('settingsDesc')}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors cursor-pointer"
            aria-label="Close settings modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto max-h-[calc(85vh-72px)] flex-1 bg-card">
          <SettingsPanel />
        </div>
      </div>
    </div>
  );
}
