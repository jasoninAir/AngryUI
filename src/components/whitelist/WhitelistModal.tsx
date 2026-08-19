import { X, ShieldCheck } from 'lucide-react';
import { PermissionsPanel } from '@/components/settings/PermissionsPanel';
import { useLanguage } from '@/context/LanguageContext';

interface WhitelistModalProps {
  isOpen?: boolean;
  onClose: () => void;
}

export function WhitelistModal({ isOpen = true, onClose }: WhitelistModalProps) {
  const { t } = useLanguage();
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl max-h-[85vh] bg-background/85 dark:bg-card/85 backdrop-blur-xl border border-border/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/60 bg-background/40">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/15 text-primary rounded-xl">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-foreground">{t('whitelistRules')}</h3>
              <p className="text-xs text-muted-foreground">{t('allowListDesc')}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors cursor-pointer"
            aria-label="Close whitelist modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto max-h-[calc(85vh-76px)] flex-1">
          <PermissionsPanel />
        </div>
      </div>
    </div>
  );
}
