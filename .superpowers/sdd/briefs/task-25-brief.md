# Task 2.5: useBatterySaver hook

## Context
Task 2.5 of the audit fix plan. Fixes MEDIUM issue F-03.
Project: /Users/jason/myprojects/angryui

## Goal
Explicit `useBatterySaver` hook that pauses expensive work when tab is hidden.

## Files to Create/Modify
- `src/hooks/useBatterySaver.ts` — CREATE
- `src/hooks/useWebSocket.ts` — pause reconnect when tab hidden, reset backoff on refocus

## Exact Changes

### src/hooks/useBatterySaver.ts
```typescript
import { useEffect, useState } from 'react';

export function useBatterySaver() {
  const [isVisible, setIsVisible] = useState(
    typeof document !== 'undefined' ? document.visibilityState === 'visible' : true
  );
  useEffect(() => {
    const handler = () => setIsVisible(document.visibilityState === 'visible');
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  }, []);
  return isVisible;
}
```

### src/hooks/useWebSocket.ts
In the `connect()` function, before scheduling reconnect on close:
```typescript
if (!isVisible) {
  const handleVisible = () => {
    document.removeEventListener('visibilitychange', handleVisible);
    reconnectAttemptRef.current = 0;
    connect();
  };
  document.addEventListener('visibilitychange', handleVisible);
  return;
}
```

## Success Criteria
1. `npm test -- --run` → ALL pass
2. Commit: "feat(mobile): explicit useBatterySaver hook pauses WS when tab hidden"

## Global Constraints
TypeScript strict ON · `npm test -- --run` must pass
