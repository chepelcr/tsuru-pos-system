# Dark Mode

## Design system support
`src/index.css` already defines CSS variables for both light and dark themes:
```css
:root { /* light tokens */ }
.dark { /* dark tokens — same var names, different values */ }
```

## Toggle button location
Add a sun/moon icon button to the `DashboardShell` header (`src/components/layout/DashboardShell.tsx`), next to the "Sincronizar" button.

## Implementation

### 1. Hook `src/hooks/useDarkMode.ts`
```typescript
import { useState, useEffect } from "react";

export function useDarkMode() {
  const [dark, setDark] = useState(() => {
    const saved = localStorage.getItem("theme");
    if (saved) return saved === "dark";
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("theme", dark ? "dark" : "light");
  }, [dark]);

  return { dark, toggle: () => setDark((d) => !d) };
}
```

### 2. Toggle button in DashboardShell header
```tsx
const { dark, toggle } = useDarkMode();

<Button variant="ghost" size="sm" icon={dark ? "sun" : "moon"} onClick={toggle} />
```

### 3. Persistence
- Stored in `localStorage` under key `"theme"`
- Read on app load so there's no flash of wrong theme
- Respects `prefers-color-scheme` as default when no saved preference

## Notes
- The `sun` and `moon` icons are already defined in `src/components/ui/Icon.tsx`
- No additional CSS is needed — the `.dark` class activates the existing token overrides
- The POS screens (`POSPage`, `InventoryOpening`, `ClosingFlow`) will also benefit since they use the same HSL variables
