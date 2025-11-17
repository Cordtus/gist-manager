# Park UI Migration Plan

**Status:** 🔴 **REQUIRES APPROVAL - Major Architecture Change**

---

## Critical Understanding

### What Park UI Actually Is

Park UI is **NOT a drop-in replacement for shadcn/ui**. It's a completely different architecture:

| Aspect | shadcn/ui (Current) | Park UI (Proposed) |
|--------|---------------------|-------------------|
| **Styling** | Tailwind CSS | Panda CSS (CSS-in-JS) |
| **Components** | Radix UI primitives | Ark UI primitives |
| **Installation** | Copy/paste components | CLI + package installation |
| **Config** | `tailwind.config.js` | `panda.config.ts` |
| **Classes** | Utility classes | CSS-in-JS recipes |
| **Build** | Tailwind PostCSS | Panda extraction |

### What This Means

**We just completed a major refactor to shadcn/ui (5b920f5).**
**Migrating to Park UI means:**

1. ❌ **Removing all the work just done:**
   - Delete all shadcn components (`src/components/ui/`)
   - Remove Tailwind configuration
   - Remove Tailwind utility classes from all components
   - Uninstall Radix UI packages

2. 🔄 **Complete rewrite:**
   - Install Panda CSS
   - Install Ark UI
   - Rewrite every component
   - Convert all Tailwind classes to Panda recipes
   - Restructure theme system

3. ⏱️ **Time investment:**
   - Estimated 12-16 hours of work
   - High risk of breaking existing functionality
   - Testing required for every page

---

## Detailed Migration Steps

### Phase 1: Remove Current Stack (2-3 hours)

#### 1.1 Uninstall Dependencies
```bash
npm uninstall tailwindcss tailwindcss-animate postcss autoprefixer
npm uninstall class-variance-authority clsx tailwind-merge
npm uninstall @radix-ui/react-slot @radix-ui/react-separator
npm uninstall @radix-ui/react-dialog @radix-ui/react-dropdown-menu
npm uninstall @radix-ui/react-tabs @radix-ui/react-tooltip
npm uninstall @radix-ui/react-select
```

#### 1.2 Delete Files
- ❌ `client/tailwind.config.js`
- ❌ `client/src/styles/globals.css` (shadcn theme)
- ❌ `client/src/components/ui/button.jsx`
- ❌ `client/src/components/ui/card.jsx`
- ❌ `client/src/components/ui/input.jsx`
- ❌ `client/src/components/ui/badge.jsx`
- ❌ `client/src/components/ui/separator.jsx`
- ❌ `client/src/components/ui/tabs.jsx`
- ❌ `client/src/components/ui/textarea.jsx`
- ❌ `client/src/lib/utils.js` (cn helper)

#### 1.3 Components Requiring Rewrite
All components with shadcn imports:
- `Header.js` - Remove Button, Separator
- `Sidebar.js` - Remove Button, Separator
- `Dashboard.js` - Remove Card, Button, Badge, Separator
- `GistList.js` - Remove Card, Button, Input, Badge, Separator
- `App.js` - Remove globals.css import

**All Tailwind classes must be removed from:**
- Header, Sidebar, Dashboard, GistList, Layout, Spinner
- Any component using `className` with Tailwind utilities

---

### Phase 2: Install Park UI (1 hour)

#### 2.1 Install Dependencies
```bash
# Install Panda CSS
npm install -D @pandacss/dev

# Initialize Panda
npx panda init

# Install Park UI preset
npm install -D @park-ui/panda-preset

# Install Ark UI for React
npm install @ark-ui/react
```

#### 2.2 Configure Panda CSS
Create `panda.config.ts`:
```typescript
import { defineConfig } from '@pandacss/dev'
import { createPreset } from '@park-ui/panda-preset'

export default defineConfig({
  preflight: true,
  presets: [
    '@pandacss/preset-base',
    createPreset({
      accentColor: 'blue',
      grayColor: 'neutral',
      borderRadius: 'md',
    }),
  ],
  include: ['./src/**/*.{js,jsx,ts,tsx}'],
  exclude: [],
  outdir: 'styled-system',
  jsxFramework: 'react',
})
```

