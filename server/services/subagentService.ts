import fs from 'fs';
import path from 'path';
import os from 'os';
import { logger } from '../utils/logger';

export interface SubagentInfo {
  conversationId: string;
  typeName: string;
  role: string;
  model: string;
  prompt: string;
  workspace?: string;
  state: 'running' | 'idle' | 'waiting' | 'errored' | 'done';
  stateDetail?: string;
  stepCount: number;
  createdAt: string;
  durationMs: number;
  transcriptUri: string;
  lastMessage?: string;
}

export interface ConversationSubagentsResult {
  parentId: string;
  subagents: SubagentInfo[];
}

export interface SubagentTranscriptStep {
  stepIndex: number;
  source: string;
  type: string;
  status: string;
  createdAt?: string;
  content?: string;
  thinking?: string;
  toolCalls?: Array<{
    name: string;
    args: any;
    toolAction?: string;
    toolSummary?: string;
  }>;
}

function getBrainDir(): string {
  return path.join(os.homedir(), '.gemini/antigravity-cli/brain');
}

/**
 * Scan parent conversation transcript to find all subagents spawned via invoke_subagent
 */
export function getConversationSubagents(parentConversationId: string): ConversationSubagentsResult {
  const brainDir = getBrainDir();
  const parentLogPath = path.join(
    brainDir,
    parentConversationId,
    '.system_generated/logs/transcript.jsonl'
  );

  if (!fs.existsSync(parentLogPath)) {
    return { parentId: parentConversationId, subagents: [] };
  }

  const subagentsMap = new Map<string, SubagentInfo>();

  try {
    const fileContent = fs.readFileSync(parentLogPath, 'utf-8');
    const lines = fileContent.split('\n').filter(Boolean);

    for (let i = 0; i < lines.length; i++) {
      let step: any;
      try {
        step = JSON.parse(lines[i]);
      } catch {
        continue;
      }

      // Check tool calls for invoke_subagent
      if (step.tool_calls && Array.isArray(step.tool_calls)) {
        for (const tc of step.tool_calls) {
          if (tc.name === 'invoke_subagent' && tc.args) {
            let subagentsArg = tc.args.Subagents;
            if (typeof subagentsArg === 'string') {
              try {
                subagentsArg = JSON.parse(subagentsArg);
              } catch {}
            }
            if (Array.isArray(subagentsArg)) {
              for (const sub of subagentsArg) {
                // We'll match this with subagent logs or return placeholder
                const typeName = sub.TypeName || 'subagent';
                const role = sub.Role || typeName;
                const model = sub.Model || 'inherit';
                const prompt = sub.Prompt || '';
                const workspace = sub.Workspace;

                // Look ahead in subsequent steps for tool return with conversationId
                let foundConvId = '';
                for (let j = i; j < Math.min(lines.length, i + 10); j++) {
                  try {
                    const nextStep = JSON.parse(lines[j]);
                    const nextContent = typeof nextStep.content === 'string' ? nextStep.content : JSON.stringify(nextStep.content || '');
                    const match = nextContent.match(/"conversationId":\s*"([a-f0-9-]{36})"/i) ||
                                  nextContent.match(/"conversation_id":\s*"([a-f0-9-]{36})"/i) ||
                                  nextContent.match(/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/i);
                    if (match) {
                      foundConvId = match[1];
                      break;
                    }
                  } catch {}
                }

                if (foundConvId && !subagentsMap.has(foundConvId)) {
                  subagentsMap.set(foundConvId, {
                    conversationId: foundConvId,
                    typeName,
                    role,
                    model,
                    prompt,
                    workspace,
                    state: 'idle',
                    stepCount: 0,
                    createdAt: step.created_at || new Date().toISOString(),
                    durationMs: 0,
                    transcriptUri: `file://${path.join(brainDir, foundConvId, '.system_generated/logs/transcript.jsonl')}`
                  });
                }
              }
            }
          }
        }
      }
    }
  } catch (err) {
    logger.error({ err, parentConversationId }, 'Error reading parent transcript for subagents');
  }

  // Also inspect all existing brain directories to match parent or referenced subagents
  try {
    const allDirs = fs.readdirSync(brainDir);
    for (const dirName of allDirs) {
      if (dirName === parentConversationId || !dirName.match(/^[a-f0-9-]{36}$/i)) continue;
      const subLog = path.join(brainDir, dirName, '.system_generated/logs/transcript.jsonl');
      if (fs.existsSync(subLog)) {
        // Inspect if this subagent was spawned around the same time or matches
        const existing = subagentsMap.get(dirName);
        if (existing) {
          inspectSubagentDetails(existing, subLog);
        }
      }
    }
  } catch {}

  // Fill details for all discovered subagents
  for (const [convId, sub] of subagentsMap.entries()) {
    const subLog = path.join(brainDir, convId, '.system_generated/logs/transcript.jsonl');
    if (fs.existsSync(subLog)) {
      inspectSubagentDetails(sub, subLog);
    }
  }

  return {
    parentId: parentConversationId,
    subagents: Array.from(subagentsMap.values())
  };
}

