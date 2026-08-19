# Task 2.6: Command danger highlighting in permission card

## Context
Task 2.6 of the audit fix plan. Fixes MEDIUM issue C-03.
Project: /Users/jason/myprojects/angryui

## Goal
Highlight dangerous command patterns in the permission authorization card with colored chips.

## Files to Create/Modify
- `src/lib/dangerCommands.ts` — CREATE
- Permission card component (find where `permission_required` events are rendered)

## Exact Changes

### src/lib/dangerCommands.ts
```typescript
export interface DangerPattern { pattern: RegExp; severity: 'high' | 'medium'; label: string; }

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
```

### Permission card
Find the component rendering `permission_required` events. After the command display, add:
```tsx
import { findDangerMatches } from '@/lib/dangerCommands';
// In JSX:
{dangers.length > 0 && (
  <div className="flex flex-wrap gap-1">
    {dangers.map(d => (
      <span key={d.label}
        className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
          d.severity === 'high' ? 'bg-destructive/20 text-destructive' : 'bg-yellow-500/20 text-yellow-600'
        }`}>
        ⚠ {d.label}
      </span>
    ))}
  </div>
)}
```

## Success Criteria
1. `npm test -- --run` → ALL pass
2. Commit: "feat(security): command danger pattern chips on permission card"

## Global Constraints
TypeScript strict ON · `npm test -- --run` must pass
