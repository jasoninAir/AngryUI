import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Folder,
  FolderOpen,
  FileCode,
  FileText,
  FileJson,
  FileSpreadsheet,
  FileImage,
  File,
  ChevronRight,
  ChevronDown,
  Copy,
  Check,
  Plus,
  RefreshCw,
  X,
  Search,
  FolderTree,
  Eye
} from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { authFetch } from '@/lib/api';

export interface WorkspaceFileEntry {
  name: string;
  path: string;
  relativePath: string;
  isDirectory: boolean;
  size?: number;
  mtime?: string;
  extension?: string;
}

interface TreeNodeProps {
  entry: WorkspaceFileEntry;
  workspace: string;
  level: number;
  searchFilter: string;
  onCopyPath: (relPath: string) => void;
  onInsertPath?: (relPath: string) => void;
  onPreviewFile?: (filePath: string) => void;
  copiedPath: string | null;
}

function getFileIcon(entry: WorkspaceFileEntry, isOpen?: boolean) {
  if (entry.isDirectory) {
    return isOpen ? (
      <FolderOpen className="w-4 h-4 text-amber-500 shrink-0" />
    ) : (
      <Folder className="w-4 h-4 text-amber-500 shrink-0" />
    );
  }

  const ext = entry.extension?.toLowerCase() || '';
  if (['.ts', '.tsx', '.js', '.jsx', '.py', '.go', '.rs', '.sh', '.bash', '.zsh', '.c', '.cpp', '.java'].includes(ext)) {
    return <FileCode className="w-4 h-4 text-sky-500 shrink-0" />;
  }
  if (['.json', '.yaml', '.yml', '.toml', '.xml', '.env', '.config'].includes(ext)) {
    return <FileJson className="w-4 h-4 text-emerald-500 shrink-0" />;
  }
  if (['.md', '.markdown', '.txt', '.rst', '.doc', '.docx', '.pdf'].includes(ext)) {
    return <FileText className="w-4 h-4 text-indigo-400 shrink-0" />;
  }
  if (['.csv', '.tsv', '.xlsx', '.xls'].includes(ext)) {
    return <FileSpreadsheet className="w-4 h-4 text-teal-500 shrink-0" />;
  }
  if (['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.ico'].includes(ext)) {
    return <FileImage className="w-4 h-4 text-purple-400 shrink-0" />;
  }

  return <File className="w-4 h-4 text-muted-foreground shrink-0" />;
}

