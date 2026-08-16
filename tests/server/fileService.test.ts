import { describe, it, expect } from 'vitest';
import path from 'path';
import { listWorkspaceFiles } from '../../server/services/fileService';

describe('fileService', () => {
  const cwd = process.cwd();

  it('lists files in workspace root', () => {
    const files = listWorkspaceFiles(cwd);
    expect(files.length).toBeGreaterThan(0);
    const hasPackageJson = files.some((f) => f.name === 'package.json' && !f.isDirectory);
    expect(hasPackageJson).toBe(true);
  });

  it('filters out .git and node_modules', () => {
    const files = listWorkspaceFiles(cwd);
    const hasGit = files.some((f) => f.name === '.git');
    const hasNodeModules = files.some((f) => f.name === 'node_modules');
    expect(hasGit).toBe(false);
    expect(hasNodeModules).toBe(false);
  });

  it('lists files in subdirectory with relative paths', () => {
    const serverFiles = listWorkspaceFiles(cwd, 'server');
    expect(serverFiles.length).toBeGreaterThan(0);
    expect(serverFiles.every((f) => f.relativePath.startsWith('server/'))).toBe(true);
  });

  it('throws when attempting directory traversal', () => {
    expect(() => {
      listWorkspaceFiles(cwd, '../../');
    }).toThrow(/Access denied/);
  });
});
