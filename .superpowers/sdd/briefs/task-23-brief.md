# Task 2.3: WebTTY virtual key ≥44pt + more keys

## Context
Task 2.3 of the audit fix plan. Fixes MEDIUM issue B-04.
Project: /Users/jason/myprojects/angryui

## Goal
Virtual keys on mobile: 44pt min height, more keys (Ctrl+D, Ctrl+W, PgUp, PgDn), safe area padding.

## File to Modify
- `src/components/tui/WebTTYModal.tsx`

## Exact Changes
Replace the VIRTUAL_KEYS array and button JSX:

```typescript
const VIRTUAL_KEYS: Array<{ label: string; input: string; minW?: number }> = [
  { label: 'Esc',   input: '\x1b',     minW: 58 },
  { label: 'Tab',   input: '\t',        minW: 58 },
  { label: 'Ctrl+C',input: '\x03',      minW: 58 },
  { label: 'Ctrl+D',input: '\x04',      minW: 58 },
  { label: 'Ctrl+W',input: '\x17',      minW: 58 },
  { label: '↑',     input: '\x1b[A',   minW: 44 },
  { label: '↓',     input: '\x1b[B',   minW: 44 },
  { label: '←',     input: '\x1b[D',   minW: 44 },
  { label: '→',     input: '\x1b[C',   minW: 44 },
  { label: 'PgUp',  input: '\x1b[5~', minW: 58 },
  { label: 'PgDn',  input: '\x1b[6~', minW: 58 },
  { label: 'Enter',  input: '\r',       minW: 58 },
];
```

Button style:
```tsx
className={`shrink-0 h-[44px] text-xs font-mono border border-border rounded bg-secondary text-secondary-foreground active:opacity-60 ${k.minW ? '' : ''}`}
style={{ minWidth: k.minW ?? 58 }}
```

And the container div:
```tsx
className="border-t border-border px-2 py-2 pb-safe flex gap-1 overflow-x-auto"
```

## Success Criteria
1. `npm test -- --run` → ALL pass
2. Commit: "feat(mobile): WebTTY virtual keys 44pt min height + PgUp/Down, Ctrl+D/W"

## Global Constraints
TypeScript strict ON · `npm test -- --run` must pass