function formatFileSize(bytes?: number): string {
  if (bytes === undefined || bytes === null) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function TreeNode({
  entry,
  workspace,
  level,
  searchFilter,
  onCopyPath,
  onInsertPath,
  copiedPath
}: TreeNodeProps) {
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState<boolean>(level === 0 || !!searchFilter);
  const [children, setChildren] = useState<WorkspaceFileEntry[] | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const fetchChildren = useCallback(async () => {
    if (!entry.isDirectory) return;
    setLoading(true);
    try {
      const res = await authFetch(
        `/api/workspace/files?workspace=${encodeURIComponent(workspace)}&subDir=${encodeURIComponent(
          entry.relativePath
        )}`
      );
      if (res.ok) {
        const data = await res.json();
        setChildren(data.entries || []);
      }
    } catch (e) {
      console.error('Failed to load subdirectory files:', e);
    } finally {
      setLoading(false);
    }
  }, [entry.isDirectory, entry.relativePath, workspace]);

  const handleToggle = () => {
    if (entry.isDirectory) {
      if (!isOpen && children === null) {
        fetchChildren();
      }
      setIsOpen(!isOpen);
    }
  };

  // Auto-expand when searchFilter is active
  useEffect(() => {
    if (searchFilter && entry.isDirectory && children === null) {
      fetchChildren();
      setIsOpen(true);
    }
  }, [searchFilter, entry.isDirectory, children, fetchChildren]);

  const isCopied = copiedPath === entry.relativePath;

  // Filter logic for searching
  const matchesFilter =
    !searchFilter ||
    entry.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
    entry.relativePath.toLowerCase().includes(searchFilter.toLowerCase());

  const filteredChildren = useMemo(() => {
    if (!children) return null;
    if (!searchFilter) return children;
    return children.filter(
      (c) =>
        c.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
        c.relativePath.toLowerCase().includes(searchFilter.toLowerCase()) ||
        c.isDirectory
    );
  }, [children, searchFilter]);

  if (searchFilter && !matchesFilter && (!filteredChildren || filteredChildren.length === 0)) {
    return null;
  }

  return (
    <div className="select-none text-xs">
      <div
        className={`group flex items-center justify-between py-1 px-2 rounded-md hover:bg-accent/60 cursor-pointer transition-colors ${
          entry.isDirectory ? 'font-medium text-foreground' : 'text-muted-foreground hover:text-foreground'
        }`}
        style={{ paddingLeft: `${Math.max(8, level * 16 + 8)}px` }}
        onClick={() => {
          if (entry.isDirectory) {
            handleToggle();
          } else if (onPreviewFile) {
            onPreviewFile(entry.path);
          }
        }}
      >
        <div className="flex items-center gap-1.5 min-w-0 flex-1 py-0.5">
          {entry.isDirectory ? (
            <span className="w-3.5 h-3.5 flex items-center justify-center text-muted-foreground shrink-0">
              {loading ? (
                <RefreshCw className="w-3 h-3 animate-spin text-muted-foreground" />
              ) : isOpen ? (
                <ChevronDown className="w-3.5 h-3.5" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5" />
              )}
            </span>
          ) : (
            <span className="w-3.5 h-3.5 shrink-0" />
          )}

          {getFileIcon(entry, isOpen)}

          <span className="truncate text-xs" title={entry.relativePath}>
            {entry.name}
          </span>
        </div>

        {/* Right side actions */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-1">
          {!entry.isDirectory && (
            <>
              {entry.size !== undefined && (
                <span className="text-[10px] text-muted-foreground/70 font-mono hidden sm:inline mr-1">
                  {formatFileSize(entry.size)}
                </span>
              )}

              {/* Preview file button */}
              {onPreviewFile && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onPreviewFile(entry.path);
                  }}
                  title="Preview code / text"
                  className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" />
                </button>
              )}

              {/* Insert @path into chat input */}
              {onInsertPath && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onInsertPath(entry.relativePath);
                  }}
                  title={t('insertToChat')}
                  className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              )}

              {/* Copy relative path button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onCopyPath(entry.relativePath);
                }}
                title={isCopied ? t('pathCopied') : t('copyRelativePath')}
                className={`p-1 rounded transition-colors cursor-pointer ${
                  isCopied
                    ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                    : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                }`}
              >
                {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </>
          )}

          {entry.isDirectory && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onCopyPath(entry.relativePath);
              }}
              title={isCopied ? t('pathCopied') : t('copyRelativePath')}
              className={`p-1 rounded transition-colors cursor-pointer ${
                isCopied
                  ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                  : 'hover:bg-muted text-muted-foreground hover:text-foreground'
              }`}
            >
              {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>
      </div>

      {/* Subdirectory children */}
      {entry.isDirectory && isOpen && (
        <div>
          {loading && !children && (
            <div
              className="py-1 text-[11px] text-muted-foreground/60 italic"
              style={{ paddingLeft: `${(level + 1) * 16 + 24}px` }}
            >
              ...
            </div>
          )}
          {filteredChildren && filteredChildren.length === 0 && (
            <div
              className="py-1 text-[11px] text-muted-foreground/50 italic"
              style={{ paddingLeft: `${(level + 1) * 16 + 24}px` }}
            >
              ({t('emptyFolder')})
            </div>
          )}
          {filteredChildren &&
            filteredChildren.map((child) => (
              <TreeNode
                key={child.path}
                entry={child}
                workspace={workspace}
                level={level + 1}
                searchFilter={searchFilter}
                onCopyPath={onCopyPath}
                onInsertPath={onInsertPath}
                onPreviewFile={onPreviewFile}
                copiedPath={copiedPath}
              />
            ))}
        </div>
      )}
    </div>
  );
}

