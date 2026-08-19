import { describe, it, expect } from 'vitest';
import { notificationManager } from '../../src/lib/notificationManager';

describe('notificationManager', () => {
  it('manages enable/disable state safely', () => {
    expect(typeof notificationManager.isEnabled()).toBe('boolean');
    notificationManager.setEnabled(false);
    expect(notificationManager.isEnabled()).toBe(false);
    notificationManager.setEnabled(true);
    expect(notificationManager.isEnabled()).toBe(true);
  });

  it('detects notification support gracefully in node/browser environment', () => {
    const supported = notificationManager.isSupported();
    expect(typeof supported).toBe('boolean');
  });

  it('handles permission check and returns default/denied/granted if unsupported', () => {
    const perm = notificationManager.getPermission();
    expect(['granted', 'denied', 'default']).toContain(perm);
  });

  it('can call notifyTaskComplete and notifyPermissionRequired safely without throwing', () => {
    expect(() => notificationManager.notifyTaskComplete()).not.toThrow();
    expect(() => notificationManager.notifyPermissionRequired('rm -rf /')).not.toThrow();
  });
});
