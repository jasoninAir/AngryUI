import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { saveUploadedFiles, getUploadFilePath } from '../services/uploadService';

export function createUploadRouter(): Router {
  const router = Router();

  // POST /api/upload -> { conversationId, files: [{ name, type, data }] }
  router.post('/upload', (req, res) => {
    const { conversationId, files } = req.body ?? {};
    if (!Array.isArray(files) || files.length === 0) {
      return res.status(400).json({ error: 'files array is required and must not be empty' });
    }

    try {
      const saved = saveUploadedFiles(conversationId || 'default', files);
      res.json({ success: true, files: saved });
    } catch (e: any) {
      res.status(500).json({ error: e.message || 'Failed to save uploaded files' });
    }
  });

  // GET /api/uploads/:conversationId/:filename -> Download / Serve uploaded attachment
  router.get('/uploads/:conversationId/:filename', (req, res) => {
    const { conversationId, filename } = req.params;
    const filePath = getUploadFilePath(conversationId, filename);
    if (!filePath) {
      return res.status(404).json({ error: 'File not found' });
    }
    // Allow hidden directories (.agy-webui, .gemini) via dotfiles: 'allow'
    res.sendFile(filePath, { dotfiles: 'allow' });
  });

  // GET /api/file-preview?path=... -> Serve local filesystem image or document preview
  router.get('/file-preview', (req, res) => {
    let rawPath = (req.query.path as string) || '';
    if (!rawPath.trim()) {
      return res.status(400).json({ error: 'path query parameter is required' });
    }

    if (rawPath.startsWith('file://')) {
      rawPath = rawPath.replace(/^file:\/\//, '');
    }

    const resolved = path.resolve(rawPath.trim());
    if (!fs.existsSync(resolved) || !fs.statSync(resolved).isFile()) {
      return res.status(404).json({ error: 'File not found on server disk' });
    }

    // Allow hidden directories (.agy-webui, .gemini) via dotfiles: 'allow'
    res.sendFile(resolved, { dotfiles: 'allow' });
  });

  return router;
}
