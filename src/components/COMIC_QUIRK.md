# ComicQuirk

Reusable React component for comic-style speech bubbles + hover glow.

## Files
- `ComicQuirk.tsx` — the component
- `comic-quirk.css` — bubble styles
- `comic-quirk.example.tsx` — usage examples

## Quick start

1. Import the CSS once (e.g. in your global stylesheet or root layout):
   ```tsx
   import "./comic-quirk.css";
   ```
2. Wrap any element:

```tsx
import { ComicQuirk } from "./ComicQuirk";

<ComicQuirk>
  <button className="px-4 py-2 bg-purple-600 text-white rounded">
    Click me
  </button>
</ComicQuirk>
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `phrases` | `string[]` | Napoleon-style lines | List of random phrases |
| `phrase` | `string` | — | Force a single phrase |
| `duration` | `number` | `2800` | How long the bubble stays (ms). `0` = until next click |
| `offset` | `{ x?: number; y?: number }` | `{ x: 12, y: -48 }` | Bubble position relative to trigger |
| `noGlow` | `boolean` | `false` | Disable the hover glow |
| `className` | `string` | `""` | Extra classes on the wrapper |

## Hover effect
By default the wrapped element gets a purple glow + slight scale on hover.  
Turn it off with `noGlow`.
