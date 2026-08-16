import { useState } from 'react';
import { soundManager } from '@/lib/sound';
import { useLanguage } from '@/context/LanguageContext';
import { Volume2, Play } from 'lucide-react';

export function SoundPanel() {
  const { t } = useLanguage();
  const [enabled, setEnabled] = useState(soundManager.isEnabled());

  const handleToggle = (val: boolean) => {
    soundManager.setEnabled(val);
    setEnabled(val);
  };

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold flex items-center gap-2">
        <Volume2 className="w-5 h-5 text-primary" />
        <span>{t('soundTitle')}</span>
      </h2>
      <p className="text-xs text-muted-foreground">{t('soundDesc')}</p>

      <div className="border border-border rounded-lg p-4 bg-card/40 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">{t('enableSound')}</span>
          <button
            onClick={() => handleToggle(!enabled)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
              enabled ? 'bg-primary' : 'bg-muted'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-background transition-transform ${
                enabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-border">
          <button
            onClick={() => soundManager.playTaskComplete()}
            className="px-3 py-1.5 border border-border rounded-md text-xs font-medium hover:bg-accent flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 text-emerald-500" />
            <span>{t('previewCompleteSound')}</span>
          </button>
          <button
            onClick={() => soundManager.playAttentionRequired()}
            className="px-3 py-1.5 border border-border rounded-md text-xs font-medium hover:bg-accent flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 text-blue-500" />
            <span>{t('previewAttentionSound')}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
