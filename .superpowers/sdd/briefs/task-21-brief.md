# Task 2.1: Reconnecting status UI in sidebar

## Context
Task 2.1 of the audit fix plan. Fixes MEDIUM issue A-08.
Project: /Users/jason/myprojects/angryui

## Goal
Show "Reconnecting (N)…" in the sidebar when WebSocket is down.

## Files to Modify
- `src/hooks/useWebSocket.ts` — expose `retryCount` via return (Task 1.2 added it — verify it's there)
- `src/components/sidebar/Sidebar.tsx` — add reconnecting indicator with retry count

## Exact Changes
In Sidebar, when rendering the connection status:
```tsx
// Import useWebSocket or pass retryCount as prop from parent
// Show when WS is not open:
{readyState === WebSocket.CONNECTING && (
  <span className="text-xs text-muted-foreground">Connecting…</span>
)}
{readyState === WebSocket.CLOSED && retryCount > 0 && (
  <span className="text-xs text-yellow-500">Reconnecting ({retryCount})…</span>
)}
{readyState === WebSocket.CLOSED && retryCount === 0 && (
  <span className="text-xs text-destructive">Disconnected</span>
)}
```

## Success Criteria
1. `npm test -- --run` → ALL pass
2. Commit: "feat(ui): reconnecting status indicator with retry count"

## Global Constraints
TypeScript strict ON · `npm test -- --run` must pass
