import { useState, useEffect } from 'react';
import { Smartphone, Download, CheckCircle2, Share, PlusSquare } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';

export function PwaInstallPanel() {
  const { t } = useLanguage();
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if app is already running in standalone PWA mode
    const checkStandalone = () => {
      const isStandaloneMode =
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone === true;
      setIsStandalone(isStandaloneMode);
    };

    checkStandalone();

    // Check if device is iOS Safari
    const ua = window.navigator.userAgent;
    const isIOSDevice = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
    setIsIOS(isIOSDevice);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsStandalone(true);
      setDeferredPrompt(null);
    }
  };

  return (
    <div className="space-y-3 pt-2 border-t border-border">
      <div className="flex items-center gap-2">
        <Smartphone className="w-5 h-5 text-primary" />
        <h2 className="text-base font-semibold">{t('pwaTitle')}</h2>
      </div>
      <p className="text-xs text-muted-foreground">{t('pwaDesc')}</p>

      {isStandalone ? (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-medium">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <span>{t('pwaInstalledStatus')}</span>
        </div>
      ) : deferredPrompt ? (
        <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-between gap-3">
          <div className="text-xs">
            <div className="font-semibold text-foreground">{t('pwaInstallPromptTitle')}</div>
            <div className="text-muted-foreground text-[11px]">{t('pwaInstallPromptDesc')}</div>
          </div>
          <button
            onClick={handleInstallClick}
            className="px-3.5 py-1.5 bg-primary text-primary-foreground text-xs font-medium rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-1.5 shrink-0 shadow-xs cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{t('pwaInstallButton')}</span>
          </button>
        </div>
      ) : isIOS ? (
        <div className="p-3 rounded-xl bg-muted/60 border border-border text-xs space-y-1.5">
          <div className="font-semibold text-foreground flex items-center gap-1.5">
            <Share className="w-3.5 h-3.5 text-primary" />
            <span>{t('pwaIOSGuideTitle')}</span>
          </div>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            {t('pwaIOSGuideSteps')}
          </p>
        </div>
      ) : (
        <div className="p-3 rounded-xl bg-muted/40 border border-border text-xs text-muted-foreground flex items-center gap-2">
          <Download className="w-4 h-4 text-muted-foreground/60 shrink-0" />
          <span className="text-[11px]">{t('pwaBrowserGuide')}</span>
        </div>
      )}
    </div>
  );
}
