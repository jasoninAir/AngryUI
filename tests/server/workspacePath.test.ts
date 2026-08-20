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
    expect(toFileUri('/path/to/project')).toBe('file:///path/to/project');
    expect(toFileUri('file:///path/to/project')).toBe('file:///path/to/project');
    expect(fromFileUri('file:///path/to/project')).toBe('/path/to/project');
    expect(fromFileUri('/path/to/project')).toBe('/path/to/project');
  });
});
