import fs from 'fs';
import path from 'path';

export interface WorkspaceFileEntry {
  name: string;
  path: string;
  relativePath: string;
  isDirectory: boolean;
  size?: number;
  mtime?: string;
  extension?: string;
}

const IGNORED_NAMES = new Set(['.git', 'node_modules', '.DS_Store', '__pycache__', '.pytest_cache']);

export function listWorkspaceFiles(workspaceRoot: string, subDir?: string): WorkspaceFileEntry[] {
  let cleanRoot = workspaceRoot.startsWith('file://') ? workspaceRoot.replace(/^file:\/\//, '') : workspaceRoot;
  cleanRoot = path.resolve(cleanRoot.trim());

  if (!fs.existsSync(cleanRoot)) {
    return [];
  }

  const targetDir = subDir ? path.resolve(cleanRoot, subDir) : cleanRoot;
  // Security check: ensure target path is within workspace root
  if (!targetDir.startsWith(cleanRoot)) {
    throw new Error('Access denied: target path is outside workspace root');
  }

  if (!fs.existsSync(targetDir) || !fs.statSync(targetDir).isDirectory()) {
    return [];
  }

  const entries = fs.readdirSync(targetDir, { withFileTypes: true });
  const result: WorkspaceFileEntry[] = [];

  for (const entry of entries) {
    if (IGNORED_NAMES.has(entry.name)) continue;

    const fullPath = path.join(targetDir, entry.name);
    const relPath = path.relative(cleanRoot, fullPath);

    try {
      const isDirectory = entry.isDirectory();
      const stat = isDirectory ? null : fs.statSync(fullPath);
      const ext = isDirectory ? undefined : path.extname(entry.name).toLowerCase();

      result.push({
        name: entry.name,
        path: fullPath,
        relativePath: relPath,
        isDirectory,
        size: stat?.size,
        mtime: stat?.mtime?.toISOString(),
        extension: ext
      });
    } catch {
      // Ignore unreadable or broken symlink files
    }
  }

  // Sort: directories first, then files alphabetically
  result.sort((a, b) => {
    if (a.isDirectory && !b.isDirectory) return -1;
    if (!a.isDirectory && b.isDirectory) return 1;
    return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
  });

  return result;
}
