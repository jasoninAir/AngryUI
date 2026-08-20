import * as pty from 'node-pty';
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { getConfig } from '../config';

const require = createRequire(import.meta.url);

export interface PtySession {
  pid: number;
  onData(cb: (data: string) => void): void;
  onExit(cb: () => void): void;
  write(data: string): void;
  resize(cols: number, rows: number): void;
  kill(): void;
}

/**
 * Self-healing helper: ensure node-pty prebuilt binaries (like spawn-helper on macOS/Linux)
 * have executable permissions (+x). When packages are extracted by npm/npx,
 * executable bits are sometimes lost, causing `posix_spawnp failed`.
 */
function ensureSpawnHelperExecutable(): void {
  try {
    const pkgPath = require.resolve('node-pty/package.json');
    const prebuildsDir = path.join(path.dirname(pkgPath), 'prebuilds');
    if (fs.existsSync(prebuildsDir)) {
      const archDirs = fs.readdirSync(prebuildsDir);
      for (const arch of archDirs) {
        const helper = path.join(prebuildsDir, arch, 'spawn-helper');
        if (fs.existsSync(helper)) {
          const stats = fs.statSync(helper);
          if ((stats.mode & 0o111) === 0) {
            fs.chmodSync(helper, 0o755);
          }
        }
      }
    }
  } catch {
    // Non-critical, ignore
  }
}

export class PtyManager {
  private static activeSessions = new Map<string, PtySession>();

  static register(id: string, session: PtySession): void {
    this.activeSessions.set(id, session);
  }

  static unregister(id: string): void {
    this.activeSessions.delete(id);
  }

  static killAll(): void {
    for (const [, s] of this.activeSessions) {
      try { s.kill(); } catch { /* ignore */ }
    }
    this.activeSessions.clear();
  }

  spawn(conversationId: string, cwd?: string): PtySession {
    ensureSpawnHelperExecutable();

    let runCwd = process.cwd();
    if (cwd) {
      const clean = cwd.startsWith('file://') ? cwd.replace('file://', '') : cwd;
      if (clean && clean.trim()) runCwd = clean.trim();
    }

    const agyBin = getConfig().agyBin;
    const env = {
      ...process.env,
      TERM: 'xterm-256color',
      COLORTERM: 'truecolor'
    } as { [key: string]: string };

    let proc: pty.IPty;
    try {
      proc = pty.spawn(agyBin, ['--conversation', conversationId], {
        name: 'xterm-256color',
        cols: 80,
        rows: 24,
        cwd: runCwd,
        env
      });
    } catch (e: any) {
      const errorMsg = `[WebTTY unavailable] node-pty failed to spawn (${agyBin}): ${e.message}`;
      console.error(errorMsg);

      return {
        pid: -1,
        onData: (cb) => {
          setTimeout(() => {
            cb(`\r\n\x1b[31m${errorMsg}\r\n\x1b[0m`);
          }, 50);
        },
        onExit: () => {},
        write: () => {},
        resize: () => {},
        kill: () => {}
      };
    }

    const dataCallbacks: ((data: string) => void)[] = [];
    const exitCallbacks: (() => void)[] = [];

    proc.onData((data) => {
      for (const cb of dataCallbacks) cb(data);
    });
    proc.onExit(() => {
      for (const cb of exitCallbacks) cb();
    });

    const session: PtySession = {
      pid: proc.pid,
      onData(cb) {
        dataCallbacks.push(cb);
      },
      onExit(cb) {
        exitCallbacks.push(cb);
      },
      write(data) {
        proc.write(data);
      },
      resize(cols, rows) {
        proc.resize(cols, rows);
      },
      kill() {
        proc.kill();
      }
    };

    // Register this session for tracking
    PtyManager.register(conversationId, session);

    // Unregister when process exits
    proc.onExit(() => {
      PtyManager.unregister(conversationId);
    });

    return session;
  }
}
