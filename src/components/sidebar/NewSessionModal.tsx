import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FolderPlus, X, Folder } from 'lucide-react';

interface NewSessionModalProps {
  existingWorkspaces: string[];
  onClose: () => void;
}

export function NewSessionModal({ existingWorkspaces, onClose }: NewSessionModalProps) {
  const navigate = useNavigate();
  const [workspacePath, setWorkspacePath] = useState('');
  const [initialPrompt, setInitialPrompt] = useState('');
  const [error, setError] = useState('');

  const cleanPaths = existingWorkspaces
    .map((w) => (w.startsWith('file://') ? w.replace('file://', '') : w))
    .filter((w) => w && w !== 'unknown');

  const handleCreate = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanPath = workspacePath.trim();
    if (!cleanPath) {
      setError('请输入或选择项目工作区目录路径');
      return;
    }

    const conversationId = crypto.randomUUID();
    const targetUrl = `/chat/${conversationId}?workspace=${encodeURIComponent(cleanPath)}`;
    onClose();
    navigate(targetUrl);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-card text-card-foreground border border-border rounded-xl shadow-xl w-full max-w-md p-5 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-primary/10 text-primary rounded-lg">
              <FolderPlus className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-semibold">新建会话 / 指定项目路径</h3>
              <p className="text-xs text-muted-foreground">在指定的工作区目录中开启新的会话</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-accent"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              项目目录路径 (Workspace Directory Path)
            </label>
            <input
              type="text"
              value={workspacePath}
              onChange={(e) => {
                setWorkspacePath(e.target.value);
                setError('');
              }}
              placeholder="/Users/username/myprojects/new-project"
              autoFocus
              className="w-full bg-background border border-input rounded-md px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>

          {/* Quick Select from Existing Workspaces */}
          {cleanPaths.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-[11px] text-muted-foreground">常用 / 已有项目路径：</span>
              <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pr-1">
                {cleanPaths.slice(0, 6).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => {
                      setWorkspacePath(p);
                      setError('');
                    }}
                    className="flex items-center gap-1 px-2 py-1 text-xs border border-border rounded-md bg-secondary/50 hover:bg-accent hover:text-accent-foreground truncate max-w-full text-left"
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
              className="px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground rounded-md hover:bg-accent"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={!workspacePath.trim()}
              className="px-4 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 transition-colors shadow-sm"
            >
              创建并进入会话
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
