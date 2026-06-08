---
name: Native "Load failed" = stale production deploy missing CORS
description: Capacitor app gets "Load failed" while dev works — the deployed server predates the CORS middleware
---

When the native (Capacitor) app shows WebKit's generic **"Load failed"** on API
calls while the **dev server works fine**, the most likely cause is that the
**production deployment is stale** and does not yet contain the server-side CORS
middleware (or other mobile backend changes). The WebView's cross-origin request
to `capacitor://localhost` is blocked because the live server returns no
`Access-Control-Allow-*` headers.

**Why this is easy to miss:** `getDeploymentInfo()` reporting `hasSuccessfulBuild:
true` only means the *last* build succeeded — NOT that it is recent. A deploy can
be months old and still report healthy.

**How to confirm:** curl the live endpoint's OPTIONS preflight and inspect *headers*,
not just the status code:
`curl -s -D - -o /dev/null -X OPTIONS <url>/api/<route> -H "Origin: capacitor://localhost" -H "Access-Control-Request-Method: POST"`.
A correct server returns `204` + `Access-Control-Allow-Origin: capacitor://localhost`.
A stale one returns `200` with an HTML body, an old `last-modified` date, and no
Access-Control headers. Compare against the local dev server to prove the code is
correct but unshipped.

**Rule:** any server-side change required by the native app (CORS, SameSite=None
cookies, new endpoints) only takes effect after the user **republishes**. Checking
status codes alone is insufficient — always verify the actual response headers, and
remember a 200 on a preflight without ACAO headers still fails CORS in the browser.
