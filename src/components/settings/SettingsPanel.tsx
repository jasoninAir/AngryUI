import { SecurityPanel } from './SecurityPanel';
import { SoundPanel } from './SoundPanel';
import { PwaInstallPanel } from './PwaInstallPanel';
import { useLanguage } from '@/context/LanguageContext';

export function SettingsPanel() {
  const { t } = useLanguage();

  return (
    <div className="p-5 max-w-3xl space-y-6 overflow-y-auto h-full">
      <div>
        <h1 className="text-xl font-bold">{t('settingsTitle')}</h1>
        <p className="text-xs text-muted-foreground mt-1">{t('settingsDesc')}</p>
      </div>
      <SecurityPanel />
      <SoundPanel />
      <PwaInstallPanel />
    </div>
  );
}
