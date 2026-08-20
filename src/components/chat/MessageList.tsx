import { useRef, useState, useCallback } from 'react';
import { Virtuoso, VirtuosoHandle } from 'react-virtuoso';
import { MessageItem } from './MessageItem';
import { useLanguage } from '@/context/LanguageContext';
import { Loader2, ArrowDown } from 'lucide-react';

export function MessageList({
  messages,
  loading = false,
  onFileClick
}: {
  messages: any[];
  loading?: boolean;
  onFileClick?: (path: string, startLine?: number, endLine?: number) => void;
}) {
  const virtuosoRef = useRef<VirtuosoHandle>(null);
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const { t } = useLanguage();

  const scrollToBottom = useCallback((smooth = true) => {
    virtuosoRef.current?.scrollToIndex({
      index: messages.length - 1,
      align: 'end',
      behavior: smooth ? 'smooth' : 'auto'
    });
    setShowScrollBottom(false);
  }, [messages.length]);

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
    <div className="relative h-full w-full overflow-hidden">
      <Virtuoso
        ref={virtuosoRef}
        data={messages}
        initialTopMostItemIndex={messages.length - 1}
        followOutput={(isAtBottom) => (isAtBottom ? 'smooth' : false)}
        atBottomStateChange={(atBottom) => setShowScrollBottom(!atBottom)}
        className="h-full w-full overflow-y-auto overscroll-contain"
        components={{
          Header: () =>
            loading ? (
              <div className="py-3 flex items-center justify-center text-xs text-muted-foreground gap-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                <span>{t('loadingEarlier')}</span>
              </div>
            ) : null
        }}
        itemContent={(index, m) => (
          <div className="px-4 py-2" key={m.id || index}>
            <MessageItem msg={m} onFileClick={onFileClick} />
          </div>
        )}
      />

      {/* Floating Scroll to Bottom Button */}
      {showScrollBottom && (
        <button
          onClick={() => scrollToBottom(true)}
          title={t('scrollToBottom') || 'Scroll to bottom'}
          aria-label={t('scrollToBottom') || 'Scroll to bottom'}
          className="absolute bottom-4 right-4 z-30 flex items-center gap-1 px-3 py-2 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 hover:scale-105 active:scale-95 transition-all text-xs font-medium cursor-pointer animate-in fade-in slide-in-from-bottom-2 duration-150"
        >
          <ArrowDown className="w-3.5 h-3.5" />
          <span className="text-[11px] font-medium hidden sm:inline">{t('scrollToBottom') || 'Latest'}</span>
        </button>
      )}
    </div>
  );
}
