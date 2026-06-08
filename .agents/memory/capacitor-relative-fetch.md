---
name: Capacitor relative fetch
description: Why relative fetch calls break on the native iOS/Android WebView and the project's policy for handling them
---

On native (Capacitor) builds the WebView origin is `capacitor://localhost`, so any relative `fetch("/api/...")` that bypasses the `queryClient`/`apiRequest` helpers never reaches the backend and the feature silently fails.

**Rule:** relative same-origin API requests on native must be redirected to `VITE_API_BASE_URL`. The project does this with a single global fetch interceptor installed before app render, rather than editing each call site — there are many raw `fetch("/api/...")` sites and future ones would regress.

**Why:** one interceptor covers all current and future relative API calls; per-call-site edits are error-prone and leak regressions.

**How to apply / gotchas:**
- No-op on web (`VITE_API_BASE_URL` empty); active only on mobile bundles.
- Must NOT double-prefix `queryClient`/`apiRequest` calls — those already build absolute `https://` URLs, so scope the rewrite to relative `/api` paths only.
- Leave external absolute URLs (dictionary APIs, Wiktionary) untouched.
- Native cross-origin auth also needs server cookies as `SameSite=None; Secure`.
- Known limitation: a string-URL interceptor won't catch `Request`/`URL` object inputs — none exist today, but new code should keep using string URLs or extend the interceptor.
