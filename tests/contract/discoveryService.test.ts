import { describe, it, expect, afterAll } from 'vitest';
import { DiscoveryService } from '../../server/services/discoveryService';
import { ConversationIndex } from '../../server/db/conversationIndex';

describe('DiscoveryService', () => {
  let service: DiscoveryService;
  let idx: ConversationIndex;

  afterAll(() => service?.stop());

  it('starts and loads initial conversations', () => {
    idx = new ConversationIndex();
    service = new DiscoveryService(idx);
    const events: any[] = [];
    service.start((e) => events.push(e));
    expect(idx.getAll().length).toBeGreaterThan(0);
  });
});
