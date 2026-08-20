import { Router } from 'express';
import { ConversationIndex } from '../db/conversationIndex';
import { getConversationHistory } from '../services/historyService';
import { conversationHub } from '../ws/conversationHub';
import { listWorkspaceFiles, readWorkspaceFile } from '../services/fileService';
import { readProjectAliases, setProjectAlias, deleteProjectAlias } from '../services/sessionMetaService';

export function createProjectsRouter(index: ConversationIndex): Router {
  const router = Router();

  // GET /api/workspace/files?workspace=...&subDir=...
  router.get('/workspace/files', (req, res) => {
    const workspace = (req.query.workspace as string) || process.cwd();
    const subDir = req.query.subDir as string | undefined;
    try {
      const entries = listWorkspaceFiles(workspace, subDir);
      res.json({ workspace, subDir: subDir || '', entries });
    } catch (e: any) {
      res.status(400).json({ error: e.message || 'Failed to list files' });
    }
  });

  // GET /api/workspace/file/content?path=...&workspace=...
  router.get('/workspace/file/content', (req, res) => {
    const filePath = req.query.path as string;
    const workspace = req.query.workspace as string | undefined;
    if (!filePath) {
      return res.status(400).json({ error: 'Missing path parameter' });
    }
    try {
      const data = readWorkspaceFile(filePath, workspace);
      res.json(data);
    } catch (e: any) {
      res.status(404).json({ error: e.message || 'Failed to read file' });
    }
  });

  // GET /api/sessions/status
  router.get('/sessions/status', (_req, res) => {
    res.json({ statuses: conversationHub.getAllStatuses() });
  });

  // GET /api/conversations/:id
  router.get('/conversations/:id', (req, res) => {
    const { id } = req.params;
    const conv = index.getById(id);
    if (!conv) {
      return res.status(404).json({ error: 'Conversation not found' });
    }
    res.json(conv);
  });

  // GET /api/conversations/:id/history?turns=5&offset=0
  router.get('/conversations/:id/history', (req, res) => {
    const { id } = req.params;
    const turns = parseInt(req.query.turns as string, 10) || 5;
    const offset = parseInt(req.query.offset as string, 10) || 0;
    const result = getConversationHistory(id, turns, offset);
    res.json(result);
  });

  // GET /api/projects?showArchived=true|false&includeSubagents=true|false&force=true|false
  router.get('/projects', (req, res) => {
    const showArchived = req.query.showArchived === 'true';
    const includeSubagents = req.query.includeSubagents === 'true';
    const force = req.query.force === 'true';
    index.load(force);
    const result = index.groupByWorkspace(showArchived, includeSubagents);
    res.json(result);
  });

  // PATCH /api/conversations/:id/rename -> { title: string }
  router.patch('/conversations/:id/rename', (req, res) => {
    const { id } = req.params;
    const { title } = req.body ?? {};
    if (typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({ error: 'Title is required and must be non-empty' });
    }
    const ok = index.rename(id, title.trim());
    if (!ok) {
      return res.status(404).json({ error: 'Conversation not found or rename failed' });
    }
    res.json({ success: true, conversation_id: id, title: title.trim() });
  });

  // POST /api/conversations/:id/archive -> { archived?: boolean }
  router.post('/api/conversations/:id/archive', (req, res) => {
    const { id } = req.params;
    const archived = req.body?.archived !== false; // defaults to true
    const ok = index.archive(id, archived);
    if (!ok) {
      return res.status(404).json({ error: 'Conversation not found' });
    }
    res.json({ success: true, conversation_id: id, is_archived: archived });
  });

  // Also mount without /api prefix in case router is mounted at /api
  router.post('/conversations/:id/archive', (req, res) => {
    const { id } = req.params;
    const archived = req.body?.archived !== false;
    const ok = index.archive(id, archived);
    if (!ok) {
      return res.status(404).json({ error: 'Conversation not found' });
    }
    res.json({ success: true, conversation_id: id, is_archived: archived });
  });

  // GET /api/projects/aliases
  router.get('/projects/aliases', (_req, res) => {
    const map = readProjectAliases();
    res.json({ aliases: Object.fromEntries(map.entries()) });
  });

  // POST /api/projects/alias -> { workspace: string, alias: string }
  router.post('/projects/alias', (req, res) => {
    const { workspace, alias } = req.body ?? {};
    if (!workspace || typeof workspace !== 'string') {
      return res.status(400).json({ error: 'workspace is required' });
    }
    setProjectAlias(workspace, typeof alias === 'string' ? alias.trim() : '');
    res.json({ success: true, workspace, alias: typeof alias === 'string' ? alias.trim() : '' });
  });

  // DELETE /api/projects/alias -> { workspace: string }
  router.delete('/projects/alias', (req, res) => {
    const { workspace } = req.body ?? req.query ?? {};
    if (!workspace || typeof workspace !== 'string') {
      return res.status(400).json({ error: 'workspace is required' });
    }
    deleteProjectAlias(workspace);
    res.json({ success: true, workspace });
  });

  // POST /api/projects/clear-probes -> { workspace?: string }
  router.post('/projects/clear-probes', (req, res) => {
    const { workspace } = req.body ?? {};
    const grouped = index.groupByWorkspace(true, true);
    let deletedCount = 0;

    for (const g of grouped.groups) {
      if (workspace && g.workspace !== workspace && !g.workspace.includes(workspace)) {
        continue;
      }
      if (g.probes && g.probes.length > 0) {
        for (const p of g.probes) {
          if (index.delete(p.conversation_id)) {
            deletedCount++;
          }
        }
      }
    }

    res.json({ success: true, deletedCount });
  });

  // DELETE /api/conversations/:id
  router.delete('/conversations/:id', (req, res) => {
    const { id } = req.params;
    const ok = index.delete(id);
    if (!ok) {
      return res.status(404).json({ error: 'Conversation not found or delete failed' });
    }
    res.json({ success: true, conversation_id: id });
  });

  return router;
}
