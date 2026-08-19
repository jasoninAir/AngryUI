# Task 2.2: Manual dark/light mode toggle

## Context
Task 2.2 of the audit fix plan. Fixes MEDIUM issue B-03.
Project: /Users/jason/myprojects/angryui

## Goal
Manual dark/light toggle persisted to localStorage. System preference is default.

## Files to Modify
- `tailwind.config.js` — `darkMode: 'media'` → `'class'`
- `src/components/common/ThemeToggle.tsx` — CREATE
- `src/App.tsx` or header component — add the toggle button

## Exact Changes
### tailwind.config.js
```javascript
// BEFORE:
darkMode: 'media',
// AFTER:
darkMode: 'class',
```

### src/components/common/ThemeToggle.tsx
```tsx
import { Sun, Moon } from 'lucide-react';
import { useEffect, useState } from 'react';

export function ThemeToggle() {
  const [dark, setDark] = useState(() => {
    const s = localStorage.getItem('theme');
    if (s) return s === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('theme', dark ? 'dark' : 'light');
  }, [dark]);
  return (
    <button
      onClick={() => setDark(!dark)}
      className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
      aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
    </button>
  );
}
```

Add `<ThemeToggle />` to the sidebar header or main app header.

## Success Criteria
1. `npm test -- --run` → ALL pass
2. Commit: "feat(ui): manual dark/light mode toggle persisted to localStorage"

## Global Constraints
TypeScript strict ON · `npm test -- --run` must pass
