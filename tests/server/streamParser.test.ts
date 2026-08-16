import { describe, it, expect } from 'vitest';
import { parseStreamLine } from '../../server/utils/streamParser';

describe('parseStreamLine', () => {
  it('parses init event', () => {
    const line = JSON.stringify({
      event: 'init',
      conversation_id: 'abc-123',
      init: { model: 'Gemini 3.7 Flash (High)', tools: ['finish'], permission_mode: 'request-review' }
    });
    const e = parseStreamLine(line);
    expect(e?.type).toBe('init');
    if (e?.type === 'init') {
      expect(e.model).toBe('Gemini 3.7 Flash (High)');
      expect(e.tools).toContain('finish');
    }
  });

  it('parses step_update with text_delta', () => {
    const line = JSON.stringify({
      event: 'step_update',
      step_update: { step_index: 5, step_type: 'agent_response', state: 'ACTIVE', text_delta: 'hello' }
    });
    const e = parseStreamLine(line);
    expect(e?.type).toBe('step_update');
    if (e?.type === 'step_update') {
      expect(e.text_delta).toBe('hello');
    }
  });

  it('parses step_update with tool call', () => {
    const line = JSON.stringify({
      event: 'step_update',
      step_update: {
        step_index: 3,
        step_type: 'tool',
        state: 'DONE',
        tool_name: 'run_command',
        tool_info: { name: 'run_command', parameters: { CommandLine: 'ls' }, output: 'file.txt' }
      }
    });
    const e = parseStreamLine(line);
    if (e?.type === 'step_update') {
      expect(e.tool_name).toBe('run_command');
    }
  });

  it('parses result event with usage', () => {
    const line = JSON.stringify({
      event: 'result',
      result: {
        conversation_id: 'abc',
        status: 'SUCCESS',
        response: 'hi',
        duration_seconds: 1.0,
        num_turns: 1,
        usage: { input_tokens: 100, output_tokens: 50, thinking_tokens: 0, cache_read_tokens: 0, total_tokens: 150 }
      }
    });
    const e = parseStreamLine(line);
    if (e?.type === 'result') {
      expect(e.usage.input_tokens).toBe(100);
    }
  });

  it('returns null for malformed line', () => {
    expect(parseStreamLine('not json')).toBeNull();
  });

  it('returns null for unknown event', () => {
    expect(parseStreamLine(JSON.stringify({ event: 'mystery' }))).toBeNull();
  });

  it('parses jetski permission denial line', () => {
    const raw = 'jetski: no output produced — a tool required the "command" permission that headless mode cannot prompt for, so it was auto-denied.';
    const evt = parseStreamLine(raw);
    expect(evt?.type).toBe('permission_required');
    if (evt?.type === 'permission_required') {
      expect(evt.tool).toBe('command');
    }
  });

  it('parses step_update tool error permission denial', () => {
    const raw = JSON.stringify({
      event: 'step_update',
      step_update: {
        step_index: 28,
        state: 'ERROR',
        step_type: 'tool',
        tool_name: 'run_command',
        tool_info: {
          name: 'run_command',
          parameters: { CommandLine: 'find /Users/test -type d' },
          error: { type: 'TOOL_ERROR', message: 'User denied permission to run command:\nfind /Users/test -type d' }
        }
      }
    });
    const evt = parseStreamLine(raw);
    expect(evt?.type).toBe('permission_required');
    if (evt?.type === 'permission_required') {
      expect(evt.command).toBe('find /Users/test -type d');
      expect(evt.tool).toBe('run_command');
    }
  });
});
