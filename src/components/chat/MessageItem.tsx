import { useState } from 'react';
import { ThoughtAccordion } from './ThoughtAccordion';
import { ToolCard } from './ToolCard';
import { MarkdownContent } from './MarkdownContent';
import { FileText, FileCode, FileSpreadsheet, ExternalLink, ZoomIn, ShieldCheck } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';

type Message =
  | { id: string; role: 'user'; text?: string }
  | { id: string; role: 'assistant'; text?: string; thought?: string }
  | { id: string; role: 'tool'; name: string; input: any; output: string };

interface ParsedAttachment {
  path: string;
  url: string;
  filename: string;
  isImage: boolean;
}

const IMAGE_EXTS = ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg', '.bmp', '.ico'];

export function resolveMediaUrl(rawPathOrUrl: string): { url: string; isImage: boolean; filename: string } {
  let clean = (rawPathOrUrl || '').trim();
  if (clean.startsWith('file://')) {
    clean = clean.replace(/^file:\/\//, '');
  }

  const filename = clean.split('/').pop()?.split('?')[0] || 'attachment';
  const ext = (filename.includes('.') ? '.' + filename.split('.').pop() : '').toLowerCase();
  const isImage = IMAGE_EXTS.includes(ext);

  // If already a browser accessible URL
  if (
    clean.startsWith('/api/') ||
    clean.startsWith('http://') ||
    clean.startsWith('https://') ||
    clean.startsWith('data:image/') ||
    clean.startsWith('blob:')
  ) {
    return { url: clean, isImage, filename };
  }

  // Local filesystem absolute path -> serve via /api/file-preview
  return {
    url: `/api/file-preview?path=${encodeURIComponent(clean)}`,
    isImage,
    filename
  };
}

function parseUserAttachments(rawText: string = ''): { attachments: ParsedAttachment[]; cleanText: string } {
  const attachments: ParsedAttachment[] = [];
  const lines = (rawText || '').split('\n');
  const remainingLines: string[] = [];

  for (const line of lines) {
    // Match [User Attached File: ...], [Attached File: ...], or Markdown images ![alt](url)
    const attachMatch = line.match(/^\[(?:User )?Attached (?:File|Image):\s*(.*?)(?:\s*\|\s*(.*?))?\]$/i);
    const mdImageMatch = line.match(/^!\[(.*?)\]\((.*?)\)$/);

    if (attachMatch) {
      const filePath = attachMatch[1].trim();
      const rawUrl = attachMatch[2]?.trim() || filePath;
      const media = resolveMediaUrl(rawUrl);

      attachments.push({
        path: filePath,
        url: media.url,
        filename: media.filename,
        isImage: media.isImage
      });
    } else if (mdImageMatch) {
      const rawUrl = mdImageMatch[2].trim();
      const media = resolveMediaUrl(rawUrl);
      attachments.push({
        path: rawUrl,
        url: media.url,
        filename: mdImageMatch[1] || media.filename,
        isImage: true
      });
    } else {
      remainingLines.push(line);
    }
  }

  return {
    attachments,
    cleanText: remainingLines.join('\n').trim()
  };
}



interface AuthMessageInfo {
  isAuth: boolean;
  type: 'once' | 'whitelist' | 'temporary';
  command?: string;
}

export function parseAuthorizationMessage(text: string = ''): AuthMessageInfo | null {
  const clean = text.trim();
  if (!clean) return null;

  // 1. Temporary 10 min whitelist
  const tempMatch =
    clean.match(/已临时允许(?:命令\s*)?(.*?)(?:\s*\(10分钟|\s*命中10分钟)/) ||
    clean.match(/temporarily allowed\s*(.*?)\s*for 10 min/i) ||
    clean.match(/10分間一時的に許可/i);

  if (tempMatch || clean.includes('临时允许') || clean.includes('10分钟临时白名单') || clean.includes('temporarily allowed')) {
    const cmd = tempMatch ? tempMatch[1]?.trim() : undefined;
    return { isAuth: true, type: 'temporary', command: cmd };
  }

  // 2. Allow once
  if (
    clean.includes('允许执行本次命令') ||
    clean.includes('允许执行当前命令') ||
    clean.includes('允许本次授权') ||
    clean.includes('Authorization granted') ||
    clean.includes('Authorization Granted') ||
    clean.includes('Permission Granted') ||
    clean.includes('今回のコマンド実行を許可') ||
    clean.includes('Ejecución permitida')
  ) {
    return { isAuth: true, type: 'once' };
  }

  // 3. Add to permanent whitelist
  const whitelistMatch =
    clean.match(/已将命令\s*(.*?)\s*加入白名单/) ||
    clean.match(/added command\s*(.*?)\s*to (?:permission )?whitelist/i) ||
    clean.match(/コマンド\s*(.*?)\s*を(?:許可ルール|ホワイトリスト)に追加/i) ||
    clean.match(/Comando\s*(.*?)\s*añadido a las reglas/i);

  if (whitelistMatch || clean.includes('加入白名单') || clean.includes('whitelist') || clean.includes('ホワイトリスト')) {
    const cmd = whitelistMatch ? whitelistMatch[1]?.trim() : undefined;
    return { isAuth: true, type: 'whitelist', command: cmd };
  }

  return null;
}

export function MessageItem({
  msg,
  onFileClick
}: {
  msg: Message;
  onFileClick?: (path: string, startLine?: number, endLine?: number) => void;
}) {
  const { t } = useLanguage();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  if (msg.role === 'user') {
    const rawText = msg.text || '';
    const authInfo = parseAuthorizationMessage(rawText);

    // Render authorization confirmations as a centered capsule badge
    if (authInfo) {
      const label =
        authInfo.type === 'temporary'
          ? authInfo.command
            ? `${t('authApprovedTemporary')}: ${authInfo.command}`
            : t('authApprovedTemporary')
          : authInfo.type === 'whitelist'
          ? authInfo.command
            ? `${t('authAddedToWhitelist')}: ${authInfo.command}`
            : t('authAddedToWhitelist')
          : t('authGrantedOnce');

      return (
        <div className="flex justify-center items-center my-3 w-full animate-in fade-in zoom-in-95 duration-200 select-none">
          <div className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-xs font-medium shadow-2xs ${
            authInfo.type === 'temporary'
              ? 'bg-sky-500/10 dark:bg-sky-950/40 border-sky-500/30 text-sky-700 dark:text-sky-300'
              : 'bg-emerald-500/10 dark:bg-emerald-950/40 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
          }`}>
            <ShieldCheck className={`w-3.5 h-3.5 shrink-0 ${
              authInfo.type === 'temporary' ? 'text-sky-600 dark:text-sky-400' : 'text-emerald-600 dark:text-emerald-400'
            }`} />
            <span className="truncate max-w-md font-sans">{label}</span>
          </div>
        </div>
      );
    }

    const { attachments, cleanText } = parseUserAttachments(rawText);

    return (
      <div className="flex flex-col items-end gap-1.5 my-1.5">
        <div className="max-w-[85%] rounded-2xl p-3.5 bg-primary text-primary-foreground shadow-xs text-sm">
          {/* Render Attached Media / Images */}
          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2 pb-2 border-b border-primary-foreground/20">
              {attachments.map((att, i) =>
                att.isImage ? (
                  <div key={i} className="relative group">
                    <img
                      src={att.url}
                      alt={att.filename}
                      onClick={() => setSelectedImage(att.url)}
                      className="max-h-48 max-w-xs rounded-lg border border-primary-foreground/30 object-cover cursor-zoom-in hover:opacity-95 transition-opacity shadow-sm bg-black/10"
                    />
                    <span
                      className="text-[10px] opacity-85 truncate block mt-0.5 max-w-[200px] font-mono"
                      title={att.filename}
                    >
                      {att.filename}
                    </span>
                  </div>
                ) : (
                  <button
                    key={i}
                    onClick={() => onFileClick?.(att.path)}
                    className="flex items-center gap-1.5 bg-primary-foreground/15 hover:bg-primary-foreground/25 border border-primary-foreground/30 px-2.5 py-1.5 rounded-lg text-xs transition-colors shadow-2xs text-left"
                  >
                    {att.filename.endsWith('.csv') || att.filename.endsWith('.xlsx') ? (
                      <FileSpreadsheet className="w-4 h-4 shrink-0" />
                    ) : att.filename.endsWith('.ts') || att.filename.endsWith('.py') ? (
                      <FileCode className="w-4 h-4 shrink-0" />
                    ) : (
                      <FileText className="w-4 h-4 shrink-0" />
                    )}
                    <span className="max-w-[160px] truncate font-medium">{att.filename}</span>
                    <ExternalLink className="w-3 h-3 opacity-70 shrink-0" />
                  </button>
                )
              )}
            </div>
          )}

          {/* Clean User Message Body */}
          <div className="whitespace-pre-wrap leading-relaxed">{cleanText || rawText}</div>
        </div>

        {/* Lightbox Modal for enlarged image view */}
        {selectedImage && (
          <div
            className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xs flex items-center justify-center p-4 cursor-zoom-out animate-in fade-in duration-150"
            onClick={() => setSelectedImage(null)}
          >
            <div className="relative max-w-5xl max-h-[92vh] flex flex-col items-center">
              <img
                src={selectedImage}
                alt="Full preview"
                className="max-w-full max-h-[85vh] rounded-xl shadow-2xl object-contain border border-white/10"
              />
              <div className="flex items-center justify-between w-full mt-2 px-2 text-xs text-white/80">
                <span className="truncate">{selectedImage.split('/').pop()?.split('?')[0]}</span>
                <button
                  onClick={() => setSelectedImage(null)}
                  className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded-md text-white transition-colors cursor-pointer"
                >
                  {t('closeLightbox')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (msg.role === 'tool') {
    return <ToolCard name={msg.name} input={msg.input} output={msg.output} />;
  }

  return (
    <div className="flex justify-start my-1.5">
      <div className="max-w-[85%] rounded-2xl p-3.5 bg-secondary text-secondary-foreground shadow-2xs text-sm">
        {msg.thought && <ThoughtAccordion thought={msg.thought} />}
        <MarkdownContent
          content={msg.text || ''}
          onImageClick={(url) => setSelectedImage(url)}
          onFileClick={onFileClick}
        />
      </div>

      {/* Lightbox Modal for Assistant Images */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xs flex items-center justify-center p-4 cursor-zoom-out animate-in fade-in duration-150"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-5xl max-h-[92vh] flex flex-col items-center">
            <img
              src={selectedImage}
              alt="Full preview"
              className="max-w-full max-h-[85vh] rounded-xl shadow-2xl object-contain border border-white/10"
            />
            <div className="flex items-center justify-between w-full mt-2 px-2 text-xs text-white/80">
              <span className="truncate">{selectedImage.split('/').pop()?.split('?')[0]}</span>
              <button
                onClick={() => setSelectedImage(null)}
                className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded-md text-white transition-colors cursor-pointer"
              >
                {t('closeLightbox')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
