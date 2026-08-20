import fs from 'fs';
import path from 'path';

/**
 * Normalizes a workspace path:
 * 1. Strips 'file://' prefix if present.
 * 2. Resolves relative paths to absolute paths.
 * 3. Resolves symlinks via fs.realpathSync.
 * 4. If a file path is passed, resolves to its containing directory.
 * 5. Ensures directory exists and is a directory.
 * Throws an Error if raw path is missing or invalid.
 */
export function normalizeWorkspacePath(raw?: string | null): string {
  if (!raw || typeof raw !== 'string' || !raw.trim()) {
    throw new Error('Workspace path is required; refusing to fall back to process.cwd()');
  }

  const cleaned = raw.trim().startsWith('file://')
    ? raw.trim().replace(/^file:\/\//, '')
    : raw.trim();

  let resolved = path.resolve(cleaned);

  try {
    const real = fs.realpathSync(resolved);
    const stat = fs.statSync(real);
    if (stat.isFile()) {
      return path.dirname(real);
    }
    if (stat.isDirectory()) {
      return real;
    }
    throw new Error(`Workspace path is not a directory: ${real}`);
  } catch (e: any) {
    if (fs.existsSync(resolved)) {
      const stat = fs.statSync(resolved);
      if (stat.isFile()) return path.dirname(resolved);
      if (stat.isDirectory()) return resolved;
    }
    throw new Error(`Workspace does not exist or is not a directory: ${resolved}`);
  }
}

/**
 * Formats an absolute filesystem path into a canonical 'file://' URI.
 */
export function toFileUri(absPath: string): string {
  if (!absPath) return '';
  const clean = absPath.startsWith('file://') ? absPath.replace(/^file:\/\//, '') : absPath;
  return `file://${clean}`;
}

/**
 * Strips 'file://' prefix from a URI if present.
 */
export function fromFileUri(uri: string): string {
  if (!uri) return '';
  return uri.startsWith('file://') ? uri.replace(/^file:\/\//, '') : uri;
}
