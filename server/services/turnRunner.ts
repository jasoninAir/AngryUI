import { spawn, ChildProcessWithoutNullStreams } from 'child_process';
import fs from 'fs';
import { StringDecoder } from 'string_decoder';
import { parseStreamLine, AgyEvent } from '../utils/streamParser';
import { getConfig } from '../config';

export interface TurnOptions {
  conversationId: string;
  message: string;
  model?: string;
  effort?: 'low' | 'medium' | 'high';
  dangerouslySkipPermissions?: boolean;
  cwd?: string;
}

export interface TurnHandle {
  pid: number;
  events: AsyncIterable<AgyEvent>;
  abort(): void;
}

/**
 * Format model and effort into AGY CLI expected model flag string.
 * Example: 'Gemini 3.7 Flash' + 'high' => 'Gemini 3.7 Flash (High)'
 * 'Claude Sonnet 4.6 (Thinking)' => 'Claude Sonnet 4.6 (Thinking)'
 */
export function formatAgyModel(model?: string, effort?: 'low' | 'medium' | 'high'): string | undefined {
  if (!model) return undefined;
  if (model.includes('(')) {
    if (effort) {
      const base = model.replace(/\s*\([^)]*\)/, '').trim();
      const capEffort = effort.charAt(0).toUpperCase() + effort.slice(1);
      return `${base} (${capEffort})`;
    }
    return model;
  }
  if (effort) {
    const capEffort = effort.charAt(0).toUpperCase() + effort.slice(1);
    return `${model} (${capEffort})`;
  }
  if (model.toLowerCase().includes('gemini')) {
    return `${model} (High)`;
  }
  return model;
}

export class TurnRunner {
  spawn(opts: TurnOptions): TurnHandle {
    let runCwd = process.cwd();
    if (opts.cwd) {
      const clean = opts.cwd.startsWith('file://') ? opts.cwd.replace('file://', '') : opts.cwd;
      if (clean && clean.trim()) {
        runCwd = clean.trim();
        if (!fs.existsSync(runCwd)) {
          try {
            fs.mkdirSync(runCwd, { recursive: true });
          } catch {}
        }
      }
    }

    const formattedModel = formatAgyModel(opts.model, opts.effort);
    const skipPerms = Boolean(opts.dangerouslySkipPermissions);
    const args = [
      '--conversation', opts.conversationId,
      '--add-dir', runCwd,
      ...(formattedModel ? ['--model', formattedModel] : []),
      ...(skipPerms ? ['--dangerously-skip-permissions'] : []),
      '--output-format', 'stream-json',
      '--print', opts.message
    ];

    const child: ChildProcessWithoutNullStreams = spawn(getConfig().agyBin, args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: runCwd,
      env: { ...process.env, LANG: 'en_US.UTF-8', LC_ALL: 'en_US.UTF-8', PYTHONIOENCODING: 'utf-8' }
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
    let lastProposedCommand = '';
    const stdoutDecoder = new StringDecoder('utf-8');
    const stderrDecoder = new StringDecoder('utf-8');

    child.stdout.on('data', (chunk: Buffer) => {
      buffer += stdoutDecoder.write(chunk);
      let idx;
      while ((idx = buffer.indexOf('\n')) !== -1) {
        const line = buffer.slice(0, idx);
        buffer = buffer.slice(idx + 1);

        try {
          const raw = JSON.parse(line);
          if (raw?.step_update?.tool_info?.parameters?.CommandLine) {
            lastProposedCommand = raw.step_update.tool_info.parameters.CommandLine;
          } else if (raw?.step_update?.tool_info?.parameters?.command) {
            lastProposedCommand = raw.step_update.tool_info.parameters.command;
          }
        } catch {}

        const evt = parseStreamLine(line);
        if (evt) {
          if (evt.type === 'permission_required' && !evt.command && lastProposedCommand) {
            evt.command = lastProposedCommand;
          }
          push(evt);
        }
      }
    });

    child.stderr.on('data', (chunk: Buffer) => {
      stderrBuffer += stderrDecoder.write(chunk);
    });

    child.on('close', (code) => {
      buffer += stdoutDecoder.end();
      stderrBuffer += stderrDecoder.end();

      // Flush any remaining stdout buffer
      if (buffer.trim()) {
        const evt = parseStreamLine(buffer);
        if (evt) {
          if (evt.type === 'permission_required' && !evt.command && lastProposedCommand) {
            evt.command = lastProposedCommand;
          }
          push(evt);
        }
      }

      // Check if process was terminated due to permission denial
      if (
        stderrBuffer.includes('jetski:') ||
        stderrBuffer.includes('permission') ||
        stderrBuffer.includes('auto-denied') ||
        buffer.includes('jetski:')
      ) {
        push({
          type: 'permission_required',
          tool: 'command',
          command: lastProposedCommand || undefined,
          message: stderrBuffer.trim() || 'Command permission required by agent'
        });
      } else if (code !== 0 && code !== null && stderrBuffer.trim()) {
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
