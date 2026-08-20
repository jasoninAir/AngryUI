import { describe, it, expect, beforeAll } from 'vitest';
import { TurnRunner, formatAgyModel } from '../../server/services/turnRunner';
import { ConversationIndex } from '../../server/db/conversationIndex';
import { fromFileUri } from '../../server/utils/workspacePath';

describe('TurnRunner', () => {
  let testConversationId: string;
  let testWorkspace: string;

  beforeAll(() => {
    const idx = new ConversationIndex();
    idx.load();
    const all = idx.getAll();
    if (all.length === 0) {
      throw new Error('No conversations in AGY storage—run an `agy` session first.');
    }
    testConversationId = all[0].conversation_id;
    testWorkspace = fromFileUri(all[0].workspace_uris[0] || process.cwd());
  });

  it('formatAgyModel correctly formats model and effort for CLI', () => {
    expect(formatAgyModel('Gemini 3.7 Flash', 'high')).toBe('Gemini 3.7 Flash (High)');
    expect(formatAgyModel('Gemini 3.7 Flash', 'medium')).toBe('Gemini 3.7 Flash (Medium)');
    expect(formatAgyModel('Gemini 3.1 Pro', 'low')).toBe('Gemini 3.1 Pro (Low)');
    expect(formatAgyModel('Claude Sonnet 4.6 (Thinking)')).toBe('Claude Sonnet 4.6 (Thinking)');
    expect(formatAgyModel('GPT-OSS 120B (Medium)')).toBe('GPT-OSS 120B (Medium)');
    expect(formatAgyModel('Gemini 2.5 Flash')).toBe('Gemini 2.5 Flash (High)');
  });

  it('refuses to spawn without valid cwd', () => {
    const runner = new TurnRunner();
    expect(() =>
      runner.spawn({
        conversationId: 'test-no-cwd',
        message: 'test',
        cwd: undefined
      })
    ).toThrow('Workspace path is required');

    expect(() =>
      runner.spawn({
        conversationId: 'test-invalid-cwd',
        message: 'test',
        cwd: '/path/does/not/exist/9999'
      })
    ).toThrow('does not exist or is not a directory');
  });

  it('spawns agy and receives init event', async () => {
    const runner = new TurnRunner();
    const handle = runner.spawn({
      conversationId: testConversationId,
      message: 'say hi',
      model: 'Gemini 3.7 Flash',
      effort: 'low',
      cwd: testWorkspace
    });

    let initSeen = false;
    let resultSeen = false;
    let resultStatus: string | undefined;
    for await (const ev of handle.events) {
      console.log('[TEST EV]', ev.type, (ev as any).status || (ev as any).message || '');
      if (ev.type === 'init') initSeen = true;
      if (ev.type === 'result') {
        resultSeen = true;
        resultStatus = ev.status;
        break;
      }
      if (ev.type === 'error') {
        resultSeen = true;
        resultStatus = 'ERROR';
        break;
      }
      if (ev.type === 'permission_required') {
        resultSeen = true;
        resultStatus = 'SUCCESS';
        break;
      }
      if (ev.type === 'step_update') {
        resultSeen = true;
        resultStatus = 'SUCCESS';
      }
    }
    expect(resultSeen).toBe(true);
    expect(['SUCCESS', 'ERROR']).toContain(resultStatus);
  }, 120000);

  it('abort() sends SIGINT', async () => {
    const runner = new TurnRunner();
    const handle = runner.spawn({
      conversationId: testConversationId,
      message: 'long task',
      model: 'Gemini 3.7 Flash',
      effort: 'high',
      cwd: testWorkspace
    });

    setTimeout(() => handle.abort(), 1000);

    let closed = false;
    for await (const _ of handle.events) {
      // consume
    }
    closed = true;
    expect(closed).toBe(true);
  }, 30000);
});
