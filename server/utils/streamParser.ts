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

  return null;
}
