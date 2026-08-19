import { useState, useEffect } from 'react';
import { soundManager } from '@/lib/sound';
import { notificationManager } from '@/lib/notificationManager';
import { useLanguage } from '@/context/LanguageContext';
import { Volume2, Bell, Play, CheckCircle2, AlertCircle } from 'lucide-react';

export function SoundPanel() {
  const { t } = useLanguage();
  const [soundEnabled, setSoundEnabled] = useState(soundManager.isEnabled());
  const [notifEnabled, setNotifEnabled] = useState(notificationManager.isEnabled());
  const [permStatus, setPermStatus] = useState<NotificationPermission>('default');

  useEffect(() => {
    if (notificationManager.isSupported()) {
      setPermStatus(notificationManager.getPermission());
    }
  }, []);

  const handleSoundToggle = (val: boolean) => {
    soundManager.setEnabled(val);
    setSoundEnabled(val);
  };

  const handleNotifToggle = async (val: boolean) => {
    if (val && notificationManager.isSupported() && Notification.permission !== 'granted') {
      const granted = await notificationManager.requestPermission();
      setPermStatus(granted ? 'granted' : 'denied');
      if (!granted) {
        notificationManager.setEnabled(false);
        setNotifEnabled(false);
        return;
      }
    }
    notificationManager.setEnabled(val);
    setNotifEnabled(val);
  };

  const handleTestNotification = async () => {
    if (permStatus !== 'granted') {
      const granted = await notificationManager.requestPermission();
      setPermStatus(granted ? 'granted' : 'denied');
      if (!granted) return;
    }
    notificationManager.sendNotification('AngryUI — Test Notification', {
      body: 'Notifications are working! You will be alerted when tasks finish or permissions are needed.'
    });
  };

  return (
    <div className="space-y-4">
      {/* Audio Sounds */}
      <div className="space-y-2">
        <h2 className="text-base font-semibold flex items-center gap-2">
          <Volume2 className="w-4 h-4 text-primary" />
          <span>{t('soundTitle')}</span>
        </h2>
        <p className="text-xs text-muted-foreground">{t('soundDesc')}</p>

        <div className="border border-border rounded-xl p-3.5 bg-card/40 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium">{t('enableSound')}</span>
            <button
              onClick={() => handleSoundToggle(!soundEnabled)}
              className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors cursor-pointer ${
                soundEnabled ? 'bg-primary' : 'bg-muted'
              }`}
            >
              <span
                className={`inline-block h-3.5 w-3.5 transform rounded-full bg-background transition-transform ${
                  soundEnabled ? 'translate-x-5' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border">
            <button
              onClick={() => soundManager.playTaskComplete()}
              className="px-2.5 py-1 border border-border rounded-lg text-xs font-medium hover:bg-accent flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Play className="w-3 h-3 text-emerald-500" />
              <span>{t('previewCompleteSound')}</span>
            </button>
            <button
              onClick={() => soundManager.playAttentionRequired()}
              className="px-2.5 py-1 border border-border rounded-lg text-xs font-medium hover:bg-accent flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Play className="w-3 h-3 text-blue-500" />
              <span>{t('previewAttentionSound')}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Web Push & System Notifications */}
      <div className="space-y-2 pt-2 border-t border-border">
        <h2 className="text-base font-semibold flex items-center gap-2">
          <Bell className="w-4 h-4 text-primary" />
          <span>{t('systemNotificationsTitle')}</span>
        </h2>
        <p className="text-xs text-muted-foreground">{t('systemNotificationsDesc')}</p>

        <div className="border border-border rounded-xl p-3.5 bg-card/40 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium">{t('enableSystemNotifications')}</span>
            <button
              onClick={() => handleNotifToggle(!notifEnabled)}
              className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors cursor-pointer ${
                notifEnabled && permStatus === 'granted' ? 'bg-primary' : 'bg-muted'
              }`}
            >
              <span
                className={`inline-block h-3.5 w-3.5 transform rounded-full bg-background transition-transform ${
                  notifEnabled && permStatus === 'granted' ? 'translate-x-5' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border">
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              {permStatus === 'granted' ? (
                <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {t('notificationPermissionGranted')}
                </span>
              ) : permStatus === 'denied' ? (
                <span className="text-rose-500 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {t('notificationPermissionDenied')}
                </span>
              ) : (
                <span>{t('notificationPermissionDefault')}</span>
              )}
            </div>

            <button
              onClick={handleTestNotification}
              className="px-2.5 py-1 bg-secondary text-secondary-foreground hover:bg-accent border border-border rounded-lg text-xs font-medium transition-colors cursor-pointer"
            >
              {t('testNotificationButton')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