export function FileExplorerDrawer({
  workspace,
  isOpen,
  onClose,
  onInsertPath,
  onPreviewFile
}: {
  workspace?: string;
  isOpen: boolean;
  onClose: () => void;
  onInsertPath?: (relPath: string) => void;
  onPreviewFile?: (filePath: string) => void;
}) {
  const { t } = useLanguage();
  const [entries, setEntries] = useState<WorkspaceFileEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [search, setSearch] = useState<string>('');
  const [copiedPath, setCopiedPath] = useState<string | null>(null);

  const cleanWorkspace = workspace?.startsWith('file://') ? workspace.replace(/^file:\/\//, '') : workspace;

  const loadRootFiles = useCallback(async () => {
    if (!cleanWorkspace) return;
    setLoading(true);
    try {
      const res = await authFetch(`/api/workspace/files?workspace=${encodeURIComponent(cleanWorkspace)}`);
      if (res.ok) {
        const data = await res.json();
        setEntries(data.entries || []);
      }
    } catch (e) {
      console.error('Failed to load workspace root files:', e);
    } finally {
      setLoading(false);
    }
  }, [cleanWorkspace]);

  useEffect(() => {
    if (isOpen && cleanWorkspace) {
      loadRootFiles();
    }
  }, [isOpen, cleanWorkspace, loadRootFiles]);

  const handleCopyPath = (relPath: string) => {
    navigator.clipboard.writeText(relPath);
    setCopiedPath(relPath);
    setTimeout(() => {
      setCopiedPath((prev) => (prev === relPath ? null : prev));
    }, 2000);
  };

  if (!isOpen) return null;

  const workspaceName = cleanWorkspace?.split('/').filter(Boolean).slice(-2).join('/') || 'Root';

  return (
    <aside className="w-80 sm:w-88 border-l border-border bg-card flex flex-col h-full shrink-0 shadow-lg select-none animate-in slide-in-from-right duration-200 z-10">
      {/* Drawer Header */}
      <div className="p-3 border-b border-border flex items-center justify-between gap-2 shrink-0 bg-muted/40">
        <div className="flex items-center gap-2 min-w-0">
          <FolderTree className="w-4 h-4 text-primary shrink-0" />
          <div className="min-w-0">
            <h3 className="text-xs font-semibold text-foreground truncate">{t('fileExplorerTitle')}</h3>
            <span className="text-[10px] text-muted-foreground truncate block font-mono" title={cleanWorkspace}>
              {workspaceName}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={loadRootFiles}
            title={t('refreshFiles')}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={onClose}
            title={t('cancel')}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Search Input */}
      <div className="p-2 border-b border-border/80 shrink-0 bg-background/50">
        <div className="relative flex items-center">
          <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('searchFilesPlaceholder')}
            className="w-full pl-8 pr-7 py-1.5 text-xs bg-background border border-input rounded-md focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground/60"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2 text-muted-foreground hover:text-foreground p-0.5 cursor-pointer"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Copy Toast Alert if copied */}
      {copiedPath && (
        <div className="px-3 py-1.5 bg-emerald-500/10 border-b border-emerald-500/20 text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center justify-between shrink-0 animate-in fade-in duration-150">
          <div className="flex items-center gap-1.5 truncate">
            <Check className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{t('pathCopied')}: {copiedPath}</span>
          </div>
        </div>
      )}

      {/* File Tree Content */}
      <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {loading && entries.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-xs text-muted-foreground gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-primary" />
            <span>...</span>
          </div>
        ) : entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-xs text-muted-foreground text-center p-4">
            <Folder className="w-8 h-8 text-muted-foreground/40 mb-2" />
            <span>{t('emptyFolder')}</span>
          </div>
        ) : (
          entries.map((entry) => (
            <TreeNode
              key={entry.path}
              entry={entry}
              workspace={cleanWorkspace || ''}
              level={0}
              searchFilter={search}
              onCopyPath={handleCopyPath}
              onInsertPath={onInsertPath}
              onPreviewFile={onPreviewFile}
              copiedPath={copiedPath}
            />
          ))
        )}
      </div>

      {/* Footer Info */}
      <div className="p-2 border-t border-border bg-muted/20 text-[10px] text-muted-foreground/80 flex items-center justify-between shrink-0">
        <span>📋 {t('copyRelativePath')}</span>
        <span>➕ {t('insertToChat')}</span>
      </div>
    </aside>
  );
}
