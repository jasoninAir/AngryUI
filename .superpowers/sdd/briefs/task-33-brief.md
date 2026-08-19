# Task 3.3: Virtualized message list (react-window)

## Context
Task 3.3 of the audit fix plan. Fixes LOW issue B-05.
Project: /Users/jason/myprojects/angryui

## Goal
Virtualize the chat message list so sessions with 1000+ messages don't lag.

## File to Modify
- `src/components/chat/MessageList.tsx`

## Changes
```bash
npm install react-window
```

Find the message list component. Replace the flat message rendering with `FixedSizeList` from react-window.
Estimate each message row at ~80px height.

```tsx
import { FixedSizeList } from 'react-window';
// In the render:
<FixedSizeList
  height={containerHeight}
  itemCount={messages.length}
  itemSize={80}
  width="100%"
>
  {({ index, style }) => (
    <div style={style}>
      {/* render message at messages[index] */}
    </div>
  )}
</FixedSizeList>
```

## Success Criteria
1. `npm test -- --run` → ALL pass
2. Commit: "perf(ui): virtualized message list for long conversations"
