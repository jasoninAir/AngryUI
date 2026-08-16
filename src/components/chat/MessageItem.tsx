import { useState } from 'react';
import { ThoughtAccordion } from './ThoughtAccordion';
import { ToolCard } from './ToolCard';
import { FileText, FileCode, FileSpreadsheet, ExternalLink, X } from 'lucide-react';

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

function parseUserAttachments(rawText: string): { attachments: ParsedAttachment[]; cleanText: string } {
  const attachments: ParsedAttachment[] = [];
  const lines = rawText.split('\n');
  const remainingLines: string[] = [];

  for (const line of lines) {
    const match = line.match(/^\[User Attached File:\s*(.*?)(?:\s*\|\s*(.*?))?\]$/);
    if (match) {
      const filePath = match[1].trim();
      const url = match[2]?.trim() || filePath;
      const filename = filePath.split('/').pop() || 'attachment';
      const ext = (filename.includes('.') ? '.' + filename.split('.').pop() : '').toLowerCase();
      const isImage = IMAGE_EXTS.includes(ext);

      attachments.push({
        path: filePath,
        url,
        filename,
        isImage
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

export function MessageItem({ msg }: { msg: Message }) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  if (msg.role === 'user') {
    const { attachments, cleanText } = parseUserAttachments(msg.text);

    return (
      <div className="flex flex-col items-end gap-1.5 my-1">
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
                      className="max-h-48 max-w-xs rounded-lg border border-primary-foreground/30 object-cover cursor-pointer hover:opacity-95 transition-opacity"
                    />
                    <span className="text-[10px] opacity-80 truncate block mt-0.5 max-w-[200px]" title={att.filename}>
                      {att.filename}
                    </span>
                  </div>
                ) : (
                  <a
                    key={i}
                    href={att.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 bg-primary-foreground/15 hover:bg-primary-foreground/25 border border-primary-foreground/30 px-2.5 py-1.5 rounded-lg text-xs transition-colors"
                  >
                    {att.filename.endsWith('.csv') || att.filename.endsWith('.xlsx') ? (
                      <FileSpreadsheet className="w-4 h-4" />
                    ) : att.filename.endsWith('.ts') || att.filename.endsWith('.py') ? (
                      <FileCode className="w-4 h-4" />
                    ) : (
                      <FileText className="w-4 h-4" />
                    )}
                    <span className="max-w-[160px] truncate">{att.filename}</span>
                    <ExternalLink className="w-3 h-3 opacity-70" />
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
            className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 cursor-zoom-out"
            onClick={() => setSelectedImage(null)}
          >
            <div className="relative max-w-4xl max-h-[90vh]">
              <img src={selectedImage} alt="Full view" className="max-w-full max-h-[90vh] rounded-lg shadow-2xl" />
              <button
                onClick={() => setSelectedImage(null)}
                className="absolute top-2 right-2 p-1.5 bg-black/60 text-white rounded-full hover:bg-black/80"
              >
                <X className="w-4 h-4" />
              </button>
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
    <div className="flex justify-start my-1">
      <div className="max-w-[85%] rounded-2xl p-3.5 bg-secondary text-secondary-foreground shadow-2xs text-sm">
        {msg.thought && <ThoughtAccordion thought={msg.thought} />}
        <div className="whitespace-pre-wrap leading-relaxed">{msg.text}</div>
      </div>
    </div>
  );
}
