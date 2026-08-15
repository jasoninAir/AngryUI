import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { parseStreamLine } from '../../server/utils/streamParser';

describe('replay real AGY stream-json', () => {
  it('parses all lines from spike1c-output.log', () => {
    const logPath = '/tmp/agy-spike/spike1c-output.log';
    let content: string;
    try {
      content = readFileSync(logPath, 'utf-8');
    } catch {
      console.warn('Skipping: spike log not present at ' + logPath);
      return;
    }
    const lines = content.split('\n').filter((l) => l.trim().startsWith('{'));
    expect(lines.length).toBeGreaterThan(0);
    for (const line of lines) {
      const evt = parseStreamLine(line);
      expect(evt).not.toBeNull();
    }
  });
});
