export interface DangerPattern {
  pattern: RegExp;
  severity: 'high' | 'medium';
  label: string;
}

export const DANGER_PATTERNS: DangerPattern[] = [
  { pattern: /curl.*\|.*(sh|bash|bashrc)/i, severity: 'high', label: 'curl | sh' },
  { pattern: /wget.*\|.*(sh|bash)/i, severity: 'high', label: 'wget | sh' },
  { pattern: /rm\s+-rf\s+\/(?:\s|$)/i, severity: 'high', label: 'rm -rf /' },
  { pattern: /chmod\s+-R?\s*777\b/i, severity: 'high', label: 'chmod 777' },
  { pattern: /git\s+(push|reset\s+--hard|force)\b/i, severity: 'medium', label: 'git push/reset --hard' },
  { pattern: /sudo\s+rm\b/i, severity: 'medium', label: 'sudo rm' },
];

export function findDangerMatches(cmd: string): DangerPattern[] {
  return DANGER_PATTERNS.filter(p => p.pattern.test(cmd));
}
