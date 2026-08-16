import { describe, it, expect } from 'vitest';
import { soundManager } from '../../src/lib/sound';

describe('SoundManager', () => {
  it('has enabled property and toggle capabilities', () => {
    expect(typeof soundManager.isEnabled()).toBe('boolean');
    soundManager.setEnabled(false);
    expect(soundManager.isEnabled()).toBe(false);
    soundManager.setEnabled(true);
    expect(soundManager.isEnabled()).toBe(true);
  });

  it('can call playTaskComplete and playAttentionRequired safely without error', () => {
    expect(() => soundManager.playTaskComplete()).not.toThrow();
    expect(() => soundManager.playAttentionRequired()).not.toThrow();
  });
});