#### 2.3 Update package.json Scripts
```json
{
  "scripts": {
    "prepare": "panda codegen",
    "start": "panda codegen && react-scripts start",
    "build": "panda codegen && react-scripts build"
  }
}
```

---

### Phase 3: Install Park UI Components (2-3 hours)

#### 3.1 Use Park UI CLI
```bash
# Install CLI
npm install -g @park-ui/cli

# Add components we need
park-ui add button
park-ui add card
park-ui add input
park-ui add badge
park-ui add separator
park-ui add tabs
park-ui add splitter  # For editor!
park-ui add dialog
park-ui add dropdown-menu
park-ui add tooltip
```

#### 3.2 Component Structure
Park UI components will be in `src/components/ui/` but with different API:
- Use Ark UI primitives
- Style with Panda CSS recipes
- Different prop names than Radix UI

---

### Phase 4: Rewrite Components (6-8 hours)

#### 4.1 Header Component
**Before (shadcn):**
```jsx
import { Button } from './ui/button';
<Button variant="ghost" size="icon">
```

**After (Park UI):**
```jsx
import { Button } from '~/components/ui/button';
<Button variant="ghost">
```

**Changes:**
- Remove all `className` props with Tailwind
- Use Panda CSS recipes/styles
- Update prop names to match Ark UI

#### 4.2 Dashboard Component
**Before:**
- Uses shadcn Card, CardHeader, CardTitle, etc.
- Tailwind classes for layout
- Radix UI primitives

**After:**
- Park UI Card components
- Panda CSS for layout (`css()` function)
- Ark UI primitives

#### 4.3 GistList Component
**Before:**
```jsx
<Card className="flex flex-col hover:shadow-lg transition-shadow">
  <Input className="pl-10" />
  <Badge variant="outline">
```

**After:**
```jsx
<Card> {/* Uses Panda recipes */}
  <Input /> {/* Styled with Panda */}
  <Badge variant="outline">
```

#### 4.4 GistEditor Component (★ Key Benefit: Splitter!)
**Before:**
- Custom resize handle implementation
- Manual split panel logic
- CSS-based resizing

**After:**
```jsx
import { Splitter } from '~/components/ui/splitter';

<Splitter.Root>
  <Splitter.Panel>
    {/* Editor */}
  </Splitter.Panel>
  <Splitter.ResizeTrigger />
  <Splitter.Panel>
    {/* Preview */}
  </Splitter.Panel>
</Splitter.Root>
```

**This is a major improvement!**

---

### Phase 5: Theme System (2-3 hours)

#### 5.1 Convert CSS Variables to Panda Tokens
**Before (theme.css):**
```css
:root {
  --color-bg: #0F1419;
  --color-primary: #5A67D8;
}
```

**After (panda.config.ts tokens):**
```typescript
tokens: {
  colors: {
    bg: { value: '#0F1419' },
    primary: { value: '#5A67D8' },
  }
}
```

#### 5.2 Update Styling Approach
**Before:**
```jsx
<div className="bg-background text-foreground p-4">
```

**After:**
```jsx
import { css } from '../styled-system/css'
<div className={css({ bg: 'bg', color: 'foreground', p: 4 })}>
```

Or use Park UI's built-in styling.

---

### Phase 6: Testing & Fixes (2-3 hours)

Test every page and component:
- ✅ Dashboard loads correctly
- ✅ GistList search/filter works
- ✅ GistEditor with new Splitter
- ✅ Header theme toggle
- ✅ Sidebar navigation
- ✅ All buttons clickable
- ✅ All forms submittable
- ✅ Dark/light mode switching
- ✅ Responsive design intact
- ✅ Markdown preview styling

---

## Components We'd Gain

