import { describe, it, expect } from 'vitest';
import { getSkillsAndRules, toggleSkillStatus } from '../../server/services/skillsService';

describe('skillsService', () => {
  it('discovers skills and rules without throwing', () => {
    const result = getSkillsAndRules();
    expect(result).toBeDefined();
    expect(Array.isArray(result.skills)).toBe(true);
    expect(Array.isArray(result.rules)).toBe(true);
  });

  it('can toggle skill enabled status safely', () => {
    const status = toggleSkillStatus('test_skill_mock', false);
    expect(typeof status).toBe('boolean');
    expect(status).toBe(false);

    const reverted = toggleSkillStatus('test_skill_mock', true);
    expect(reverted).toBe(true);
  });
});
