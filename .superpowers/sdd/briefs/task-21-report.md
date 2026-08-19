# Task 2.1 Report: Reconnecting status UI in sidebar

## Summary
Implemented WebSocket connection status indicator in the sidebar showing reconnecting state with retry count.

## Changes Made

### 1. `src/context/SessionStatusContext.tsx`
- Extended `SessionStatusContextType` interface to include `wsReadyState` and `wsRetryCount`
- Updated `useWebSocket` hook call to destructure `readyState` and `retryCount`
- Added `wsReadyState` and `wsRetryCount` to context value

### 2. `src/components/sidebar/Sidebar.tsx`
- Added import for `useSessionStatus` hook
- Added import for `WifiOff` icon from lucide-react
- Added `wsReadyState` and `wsRetryCount` destructuring from `useSessionStatus()`
- Restructured header to use flex column layout
- Added connection status indicator in header:
  - "Connecting…" (gray text) when `wsReadyState === WebSocket.CONNECTING`
  - "Reconnecting (N)…" (amber text with spinning icon) when `wsReadyState === WebSocket.CLOSED && wsRetryCount > 0`
  - "Disconnected" (red text with WifiOff icon) when `wsReadyState === WebSocket.CLOSED && wsRetryCount === 0`

## Verification
- All 87 tests pass (`npm test -- --run`)
- TypeScript strict mode enabled, no type errors
- Commit: "feat(ui): reconnecting status indicator with retry count"

## Files Modified
- `/Users/jason/myprojects/angryui/src/context/SessionStatusContext.tsx`
- `/Users/jason/myprojects/angryui/src/components/sidebar/Sidebar.tsx`
