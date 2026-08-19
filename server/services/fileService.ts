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

export interface FileContentResult {
  path: string;
  name: string;
  extension: string;
  content: string;
  size: number;
  isBinary: boolean;
  truncated: boolean;
  totalLines: number;
}

const MAX_PREVIEW_BYTES = 2 * 1024 * 1024; // 2MB

export function readWorkspaceFile(filePath: string, workspaceRoot?: string): FileContentResult {
  let cleanPath = filePath.startsWith('file://') ? filePath.replace(/^file:\/\//, '') : filePath;
  cleanPath = path.resolve(cleanPath.trim());

  if (!fs.existsSync(cleanPath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  const stat = fs.statSync(cleanPath);
  if (stat.isDirectory()) {
    throw new Error(`Path is a directory: ${filePath}`);
  }

  const ext = path.extname(cleanPath).toLowerCase();
  const name = path.basename(cleanPath);

  // Common binary file extensions
  const binaryExts = new Set([
    '.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico', '.pdf', '.zip', '.tar', '.gz',
    '.exe', '.bin', '.dll', '.so', '.dylib', '.sqlite', '.db', '.woff', '.woff2', '.ttf',
    '.mp4', '.mp3', '.wav', '.mov', '.avi', '.7z', '.bz2', '.iso'
  ]);

  if (binaryExts.has(ext)) {
    return {
      path: cleanPath,
      name,
      extension: ext,
      content: '',
      size: stat.size,
      isBinary: true,
      truncated: false,
      totalLines: 0
    };
  }

  const buf = fs.readFileSync(cleanPath);
  let isBinary = false;
  for (let i = 0; i < Math.min(buf.length, 512); i++) {
    if (buf[i] === 0) {
      isBinary = true;
      break;
    }
  }

  if (isBinary) {
    return {
      path: cleanPath,
      name,
      extension: ext,
      content: '',
      size: stat.size,
      isBinary: true,
      truncated: false,
      totalLines: 0
    };
  }

  const truncated = buf.length > MAX_PREVIEW_BYTES;
  const contentToDecode = truncated ? buf.subarray(0, MAX_PREVIEW_BYTES) : buf;
  const content = contentToDecode.toString('utf-8');
  const totalLines = content.split('\n').length;

  return {
    path: cleanPath,
    name,
    extension: ext,
    content,
    size: stat.size,
    isBinary: false,
    truncated,
    totalLines
  };
}
