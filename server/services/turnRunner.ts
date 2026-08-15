import { spawn, ChildProcessWithoutNullStreams } from 'child_process';
import { parseStreamLine, AgyEvent } from '../utils/streamParser';
import { getConfig } from '../config';

export interface TurnOptions {
  conversationId: string;
  message: string;
  model?: string;
  effort?: 'low' | 'medium' | 'high';
  dangerouslySkipPermissions?: boolean;
}

export interface TurnHandle {
  pid: number;
  events: AsyncIterable<AgyEvent>;
  abort(): void;
}

export class TurnRunner {
  spawn(opts: TurnOptions): TurnHandle {
    const args = [
      '--conversation', opts.conversationId,
      ...(opts.model ? ['--model', opts.model] : []),
      ...(opts.effort ? ['--effort', opts.effort] : []),
      ...(opts.dangerouslySkipPermissions ? ['--dangerously-skip-permissions'] : []),
      '--output-format', 'stream-json',
      '--print', opts.message
    ];

    const child: ChildProcessWithoutNullStreams = spawn(getConfig().agyBin, args, {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    const queue: AgyEvent[] = [];
    const waiters: ((ev: AgyEvent | null) => void)[] = [];
    let closed = false;

    const push = (ev: AgyEvent | null) => {
      const w = waiters.shift();
      if (w) w(ev);
      else if (ev) queue.push(ev);
    };

    let buffer = '';
    let stderrBuffer = '';

    child.stdout.on('data', (chunk: Buffer) => {
      buffer += chunk.toString();
      let idx;
      while ((idx = buffer.indexOf('\n')) !== -1) {
        const line = buffer.slice(0, idx);
        buffer = buffer.slice(idx + 1);
        const evt = parseStreamLine(line);
        if (evt) push(evt);
      }
    });

    child.stderr.on('data', (chunk: Buffer) => {
      stderrBuffer += chunk.toString();
    });

    child.on('close', (code) => {
      // Flush any remaining stdout buffer
      if (buffer.trim()) {
        const evt = parseStreamLine(buffer);
        if (evt) push(evt);
      }
      // Surface CLI errors that came via stderr (e.g. invalid flag, auth expired)
      if (code !== 0 && code !== null && stderrBuffer.trim()) {
        push({ type: 'error', message: `CLI exited with code ${code}: ${stderrBuffer.trim()}` });
      }
      closed = true;
      push(null);
    });

    child.on('error', (e) => {
      push({ type: 'error', message: e.message });
      closed = true;
      push(null);
    });

    const events: AsyncIterable<AgyEvent> = {
      [Symbol.asyncIterator](): AsyncIterator<AgyEvent> {
        return {
          next(): Promise<IteratorResult<AgyEvent>> {
            if (queue.length > 0) {
              return Promise.resolve({ value: queue.shift()!, done: false });
            }
            if (closed) {
              return Promise.resolve({ value: undefined, done: true });
            }
            return new Promise((resolve) => {
              waiters.push((ev) => {
                if (ev === null) resolve({ value: undefined, done: true });
                else resolve({ value: ev, done: false });
              });
            });
          }
        };
      }
    };

    return {
      pid: child.pid ?? -1,
      events,
      abort(): void {
        child.kill('SIGINT');
      }
    };
  }

  async quota(): Promise<string> {
    return new Promise((resolve, reject) => {
      const child = spawn(getConfig().agyBin, ['--print', '/quota', '--output-format', 'stream-json'], {
        stdio: ['pipe', 'pipe', 'pipe']
      });
      let output = '';
      child.stdout.on('data', (c: Buffer) => {
        output += c.toString();
      });
      child.on('close', () => resolve(output));
      child.on('error', reject);
    });
  }
}
