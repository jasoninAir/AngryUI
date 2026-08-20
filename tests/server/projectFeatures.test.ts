import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { getConfig } from '../../server/config';
import {
  readProjectAliases,
  setProjectAlias,
  deleteProjectAlias
} from '../../server/services/sessionMetaService';
import { ConversationIndex } from '../../server/db/conversationIndex';
import { upsertConversationSummary } from '../../server/services/sessionSummaryService';
import type { ConversationSummary } from '../../server/db/conversationIndex';

describe('Project Aliasing, Probe Isolation, and Lock Protection', () => {
  const testWs = '/tmp/test-project-ws-' + Date.now();

  beforeEach(() => {
    deleteProjectAlias(testWs);
  });

  it('sets, reads, and deletes project aliases', () => {
    expect(readProjectAliases().get(testWs)).toBeUndefined();

    setProjectAlias(testWs, '🚀 Test Workspace Custom Name');
    expect(readProjectAliases().get(testWs)).toBe('🚀 Test Workspace Custom Name');

    deleteProjectAlias(testWs);
    expect(readProjectAliases().get(testWs)).toBeUndefined();
  });

  it('groupByWorkspace attaches project alias and separates probes', () => {
    const idx = new ConversationIndex();
    const mockIdRegular = `test-regular-${Date.now()}`;
    const mockIdProbe = `test-probe-${Date.now()}`;

    setProjectAlias(testWs, '🚀 Super App');

    const regularConv: ConversationSummary = {
      conversation_id: mockIdRegular,
      title: 'Implement authentication flow',
      preview: 'Implement authentication flow',
      step_count: 10,
      last_modified_time: new Date().toISOString(),
      workspace_uris: [`file://${testWs}`],
      status: 'COMPLETED',
      source: 'CLI',
      project_id: '',
      agent_name: '',
      parent_conversation_id: '',
      nesting_depth: 0,
      not_fully_idle: false,
      killed: false,
      last_user_input_time: new Date().toISOString()
    };

    const probeConv: ConversationSummary = {
      conversation_id: mockIdProbe,
      title: 'say hi',
      preview: 'say hi',
      step_count: 1,
      last_modified_time: new Date().toISOString(),
      workspace_uris: [`file://${testWs}`],
      status: 'COMPLETED',
      source: 'CLI',
      project_id: '',
      agent_name: '',
      parent_conversation_id: '',
      nesting_depth: 0,
      not_fully_idle: false,
      killed: false,
      last_user_input_time: new Date().toISOString()
    };

    upsertConversationSummary(regularConv);
    upsertConversationSummary(probeConv);
    idx.applyDelta([regularConv, probeConv]);

    const result = idx.groupByWorkspace(false, false);
    const group = result.groups.find((g) => g.workspace.includes(testWs));

    expect(group).toBeDefined();
    expect(group?.alias).toBe('🚀 Super App');

    // Regular conversation is in conversations list
    expect(group?.conversations.some((c) => c.conversation_id === mockIdRegular)).toBe(true);
    // Probe conversation is excluded from main conversations list and isolated in probes
    expect(group?.conversations.some((c) => c.conversation_id === mockIdProbe)).toBe(false);
    expect(group?.probes?.some((p) => p.conversation_id === mockIdProbe)).toBe(true);

    // Clean up
    idx.delete(mockIdRegular);
    idx.delete(mockIdProbe);
    deleteProjectAlias(testWs);
  });

  it('project lock: upsertConversationSummary preserves existing workspace and prevents workspace drift', () => {
    const mockId = `test-lock-${Date.now()}`;
    const initialWs = `/tmp/test-project-fixed-${Date.now()}`;
    const driftedWs = `/tmp/test-project-subfolder-${Date.now()}`;

    const initialSummary: ConversationSummary = {
      conversation_id: mockId,
      title: 'Fixed Project Session',
      preview: 'Fixed Project Session',
      step_count: 5,
      last_modified_time: new Date().toISOString(),
      workspace_uris: [`file://${initialWs}`],
      status: 'COMPLETED',
      source: 'CLI',
      project_id: '',
      agent_name: '',
      parent_conversation_id: '',
      nesting_depth: 0,
      not_fully_idle: false,
      killed: false,
      last_user_input_time: new Date().toISOString()
    };

    const brainDir = path.join(getConfig().agyHome, 'brain', mockId);
    const transcriptFile = path.join(brainDir, '.system_generated', 'logs', 'transcript.jsonl');
    fs.mkdirSync(path.dirname(transcriptFile), { recursive: true });
    fs.writeFileSync(transcriptFile, '');

    upsertConversationSummary(initialSummary);

    const idx = new ConversationIndex();
    idx.load();
    const stored = idx.getById(mockId);
    expect(stored?.workspace_uris[0]).toBe(`file://${initialWs}`);

    // Simulate an external update/rescan that attempts to drift the workspace to driftedWs
    const driftedSummary: ConversationSummary = {
      ...initialSummary,
      step_count: 6,
      workspace_uris: [`file://${driftedWs}`]
    };

    upsertConversationSummary(driftedSummary);

    idx.load();
    const locked = idx.getById(mockId);
    // Workspace must remain immutably locked to initialWs!
    expect(locked?.workspace_uris[0]).toBe(`file://${initialWs}`);

    // Clean up
    idx.delete(mockId);
    try {
      fs.rmSync(brainDir, { recursive: true, force: true });
    } catch {}
  });
});
