---
name: Native session auth needs CapacitorHttp
description: iOS WKWebView drops the cross-site session cookie; CapacitorHttp + CapacitorCookies are required for cookie-based auth on native.
---

The app authenticates with a **session cookie**. On native the WebView origin is `capacitor://localhost` but the API is `https://spellingplayground.com`, so that cookie is **third-party** and iOS WKWebView silently drops it. Result: a request that logs the user in (e.g. `POST /api/family/signup`) returns 200, but the very next authenticated call (`GET /api/user`, `POST /api/family/send-email-verification`) returns **401** — there is no failing error, the cookie just never comes back.

**Fix:** enable `CapacitorHttp: { enabled: true }` and `CapacitorCookies: { enabled: true }` in `capacitor.config.ts`. This routes all `fetch`/`XHR` through the native HTTP stack, which has its own cookie jar that stores `Set-Cookie` and re-sends it. Built into `@capacitor/core` (v8) — no npm install. Config-only, but needs a Mac Mini rebuild (`npx cap sync ios` + Xcode) to reach the device.

**Why:** server cookie config was already correct (`secure: true; sameSite: 'none'` in prod, `trust proxy` set in `server/auth.ts`), and web worked — the failure was purely WKWebView third-party-cookie blocking, not the email service or the server.

**How to apply / diagnose:** when a native-only auth bug appears ("works on web, 401 on iPad"), check the **deployment** logs (the iPad hits production, not dev): a 200 login immediately followed by 401s is the tell. Don't chase the downstream feature (email, etc.) — it's the cookie. Keep `client/src/lib/native-fetch.ts` (it rewrites relative `/api` → absolute `API_BASE`); CapacitorHttp composes on top of it because native-fetch is imported first in `main.tsx` and wraps the already-patched `window.fetch`.
