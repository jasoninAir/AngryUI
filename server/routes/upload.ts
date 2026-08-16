import { Router } from 'express';
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
    res.sendFile(filePath);
  });

  return router;
}
