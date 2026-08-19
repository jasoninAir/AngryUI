import { useState } from 'react';
import { Shield, Loader2 } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { authFetch } from '@/lib/api';

export function SecurityPanel() {
  const { t } = useLanguage();
  const [token, setToken] = useState('');
  const [status, setStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');

  const handleSave = async () => {
    setStatus('saving');
    try {
      const res = await authFetch('/api/settings/token', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      });
      if (res.ok) {
        setStatus('success');
        setTimeout(() => setStatus('idle'), 4000);
      } else {
        setStatus('error');
        setTimeout(() => setStatus('idle'), 4000);
      }
    } catch {
      setStatus('error');
      setTimeout(() => setStatus('idle'), 4000);
    }
  };

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold flex items-center gap-2">
        <Shield className="w-5 h-5 text-primary" />
        <span>{t('securityTitle')}</span>
      </h2>
      <p className="text-xs text-muted-foreground">{t('securityDesc')}</p>

      <div className="border border-border rounded-lg p-4 bg-card/40 space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="access-token">
            {t('accessTokenLabel')}
          </label>
          <input
            id="access-token"
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder={t('accessTokenPlaceholder')}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground/60"
          />
        </div>

        <button
          onClick={handleSave}
          disabled={status === 'saving'}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2 transition-colors cursor-pointer"
        >
          {status === 'saving' && <Loader2 className="w-4 h-4 animate-spin" />}
          {t('saveToken')}
        </button>

        {status === 'success' && (
          <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
            {t('tokenSaveSuccess')}
          </p>
        )}
        {status === 'error' && (
          <p className="text-xs text-destructive font-medium">
            {t('tokenSaveError')}
          </p>
        )}
      </div>
    </div>
  );
}
