import { describe, it, expect, afterAll } from 'vitest';
import {
  getAllowedCommands,
  addAllowedCommand,
  removeAllowedCommand
} from '../../server/services/settingsService';

describe('settingsService', () => {
  const testPattern = 'command(test-util-' + Date.now() + ')';
  let original: string[];

  afterAll(() => {
    if (original) {
      for (const p of original) {
        try {
          addAllowedCommand(p);
        } catch {
          /* ignore */
        }
      }
    }
    try {
      removeAllowedCommand(testPattern);
    } catch {
      /* ignore */
    }
  });

  it('returns a list of allowed commands', () => {
    const list = getAllowedCommands();
    expect(Array.isArray(list)).toBe(true);
    original = [...list];
  });

  it('adds a new command', () => {
    addAllowedCommand(testPattern);
    expect(getAllowedCommands()).toContain(testPattern);
  });

  it('does not duplicate existing pattern', () => {
    addAllowedCommand(testPattern);
    const count = getAllowedCommands().filter((p) => p === testPattern).length;
    expect(count).toBe(1);
  });

  it('removes a command', () => {
    removeAllowedCommand(testPattern);
    expect(getAllowedCommands()).not.toContain(testPattern);
  });
});
