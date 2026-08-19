import { Router } from 'express';
import {
  getAllowedCommands,
  addAllowedCommand,
  removeAllowedCommand,
  readSettings,
  writeSettings
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

  router.put('/settings/token', (req, res) => {
    const { token } = req.body ?? {};
    if (typeof token !== 'string') {
      return res.status(400).json({ error: 'token must be a string' });
    }
    const settings = readSettings();
    settings.accessToken = token;
    writeSettings(settings);
    res.json({ ok: true });
  });

  return router;
}
