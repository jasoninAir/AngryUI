import { describe, it, expect } from 'vitest';
import { listConversationArtifacts, getArtifactDetail } from '../../server/services/artifactsService';

describe('artifactsService', () => {
  it('returns empty list for non-existent session', () => {
    const list = listConversationArtifacts('non-existent-session-id');
    expect(Array.isArray(list)).toBe(true);
    expect(list.length).toBe(0);
  });

  it('returns null for non-existent artifact file', () => {
    const detail = getArtifactDetail('non-existent-session', 'doc.md');
    expect(detail).toBeNull();
  });
});
