diff --git a/src/components/chat/ChatContainer.tsx b/src/components/chat/ChatContainer.tsx
index cc3777e..fb3642e 100644
--- a/src/components/chat/ChatContainer.tsx
+++ b/src/components/chat/ChatContainer.tsx
@@ -5,6 +5,7 @@ import { useSidebar } from '@/context/SidebarContext';
 import { useSessionStatus } from '@/context/SessionStatusContext';
 import { useLanguage } from '@/context/LanguageContext';
 import { SUPPORTED_MODELS, getModelConfig, EffortLevel } from '@/lib/models';
+import { authFetch } from '@/lib/api';
 import { MessageList } from './MessageList';
 import { ChatInput, ChatInputHandle } from './ChatInput';
 import { FileExplorerDrawer } from './FileExplorerDrawer';
@@ -112,7 +113,7 @@ export function ChatContainer({ conversationId }: { conversationId: string }) {
   // Auto-fill workspace from database if not specified in searchParams
   useEffect(() => {
     if (!workspace) {
-      fetch('/api/projects')
+      authFetch('/api/projects')
         .then((res) => res.json())
         .then((data) => {
           if (data && data.groups) {
@@ -146,7 +147,7 @@ export function ChatContainer({ conversationId }: { conversationId: string }) {
     }
     const cmdRule = `command(${permissionPrompt.command})`;
     try {
-      await fetch('/api/settings/permissions', {
+      await authFetch('/api/settings/permissions', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ pattern: cmdRule })
diff --git a/src/components/chat/FileExplorerDrawer.tsx b/src/components/chat/FileExplorerDrawer.tsx
index 94c95e0..6d48ab2 100644
--- a/src/components/chat/FileExplorerDrawer.tsx
+++ b/src/components/chat/FileExplorerDrawer.tsx
@@ -19,6 +19,7 @@ import {
   FolderTree
 } from 'lucide-react';
 import { useLanguage } from '@/context/LanguageContext';
+import { authFetch } from '@/lib/api';
 
 export interface WorkspaceFileEntry {
   name: string;
@@ -94,7 +95,7 @@ function TreeNode({
     if (!entry.isDirectory) return;
     setLoading(true);
     try {
-      const res = await fetch(
+      const res = await authFetch(
         `/api/workspace/files?workspace=${encodeURIComponent(workspace)}&subDir=${encodeURIComponent(
           entry.relativePath
         )}`
@@ -306,7 +307,7 @@ export function FileExplorerDrawer({
     if (!cleanWorkspace) return;
     setLoading(true);
     try {
-      const res = await fetch(`/api/workspace/files?workspace=${encodeURIComponent(cleanWorkspace)}`);
+      const res = await authFetch(`/api/workspace/files?workspace=${encodeURIComponent(cleanWorkspace)}`);
       if (res.ok) {
         const data = await res.json();
         setEntries(data.entries || []);
diff --git a/src/context/SessionStatusContext.tsx b/src/context/SessionStatusContext.tsx
index 7784a82..8852349 100644
--- a/src/context/SessionStatusContext.tsx
+++ b/src/context/SessionStatusContext.tsx
@@ -1,6 +1,7 @@
 import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
 import { useWebSocket } from '@/hooks/useWebSocket';
 import { soundManager } from '@/lib/sound';
+import { authFetch } from '@/lib/api';
 
 export type SessionState = 'IDLE' | 'RUNNING' | 'WAITING_INPUT' | 'PAUSED';
 
@@ -24,7 +25,7 @@ export function SessionStatusProvider({ children }: { children: React.ReactNode
 
   // Fetch initial active statuses from REST API
   useEffect(() => {
-    fetch('/api/sessions/status')
+    authFetch('/api/sessions/status')
       .then((res) => (res.ok ? res.json() : { statuses: {} }))
       .then((data) => {
         if (data && data.statuses) {
 src/components/chat/ChatContainer.tsx      | 5 +++--
 src/components/chat/FileExplorerDrawer.tsx | 5 +++--
 src/context/SessionStatusContext.tsx       | 3 ++-
 3 files changed, 8 insertions(+), 5 deletions(-)
