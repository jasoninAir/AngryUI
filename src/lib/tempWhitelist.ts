export interface TemporaryRule {
  rule: string;
  commandPattern: RegExp;
  expiresAt: number;
  addedAt: number;
}

// In-memory array of active temporary whitelist rules
let temporaryRules: TemporaryRule[] = [];

/**
 * Convert a command or pattern string to a RegExp for matching.
 * e.g. "npm test" -> exact/prefix match
 * "command(npm test)" -> matches "npm test"
 */
function createPatternRegex(rule: string): RegExp {
  let clean = rule.trim();
  const cmdMatch = /^command\((.*)\)$/.exec(clean);
  if (cmdMatch) {
    clean = cmdMatch[1].trim();
  }

  // Escape special regex chars except wildcard *
  const escaped = clean
    .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
    .replace(/\*/g, '.*');

  return new RegExp(`^${escaped}`, 'i');
}

/**
 * Add a temporary rule for specified duration (default: 10 minutes)
 */
export function addTemporaryRule(ruleOrCommand: string, durationMs: number = 10 * 60 * 1000): TemporaryRule {
  const clean = ruleOrCommand.trim();
  const now = Date.now();
  const expiresAt = now + durationMs;
  const commandPattern = createPatternRegex(clean);

  // Remove existing duplicate if present
  temporaryRules = temporaryRules.filter(r => r.rule !== clean && r.expiresAt > now);

  const newRule: TemporaryRule = {
    rule: clean,
    commandPattern,
    expiresAt,
    addedAt: now
  };

  temporaryRules.push(newRule);
  return newRule;
}

/**
 * Check if a command is currently allowed by any active temporary whitelist rule
 */
export function isTemporarilyAllowed(cmd: string): boolean {
  if (!cmd || typeof cmd !== 'string') return false;
  const now = Date.now();
  const cleanCmd = cmd.trim();

  // Purge expired
  temporaryRules = temporaryRules.filter(r => r.expiresAt > now);

  return temporaryRules.some(r => r.commandPattern.test(cleanCmd));
}

/**
 * Get all active temporary rules with remaining time
 */
export function getActiveTemporaryRules(): { rule: string; expiresAt: number; remainingSeconds: number }[] {
  const now = Date.now();
  temporaryRules = temporaryRules.filter(r => r.expiresAt > now);

  return temporaryRules.map(r => ({
    rule: r.rule,
    expiresAt: r.expiresAt,
    remainingSeconds: Math.max(0, Math.round((r.expiresAt - now) / 1000))
  }));
}

/**
 * Remove a temporary rule by string
 */
export function removeTemporaryRule(rule: string): void {
  temporaryRules = temporaryRules.filter(r => r.rule !== rule);
}

/**
 * Clear all temporary rules
 */
export function clearAllTemporaryRules(): void {
  temporaryRules = [];
}
