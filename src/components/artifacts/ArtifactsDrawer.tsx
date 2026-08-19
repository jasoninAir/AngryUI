import { useEffect, useState, useMemo } from 'react';
import {
  X,
  Sparkles,
  Layers,
  Download,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  FileText,
  Loader2,
  Calendar,
  HardDrive
} from 'lucide-react';
import {
  fetchConversationArtifacts,
  fetchArtifactDetail,
  type ArtifactSummary,
  type ArtifactDetail
} from '@/lib/api';
import { MarkdownContent } from '@/components/chat/MarkdownContent';
import { useLanguage } from '@/context/LanguageContext';

interface ArtifactsDrawerProps {
  isOpen: boolean;
  conversationId: string;
  onClose: () => void;
  onFileClick?: (path: string, startLine?: number, endLine?: number) => void;
}

export function ArtifactsDrawer({
  isOpen,
  conversationId,
  onClose,
  onFileClick
}: ArtifactsDrawerProps) {
  const { t } = useLanguage();
  const [artifacts, setArtifacts] = useState<ArtifactSummary[]>([]);
  const [selectedFilename, setSelectedFilename] = useState<string | null>(null);
  const [currentArtifact, setCurrentArtifact] = useState<ArtifactDetail | null>(null);
  const [loadingList, setLoadingList] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [copied, setCopied] = useState(false);

  // Load Artifacts List
  useEffect(() => {
    if (!isOpen || !conversationId) return;

    let mounted = true;
    setLoadingList(true);

    fetchConversationArtifacts(conversationId)
      .then((res) => {
        if (mounted) {
          setArtifacts(res.artifacts || []);
          if (res.artifacts?.length > 0 && !selectedFilename) {
            setSelectedFilename(res.artifacts[0].filename);
          }
        }
      })
      .catch(() => {})
      .finally(() => {
        if (mounted) setLoadingList(false);
      });

    return () => {
      mounted = false;
    };
  }, [isOpen, conversationId]);

  // Load Selected Artifact Detail
  useEffect(() => {
    if (!isOpen || !conversationId || !selectedFilename) return;

    let mounted = true;
    setLoadingDetail(true);
    setCurrentSlideIndex(0);

    fetchArtifactDetail(conversationId, selectedFilename)
      .then((data) => {
        if (mounted) {
          setCurrentArtifact(data);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (mounted) setLoadingDetail(false);
      });

    return () => {
      mounted = false;
    };
  }, [isOpen, conversationId, selectedFilename]);

  // Keyboard navigation for slides
  useEffect(() => {
    if (!isOpen || !currentArtifact || currentArtifact.slides.length <= 1) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        setCurrentSlideIndex((prev) => Math.min(currentArtifact.slides.length - 1, prev + 1));
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        setCurrentSlideIndex((prev) => Math.max(0, prev - 1));
      } else if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentArtifact, isFullscreen]);

  if (!isOpen) return null;

  const handleCopyContent = async () => {
    if (!currentArtifact) return;
    try {
      await navigator.clipboard.writeText(currentArtifact.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const handleDownload = () => {
    if (!currentArtifact) return;
    const blob = new Blob([currentArtifact.content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = currentArtifact.filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    return `${(bytes / 1024).toFixed(1)} KB`;
  };

  const totalSlides = currentArtifact?.slides?.length || 1;
  const currentSlideContent = currentArtifact?.slides?.[currentSlideIndex] || currentArtifact?.content || '';

  return (
    <div
      className={`fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex justify-end animate-in fade-in duration-200 ${
        isFullscreen ? 'p-0' : ''
      }`}
      onClick={onClose}
    >
      <div
        className={`bg-card border-border h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-250 select-text ${
          isFullscreen ? 'w-full max-w-full rounded-none border-none' : 'w-full max-w-4xl border-l'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-3.5 sm:p-4 border-b border-border flex items-center justify-between bg-muted/30 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-semibold truncate flex items-center gap-2">
                <span>{currentArtifact?.title || t('artifactsDrawerTitle')}</span>
                {totalSlides > 1 && (
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-600 dark:text-purple-300 font-medium shrink-0">
                    Slide {currentSlideIndex + 1} / {totalSlides}
                  </span>
                )}
              </h3>
              <p className="text-[11px] text-muted-foreground truncate">
                {currentArtifact?.summary || t('artifactsDrawerDesc')}
              </p>
            </div>
          </div>

          {/* Action Bar */}
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            {currentArtifact && (
              <>
                <button
                  onClick={handleCopyContent}
                  title="Copy markdown"
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors cursor-pointer"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                </button>
                <button
                  onClick={handleDownload}
                  title="Download .md"
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                </button>
              </>
            )}
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors cursor-pointer hidden sm:inline-flex"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Artifacts Tab Switcher (if multiple artifacts in this session) */}
        {artifacts.length > 1 && (
          <div className="flex items-center gap-1.5 px-4 py-2 border-b border-border bg-card/60 overflow-x-auto shrink-0">
            {artifacts.map((art) => (
              <button
                key={art.filename}
                onClick={() => setSelectedFilename(art.filename)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer ${
                  selectedFilename === art.filename
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'bg-secondary text-secondary-foreground hover:bg-accent'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span className="truncate max-w-[160px]">{art.title}</span>
                {art.slideCount > 1 && (
                  <span className="text-[10px] opacity-80 font-mono">({art.slideCount})</span>
                )}
              </button>
            ))}
          </div>
        )}

        {/* Artifact Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {loadingList || loadingDetail ? (
            <div className="py-24 flex flex-col items-center justify-center text-muted-foreground gap-2">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <span className="text-xs">{t('loadingArtifact')}</span>
            </div>
          ) : !currentArtifact ? (
            <div className="py-24 text-center text-xs text-muted-foreground border border-dashed border-border rounded-2xl p-6">
              <Sparkles className="w-8 h-8 opacity-40 mx-auto mb-2 text-purple-400" />
              <p className="font-medium text-foreground/80">{t('noArtifactsInSession')}</p>
              <p className="text-[11px] mt-1">{t('noArtifactsHint')}</p>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto space-y-4">
              {/* Slide Presentation Mode Container */}
              <div className="border border-border/80 rounded-2xl p-4 sm:p-7 bg-card/90 shadow-sm transition-all relative">
                <MarkdownContent
                  content={currentSlideContent}
                  onFileClick={onFileClick}
                />
              </div>

              {/* Multi-Slide Navigation Controls */}
              {totalSlides > 1 && (
                <div className="sticky bottom-2 z-10 flex items-center justify-between bg-card/95 backdrop-blur-md border border-border rounded-xl p-2.5 shadow-lg">
                  <button
                    onClick={() => setCurrentSlideIndex((prev) => Math.max(0, prev - 1))}
                    disabled={currentSlideIndex === 0}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-secondary hover:bg-accent text-secondary-foreground disabled:opacity-40 flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>{t('prevSlide')}</span>
                  </button>

                  <div className="flex items-center gap-1.5">
                    {Array.from({ length: totalSlides }).map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => setCurrentSlideIndex(idx)}
                        className={`h-2 rounded-full transition-all cursor-pointer ${
                          idx === currentSlideIndex
                            ? 'w-6 bg-primary'
                            : 'w-2 bg-muted-foreground/30 hover:bg-muted-foreground/60'
                        }`}
                        title={`Go to Slide ${idx + 1}`}
                      />
                    ))}
                  </div>

                  <button
                    onClick={() =>
                      setCurrentSlideIndex((prev) => Math.min(totalSlides - 1, prev + 1))
                    }
                    disabled={currentSlideIndex === totalSlides - 1}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-secondary hover:bg-accent text-secondary-foreground disabled:opacity-40 flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <span>{t('nextSlide')}</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
