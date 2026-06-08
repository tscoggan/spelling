---
name: Capacitor relative fetch
description: Why relative fetch calls break on the native iOS/Android WebView and the project's policy for handling them
---

On native (Capacitor) builds the WebView origin is `capacitor://localhost`, so any relative `fetch("/api/...")` that bypasses the `queryClient`/`apiRequest` helpers never reaches the backend and the feature silently fails.

**Rule:** relative same-origin API requests on native must be redirected to the production backend. The project does this with a single global fetch interceptor installed before app render, rather than editing each call site — there are many raw `fetch("/api/...")` sites and future ones would regress.

**Build-time env trap:** `VITE_API_BASE_URL` is baked in at Vite build time. The Mac Mini build doc uses `export VITE_API_BASE_URL=...` which only lives for that shell session; a rebuild in a fresh terminal silently produces a bundle with an empty base, so every native API call hits `capacitor://localhost` and throws. The symptom is generic per-feature failures (e.g. "Failed to validate words"). To make this robust, the centralized base (`apiBase.ts`) falls back to the hardcoded production URL whenever running native, so a forgotten env var no longer breaks the app.

**Why:** one interceptor covers all current and future relative API calls; per-call-site edits are error-prone and leak regressions.

**How to apply / gotchas:**
- No-op on web (`VITE_API_BASE_URL` empty); active only on mobile bundles.
- Must NOT double-prefix `queryClient`/`apiRequest` calls — those already build absolute `https://` URLs, so scope the rewrite to relative `/api` paths only.
- Leave external absolute URLs (dictionary APIs, Wiktionary) untouched.
- Native cross-origin auth also needs server cookies as `SameSite=None; Secure`.
- Known limitation: a string-URL interceptor won't catch `Request`/`URL` object inputs — none exist today, but new code should keep using string URLs or extend the interceptor.
