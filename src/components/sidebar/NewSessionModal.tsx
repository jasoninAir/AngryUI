import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FolderPlus, X, Folder, ArrowRight } from 'lucide-react';
import { useSidebar } from '@/context/SidebarContext';
import { useLanguage } from '@/context/LanguageContext';

interface NewSessionModalProps {
  existingWorkspaces: string[];
  onClose: () => void;
}

export function NewSessionModal({ existingWorkspaces, onClose }: NewSessionModalProps) {
  const navigate = useNavigate();
  const { isMobile, closeSidebar } = useSidebar();
  const { t } = useLanguage();
  const [workspacePath, setWorkspacePath] = useState('');
  const [error, setError] = useState('');

  const cleanPaths = Array.from(
    new Set(
      existingWorkspaces
        .map((w) => (w.startsWith('file://') ? w.replace('file://', '') : w))
        .filter((w) => w && w !== 'unknown')
    )
  );

  const handleCreate = (e?: React.FormEvent, customPath?: string) => {
    if (e) e.preventDefault();
    const cleanPath = (customPath !== undefined ? customPath : workspacePath).trim();
    if (!cleanPath) {
      setError(t('workspacePathPlaceholder'));
      return;
    }

    const conversationId = crypto.randomUUID();
    const targetUrl = `/chat/${conversationId}?workspace=${encodeURIComponent(cleanPath)}`;
    onClose();
    if (isMobile) closeSidebar();
    navigate(targetUrl);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-card text-card-foreground border border-border rounded-xl shadow-xl w-full max-w-md p-5 space-y-4 animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-primary/10 text-primary rounded-lg">
              <FolderPlus className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-semibold">{t('newSessionTitle')}</h3>
              <p className="text-xs text-muted-foreground">{t('workspacePath')}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-accent cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={(e) => handleCreate(e)} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              {t('workspacePath')}
            </label>
            <input
              type="text"
              value={workspacePath}
              onChange={(e) => {
                setWorkspacePath(e.target.value);
                setError('');
              }}
              placeholder={t('workspacePathPlaceholder')}
              autoFocus
              className="w-full bg-background border border-input rounded-md px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>

          {/* Quick Select from Existing Workspaces */}
          {cleanPaths.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-[11px] text-muted-foreground">{t('allProjects')}:</span>
              <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pr-1">
                {cleanPaths.slice(0, 6).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => {
                      setWorkspacePath(p);
                      setError('');
                    }}
                    className={`flex items-center gap-1.5 px-2 py-1 text-xs border rounded-md transition-colors truncate max-w-full text-left cursor-pointer ${
                      workspacePath === p
                        ? 'border-primary bg-primary/10 text-primary font-medium'
                        : 'border-border bg-secondary/50 hover:bg-accent hover:text-accent-foreground'
                    }`}
                  >
                    <Folder className="w-3 h-3 shrink-0 text-muted-foreground" />
                    <span className="truncate">{p.split('/').filter(Boolean).slice(-2).join('/') || p}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground rounded-md hover:bg-accent cursor-pointer"
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              disabled={!workspacePath.trim()}
              className="px-4 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 transition-colors shadow-sm flex items-center gap-1 cursor-pointer"
            >
              <span>{t('createAndStart')}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
