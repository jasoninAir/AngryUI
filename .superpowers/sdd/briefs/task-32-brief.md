# Task 3.2: ARIA accessibility pass

## Context
Task 3.2 of the audit fix plan. Fixes MEDIUM issue F-01.
Project: /Users/jason/myprojects/angryui

## Goal
Add ARIA roles and labels throughout the UI.

## Files to Modify
- `src/components/sidebar/Sidebar.tsx`
- `src/components/chat/ChatInput.tsx`
- `src/components/tui/WebTTYModal.tsx`
- `src/App.tsx`

## Exact Changes

### Sidebar — add navigation role
```tsx
<nav role="navigation" aria-label="Main navigation">
```

### ChatInput — add live region and label
```tsx
<textarea
  aria-label="Chat message input"
  aria-live="polite"
  ...
/>
```

### WebTTYModal — dialog semantics
```tsx
<div
  role="dialog"
  aria-modal="true"
  aria-label={`WebTTY terminal — ${conversationId.slice(0, 8)}`}
>
```

### App.tsx — skip-to-content
```tsx
<a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded">
  Skip to main content
</a>
<main id="main-content">
  {/* existing app content */}
</main>
```

## Success Criteria
1. `npm test -- --run` → ALL pass
2. Commit: "a11y: ARIA roles, labels, skip-to-content, dialog modal semantics"