function inspectSubagentDetails(sub: SubagentInfo, subLogPath: string): void {
  try {
    const stat = fs.statSync(subLogPath);
    const content = fs.readFileSync(subLogPath, 'utf-8');
    const lines = content.split('\n').filter(Boolean);
    sub.stepCount = lines.length;

    if (lines.length > 0) {
      let firstStep: any = null;
      let lastStep: any = null;
      try { firstStep = JSON.parse(lines[0]); } catch {}
      try { lastStep = JSON.parse(lines[lines.length - 1]); } catch {}

      const startTime = firstStep?.created_at ? new Date(firstStep.created_at).getTime() : stat.birthtimeMs;
      const lastTime = lastStep?.created_at ? new Date(lastStep.created_at).getTime() : stat.mtimeMs;
      sub.durationMs = Math.max(0, lastTime - startTime);
      sub.createdAt = firstStep?.created_at || new Date(stat.birthtimeMs).toISOString();

      if (lastStep) {
        if (lastStep.status === 'ERROR') {
          sub.state = 'errored';
          sub.stateDetail = lastStep.content || 'Execution encountered an error';
        } else if (lastStep.status === 'DONE') {
          sub.state = 'done';
          sub.stateDetail = 'Completed all tasks';
        } else {
          sub.state = 'running';
          sub.stateDetail = lastStep.thinking?.slice(0, 100) || 'Processing';
        }

        if (lastStep.content) {
          sub.lastMessage = String(lastStep.content).slice(0, 180);
        } else if (lastStep.thinking) {
          sub.lastMessage = String(lastStep.thinking).slice(0, 180);
        }
      }
    }
  } catch {}
}

/**
 * Get step-by-step transcript for a subagent
 */
export function getSubagentTranscript(subConversationId: string): SubagentTranscriptStep[] {
  const brainDir = getBrainDir();
  const logPath = path.join(brainDir, subConversationId, '.system_generated/logs/transcript.jsonl');

  if (!fs.existsSync(logPath)) {
    return [];
  }

  const steps: SubagentTranscriptStep[] = [];
  try {
    const content = fs.readFileSync(logPath, 'utf-8');
    const lines = content.split('\n').filter(Boolean);

    for (const line of lines) {
      try {
        const item = JSON.parse(line);
        steps.push({
          stepIndex: item.step_index ?? steps.length + 1,
          source: item.source || 'MODEL',
          type: item.type || 'PLANNER_RESPONSE',
          status: item.status || 'DONE',
          createdAt: item.created_at,
          content: typeof item.content === 'string' ? item.content : item.content ? JSON.stringify(item.content) : undefined,
          thinking: item.thinking,
          toolCalls: item.tool_calls?.map((tc: any) => ({
            name: tc.name,
            args: tc.args,
            toolAction: tc.toolAction,
            toolSummary: tc.toolSummary
          }))
        });
      } catch {}
    }
  } catch (err) {
    logger.error({ err, subConversationId }, 'Failed to read subagent transcript');
  }

  return steps;
}
