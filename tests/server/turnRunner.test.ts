import { describe, it, expect, beforeAll } from 'vitest';
import { TurnRunner } from '../../server/services/turnRunner';
import { ConversationIndex } from '../../server/db/conversationIndex';

describe('TurnRunner', () => {
  let testConversationId: string;

  // Defensive: dynamically pick a real conversation ID rather than hardcoding.
  // Avoids flaky tests when conversations are archived or DB is rebuilt.
  beforeAll(() => {
    const idx = new ConversationIndex();
    idx.load();
    const all = idx.getAll();
    if (all.length === 0) {
      throw new Error('No conversations in AGY storage—run an `agy` session first.');
    }
    testConversationId = all[0].conversation_id;
  });

  it('spawns agy and receives init event', async () => {
    const runner = new TurnRunner();
    const handle = runner.spawn({
      conversationId: testConversationId,
      message: 'say hi',
      model: 'Gemini 3.7 Flash (High)'
    });

    let initSeen = false;
    let resultSeen = false;
    for await (const ev of handle.events) {
      if (ev.type === 'init') initSeen = true;
      if (ev.type === 'result') {
        resultSeen = true;
        expect(ev.status).toBe('SUCCESS');
        break;
      }
    }
    expect(initSeen).toBe(true);
    expect(resultSeen).toBe(true);
  }, 60000);

  it('abort() sends SIGINT', async () => {
    const runner = new TurnRunner();
    const handle = runner.spawn({
      conversationId: testConversationId,
      message: 'long task',
      model: 'Gemini 3.7 Flash (High)'
    });

    setTimeout(() => handle.abort(), 1000);

    let closed = false;
    for await (const _ of handle.events) {
      // consume
    }
    closed = true;
    expect(closed).toBe(true);
  }, 30000);
});
