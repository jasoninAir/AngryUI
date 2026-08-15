import * as pty from 'node-pty';
import { getConfig } from '../config';

export interface PtySession {
  pid: number;
  onData(cb: (data: string) => void): void;
  onExit(cb: () => void): void;
  write(data: string): void;
  resize(cols: number, rows: number): void;
  kill(): void;
}

export class PtyManager {
  spawn(conversationId: string): PtySession {
    let proc: pty.IPty;
    try {
      proc = pty.spawn(getConfig().agyBin, ['--conversation', conversationId], {
        name: 'xterm-color',
        cols: 80,
        rows: 24,
        cwd: process.cwd(),
        env: process.env as { [key: string]: string }
      });
    } catch (e: any) {
      // node-pty on macOS sometimes fails with posix_spawnp due to entitlement /
      // signing issues. Provide a no-op session so the WS layer can still
      // surface the error to the client gracefully.
      const noop = () => {
        /* no listeners */
      };
      const errorMsg = `[WebTTY unavailable] node-pty failed to spawn: ${e.message}`;
      console.error(errorMsg);
      // Fire the error on a microtask so subscribers attached post-construction
      // still see it.
      Promise.resolve().then(() => {
        /* no-op */
      });
      return {
        pid: -1,
        onData: (cb) => {
          cb(`\r\n\x1b[31m${errorMsg}\r\n\x1b[0m`);
        },
        onExit: () => {
          /* no listeners */
        },
        write: () => {
          /* no listeners */
        },
        resize: () => {
          /* no listeners */
        },
        kill: () => {
          /* no listeners */
        }
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

    return {
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
  }
}
