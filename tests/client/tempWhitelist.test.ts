import { describe, it, expect, beforeEach } from 'vitest';
import {
  addTemporaryRule,
  isTemporarilyAllowed,
  getActiveTemporaryRules,
  removeTemporaryRule,
  clearAllTemporaryRules
} from '../../src/lib/tempWhitelist';

describe('tempWhitelist', () => {
  beforeEach(() => {
    clearAllTemporaryRules();
  });

  it('allows command within active temporary duration', () => {
    addTemporaryRule('npm test', 10 * 60 * 1000);
    expect(isTemporarilyAllowed('npm test')).toBe(true);
    expect(isTemporarilyAllowed('npm test -- --watch')).toBe(true);
    expect(isTemporarilyAllowed('rm -rf /')).toBe(false);
  });

  it('supports command(...) format', () => {
    addTemporaryRule('command(git status)', 10 * 60 * 1000);
    expect(isTemporarilyAllowed('git status')).toBe(true);
    expect(isTemporarilyAllowed('git push')).toBe(false);
  });

  it('reports active rules and remaining seconds', () => {
    addTemporaryRule('npm run build', 600 * 1000);
    const active = getActiveTemporaryRules();
    expect(active.length).toBe(1);
    expect(active[0].rule).toBe('npm run build');
    expect(active[0].remainingSeconds).toBeGreaterThan(500);
  });

  it('allows explicit rule revocation', () => {
    addTemporaryRule('python app.py', 10 * 60 * 1000);
    expect(isTemporarilyAllowed('python app.py')).toBe(true);

    removeTemporaryRule('python app.py');
    expect(isTemporarilyAllowed('python app.py')).toBe(false);
    expect(getActiveTemporaryRules().length).toBe(0);
  });

  it('expires rules after duration has elapsed', () => {
    addTemporaryRule('echo hello', -1000); // already expired
    expect(isTemporarilyAllowed('echo hello')).toBe(false);
    expect(getActiveTemporaryRules().length).toBe(0);
  });
});
