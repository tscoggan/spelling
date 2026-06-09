---
name: Playground theme dark mode
description: How system dark mode is handled for the default Playground theme (backgrounds + title banner)
---

# Playground theme dark mode

The default ("Playground") theme swaps to night-sky backgrounds and a dark title
banner when the device system setting is dark. This is driven by
`window.matchMedia('(prefers-color-scheme: dark)')` inside `use-theme.tsx`
(`isDark` state + change listener with legacy `addListener` fallback for old iOS
WebViews), exposed as `isDark` on the theme context.

**Why:** The app's tailwind `darkMode: ["class"]` is dormant — nothing ever
toggles the global `.dark` class, so `dark:` variants do nothing. The user
explicitly chose a FOCUSED approach: only swap the Playground backgrounds +
title banner to night versions, do NOT force the whole app dark.

**How to apply:**
- Dark background variants live in optional `ThemeAssets.backgroundLandscapeDark`
  / `backgroundPortraitDark` (shared/schema.ts). A `useMemo` in use-theme.tsx
  swaps the normal background fields when `isDark` and dark variants exist, so all
  ~21 consuming pages update with no per-page change.
- `hasDarkBackground` for the default theme is `isDark` only (daytime bg is light
  → dark text; night bg → white text). Other dark-bg themes stay always-dark.
- Title banner swap (`isDark ? titleBannerDark : titleBanner`) is done in
  home.tsx and auth-page.tsx (the only files importing that banner).
- Do NOT reach for the `.dark` class for theme dark mode — use `isDark` from
  `useTheme()`.

## Dark title banner must be a transparent PNG
The user-provided dark banner art shipped with an opaque BLACK rectangle around
the sticker. It must be stripped to transparency (outer background removed, the
dark charcoal "sticker" behind the letters kept) before use, mirroring the light
banner which is transparent outside its white sticker. A version with the black
rectangle looks like a black box floating on the night sky.
