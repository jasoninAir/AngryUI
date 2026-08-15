import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawn, ChildProcess } from 'child_process';
import { fetchProjects } from '../../src/lib/api';

let server: ChildProcess | null = null;

beforeAll(async () => {
  server = spawn('npx', ['tsx', 'server/index.ts'], {
    stdio: 'pipe',
    env: { ...process.env, AGY_WEBUI_PORT: '3001' }
  });
  // Wait for server to be ready
  await new Promise((resolve) => setTimeout(resolve, 3000));
});

afterAll(() => {
  server?.kill('SIGTERM');
});

describe('e2e sanity', () => {
  it('GET /api/projects returns groups', async () => {
    const res = await fetch('http://localhost:3001/api/projects');
    expect(res.ok).toBe(true);
    const data = await res.json();
    expect(Array.isArray(data.groups)).toBe(true);
  });

  it('GET /api/health returns ok', async () => {
    const res = await fetch('http://localhost:3001/api/health');
    expect(res.ok).toBe(true);
    const data = await res.json();
    expect(data.status).toBe('ok');
  });

  it('GET /api/settings/permissions returns allow list', async () => {
    const res = await fetch('http://localhost:3001/api/settings/permissions');
    expect(res.ok).toBe(true);
    const data = await res.json();
    expect(Array.isArray(data.allow)).toBe(true);
  });
});
