import { useState } from 'react';
import { ThoughtAccordion } from './ThoughtAccordion';
import { ToolCard } from './ToolCard';
import { FileText, FileCode, FileSpreadsheet, ExternalLink, X, ZoomIn } from 'lucide-react';

type Message =
  | { id: string; role: 'user'; text: string }
  | { id: string; role: 'assistant'; text: string; thought?: string }
  | { id: string; role: 'tool'; name: string; input: any; output: string };

interface ParsedAttachment {
  path: string;
  url: string;
  filename: string;
  isImage: boolean;
}

const IMAGE_EXTS = ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg', '.bmp', '.ico'];

export function resolveMediaUrl(rawPathOrUrl: string): { url: string; isImage: boolean; filename: string } {
  let clean = rawPathOrUrl.trim();
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

function parseUserAttachments(rawText: string): { attachments: ParsedAttachment[]; cleanText: string } {
  const attachments: ParsedAttachment[] = [];
  const lines = rawText.split('\n');
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

// Parse markdown images inside assistant messages
function renderAssistantContent(
  text: string,
  onImageClick: (url: string) => void
) {
  // Regex to split on markdown images ![alt](url)
  const parts = text.split(/(!\[.*?\]\(.*?\))/g);

  return parts.map((part, idx) => {
    const match = part.match(/^!\[(.*?)\]\((.*?)\)$/);
    if (match) {
      const alt = match[1] || 'Generated image';
      const rawUrl = match[2];
      const media = resolveMediaUrl(rawUrl);

      return (
        <div key={idx} className="my-2 group relative inline-block max-w-md">
          <img
            src={media.url}
            alt={alt}
            onClick={() => onImageClick(media.url)}
            className="rounded-xl border border-border/80 max-h-72 max-w-full object-contain cursor-zoom-in hover:opacity-95 transition-opacity shadow-sm bg-muted/40"
          />
          <div className="flex items-center gap-1 text-[11px] text-muted-foreground mt-1 px-1">
            <ZoomIn className="w-3 h-3 shrink-0" />
            <span className="truncate">{alt}</span>
          </div>
        </div>
      );
    }

    return <span key={idx}>{part}</span>;
  });
}

export function MessageItem({ msg }: { msg: Message }) {
  const { t } = useLanguage();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  if (msg.role === 'user') {
    const { attachments, cleanText } = parseUserAttachments(msg.text);

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
                  <a
                    key={i}
                    href={att.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 bg-primary-foreground/15 hover:bg-primary-foreground/25 border border-primary-foreground/30 px-2.5 py-1.5 rounded-lg text-xs transition-colors shadow-2xs"
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
                  </a>
                )
              )}
            </div>
          )}

          {/* Clean User Message Body */}
          <div className="whitespace-pre-wrap leading-relaxed">{cleanText || msg.text}</div>
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
        <div className="whitespace-pre-wrap leading-relaxed">
          {renderAssistantContent(msg.text, (url) => setSelectedImage(url))}
        </div>
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
