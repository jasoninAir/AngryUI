import { describe, it, expect } from 'vitest';
import { normalizeWorkspacePath, toFileUri, fromFileUri } from '../../server/utils/workspacePath';
import os from 'os';

describe('workspacePath utility', () => {
  it('normalizes valid existing directories', () => {
    const tmp = os.tmpdir();
    const normalized = normalizeWorkspacePath(tmp);
    expect(normalized).toBeDefined();
    expect(typeof normalized).toBe('string');
  });

  it('handles file:// URIs properly', () => {
    const tmp = os.tmpdir();
    const normalized = normalizeWorkspacePath(`file://${tmp}`);
    expect(normalized).toBeDefined();
  });

  it('throws when path is empty, null, or undefined', () => {
    expect(() => normalizeWorkspacePath('')).toThrow('Workspace path is required');
    expect(() => normalizeWorkspacePath(null)).toThrow('Workspace path is required');
    expect(() => normalizeWorkspacePath(undefined)).toThrow('Workspace path is required');
    expect(() => normalizeWorkspacePath('   ')).toThrow('Workspace path is required');
  });

  it('throws when path does not exist', () => {
    expect(() => normalizeWorkspacePath('/non/existent/path/for/sure/12345')).toThrow(
      'does not exist or is not a directory'
    );
  });

  it('toFileUri and fromFileUri convert correctly', () => {
    expect(toFileUri('/Users/jason/project')).toBe('file:///Users/jason/project');
    expect(toFileUri('file:///Users/jason/project')).toBe('file:///Users/jason/project');
    expect(fromFileUri('file:///Users/jason/project')).toBe('/Users/jason/project');
    expect(fromFileUri('/Users/jason/project')).toBe('/Users/jason/project');
  });
});
