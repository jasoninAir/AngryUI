import { Router } from 'express';
import { getSkillsAndRules, toggleSkillStatus } from '../services/skillsService';

export function createSkillsRouter(): Router {
  const router = Router();

  // GET /api/skills
  router.get('/skills', (_req, res) => {
    try {
      const data = getSkillsAndRules();
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to list skills and rules' });
    }
  });

  // POST /api/skills/:name/toggle
  router.post('/skills/:name/toggle', (req, res) => {
    const { name } = req.params;
    const { enabled } = req.body ?? {};
    try {
      const nextStatus = toggleSkillStatus(name, enabled);
      res.json({ success: true, name, enabled: nextStatus });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to toggle skill' });
    }
  });

  // POST /api/skills/reload
  router.post('/skills/reload', (_req, res) => {
    try {
      const data = getSkillsAndRules();
      res.json({ success: true, ...data });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to reload skills' });
    }
  });

  return router;
}
