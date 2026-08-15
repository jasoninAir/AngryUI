import { Router } from 'express';
import {
  getAllowedCommands,
  addAllowedCommand,
  removeAllowedCommand
} from '../services/settingsService';

export function createSettingsRouter(): Router {
  const router = Router();

  router.get('/settings/permissions', (_req, res) => {
    res.json({ allow: getAllowedCommands() });
  });

  router.post('/settings/permissions', (req, res) => {
    const { pattern } = req.body ?? {};
    if (typeof pattern !== 'string' || !pattern.startsWith('command(')) {
      return res.status(400).json({ error: 'pattern must start with command(' });
    }
    addAllowedCommand(pattern);
    res.json({ ok: true });
  });

  router.delete('/settings/permissions/:pattern', (req, res) => {
    const pattern = decodeURIComponent(req.params.pattern);
    removeAllowedCommand(pattern);
    res.json({ ok: true });
  });

  return router;
}
