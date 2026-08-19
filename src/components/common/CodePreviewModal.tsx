import { useEffect, useRef, useState, useCallback } from 'react';
import {
  X,
  FileText,
  Copy,
  Download,
  LinkIcon,
  AlertTriangle,
  Loader2,
  Hash,
  Check
} from 'lucide-react';
import { authFetch } from '@/lib/api';
import { useLanguage } from '@/context/LanguageContext';

interface FileContentResult {
  path: string;
  name: string;
  extension: string;
  content: string;
  size: number;
  isBinary: boolean;
  truncated: boolean;
  totalLines: number;
}

interface CodePreviewModalProps {
  isOpen: boolean;
  filePath: string;
  startLine?: number;
  endLine?: number;
  workspace?: string;
  onClose: () => void;
  onInsertReference?: (refText: string) => void;
}

/**
 * CodePreviewModal - Universal Code & Text Inspector Modal for AngryUI
 * Phase 2 P1-1: Displays file content with line numbers, syntax highlighting,
 * line range selection, and reference insertion capabilities.
 */
export function CodePreviewModal({
  isOpen,
  filePath,
  startLine,
  endLine,
  workspace,
  onClose,
  onInsertReference
}: CodePreviewModalProps) {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileData, setFileData] = useState<FileContentResult | null>(null);
  const [selectedLines, setSelectedLines] = useState<{ start: number; end: number } | null>(null);
  const [copied, setCopied] = useState(false);
  const codeRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Fetch file content
  useEffect(() => {
    if (!isOpen || !filePath) return;

    const fetchContent = async () => {
      setLoading(true);
      setError(null);
      setFileData(null);

      try {
        const params = new URLSearchParams({ path: filePath });
        if (workspace) params.append('workspace', workspace);

        const response = await authFetch(`/api/workspace/file/content?${params.toString()}`);
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to fetch file content');
        }
        const data: FileContentResult = await response.json();
        setFileData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load file');
      } finally {
        setLoading(false);
      }
    };

    fetchContent();
  }, [isOpen, filePath, workspace]);

  // Auto-scroll to highlighted range
  useEffect(() => {
    if (!scrollRef.current || !startLine || !fileData) return;

    const lineElement = scrollRef.current.querySelector(`[data-line="${startLine}"]`);
    if (lineElement) {
      lineElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [startLine, fileData]);

  // Initialize selected range from props
  useEffect(() => {
    if (startLine !== undefined && endLine !== undefined) {
      setSelectedLines({ start: startLine, end: endLine });
    }
  }, [startLine, endLine]);

  // Handle line number click for selection
  const handleLineClick = useCallback((lineNum: number, event: React.MouseEvent) => {
    if (event.shiftKey && selectedLines) {
      // Extend selection
      setSelectedLines({
        start: Math.min(selectedLines.start, lineNum),
        end: Math.max(selectedLines.end, lineNum)
      });
    } else {
      // Single line or new selection
      setSelectedLines({ start: lineNum, end: lineNum });
    }
  }, [selectedLines]);

  // Format file size
  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Get relative path
  const getRelativePath = (fullPath: string, ws?: string): string => {
    if (!ws) return fullPath;
    return fullPath.replace(ws, '').replace(/^\//, '') || fullPath;
  };

  // Copy code to clipboard
  const handleCopy = async () => {
    if (!fileData) return;
    
    const lines = fileData.content.split('\n');
    const contentToCopy = selectedLines
      ? lines.slice(selectedLines.start - 1, selectedLines.end).join('\n')
      : fileData.content;
    
    try {
      await navigator.clipboard.writeText(contentToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Download file
  const handleDownload = () => {
    if (!fileData) return;
    
    const blob = new Blob([fileData.content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileData.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Insert reference
  const handleInsertReference = () => {
    if (!onInsertReference || !fileData) return;
    
    const refText = selectedLines
      ? `@${fileData.path}#L${selectedLines.start}-L${selectedLines.end}`
      : `@${fileData.path}`;
    
    onInsertReference(refText);
    onClose();
  };

  // Check if line is in highlight range
  const isInHighlightRange = (lineNum: number): boolean => {
    if (startLine === undefined || endLine === undefined) return false;
    return lineNum >= startLine && lineNum <= endLine;
  };

  // Check if line is selected
  const isSelected = (lineNum: number): boolean => {
    if (!selectedLines) return false;
    return lineNum >= selectedLines.start && lineNum <= selectedLines.end;
  };

  // Render code content with basic syntax highlighting
  const renderCode = () => {
    if (!fileData || !fileData.content) return null;
    
    const lines = fileData.content.split('\n');
    
    return (
      <div ref={scrollRef} className="flex overflow-auto max-h-[60vh]">
        {/* Line numbers gutter */}
        <div className="flex-shrink-0 select-none bg-muted/30 border-r border-border">
          {lines.map((_, index) => {
            const lineNum = index + 1;
            const isActive = isInHighlightRange(lineNum);
            const isSel = isSelected(lineNum);
            
            return (
              <div
                key={lineNum}
                data-line={lineNum}
                onClick={(e) => handleLineClick(lineNum, e)}
                className={`
                  px-3 py-0.5 text-right text-xs font-mono leading-6 cursor-pointer transition-colors
                  ${isActive ? 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400' : ''}
                  ${isSel ? 'bg-primary/20 text-primary' : ''}
                  ${!isActive && !isSel ? 'text-muted-foreground hover:bg-accent' : ''}
                `}
                title={`Line ${lineNum}${isSel ? ` (selected: ${selectedLines?.start}-${selectedLines?.end})` : ''}`}
              >
                {lineNum}
              </div>
            );
          })}
        </div>
        
        {/* Code content */}
        <div ref={codeRef} className="flex-1 overflow-x-auto bg-background">
          <pre className="p-4 m-0 text-sm font-mono leading-6">
            <code>
              {lines.map((line, index) => {
                const lineNum = index + 1;
                const isActive = isInHighlightRange(lineNum);
                const isSel = isSelected(lineNum);
                
                return (
                  <div
                    key={lineNum}
                    className={`
                      px-2 -ml-2 whitespace-pre
                      ${isActive ? 'bg-yellow-500/10' : ''}
                      ${isSel ? 'bg-primary/10' : ''}
                      ${isActive || isSel ? 'rounded' : ''}
                    `}
                  >
                    {line || ' '}
                  </div>
                );
              })}
            </code>
          </pre>
        </div>
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-card text-card-foreground border border-border rounded-xl shadow-xl w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-gradient-to-r from-primary/5 to-transparent">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 bg-primary/10 text-primary rounded-lg flex-shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-semibold truncate">
                {fileData?.name || 'Loading...'}
              </h2>
              {fileData && (
                <p className="text-xs text-muted-foreground truncate">
                  {getRelativePath(fileData.path, workspace)}
                </p>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* File size */}
            {fileData && (
              <span className="text-xs text-muted-foreground px-2 py-1 bg-muted rounded">
                {formatSize(fileData.size)}
              </span>
            )}
            
            {/* Total lines badge */}
            {fileData && fileData.totalLines > 0 && (
              <span className="text-xs text-muted-foreground px-2 py-1 bg-muted rounded flex items-center gap-1">
                <Hash className="w-3 h-3" />
                {fileData.totalLines} {t('linesCount')}
              </span>
            )}
            
            {/* Copy Code button */}
            <button
              onClick={handleCopy}
              disabled={!fileData || fileData.isBinary}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
              title={t('copyCode')}
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-500" />
                  <span className="text-xs text-emerald-500 font-medium">{t('codeCopied')}</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span className="text-xs hidden sm:inline">{t('copyCode')}</span>
                </>
              )}
            </button>
            
            {/* Insert Reference button */}
            {onInsertReference && (
              <button
                onClick={handleInsertReference}
                disabled={!fileData || fileData.isBinary}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                title={t('insertReference')}
              >
                <LinkIcon className="w-4 h-4 text-primary" />
                <span className="text-xs hidden sm:inline">{t('insertReference')}</span>
              </button>
            )}
            
            {/* Download button */}
            <button
              onClick={handleDownload}
              disabled={!fileData || fileData.isBinary}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title={t('downloadFile')}
            >
              <Download className="w-4 h-4" />
            </button>
            
            {/* Close button */}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent cursor-pointer transition-colors"
              aria-label="Close code preview"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {loading && (
            <div className="flex items-center justify-center h-48">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
              <span className="ml-3 text-muted-foreground">{t('loadingFile')}</span>
            </div>
          )}
          
          {error && (
            <div className="flex flex-col items-center justify-center h-48 text-center px-4">
              <AlertTriangle className="w-10 h-10 text-destructive mb-3" />
              <p className="text-destructive font-medium">{error}</p>
            </div>
          )}
          
          {fileData && fileData.isBinary && (
            <div className="flex flex-col items-center justify-center h-48 text-center px-4">
              <AlertTriangle className="w-10 h-10 text-yellow-500 mb-3" />
              <p className="text-yellow-600 dark:text-yellow-400 font-medium">{t('binaryFileWarning')}</p>
              <p className="text-sm text-muted-foreground mt-1">
                {fileData.name} ({formatSize(fileData.size)})
              </p>
            </div>
          )}
          
          {!loading && !error && fileData && !fileData.isBinary && renderCode()}
          
          {fileData && fileData.truncated && (
            <div className="px-4 py-2 border-t border-border bg-muted/30 text-xs text-muted-foreground">
              ⚠️ {t('fileTruncatedWarning')}
            </div>
          )}
          
          {/* Selection info bar */}
          {selectedLines && (
            <div className="px-4 py-2 border-t border-border bg-muted/30 text-xs text-muted-foreground flex items-center gap-2">
              <span>{t('selectedRange')}</span>
              <code className="bg-muted px-1.5 py-0.5 rounded font-mono font-semibold text-primary">
                L{selectedLines.start} - L{selectedLines.end}
              </code>
              <span>({selectedLines.end - selectedLines.start + 1} {t('linesCount')})</span>
              <button
                onClick={() => setSelectedLines(null)}
                className="ml-auto text-muted-foreground hover:text-foreground underline cursor-pointer text-xs"
              >
                {t('clearSelection')}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
