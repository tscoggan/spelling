---
name: Capacitor object-storage image URLs
description: On native, <img>/<audio> bypass the fetch interceptor, so relative /objects/ media paths must be made absolute with assetUrl().
---

Object-storage uploads (profile avatars, word-list illustrations) are stored and
returned as RELATIVE paths like `/objects/images/{hash}.{ext}`, served by the
Express `GET /objects/:objectPath(*)` route.

**Rule:** Any element whose `src` points at a server-relative `/objects/...` (or
`/api/...`) path — `<img>`, `<audio>`, `<video>`, `<source>`, `new Audio()` — must
be wrapped with `assetUrl()` (client/src/lib/apiBase.ts).

**Why:** The native fix only patches `window.fetch` (native-fetch.ts), and that
interceptor only rewrites string fetch URLs starting with `/api`. `<img>` and
friends never go through `fetch`, so on native (origin `capacitor://localhost`) a
relative `/objects/...` resolves to `capacitor://localhost/objects/...` and 404s —
broken avatars everywhere (header, leaderboard, groups, head-to-head, home) and
broken word pictures (word-lists list + in-game illustration). Web is unaffected
because `API_BASE` is empty there.

**How to apply:** Use `assetUrl(path)` for any new backend-served media src. Don't
assume the fetch interceptor covers it — it does not. Bundled `@assets/...`
imports and absolute (https/data:) URLs are already fine and pass through
assetUrl unchanged.
