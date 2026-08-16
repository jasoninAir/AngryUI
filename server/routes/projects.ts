import { Router } from 'express';
import { ConversationIndex } from '../db/conversationIndex';

export function createProjectsRouter(index: ConversationIndex): Router {
  const router = Router();

  // GET /api/projects?showArchived=true|false
  router.get('/projects', (req, res) => {
    const showArchived = req.query.showArchived === 'true';
    const result = index.groupByWorkspace(showArchived);
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
