# Task 2.4: iOS Safari clipboard paste fallback

## Context
Task 2.4 of the audit fix plan. Fixes MEDIUM issue B-02.
Project: /Users/jason/myprojects/angryui

## Goal
Improve iOS Safari clipboard image paste reliability; paperclip button is manual fallback.

## File to Modify
- `src/components/chat/ChatInput.tsx`

## Changes
The existing `extractClipboardFiles` (lines 45-75) and `handleGlobalPaste` (lines 154-169) are already reasonable.
The paperclip button + `<input type="file" accept="image/*">` already serves as the manual fallback.

Enhance the paste handler to handle denial gracefully:
In `handleGlobalPaste`, after the existing `if (files.length === 0)` block, ensure the paperclip button path is clear. No new UI needed.

If `files.length === 0` after standard approach, the paperclip button already lets user pick manually — this is the fallback.

## Success Criteria
1. `npm test -- --run` → ALL pass
2. Commit: "fix(mobile): iOS Safari clipboard paste — explicit event + fallback"

## Global Constraints
TypeScript strict ON · `npm test -- --run` must pass
