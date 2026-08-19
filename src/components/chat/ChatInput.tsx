import {
  useState,
  useRef,
  useEffect,
  KeyboardEvent,
  ChangeEvent,
  ClipboardEvent,
  DragEvent,
  forwardRef,
  useImperativeHandle
} from 'react';
import { Send, Square, Paperclip, X, FileText, Loader2, Camera } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { generateUUID } from '@/lib/uuid';
import { getStoredToken } from '@/lib/auth';

export interface ChatInputHandle {
  insertSnippet: (snippet: string) => void;
  focus: () => void;
}

export interface StagedAttachment {
  id: string;
  file: File;
  name: string;
  size: number;
  type: string;
  previewUrl?: string;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

function extractClipboardFiles(clipboardData: DataTransfer | null): File[] {
  if (!clipboardData) return [];
  const files: File[] = [];

  // 1. Inspect DataTransferItemList (standard for screenshots & pasted images)
  if (clipboardData.items && clipboardData.items.length > 0) {
    for (let i = 0; i < clipboardData.items.length; i++) {
      const item = clipboardData.items[i];
      if (item.kind === 'file') {
        const blob = item.getAsFile();
        if (blob) {
          let name = blob.name;
          if (!name || name === 'image.png' || name === 'blob') {
            const ext = (blob.type.split('/')[1] || 'png').replace('+xml', '');
            name = `screenshot_${Date.now()}.${ext}`;
          }
          files.push(new File([blob], name, { type: blob.type || 'image/png' }));
        }
      }
    }
  }

  // 2. Fallback to DataTransfer.files
  if (files.length === 0 && clipboardData.files && clipboardData.files.length > 0) {
    for (let i = 0; i < clipboardData.files.length; i++) {
      files.push(clipboardData.files[i]);
    }
  }

  return files;
}

export const ChatInput = forwardRef<
  ChatInputHandle,
  {
    conversationId?: string;
    onSend: (text: string) => void;
    onCancel: () => void;
    status: 'IDLE' | 'RUNNING' | 'PAUSED' | 'WAITING_INPUT';
  }
>(function ChatInput({ conversationId, onSend, onCancel, status }, ref) {
  const { t } = useLanguage();
  const [text, setText] = useState('');
  const [stagedFiles, setStagedFiles] = useState<StagedAttachment[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useImperativeHandle(ref, () => ({
    insertSnippet: (snippet: string) => {
      setText((prev) => {
        const needsSpace = prev.length > 0 && !prev.endsWith(' ') && !prev.endsWith('\n');
        return prev + (needsSpace ? ' ' : '') + snippet + ' ';
      });
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 50);
    },
    focus: () => {
      textareaRef.current?.focus();
    }
  }));

  // Auto-grow textarea height dynamically up to max 40vh of page height
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = 'auto';
    const maxHeight = Math.floor(window.innerHeight * 0.4);
    const scrollHeight = textarea.scrollHeight;

    if (scrollHeight > maxHeight) {
      textarea.style.height = `${maxHeight}px`;
      textarea.style.overflowY = 'auto';
    } else {
      textarea.style.height = `${Math.max(44, scrollHeight)}px`;
      textarea.style.overflowY = 'hidden';
    }
  }, [text]);

  const addFiles = (files: FileList | File[]) => {
    const newStaged: StagedAttachment[] = Array.from(files).map((f) => {
      const isImg = f.type.startsWith('image/');
      return {
        id: generateUUID(),
        file: f,
        name: f.name,
        size: f.size,
        type: f.type,
        previewUrl: isImg ? URL.createObjectURL(f) : undefined
      };
    });
    setStagedFiles((prev) => [...prev, ...newStaged]);
  };

  const removeFile = (id: string) => {
    setStagedFiles((prev) => {
      const item = prev.find((f) => f.id === id);
      if (item?.previewUrl) {
        URL.revokeObjectURL(item.previewUrl);
      }
      return prev.filter((f) => f.id !== id);
    });
  };

