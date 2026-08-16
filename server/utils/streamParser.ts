export type AgyEvent =
  | {
      type: 'init';
      conversation_id: string;
      model: string;
      tools: string[];
      permission_mode: string;
    }
  | {
      type: 'step_update';
      step_index: number;
      step_type: string;
      state: string;
      text_delta?: string;
      tool_name?: string;
      tool_info?: any;
      duration_seconds?: number;
      usage?: any;
    }
  | {
      type: 'permission_required';
      tool: string;
      command?: string;
      message: string;
    }
  | {
      type: 'result';
      conversation_id: string;
      status: string;
      response: string;
      duration_seconds: number;
      num_turns: number;
      usage: {
        input_tokens: number;
        output_tokens: number;
        thinking_tokens: number;
        cache_read_tokens: number;
        total_tokens: number;
      };
    }
  | { type: 'error'; message: string };

export function parseStreamLine(line: string): AgyEvent | null {
  if (!line.trim()) return null;

  // Check for non-JSON jetski permission denial notices
  if (line.includes('jetski:') || line.includes('required the "command" permission') || line.includes('auto-denied')) {
    return {
      type: 'permission_required',
      tool: 'command',
      message: line.trim()
    };
  }

  let raw: any;
  try {
    raw = JSON.parse(line);
  } catch {
    return null;
  }

  if (raw.event === 'init' && raw.init) {
    return {
      type: 'init',
      conversation_id: raw.conversation_id,
      model: raw.init.model,
      tools: raw.init.tools ?? [],
      permission_mode: raw.init.permission_mode
    };
  }

  if (raw.event === 'step_update' && raw.step_update) {
    const su = raw.step_update;

    // Check if this step is a tool permission denial
    if (
      su.tool_info?.error?.type === 'TOOL_ERROR' ||
      (su.tool_info?.error?.message && /denied permission|permission required/i.test(su.tool_info.error.message))
    ) {
      const cmd = su.tool_info?.parameters?.CommandLine || su.tool_info?.parameters?.command;
      return {
        type: 'permission_required',
        tool: su.tool_name || 'command',
        command: typeof cmd === 'string' ? cmd : undefined,
        message: su.tool_info.error.message || 'Tool permission denied'
      };
    }

    return {
      type: 'step_update',
      step_index: su.step_index,
      step_type: su.step_type,
      state: su.state,
      text_delta: su.text_delta,
      tool_name: su.tool_name,
      tool_info: su.tool_info,
      duration_seconds: su.duration_seconds,
      usage: su.usage
    };
  }

  if (raw.event === 'result' && raw.result) {
    const r = raw.result;
    if (r.status === 'ERROR' || r.error) {
      if (r.error && /permission/i.test(r.error)) {
        return {
          type: 'permission_required',
          tool: 'command',
          message: r.error
        };
      }
      return {
        type: 'error',
        message: r.error || r.response || 'Agent execution failed'
      };
    }
    return {
      type: 'result',
      conversation_id: r.conversation_id,
      status: r.status,
      response: r.response,
      duration_seconds: r.duration_seconds,
      num_turns: r.num_turns,
      usage: r.usage
    };
  }

  if (raw.event === 'error' || raw.type === 'error' || raw.error) {
    const msg = typeof raw.error === 'string' ? raw.error : raw.error?.message || raw.message || 'Unknown error';
    if (/permission/i.test(msg)) {
      return {
        type: 'permission_required',
        tool: 'command',
        message: msg
      };
    }
    return {
      type: 'error',
      message: msg
    };
  }

  return null;
}
