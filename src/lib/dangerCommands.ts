export type DangerSeverity = 'critical' | 'high' | 'medium';

export interface DangerPattern {
  id: string;
  pattern: RegExp;
  severity: DangerSeverity;
  label: string;
  description: string;
}

export const DANGER_PATTERNS: DangerPattern[] = [
  // Critical: Catastrophic destruction
  {
    id: 'rm-root',
    pattern: /rm\s+-[a-zA-Z]*r[a-zA-Z]*f[a-zA-Z]*\s+[\/~]/i,
    severity: 'critical',
    label: 'rm -rf / or ~',
    description: 'Catastrophic root or home filesystem deletion'
  },
  {
    id: 'fork-bomb',
    pattern: /:\(\)\s*\{\s*:\s*\|\s*:\s*&\s*\}\s*;\s*:/,
    severity: 'critical',
    label: 'Fork Bomb',
    description: 'System resource exhaustion attack'
  },
  {
    id: 'disk-overwrite',
    pattern: />\s*\/dev\/(sd[a-z]|nvme[0-9]|disk[0-9])/i,
    severity: 'critical',
    label: 'Raw Disk Write',
    description: 'Direct block device overwrite risk'
  },
  {
    id: 'mkfs-format',
    pattern: /\bmkfs\b/i,
    severity: 'critical',
    label: 'Filesystem Format',
    description: 'Formatting raw partition or drive'
  },

  // High: Remote execution & permission compromise
  {
    id: 'curl-pipe-sh',
    pattern: /curl\s+[^|]+\|\s*(ba|z)?sh/i,
    severity: 'high',
    label: 'curl | bash',
    description: 'Unchecked remote script execution'
  },
  {
    id: 'wget-pipe-sh',
    pattern: /wget\s+[^|]+\|\s*(ba|z)?sh/i,
    severity: 'high',
    label: 'wget | sh',
    description: 'Unchecked remote script execution'
  },
  {
    id: 'chmod-777',
    pattern: /chmod\s+(-[a-zA-Z]*R[a-zA-Z]*\s+)?777\b/i,
    severity: 'high',
    label: 'chmod 777',
    description: 'Full world-writable permissions leak'
  },
  {
    id: 'reverse-shell',
    pattern: /\/dev\/tcp\/|\bnc\s+.*-e\b|\bsocat\s+exec/i,
    severity: 'high',
    label: 'Reverse Shell',
    description: 'Remote interactive socket connection'
  },
  {
    id: 'db-drop',
    pattern: /\b(DROP\s+DATABASE|DROP\s+TABLE|TRUNCATE\s+TABLE)\b/i,
    severity: 'high',
    label: 'SQL DROP / TRUNCATE',
    description: 'Destructive database schema deletion'
  },

  // Medium: Force git or privileged operations
  {
    id: 'git-force-push',
    pattern: /git\s+push\s+.*(--force|-f)\b/i,
    severity: 'medium',
    label: 'git push --force',
    description: 'Remote branch history overwrite'
  },
  {
    id: 'git-reset-hard',
    pattern: /git\s+reset\s+--hard\b/i,
    severity: 'medium',
    label: 'git reset --hard',
    description: 'Discards uncommitted working tree changes'
  },
  {
    id: 'git-clean-force',
    pattern: /git\s+clean\s+-[a-zA-Z]*f[a-zA-Z]*/i,
    severity: 'medium',
    label: 'git clean -f',
    description: 'Permanently deletes untracked files'
  },
  {
    id: 'sudo-destructive',
    pattern: /sudo\s+(rm|dd|mkfs|shutdown|reboot)\b/i,
    severity: 'medium',
    label: 'sudo command',
    description: 'Privileged administrative system modification'
  }
];

export function findDangerMatches(cmd: string): DangerPattern[] {
  if (!cmd || typeof cmd !== 'string') return [];
  const cleanCmd = cmd.trim();
  return DANGER_PATTERNS.filter(p => p.pattern.test(cleanCmd));
}

export function getHighestDangerSeverity(matches: DangerPattern[]): DangerSeverity | null {
  if (!matches || matches.length === 0) return null;
  if (matches.some(m => m.severity === 'critical')) return 'critical';
  if (matches.some(m => m.severity === 'high')) return 'high';
  return 'medium';
}
