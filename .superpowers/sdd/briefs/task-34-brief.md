# Task 3.4: Camera capture button for mobile

## Context
Task 3.4 of the audit fix plan. Fixes LOW issue B-06.
Project: /Users/jason/myprojects/angryui

## Goal
Add camera button with `capture="environment"` for direct mobile photo taking.

## File to Modify
- `src/components/chat/ChatInput.tsx`

## Changes
In the file input, add `capture="environment"`:
```tsx
<input
  ref={fileInputRef}
  type="file"
  multiple
  accept="image/*,video/*"
  capture="environment"
  onChange={handleFileChange}
  className="hidden"
/>
```

Add camera button next to paperclip button:
```tsx
<button
  type="button"
  onClick={() => fileInputRef.current?.click()}
  title={t('takePhoto') || 'Take photo'}
  className="h-11 w-10 flex items-center justify-center rounded-lg border border-input bg-background text-muted-foreground hover:text-foreground hover:bg-accent transition-colors shrink-0 cursor-pointer"
>
  <Camera className="w-4 h-4" />
</button>
```
Add `Camera` to the lucide-react import.

## Success Criteria
1. `npm test -- --run` → ALL pass
2. Commit: "feat(mobile): camera capture button with capture=environment"
