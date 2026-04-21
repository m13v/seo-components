# Theme Contract

Shared components use these Tailwind utility classes. Each consuming website must ensure they resolve in its Tailwind theme.

## Required color tokens

| Token | Usage | Fazm value | Assrt value |
|-------|-------|-----------|-------------|
| `accent` | Primary brand, links, icons | `#14b8a6` (teal) | `#059669` (green) |
| `accent-light` | Hover states | `#2dd4bf` | (define per brand) |
| `muted` | Secondary text, labels | `#94a3b8` | `#6b7280` |
| `white` | Primary text (dark themes) | standard | standard |
| `surface-light` | Card/section backgrounds | `#12121a` | (define per brand) |

## How to wire

**Tailwind v3 (Fazm):** Add tokens to `tailwind.config.ts` under `theme.extend.colors`.

**Tailwind v4 (Assrt):** Add to `globals.css`:
```css
@theme {
  --color-accent: var(--accent);
  --color-accent-light: var(--accent-dim);
  --color-muted: var(--muted);
  --color-surface-light: var(--card);
}
```

## Required Tailwind content path

Add the shared package to your Tailwind content scan:

**Tailwind v3:** In `tailwind.config.ts`:
```ts
content: [
  // ... existing paths
  "../seo-components/src/**/*.tsx",
],
```

**Tailwind v4:** In `globals.css`:
```css
@source "../seo-components/src";
```

## Surface backgrounds

Long-lived panel components (`SitemapSidebar`, `GuideChatPanel`, `NewsletterSignup`) no longer hardcode a surface color. Their outer containers are transparent and inherit whatever the host page's `body` background is (paper, white, zinc-950, anything). Inner sub-surfaces (search field, message bubbles, summary chip, input, hover states) use `color-mix(in srgb, currentColor N%, transparent)` so the tint adapts to the site's own text color.

This means consumer sites do NOT need to override a surface variable; they just paint their own body background as usual and the shared panels blend in. The only cross-site dependencies are accent colors (see above). `color-mix` requires Safari 16.2+, Chrome 111+.
