import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Copy,
  Check,
  ZoomIn,
  ExternalLink,
  Info,
  Lightbulb,
  AlertTriangle,
  AlertCircle,
  ShieldAlert,
  Code2,
  FileCode,
  MessageSquare
} from 'lucide-react';
import { resolveMediaUrl } from './MessageItem';
import { sanitizeOutputText } from '@/lib/textSanitizer';

interface MarkdownContentProps {
  content: string;
  onImageClick?: (url: string) => void;
  onFileClick?: (path: string, startLine?: number, endLine?: number) => void;
  className?: string;
}

/**
 * Copy button for code blocks
 */
function CodeCopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="flex items-center gap-1 text-[11px] font-medium text-zinc-400 hover:text-zinc-100 bg-zinc-800/80 hover:bg-zinc-700/80 px-2 py-1 rounded-md transition-colors cursor-pointer"
      title="Copy code"
    >
      {copied ? (
        <>
          <Check className="w-3 h-3 text-emerald-400" />
          <span className="text-emerald-400">Copied</span>
        </>
      ) : (
        <>
          <Copy className="w-3 h-3" />
          <span>Copy</span>
        </>
      )}
    </button>
  );
}

/**
 * Format language tag for codeblock header
 */
function formatLanguage(lang: string = ''): string {
  const clean = lang.toLowerCase().trim();
  const map: Record<string, string> = {
    ts: 'TypeScript',
    typescript: 'TypeScript',
    tsx: 'TypeScript (React)',
    js: 'JavaScript',
    javascript: 'JavaScript',
    jsx: 'JavaScript (React)',
    py: 'Python',
    python: 'Python',
    json: 'JSON',
    jsonl: 'JSONL',
    sh: 'Bash',
    bash: 'Bash',
    zsh: 'Zsh',
    shell: 'Shell',
    html: 'HTML',
    css: 'CSS',
    sql: 'SQL',
    yaml: 'YAML',
    yml: 'YAML',
    md: 'Markdown',
    markdown: 'Markdown',
    rust: 'Rust',
    go: 'Go',
    diff: 'Diff'
  };
  return map[clean] || (clean ? clean.toUpperCase() : 'Code');
}

