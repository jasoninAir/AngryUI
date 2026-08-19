import { Router } from 'express';
import { listConversationArtifacts, getArtifactDetail } from '../services/artifactsService';

export function createArtifactsRouter(): Router {
  const router = Router();

  // GET /api/conversations/:id/artifacts
  router.get('/conversations/:id/artifacts', (req, res) => {
    const { id } = req.params;
    try {
      const artifacts = listConversationArtifacts(id);
      res.json({ conversationId: id, artifacts, totalCount: artifacts.length });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to list artifacts' });
    }
  });

  // GET /api/conversations/:id/artifacts/:filename
  router.get('/conversations/:id/artifacts/:filename', (req, res) => {
    const { id, filename } = req.params;
    try {
      const detail = getArtifactDetail(id, filename);
      if (!detail) {
        return res.status(404).json({ error: 'Artifact not found' });
      }
      res.json(detail);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to get artifact detail' });
    }
  });

  return router;
}
