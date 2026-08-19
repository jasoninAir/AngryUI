import { useEffect, useRef, useState, useCallback } from 'react';
import { FixedSizeList } from 'react-window';
import { MessageItem } from './MessageItem';
import { useLanguage } from '@/context/LanguageContext';
import { Loader2 } from 'lucide-react';

const MESSAGE_ITEM_HEIGHT = 80;

export function MessageList({
  messages,
  loading = false
}: {
  messages: any[];
  loading?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerHeight, setContainerHeight] = useState(0);
  const { t } = useLanguage();

  // Measure container height for virtualization
  const measureContainer = useCallback(() => {
    if (containerRef.current) {
      setContainerRef.current?.();
    }
  }, []);

  const setContainerRef = useCallback(() => {
    if (containerRef.current) {
      const height = containerRef.current.clientHeight;
      setContainerHeight(height);
    }
  }, []);

  useEffect(() => {
    setContainerRef();

    const resizeObserver = new ResizeObserver(() => {
      setContainerRef();
    });

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => resizeObserver.disconnect();
  }, [setContainerRef]);

  // Scroll to bottom on new messages (unless user has scrolled up)
  useEffect(() => {
    if (containerRef.current && messages.length > 0) {
      const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 100;
      if (isAtBottom) {
        containerRef.current.scrollTop = containerRef.current.scrollHeight;
      }
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

  // Use virtualization if we have a valid container height
  const useVirtualization = containerHeight > 0;

  return (
    <div ref={containerRef} className="h-full overflow-y-auto p-4">
      {useVirtualization ? (
        <FixedSizeList
          height={containerHeight - 16} // Subtract padding
          itemCount={messages.length}
          itemSize={MESSAGE_ITEM_HEIGHT}
          width="100%"
          style={{ paddingBottom: 16 }}
        >
          {({ index, style }) => (
            <div style={{ ...style, paddingBottom: 16 }}>
              <MessageItem key={messages[index].id} msg={messages[index]} />
            </div>
          )}
        </FixedSizeList>
      ) : (
        // Fallback to non-virtualized list while measuring
        <div className="space-y-4">
          {messages.map((m) => (
            <MessageItem key={m.id} msg={m} />
          ))}
        </div>
      )}
    </div>
  );
}
