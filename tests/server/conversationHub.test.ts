import { describe, it, expect } from 'vitest';
import { ConversationHub, MAX_EVENTS_PER_TURN, MAX_TURNS_IN_MEMORY } from '../../server/ws/conversationHub';
import type { AgyEvent } from '../../server/utils/streamParser';

describe('ConversationHub Session Statuses', () => {
  it('tracks session statuses and broadcasts changes', () => {
    const hub = new ConversationHub();
    expect(hub.getStatus('conv-1')).toBe('IDLE');

    const statusChanges: Array<{ convId: string; status: string }> = [];
    const unsub = hub.onGlobalStatusChange((convId, status) => {
      statusChanges.push({ convId, status });
    });

    hub.setStatus('conv-1', 'RUNNING');
    expect(hub.getStatus('conv-1')).toBe('RUNNING');
    expect(hub.getAllStatuses()).toEqual({ 'conv-1': 'RUNNING' });

    hub.setStatus('conv-1', 'WAITING_INPUT');
    expect(hub.getStatus('conv-1')).toBe('WAITING_INPUT');

    hub.setStatus('conv-1', 'IDLE');
    expect(hub.getStatus('conv-1')).toBe('IDLE');
    expect(hub.getAllStatuses()).toEqual({});

    unsub();
    expect(statusChanges).toEqual([
      { convId: 'conv-1', status: 'RUNNING' },
      { convId: 'conv-1', status: 'WAITING_INPUT' },
      { convId: 'conv-1', status: 'IDLE' }
    ]);
  });
});

describe('ConversationHub Event Sequence & lastSeq Replay', () => {
  it('assigns monotonic seq numbers and broadcasts new events', () => {
    const hub = new ConversationHub();
    const convId = 'conv-seq-test';

    const published1 = hub.publish(convId, { type: 'step_update', step_index: 1, step_type: 'thought', state: 'RUNNING' });
    expect(published1.seq).toBe(1);

    const published2 = hub.publish(convId, { type: 'step_update', step_index: 2, step_type: 'tool', state: 'RUNNING' });
    expect(published2.seq).toBe(2);

    expect(hub.getCurrentSeq(convId)).toBe(2);
    expect(hub.getMinSeq(convId)).toBe(1);
  });

  it('replays only events > lastSeq on subscription', () => {
    const hub = new ConversationHub();
    const convId = 'conv-replay-test';

    hub.publish(convId, { type: 'step_update', step_index: 1, step_type: 'thought', state: 'RUNNING' });
    hub.publish(convId, { type: 'step_update', step_index: 2, step_type: 'tool', state: 'RUNNING' });
    hub.publish(convId, { type: 'step_update', step_index: 3, step_type: 'agent_response', state: 'RUNNING' });

    const received: Array<{ event: AgyEvent; seq: number }> = [];
    const handle = hub.subscribe(convId, (event, seq) => {
      received.push({ event, seq });
    }, 1);

    expect(handle.isTruncated).toBe(false);
    expect(handle.replayedCount).toBe(2);
    expect(received.map((r) => r.seq)).toEqual([2, 3]);

    // Future publish delivered live
    hub.publish(convId, { type: 'result', conversation_id: convId, status: 'SUCCESS', response: 'ok', duration_seconds: 1, num_turns: 1, usage: { input_tokens: 0, output_tokens: 0, thinking_tokens: 0, cache_read_tokens: 0, total_tokens: 0 } });
    expect(received.map((r) => r.seq)).toEqual([2, 3, 4]);

    handle.unsubscribe();
  });

  it('correctly isolates Turn-bucketed buffers (max 200 events/turn, max 5 turns in memory)', () => {
    const hub = new ConversationHub();
    const convId = 'conv-turn-bucket-test';

    // Simulate 6 turns, each with 210 events
    for (let turnIdx = 1; turnIdx <= 6; turnIdx++) {
      hub.publish(convId, {
        type: 'init',
        conversation_id: convId,
        model: 'Gemini 3.7 Flash',
        tools: ['command'],
        permission_mode: 'ask'
      }, `turn-${turnIdx}`);

      for (let evIdx = 2; evIdx <= 210; evIdx++) {
        hub.publish(convId, {
          type: 'step_update',
          step_index: evIdx,
          step_type: 'thought',
          state: 'RUNNING'
        }, `turn-${turnIdx}`);
      }
    }

    const turns = hub.getTurnBuffers(convId);
    expect(turns.length).toBe(MAX_TURNS_IN_MEMORY); // 5 turns max retained (turn 2 to 6)
    expect(turns[turns.length - 1].events.length).toBe(MAX_EVENTS_PER_TURN); // 200 events max per turn

    // Total retained events = 5 * 200 = 1000
    const allEvents = hub.getAllEvents(convId);
    expect(allEvents.length).toBe(1000);
    expect(hub.getCurrentSeq(convId)).toBe(6 * 210); // 1260
    // Turn 2 started at seq 211, had 210 events; earliest 10 shifted out => 211 + 10 = 221
    expect(hub.getMinSeq(convId)).toBe(221);
  });

  it('detects buffer truncation when lastSeq is older than ring buffer capacity', () => {
    const hub = new ConversationHub();
    const convId = 'conv-overflow-test';

    // Publish 1050 events across turns
    for (let i = 1; i <= 1050; i++) {
      hub.publish(convId, { type: 'step_update', step_index: i, step_type: 'thought', state: 'RUNNING' });
    }

    expect(hub.getCurrentSeq(convId)).toBe(1050);
    expect(hub.getMinSeq(convId)).toBe(851); // 1050 - 200 + 1 (single turn ring buffer capped at 200)

    const received: Array<{ event: AgyEvent; seq: number }> = [];
    // Client asks for events after lastSeq = 10 (which was evicted)
    const handle = hub.subscribe(convId, (event, seq) => {
      received.push({ event, seq });
    }, 10);

    expect(handle.isTruncated).toBe(true);
    expect(handle.minSeq).toBe(851);
    expect(handle.replayedCount).toBe(200);
    expect(received[0].seq).toBe(851);
    expect(received[received.length - 1].seq).toBe(1050);

    handle.unsubscribe();
  });

  it('getEventsSince returns missed events and truncation status', () => {
    const hub = new ConversationHub();
    const convId = 'conv-since-test';

    for (let i = 1; i <= 5; i++) {
      hub.publish(convId, { type: 'step_update', step_index: i, step_type: 'thought', state: 'RUNNING' });
    }

    const res = hub.getEventsSince(convId, 3);
    expect(res.isTruncated).toBe(false);
    expect(res.events.map((e) => e.seq)).toEqual([4, 5]);
    expect(res.currentSeq).toBe(5);
  });
});
