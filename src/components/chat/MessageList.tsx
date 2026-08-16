import { useEffect, useRef } from 'react';
import { MessageItem } from './MessageItem';
import { useLanguage } from '@/context/LanguageContext';
import { Loader2 } from 'lucide-react';

export function MessageList({
  messages,
  loading = false
}: {
  messages: any[];
  loading?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { t } = useLanguage();

  useEffect(() => {
    if (ref.current) {
      ref.current.scrollTop = ref.current.scrollHeight;
    }
  }, [messages]);

  if (messages.length === 0) {
    if (loading) {
      return (
        <div className="h-full flex flex-col items-center justify-center p-8 text-center text-xs text-muted-foreground select-none gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
          <p className="text-xs">{t('loadingEarlier')}</p>
        </div>
      );
    }

    return (
      <div className="h-full flex items-center justify-center p-8 text-center text-xs text-muted-foreground select-none">
        <div className="space-y-1.5 animate-in fade-in duration-200">
          <p className="font-semibold text-sm text-foreground">✨ {t('noMessagesYet')}</p>
          <p className="opacity-70">{t('homeWelcomeDesc')}</p>
        </div>
      </div>
    );
  }

  return (
    <div ref={ref} className="h-full overflow-y-auto p-4 space-y-3">
      {messages.map((m) => (
        <MessageItem key={m.id} msg={m} />
      ))}
    </div>
  );
}
