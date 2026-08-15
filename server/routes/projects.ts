import { Router } from 'express';
import { ConversationIndex } from '../db/conversationIndex';

export function createProjectsRouter(index: ConversationIndex): Router {
  const router = Router();

  router.get('/projects', (_req, res) => {
    const groups = Array.from(index.groupByWorkspace().entries()).map(
      ([workspace, conversations]) => ({ workspace, conversations })
    );
    res.json({ groups });
  });

  return router;
}
