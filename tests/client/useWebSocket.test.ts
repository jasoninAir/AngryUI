import { describe, it, expect } from 'vitest';
import { getBackoffDelay } from '../../src/hooks/useWebSocket';

describe('getBackoffDelay', () => {
  it('starts at ~1000ms for first attempt', () => {
    const d = getBackoffDelay(0);
    expect(d).toBeGreaterThanOrEqual(1000);
    expect(d).toBeLessThanOrEqual(1500);  // 1000 + jitter
  });
  it('doubles for second attempt', () => {
    const d = getBackoffDelay(1);
    expect(d).toBeGreaterThanOrEqual(2000);
    expect(d).toBeLessThanOrEqual(2500);  // 2000 + jitter
  });
  it('caps at MAX_DELAY_MS (30000)', () => {
    const d = getBackoffDelay(20);
    expect(d).toBeLessThanOrEqual(30500);  // 30000 + jitter
  });
});