### New Components from Park UI
1. **Splitter** ⭐ - Resizable panels (major upgrade for editor)
2. **Accordion** - Collapsible sections
3. **Avatar** - User profile images
4. **Checkbox** - Better form controls
5. **Combobox** - Enhanced select
6. **DatePicker** - Date selection
7. **Drawer** - Side panels
8. **Menu** - Dropdown menus
9. **Popover** - Floating content
10. **Radio Group** - Radio buttons
11. **Select** - Dropdowns
12. **Slider** - Range inputs
13. **Switch** - Toggle switches
14. **Toast** - Notifications
15. **Tooltip** - Hover information

---

## Components We'd Lose

### From Current Implementation
- lucide-react icons (would need to re-add)
- Some shadcn-specific variants
- Tailwind's utility-first approach (some prefer this)

---

## Risk Analysis

### High Risk Items
1. **Breaking existing functionality** - Every component changes
2. **Learning curve** - Panda CSS is different from Tailwind
3. **Build complexity** - Panda codegen step
4. **Community size** - Smaller than Tailwind ecosystem
5. **Migration effort** - 12-16 hours minimum

### Medium Risk Items
1. **Performance** - CSS-in-JS can be slower (Panda optimizes this)
2. **Bundle size** - May increase initially
3. **TypeScript complexity** - More type definitions
4. **Debugging** - Different mental model

### Low Risk Items
1. **Functionality** - Ark UI is robust
2. **Accessibility** - Park UI is well-tested
3. **Theming** - Panda theming is powerful

---

## Comparison: Current vs Park UI

### Advantages of Park UI
✅ **Better component library** - More complete, modern
✅ **Splitter component** - Professional editor UX
✅ **Powerful theming** - Design tokens, recipes
✅ **Type-safe** - Better TypeScript support
✅ **Consistent API** - All components work similarly
✅ **Active development** - Regular updates

### Advantages of Keeping shadcn/ui
✅ **Already done** - Work complete, tested
✅ **Tailwind familiarity** - Well-known utility classes
✅ **Larger community** - More examples, tutorials
✅ **Flexibility** - Easy to customize
✅ **Build simplicity** - Standard Tailwind build
✅ **No learning curve** - Team already knows it

---

## Alternative Approach

### Hybrid Solution: Keep shadcn + Add Splitter Separately

Instead of full migration:
1. **Keep current shadcn/ui implementation**
2. **Install only Ark UI Splitter** as standalone
3. **Minimal Panda CSS setup** just for Splitter
4. **Best of both worlds:**
   - Keep all the work we just did
   - Add professional splitter for editor
   - Minimal disruption

#### Implementation
```bash
# Install only what we need
npm install @ark-ui/react
npm install -D @pandacss/dev

# Configure Panda for Splitter only
# Keep Tailwind for everything else
```

**Time:** 2-3 hours instead of 12-16
**Risk:** Low
**Benefit:** Get the Splitter without full migration

---

## Recommendation

### Option A: Full Park UI Migration
**Choose if:**
- You want the most modern, complete component library
- Team willing to learn Panda CSS
- 12-16 hours of work acceptable
- Okay with redoing recent work

### Option B: Hybrid Approach ⭐ RECOMMENDED
**Choose if:**
- Want to keep recent shadcn work
- Just need the Splitter for editor
- Minimal disruption desired
- Faster timeline (2-3 hours)

### Option C: Stay with Current Stack
**Choose if:**
- Happy with what we have
- Don't need Splitter urgently
- No time for any migration

---

## Next Steps

**Decision needed:**

1. ❓ **Which option do you prefer?**
   - Option A: Full Park UI migration (12-16 hours)
   - Option B: Hybrid - Keep shadcn + add Splitter (2-3 hours)
   - Option C: Keep current implementation (0 hours)

2. ❓ **Why do you want Park UI specifically?**
   - Is it primarily for the Splitter component?
   - Do you want the full component library?
   - Is it the theming system?
   - Is it the CSS-in-JS approach?

3. ❓ **Timeline concerns?**
   - How soon do you need this done?
   - Is the 12-16 hour investment acceptable?

---

**Please review both the CSS_AUDIT.md and this plan, then let me know which option you'd like to proceed with.**

---

*Last Updated: 2025-11-17*
