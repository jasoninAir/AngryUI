import { describe, it, expect, beforeAll } from 'vitest';
import { TurnRunner, formatAgyModel } from '../../server/services/turnRunner';
import { ConversationIndex } from '../../server/db/conversationIndex';
import { fromFileUri } from '../../server/utils/workspacePath';

describe('TurnRunner', () => {
  const ephemeralTestId = `test-runner-${Date.now()}`;
  const testWorkspace = process.cwd();

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

  it('TurnHandle includes write method for stdin interactivity', () => {
    const runner = new TurnRunner();
    const handle = runner.spawn({
      conversationId: ephemeralTestId,
      message: 'test command',
      cwd: testWorkspace
    });
    expect(typeof handle.write).toBe('function');
    handle.abort();
  });
});
