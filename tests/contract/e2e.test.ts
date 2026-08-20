import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawn, ChildProcess } from 'child_process';

let server: ChildProcess | null = null;

beforeAll(async () => {
  const env = { ...process.env, AGY_WEBUI_PORT: '3099' };
  delete env.AGY_WEBUI_TOKEN;

  server = spawn('./node_modules/.bin/tsx', ['server/index.ts'], {
    stdio: 'pipe',
    env
  });

  // Poll /api/health until ready or timeout after 10s
  const startTime = Date.now();
  let isReady = false;
  while (Date.now() - startTime < 10000) {
    try {
      const res = await fetch('http://localhost:3099/api/health');
      if (res.ok) {
        isReady = true;
        break;
      }
    } catch {}
    await new Promise((r) => setTimeout(r, 200));
  }

  if (!isReady) {
    throw new Error('E2E Test Server failed to start on port 3099');
  }
}, 15000);

afterAll(() => {
  server?.kill('SIGTERM');
});

describe('e2e sanity', () => {
  it('GET /api/projects returns groups', async () => {
    const res = await fetch('http://localhost:3099/api/projects');
    expect(res.ok).toBe(true);
    const data = await res.json();
    expect(Array.isArray(data.groups)).toBe(true);
  });

  it('GET /api/health returns ok', async () => {
    const res = await fetch('http://localhost:3099/api/health');
    expect(res.ok).toBe(true);
    const data = await res.json();
    expect(data.status).toBe('ok');
  });

  it('GET /api/settings/permissions returns allow list', async () => {
    const res = await fetch('http://localhost:3099/api/settings/permissions');
    expect(res.ok).toBe(true);
    const data = await res.json();
    expect(Array.isArray(data.allow)).toBe(true);
  });
});
