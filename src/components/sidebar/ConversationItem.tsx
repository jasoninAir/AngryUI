import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Pencil, Archive, ArchiveRestore, Trash2, Check, X } from 'lucide-react';
import { useSidebar } from '@/context/SidebarContext';
import { useSessionStatus } from '@/context/SessionStatusContext';
import { useLanguage } from '@/context/LanguageContext';
import type { ConversationSummary } from '@/lib/types';

interface ConversationItemProps {
  conv: ConversationSummary;
  isActive: boolean;
  onRename: (id: string, newTitle: string) => Promise<boolean>;
  onArchive: (id: string, isArchived: boolean) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
}

export function ConversationItem({
  conv,
  isActive,
  onRename,
  onArchive,
  onDelete
}: ConversationItemProps) {
  const navigate = useNavigate();
  const { isMobile, closeSidebar } = useSidebar();
  const { getStatus } = useSessionStatus();
  const { t } = useLanguage();
  const sessionStatus = getStatus(conv.conversation_id);

  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(conv.title || '');
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const displayTitle = conv.title?.trim() || conv.conversation_id.slice(0, 8);

  const handleStartEdit = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setEditTitle(conv.title || '');
    setIsEditing(true);
    setIsDeleting(false);
  };

  const handleSaveRename = async (e?: React.MouseEvent | React.FormEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!editTitle.trim() || editTitle.trim() === conv.title) {
      setIsEditing(false);
      return;
    }
    setIsSubmitting(true);
    try {
      const ok = await onRename(conv.conversation_id, editTitle.trim());
      if (ok) {
        setIsEditing(false);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelRename = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsEditing(false);
    setEditTitle(conv.title || '');
  };

  const handleArchiveToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsSubmitting(true);
    try {
      await onArchive(conv.conversation_id, !conv.is_archived);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDeleting(true);
    setIsEditing(false);
  };

  const handleConfirmDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsSubmitting(true);
    try {
      const ok = await onDelete(conv.conversation_id);
      if (ok && isActive) {
        navigate('/');
      }
    } finally {
      setIsSubmitting(false);
      setIsDeleting(false);
    }
  };

  const handleCancelDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDeleting(false);
  };

  // Inline Rename Edit Mode
  if (isEditing) {
    return (
      <div
        className={`rounded px-2 py-1.5 text-sm flex items-center gap-1 border border-primary/50 bg-accent/40 my-0.5 ${
          isActive ? 'ring-1 ring-primary' : ''
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <input
          type="text"
          value={editTitle}
          onChange={(e) => setEditTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSaveRename();
            if (e.key === 'Escape') setIsEditing(false);
          }}
          disabled={isSubmitting}
          autoFocus
          className="flex-1 min-w-0 bg-background border border-input rounded px-1.5 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
          placeholder={t('enterNewTitle')}
        />
        <button
          onClick={handleSaveRename}
          disabled={isSubmitting || !editTitle.trim()}
          title={t('save')}
          className="p-1 text-primary hover:text-primary/80 disabled:opacity-40 cursor-pointer"
        >
          <Check className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={handleCancelRename}
          disabled={isSubmitting}
          title={t('cancel')}
          className="p-1 text-muted-foreground hover:text-foreground cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  // Inline Delete Confirmation Mode
  if (isDeleting) {
    return (
      <div
        className="rounded px-2 py-1.5 text-xs flex items-center justify-between gap-1 bg-destructive/10 border border-destructive/30 text-destructive my-0.5"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="truncate font-medium">{t('deleteConfirm')}</span>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={handleConfirmDelete}
            disabled={isSubmitting}
            className="px-2 py-0.5 bg-destructive text-destructive-foreground rounded text-[11px] font-medium hover:bg-destructive/90 disabled:opacity-50 cursor-pointer"
          >
            {t('delete')}
          </button>
          <button
            onClick={handleCancelDelete}
            disabled={isSubmitting}
            className="px-1.5 py-0.5 text-muted-foreground hover:text-foreground text-[11px] cursor-pointer"
          >
            {t('cancel')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`group relative rounded px-2 py-1.5 text-sm flex items-center justify-between transition-colors my-0.5 ${
        isActive
          ? 'bg-accent text-accent-foreground font-medium'
          : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground'
      } ${conv.is_archived ? 'opacity-60' : ''}`}
    >
      <Link
        to={`/chat/${conv.conversation_id}`}
        onClick={() => {
          if (isMobile) closeSidebar();
        }}
        className="flex-1 min-w-0 flex items-center gap-1.5 overflow-hidden pr-1"
        title={conv.title || conv.conversation_id}
      >
        {/* Real-time Status Dot Indicator: Green for RUNNING, Blue for WAITING_INPUT */}
        {sessionStatus === 'RUNNING' && (
          <span className="relative flex h-2 w-2 shrink-0" title={t('running')}>
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
        )}
        {sessionStatus === 'WAITING_INPUT' && (
          <span className="relative flex h-2 w-2 shrink-0" title={t('waitingInput')}>
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
          </span>
        )}

        {conv.is_archived && (
          <span title={t('archivedSessions')} className="shrink-0 text-amber-500">
            <Archive className="w-3 h-3" />
          </span>
        )}
        <span className="truncate">{displayTitle}</span>
      </Link>

      {/* Step count badge shown when not hovered/not active */}
      <span
        className={`text-[11px] text-muted-foreground shrink-0 transition-opacity ${
          isActive ? 'hidden' : 'group-hover:hidden'
        }`}
      >
        {conv.step_count}
      </span>

      {/* 3 Action Buttons (Rename, Archive, Delete) shown on hover or when item is active */}
      <div
        className={`flex items-center gap-0.5 shrink-0 ${
          isActive ? 'flex' : 'hidden group-hover:flex'
        }`}
      >
        {/* 1. Rename Button (Pen icon) */}
        <button
          onClick={handleStartEdit}
          title={t('rename')}
          className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-background/80 transition-colors cursor-pointer"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>

        {/* 2. Archive Button (Box icon) */}
        <button
          onClick={handleArchiveToggle}
          title={conv.is_archived ? t('unarchive') : t('archive')}
          className="p-1 rounded text-muted-foreground hover:text-amber-500 hover:bg-background/80 transition-colors cursor-pointer"
        >
          {conv.is_archived ? (
            <ArchiveRestore className="w-3.5 h-3.5" />
          ) : (
            <Archive className="w-3.5 h-3.5" />
          )}
        </button>

        {/* 3. Delete Button (Trash icon) */}
        <button
          onClick={handleStartDelete}
          title={t('delete')}
          className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-background/80 transition-colors cursor-pointer"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