export function MarkdownContent({
  content,
  onImageClick,
  onFileClick,
  className = ''
}: MarkdownContentProps) {
  const navigate = useNavigate();
  const safeContent = useMemo(() => sanitizeOutputText(content || ''), [content]);

  const components = useMemo(
    () => ({
      // Tables
      table({ children }: any) {
        return (
          <div className="my-3 overflow-x-auto rounded-xl border border-border/80 bg-card/60 shadow-2xs">
            <table className="w-full text-left text-xs border-collapse divide-y divide-border">
              {children}
            </table>
          </div>
        );
      },
      thead({ children }: any) {
        return <thead className="bg-muted/80 text-foreground font-semibold divide-y divide-border">{children}</thead>;
      },
      tbody({ children }: any) {
        return <tbody className="divide-y divide-border/40 bg-background/50">{children}</tbody>;
      },
      tr({ children }: any) {
        return <tr className="transition-colors hover:bg-muted/30 even:bg-muted/15">{children}</tr>;
      },
      th({ children, style }: any) {
        return (
          <th
            className="px-3.5 py-2.5 text-xs font-semibold tracking-wider text-muted-foreground uppercase"
            style={style}
          >
            {children}
          </th>
        );
      },
      td({ children, style }: any) {
        return (
          <td className="px-3.5 py-2 text-xs leading-relaxed text-foreground/90 whitespace-normal" style={style}>
            {children}
          </td>
        );
      },

      // Code blocks & Inline code
      code({ node, inline, className: codeClassName, children, ...props }: any) {
        const match = /language-(\w+)/.exec(codeClassName || '');
        const codeText = String(children).replace(/\n$/, '');
        const isMultiLine = codeText.includes('\n');

        if (!inline && (match || isMultiLine)) {
          const lang = match ? match[1] : '';
          return (
            <div className="my-3 rounded-xl overflow-hidden border border-zinc-800 bg-zinc-950 dark:bg-zinc-900 shadow-sm">
              <div className="flex items-center justify-between px-3.5 py-1.5 bg-zinc-900/90 dark:bg-zinc-950/80 border-b border-zinc-800/80 text-xs">
                <div className="flex items-center gap-1.5 text-zinc-400 font-mono text-[11px]">
                  <Code2 className="w-3.5 h-3.5 text-zinc-400" />
                  <span>{formatLanguage(lang)}</span>
                </div>
                <CodeCopyButton text={codeText} />
              </div>
              <div className="p-3.5 overflow-x-auto font-mono text-xs leading-relaxed text-zinc-200 selection:bg-primary/30">
                <pre className="m-0 font-mono bg-transparent">
                  <code className={codeClassName} {...props}>
                    {children}
                  </code>
                </pre>
              </div>
            </div>
          );
        }

        // Inline code
        return (
          <code
            className="font-mono text-[12px] px-1.5 py-0.5 rounded-md bg-muted/80 text-primary border border-border/60 font-medium"
            {...props}
          >
            {children}
          </code>
        );
      },

      // Images
      img({ src, alt }: any) {
        if (!src) return null;
        const media = resolveMediaUrl(src);
        const altText = alt || 'Preview Image';

        return (
          <div className="my-2.5 inline-block max-w-full">
            <div className="relative group inline-block max-w-full overflow-hidden rounded-xl border border-border/80 bg-muted/30 shadow-2xs">
              <img
                src={media.url}
                alt={altText}
                loading="lazy"
                onClick={() => onImageClick?.(media.url)}
                className="max-h-80 max-w-full object-contain cursor-zoom-in transition-all group-hover:scale-[1.01]"
              />
              <div
                onClick={() => onImageClick?.(media.url)}
                className="absolute inset-0 bg-black/0 group-hover:bg-black/15 transition-colors cursor-zoom-in flex items-center justify-center pointer-events-none"
              >
                <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-black/70 backdrop-blur-xs text-white p-1.5 rounded-full shadow-lg">
                  <ZoomIn className="w-4 h-4" />
                </div>
              </div>
            </div>
            {altText && altText !== 'Preview Image' && (
              <div className="flex items-center gap-1 text-[11px] text-muted-foreground mt-1 px-1">
                <ZoomIn className="w-3 h-3 shrink-0" />
                <span className="truncate max-w-md">{altText}</span>
              </div>
            )}
          </div>
        );
      },

      // Blockquotes & GitHub callout alerts
      blockquote({ children }: any) {
        // Find text content inside children to check for [!NOTE], [!TIP], [!WARNING], [!IMPORTANT], [!CAUTION]
        const textContent = String(
          Array.isArray(children)
            ? children.map((c) => (typeof c === 'string' ? c : c?.props?.children || '')).join('')
            : children?.props?.children || children || ''
        );

        if (textContent.includes('[!NOTE]')) {
          return (
            <div className="my-2.5 p-3 rounded-xl border border-blue-500/30 bg-blue-500/10 text-blue-900 dark:text-blue-200 text-xs">
              <div className="flex items-center gap-1.5 font-semibold text-blue-600 dark:text-blue-400 mb-1">
                <Info className="w-4 h-4" />
                <span>Note</span>
              </div>
              <div className="text-foreground/90">{children}</div>
            </div>
          );
        }
        if (textContent.includes('[!TIP]')) {
          return (
            <div className="my-2.5 p-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-900 dark:text-emerald-200 text-xs">
              <div className="flex items-center gap-1.5 font-semibold text-emerald-600 dark:text-emerald-400 mb-1">
                <Lightbulb className="w-4 h-4" />
                <span>Tip</span>
              </div>
              <div className="text-foreground/90">{children}</div>
            </div>
          );
        }
        if (textContent.includes('[!WARNING]') || textContent.includes('[!CAUTION]')) {
          return (
            <div className="my-2.5 p-3 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200 text-xs">
              <div className="flex items-center gap-1.5 font-semibold text-amber-600 dark:text-amber-400 mb-1">
                <AlertTriangle className="w-4 h-4" />
                <span>Warning</span>
              </div>
              <div className="text-foreground/90">{children}</div>
            </div>
          );
        }
        if (textContent.includes('[!IMPORTANT]')) {
          return (
            <div className="my-2.5 p-3 rounded-xl border border-purple-500/30 bg-purple-500/10 text-purple-900 dark:text-purple-200 text-xs">
              <div className="flex items-center gap-1.5 font-semibold text-purple-600 dark:text-purple-400 mb-1">
                <ShieldAlert className="w-4 h-4" />
                <span>Important</span>
              </div>
              <div className="text-foreground/90">{children}</div>
            </div>
          );
        }

        return (
          <blockquote className="my-2.5 pl-3.5 border-l-3 border-primary/40 bg-muted/30 py-1.5 pr-2.5 rounded-r-lg text-xs italic text-muted-foreground">
            {children}
          </blockquote>
        );
      },

      // Headings
      h1({ children }: any) {
        return (
          <h1 className="text-base font-bold mt-4 mb-2 pb-1 border-b border-border/60 text-foreground first:mt-0">
            {children}
          </h1>
        );
      },
      h2({ children }: any) {
        return <h2 className="text-sm font-bold mt-3.5 mb-1.5 text-foreground first:mt-0">{children}</h2>;
      },
      h3({ children }: any) {
        return <h3 className="text-xs font-semibold mt-3 mb-1 text-foreground first:mt-0">{children}</h3>;
      },
      h4({ children }: any) {
        return <h4 className="text-xs font-semibold mt-2.5 mb-1 uppercase tracking-wider text-muted-foreground">{children}</h4>;
      },

      // Paragraphs & Lists
      p({ children }: any) {
        return <p className="my-1.5 leading-relaxed text-sm text-foreground/95 first:mt-0 last:mb-0">{children}</p>;
      },
      ul({ children }: any) {
        return <ul className="list-disc list-outside ml-4 my-1.5 space-y-1 text-sm">{children}</ul>;
      },
      ol({ children }: any) {
        return <ol className="list-decimal list-outside ml-4 my-1.5 space-y-1 text-sm">{children}</ol>;
      },
      li({ children }: any) {
        return <li className="leading-relaxed text-foreground/90">{children}</li>;
      },
      hr() {
        return <hr className="my-3.5 border-t border-border/60" />;
      },

      // Links: Smart handling for files, conversations, and web links
      a({ href, children }: any) {
        if (!href) return <span>{children}</span>;
        const cleanHref = href.trim();

        // 1. Antigravity Conversation link: conversation://<conversationId>
        if (cleanHref.startsWith('conversation://')) {
          const convId = cleanHref.replace(/^conversation:\/\//, '').trim();
          return (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                navigate(`/chat/${encodeURIComponent(convId)}`);
              }}
              className="text-primary hover:underline font-medium inline-flex items-center gap-1 transition-colors cursor-pointer bg-primary/10 hover:bg-primary/20 px-1.5 py-0.5 rounded text-xs align-baseline"
              title={`Open Conversation: ${convId}`}
            >
              <MessageSquare className="w-3.5 h-3.5 text-primary shrink-0" />
              <span>{children}</span>
            </button>
          );
        }

        // 2. Local files / artifacts / documents / paths
        const isTrueExternalWeb =
          /^https?:\/\/(?!localhost|127\.0\.0\.1|0\.0\.0\.0|192\.168\.|10\.)/i.test(cleanHref) &&
          !cleanHref.includes('/api/workspace/file');
        const isMailOrTel = /^mailto:/i.test(cleanHref) || /^tel:/i.test(cleanHref);

        const isFileOrDoc =
          cleanHref.startsWith('file://') ||
          cleanHref.startsWith('/') ||
          cleanHref.startsWith('./') ||
          cleanHref.startsWith('../') ||
          cleanHref.includes('/api/workspace/file') ||
          /\.(md|markdown|ts|tsx|js|jsx|py|json|yaml|yml|sh|bash|zsh|txt|log|rs|go|sql|csv|html|css|toml|env)(?:#|$)/i.test(
            cleanHref
          );

        if (!isMailOrTel && (isFileOrDoc || !isTrueExternalWeb)) {
          // Parse line range from hash e.g. #L10-L30 or #L15
          let targetPath = cleanHref.replace(/^file:\/\//, '');

          // If URL is full HTTP(S) workspace API URL, extract path query param
          if (targetPath.includes('/api/workspace/file')) {
            try {
              const u = new URL(targetPath, 'http://localhost');
              const p = u.searchParams.get('path');
              if (p) targetPath = p;
            } catch {}
          }

          let startLine: number | undefined;
          let endLine: number | undefined;

          const hashIndex = targetPath.indexOf('#');
          if (hashIndex !== -1) {
            const hash = targetPath.slice(hashIndex + 1);
            targetPath = targetPath.slice(0, hashIndex);
            const lineMatch = /L(\d+)(?:-L?(\d+))?/i.exec(hash);
            if (lineMatch) {
              startLine = parseInt(lineMatch[1], 10);
              endLine = lineMatch[2] ? parseInt(lineMatch[2], 10) : startLine;
            }
          }

          return (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (onFileClick) {
                  onFileClick(targetPath, startLine, endLine);
                }
              }}
              className="text-primary hover:underline font-medium inline-flex items-center gap-1 transition-colors cursor-pointer bg-primary/10 hover:bg-primary/20 px-1.5 py-0.5 rounded text-xs align-baseline"
              title={`Inspect document: ${targetPath}${
                startLine ? ` (Line ${startLine}${endLine ? `-${endLine}` : ''})` : ''
              }`}
            >
              <FileCode className="w-3.5 h-3.5 text-primary shrink-0" />
              <span>{children}</span>
            </button>
          );
        }

        // 3. True External Web Link
        return (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-primary hover:underline font-medium inline-flex items-center gap-0.5 transition-colors"
          >
            <span>{children}</span>
            <ExternalLink className="w-3 h-3 opacity-60 shrink-0" />
          </a>
        );
      }
    }),
    [onImageClick, onFileClick, navigate]
  );

  return (
    <div className={`prose-sm dark:prose-invert max-w-none break-words ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        urlTransform={(url) => url}
        components={components}
      >
        {safeContent}
      </ReactMarkdown>
    </div>
  );
}