  // Global window paste listener for capturing screenshot paste from anywhere on the page
  useEffect(() => {
    const handleGlobalPaste = (e: globalThis.ClipboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && target !== textareaRef.current && (target.tagName === 'INPUT' || target.isContentEditable)) {
        return;
      }
      const files = extractClipboardFiles(e.clipboardData);
      if (files.length > 0) {
        e.preventDefault();
        addFiles(files);
      }
      // iOS Safari may deny clipboard file access — let default paste proceed for text
      // User can use paperclip button as fallback for images
    };

    window.addEventListener('paste', handleGlobalPaste);
    return () => window.removeEventListener('paste', handleGlobalPaste);
  }, []);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addFiles(e.target.files);
      e.target.value = '';
    }
  };

  // Direct paste on textarea
  const handlePaste = (e: ClipboardEvent<HTMLTextAreaElement>) => {
    const files = extractClipboardFiles(e.clipboardData);
    if (files.length > 0) {
      e.preventDefault();
      addFiles(files);
    }
    // iOS Safari may deny clipboard file access — let default paste proceed for text
    // User can use paperclip button as fallback for images
  };

  // Drag and drop handlers
  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFiles(e.dataTransfer.files);
    }
  };

  const handleSubmit = async () => {
    if ((!text.trim() && stagedFiles.length === 0) || status === 'RUNNING' || isUploading) return;

    let promptText = text.trim();

    if (stagedFiles.length > 0) {
      setIsUploading(true);
      try {
        const payloadFiles = await Promise.all(
          stagedFiles.map(async (staged) => ({
            name: staged.name,
            type: staged.type,
            data: await fileToBase64(staged.file)
          }))
        );

        const token = getStoredToken();
        const hdrs: Record<string, string> = { 'Content-Type': 'application/json' };
        if (token) hdrs['Authorization'] = `Bearer ${token}`;
        const res = await fetch('/api/upload', {
          method: 'POST',
          headers: hdrs,
          body: JSON.stringify({
            conversationId: conversationId || 'default',
            files: payloadFiles
          })
        });

        if (res.ok) {
          const data = await res.json();
          const attachmentsHeader = (data.files || [])
            .map((f: any) => `[User Attached File: ${f.path} | ${f.url}]`)
            .join('\n');

          promptText = attachmentsHeader ? `${attachmentsHeader}\n\n${promptText}` : promptText;
        }
      } catch (err) {
        console.error('Failed to upload attachments:', err);
      } finally {
        setIsUploading(false);
        // Clean up object URLs
        stagedFiles.forEach((f) => {
          if (f.previewUrl) URL.revokeObjectURL(f.previewUrl);
        });
        setStagedFiles([]);
      }
    }

    if (promptText.trim()) {
      onSend(promptText.trim());
      setText('');
    }
  };

  const handleKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`border-t border-border bg-card/60 p-3 flex flex-col gap-2 transition-colors ${
        isDragging ? 'bg-primary/5 border-primary/40 ring-1 ring-primary/40' : ''
      }`}
    >
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,.pdf,.txt,.md,.json,.csv,.yaml,.yml,.docx,.xlsx,.tar,.zip"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Staged Attachments Preview Bar */}
      {stagedFiles.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 pb-1.5 border-b border-border/50">
          {stagedFiles.map((f) => (
            <div
              key={f.id}
              className="group relative flex items-center gap-2 bg-background border border-border px-2.5 py-1.5 rounded-lg shadow-2xs text-xs"
            >
              {f.previewUrl ? (
                <img
                  src={f.previewUrl}
                  alt={f.name}
                  className="w-8 h-8 rounded object-cover border border-border/60 shrink-0"
                />
              ) : (
                <div className="w-8 h-8 rounded bg-muted/80 flex items-center justify-center text-muted-foreground shrink-0">
                  <FileText className="w-4 h-4" />
                </div>
              )}

              <div className="max-w-[140px] truncate">
                <p className="truncate font-medium text-foreground text-[11px]" title={f.name}>
                  {f.name}
                </p>
                <p className="text-[10px] text-muted-foreground font-mono">{formatSize(f.size)}</p>
              </div>

              <button
                type="button"
                onClick={() => removeFile(f.id)}
                className="p-1 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors ml-1 cursor-pointer"
                title={t('removeAttachment')}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
          <span className="text-[10px] text-muted-foreground/70 self-center">
            ({stagedFiles.length} {t('attachmentsReady')})
          </span>
        </div>
      )}

      {/* Main Input Row */}
      <div className="flex items-end gap-2">
        {/* Attachment Button */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          title={t('uploadAttachmentTooltip')}
          className="h-11 w-10 flex items-center justify-center rounded-lg border border-input bg-background text-muted-foreground hover:text-foreground hover:bg-accent transition-colors shrink-0 cursor-pointer"
        >
          <Paperclip className="w-4 h-4" />
        </button>

        {/* Camera Button */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          title={t('takePhoto') || 'Take photo'}
          className="h-11 w-10 flex items-center justify-center rounded-lg border border-input bg-background text-muted-foreground hover:text-foreground hover:bg-accent transition-colors shrink-0 cursor-pointer"
        >
          <Camera className="w-4 h-4" />
        </button>

        {/* Dynamic Textarea */}
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKey}
          onPaste={handlePaste}
          placeholder={t('inputPlaceholder')}
          rows={1}
          aria-label="Chat message input"
          aria-live="polite"
          className="flex-1 resize-none rounded-lg border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground/60 min-h-[44px] max-h-[40vh] leading-relaxed transition-[height] duration-75"
        />

        {/* Send / Stop / Uploading Button */}
        {status === 'RUNNING' ? (
          <button
            onClick={onCancel}
            className="h-11 px-4 rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90 flex items-center gap-1.5 text-xs font-medium transition-colors shrink-0 cursor-pointer"
          >
            <Square className="w-3.5 h-3.5 fill-current" />
            <span>{t('stop')}</span>
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={(!text.trim() && stagedFiles.length === 0) || isUploading}
            className="h-11 px-4 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 flex items-center gap-1.5 text-xs font-medium transition-colors shrink-0 shadow-sm cursor-pointer"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>{t('uploading')}</span>
              </>
            ) : (
              <>
                <Send className="w-3.5 h-3.5" />
                <span>{t('send')}</span>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
});
