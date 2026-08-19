import { Router } from 'express';
import { getConversationSubagents, getSubagentTranscript } from '../services/subagentService';

export function createSubagentsRouter(): Router {
  const router = Router();

  // GET /api/conversations/:id/subagents
  router.get('/conversations/:id/subagents', (req, res) => {
    const { id } = req.params;
    try {
      const data = getConversationSubagents(id);
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch subagents' });
    }
  });

  // GET /api/subagents/:subId/transcript
  router.get('/subagents/:subId/transcript', (req, res) => {
    const { subId } = req.params;
    try {
      const steps = getSubagentTranscript(subId);
      res.json({ conversationId: subId, steps, totalSteps: steps.length });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch subagent transcript' });
    }
  });

  return router;
}
