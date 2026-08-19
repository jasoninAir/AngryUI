import { Router } from 'express';
import { listMcpServers, pingMcpServer } from '../services/mcpService';

export function createMcpRouter(): Router {
  const router = Router();

  // GET /api/mcp/servers
  router.get('/mcp/servers', (_req, res) => {
    try {
      const servers = listMcpServers();
      res.json({ servers, totalCount: servers.length });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to list MCP servers' });
    }
  });

  // POST /api/mcp/ping/:serverName
  router.post('/mcp/ping/:serverName', async (req, res) => {
    const { serverName } = req.params;
    try {
      const result = await pingMcpServer(serverName);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, pingMs: 0, error: err.message || 'Ping failed' });
    }
  });

  return router;
}
