export type WSMessage<T = any> = {
  type: string;
  conversationId: string;
  payload: T;
  seq?: number;
  timestamp: number;
};

export type ConversationSummary = {
  conversation_id: string;
  title: string;
  preview: string;
  step_count: number;
  last_modified_time: string;
  workspace_uris: string[];
  status: string;
  not_fully_idle: boolean;
  killed: boolean;
  last_user_input_time: string;
  is_archived?: boolean;
};

export type AgyEventClient =
  | { type: 'init'; conversation_id: string; model: string; tools: string[]; permission_mode: string }
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
      usage: any;
    }
  | { type: 'error'; message: string };
