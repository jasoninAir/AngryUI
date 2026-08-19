import { useEffect, useRef, useState, useCallback } from 'react';
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
  const containerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const isInitialScrollRef = useRef(true);
  const prevLengthRef = useRef(0);
  const { t } = useLanguage();

  const checkScrollPosition = useCallback(() => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    // Show button if user is scrolled up by more than 150px
    const isScrolledUp = scrollHeight - scrollTop - clientHeight > 150;
    setShowScrollBottom(isScrolledUp);
  }, []);

  const scrollToBottom = useCallback((smooth = true) => {
    if (!containerRef.current) return;
    containerRef.current.scrollTo({
      top: containerRef.current.scrollHeight,
      behavior: smooth ? 'smooth' : 'auto'
    });
    setShowScrollBottom(false);
  }, []);

  // Initial scroll to bottom on load / conversation switch
  useEffect(() => {
    if (messages.length > 0) {
      if (isInitialScrollRef.current || prevLengthRef.current === 0) {
        // Immediate scroll to bottom on first load
        requestAnimationFrame(() => {
          scrollToBottom(false);
        });
        isInitialScrollRef.current = false;
      } else if (containerRef.current) {
        // Auto-scroll on new messages only if user was already near the bottom
        const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
        const isNearBottom = scrollHeight - scrollTop - clientHeight < 180;
        if (isNearBottom) {
          scrollToBottom(true);
        }
      }
      prevLengthRef.current = messages.length;
    }
  }, [messages, scrollToBottom]);

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
      <div
        ref={containerRef}
        onScroll={checkScrollPosition}
        className="h-full overflow-y-auto p-4 space-y-4 overscroll-contain"
      >
        {messages.map((m) => (
          <MessageItem key={m.id} msg={m} onFileClick={onFileClick} />
        ))}
        <div ref={messagesEndRef} className="h-1 shrink-0" />
      </div>

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
