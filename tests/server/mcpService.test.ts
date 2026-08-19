import { describe, it, expect } from 'vitest';
import { listMcpServers, pingMcpServer } from '../../server/services/mcpService';

describe('mcpService', () => {
  it('lists configured MCP servers without throwing', () => {
    const servers = listMcpServers();
    expect(Array.isArray(servers)).toBe(true);
  });

  it('pings non-existent server with appropriate error', async () => {
    const res = await pingMcpServer('__non_existent_server__');
    expect(res.success).toBe(false);
    expect(res.error).toBeDefined();
  });
});
