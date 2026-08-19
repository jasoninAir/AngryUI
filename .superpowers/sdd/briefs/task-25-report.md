# Task 2.5 Report: useBatterySaver hook

## Summary
Created `useBatterySaver` hook and integrated it with `useWebSocket` to pause expensive WebSocket reconnect attempts when the browser tab is hidden.

## Files Changed

### Created: `src/hooks/useBatterySaver.ts`
- Exports `useBatterySaver()` hook that tracks `document.visibilityState`
- Returns `true` when tab is visible, `false` when hidden
- Handles SSR gracefully with `typeof document !== 'undefined'` check

### Modified: `src/hooks/useWebSocket.ts`
- Imported `useBatterySaver` hook
- Added visibility check in `ws.onclose` handler:
  - When tab is hidden: registers one-time `visibilitychange` listener to reconnect when visible
  - Resets `reconnectAttemptRef.current = 0` on tab refocus (backoff reset)
  - When tab is visible: normal reconnect behavior with exponential backoff

## Test Results
- All 87 tests passed
- No regressions

## Commit
`330360d` - feat(mobile): explicit useBatterySaver hook pauses WS when tab hidden
