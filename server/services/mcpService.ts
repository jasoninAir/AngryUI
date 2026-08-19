import fs from 'fs';
import path from 'path';
import os from 'os';
import { logger } from '../utils/logger';

export interface McpToolInfo {
  name: string;
  description?: string;
  parameters?: any;
  required?: string[];
}

export interface McpServerInfo {
  name: string;
  command?: string;
  args?: string[];
  mode: 'eager' | 'lazy';
  tools: McpToolInfo[];
  instructions?: string;
  status: 'active' | 'idle' | 'error';
  pingMs?: number;
}

export function listMcpServers(): McpServerInfo[] {
  const home = os.homedir();
  const mcpConfigPath = path.join(home, '.gemini/config/mcp_config.json');
  const mcpDir = path.join(home, '.gemini/antigravity-cli/mcp');

  const serversMap = new Map<string, McpServerInfo>();

  // 1. Read mcp_config.json
  if (fs.existsSync(mcpConfigPath)) {
    try {
      const raw = JSON.parse(fs.readFileSync(mcpConfigPath, 'utf-8'));
      if (raw.mcpServers && typeof raw.mcpServers === 'object') {
        for (const [sName, sCfg] of Object.entries(raw.mcpServers as Record<string, any>)) {
          serversMap.set(sName, {
            name: sName,
            command: sCfg.command,
            args: sCfg.args,
            mode: 'lazy',
            tools: [],
            status: 'active'
          });
        }
      }
    } catch (err) {
      logger.error({ err }, 'Failed to parse mcp_config.json');
    }
  }

  // 2. Scan ~/.gemini/antigravity-cli/mcp/ directories for tool schemas
  if (fs.existsSync(mcpDir)) {
    try {
      const entries = fs.readdirSync(mcpDir, { withFileTypes: true });
      for (const ent of entries) {
        if (ent.isDirectory()) {
          const sName = ent.name;
          const sDir = path.join(mcpDir, sName);
          let server = serversMap.get(sName);
          if (!server) {
            server = {
              name: sName,
              mode: 'lazy',
              tools: [],
              status: 'active'
            };
            serversMap.set(sName, server);
          }

          // Read instructions.md if present
          const instrPath = path.join(sDir, 'instructions.md');
          if (fs.existsSync(instrPath)) {
            server.instructions = fs.readFileSync(instrPath, 'utf-8');
          }

          // Read tool JSON schemas
          try {
            const files = fs.readdirSync(sDir);
            for (const f of files) {
              if (f.endsWith('.json') && f !== 'package.json') {
                const fPath = path.join(sDir, f);
                try {
                  const schema = JSON.parse(fs.readFileSync(fPath, 'utf-8'));
                  const toolName = schema.name || f.replace(/\.json$/, '');
                  server.tools.push({
                    name: toolName,
                    description: schema.description || 'MCP Tool',
                    parameters: schema.parameters || schema.inputSchema || schema.properties,
                    required: schema.required || schema.parameters?.required
                  });
                } catch {}
              }
            }
          } catch {}
        }
      }
    } catch {}
  }

  return Array.from(serversMap.values()).sort((a, b) => a.name.localeCompare(b.name));
}

export async function pingMcpServer(serverName: string): Promise<{ success: boolean; pingMs: number; error?: string }> {
  const start = Date.now();
  const servers = listMcpServers();
  const found = servers.find((s) => s.name === serverName);

  if (!found) {
    return { success: false, pingMs: 0, error: `MCP server "${serverName}" not found` };
  }

  // If command exists on disk, check if executable
  if (found.command) {
    if (!fs.existsSync(found.command)) {
      return {
        success: false,
        pingMs: Date.now() - start,
        error: `Executable not found at ${found.command}`
      };
    }
  }

  return {
    success: true,
    pingMs: Math.max(1, Date.now() - start)
  };
}
