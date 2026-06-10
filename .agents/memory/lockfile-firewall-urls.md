---
name: Lockfile Replit-firewall URLs break external builds
description: Mac Mini / non-Replit npm installs fail ENOTFOUND because package-lock.json has package-firewall.replit.local resolved URLs for recently-installed packages.
---

# Symptom
On the Mac Mini Capacitor build, `npm install` (or `npm run build`) fails:
`npm error ... http://package-firewall.replit.local/npm/<pkg> ... getaddrinfo ENOTFOUND`.
One bad entry aborts the WHOLE install, so `vite build` still can't resolve a newly-added import (e.g. `@capacitor/browser`), masking the real cause as a "missing package".

# Cause
`package-firewall.replit.local` is Replit's INTERNAL package proxy — it only resolves inside the Replit container. When a package is installed on Replit, its `resolved` URL in package-lock.json can get baked as `http://package-firewall.replit.local/npm/...` instead of `https://registry.npmjs.org/...`. The vast majority of entries use the public registry; only the few most-recently-added ones get the internal host. Those URLs don't resolve on any machine outside Replit.

# Fix
Rewrite the bad resolved URLs to the public registry in package-lock.json:
`http://package-firewall.replit.local/npm/` -> `https://registry.npmjs.org/`
Integrity hashes stay valid (identical tarball content). Verify 0 occurrences remain and the file still parses as JSON. Commit + push, then on the Mac Mini `git pull && npm install`.

**Why:** keeps the lockfile portable to any machine and matches the thousands of other entries already on registry.npmjs.org; Replit's own install still works because the firewall transparently proxies public-registry URLs.
**How to apply:** after adding ANY npm dependency on Replit that the Mac Mini build needs, grep package-lock.json for `package-firewall.replit.local` and normalize before the user pulls.
