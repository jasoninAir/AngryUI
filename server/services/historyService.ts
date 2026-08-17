import fs from 'fs';
import path from 'path';
import { getConfig } from '../config';
import { sanitizeOutputText } from '../utils/textSanitizer';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'tool';
  text?: string;
  thought?: string;
  name?: string;
  input?: any;
  output?: string;
  timestamp?: string;
}

export interface ConversationHistoryResult {
  messages: ChatMessage[];
  totalTurns: number;
  loadedTurns: number;
  hasMore: boolean;
}

function cleanUserContent(content: string): string {
  if (!content) return '';
  const match = content.match(/<USER_REQUEST>([\s\S]*?)<\/USER_REQUEST>/);
  if (match && match[1]) {
    return match[1].trim();
  }
  return content
    .replace(/<ADDITIONAL_METADATA>[\s\S]*?<\/ADDITIONAL_METADATA>/g, '')
    .replace(/<USER_SETTINGS_CHANGE>[\s\S]*?<\/USER_SETTINGS_CHANGE>/g, '')
    .replace(/<SYSTEM_MESSAGE>[\s\S]*?<\/SYSTEM_MESSAGE>/g, '')
    .trim();
}

export function getConversationHistory(
  conversationId: string,
  limitTurns = 5,
  offsetTurns = 0
): ConversationHistoryResult {
  const logFile = path.join(
    getConfig().agyHome,
    'brain',
    conversationId,
    '.system_generated',
    'logs',
    'transcript.jsonl'
  );

  if (!fs.existsSync(logFile)) {
    return { messages: [], totalTurns: 0, loadedTurns: 0, hasMore: false };
  }

  const rawLines = fs.readFileSync(logFile, 'utf-8').trim().split('\n').filter(Boolean);
  const turns: ChatMessage[][] = [];
  let currentTurn: ChatMessage[] = [];

  for (const line of rawLines) {
    let entry: any;
    try {
      entry = JSON.parse(line);
    } catch {
      continue;
    }

    if (entry.type === 'USER_INPUT') {
      if (currentTurn.length > 0) {
        turns.push(currentTurn);
        currentTurn = [];
      }
      const userText = sanitizeOutputText(cleanUserContent(entry.content || ''));
      currentTurn.push({
        id: `turn-${turns.length}-user-${entry.step_index}`,
        role: 'user',
        text: userText,
        timestamp: entry.created_at
      });
      continue;
    }

    if (entry.type === 'PLANNER_RESPONSE') {
      if (entry.content) {
        currentTurn.push({
          id: `turn-${turns.length}-assistant-${entry.step_index}`,
          role: 'assistant',
          text: sanitizeOutputText(entry.content),
          thought: entry.thought ? sanitizeOutputText(entry.thought) : undefined,
          timestamp: entry.created_at
        });
      }
      continue;
    }

    // Tool executions
    if (entry.type && !['CONVERSATION_HISTORY', 'CHECKPOINT'].includes(entry.type) && entry.source !== 'SYSTEM') {
      if (entry.content) {
        currentTurn.push({
          id: `turn-${turns.length}-tool-${entry.step_index}`,
          role: 'tool',
          name: (entry.type || '').toLowerCase(),
          input: {},
          output: typeof entry.content === 'string' ? sanitizeOutputText(entry.content.slice(0, 300)) : '',
          timestamp: entry.created_at
        });
      }
    }
  }

  if (currentTurn.length > 0) {
    turns.push(currentTurn);
  }

  const totalTurns = turns.length;
  if (totalTurns === 0) {
    return { messages: [], totalTurns: 0, loadedTurns: 0, hasMore: false };
  }

  // Calculate slice from the end:
  // e.g. total = 12, offset = 0, limit = 5 -> end = 12, start = 7 (turns 7..11)
  // next offset = 5, limit = 5 -> end = 7, start = 2 (turns 2..6)
  const endIndex = Math.max(0, totalTurns - offsetTurns);
  const startIndex = Math.max(0, endIndex - limitTurns);
  const selectedTurns = turns.slice(startIndex, endIndex);

  const flatMessages: ChatMessage[] = [];
  for (const t of selectedTurns) {
    flatMessages.push(...t);
  }

  const hasMore = startIndex > 0;
  const loadedTurns = offsetTurns + selectedTurns.length;

  return {
    messages: flatMessages,
    totalTurns,
    loadedTurns,
    hasMore
  };
}
