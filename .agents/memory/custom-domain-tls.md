---
name: Custom domain TLS provisioning (resolved)
description: How spellingplayground.com's missing TLS cert was diagnosed and fixed
---

The custom domain `spellingplayground.com` previously presented **no TLS certificate**
(`openssl s_client` returned "no peer certificate available") even though the Replit
Domains panel showed the domain as "Verified". This was RESOLVED — the native app now
targets the custom domain again (`client/src/lib/apiBase.ts`), with the `.replit.app`
domain kept as a documented fallback.

**Root cause:** the required `replit-verify=...` **TXT record was missing from DNS**
even though Replit's panel showed a green "Verified" badge. A "Verified" badge does NOT
guarantee the verification TXT record is still live in DNS, and without it the cert is
never issued/renewed.

**Symptom:** every HTTPS server call from the native (Capacitor) app fails, surfacing
as generic per-feature errors (e.g. guest-mode "Failed to validate words" on iPad),
even though the backend is healthy and reachable on the `.replit.app` domain.

**How to diagnose:**
- Compare both domains' TLS: `openssl s_client -connect <host>:443 -servername <host> </dev/null`.
  "no peer certificate available" on the custom domain but a valid `subject=`/`issuer=`
  on `.replit.app` pinpoints a domain-level TLS problem, not a code/CORS/server bug.
- Check DNS via DoH (works through sandbox egress): `curl -s "https://dns.google/resolve?name=<domain>&type=TXT"`,
  also types `A`, `CAA`, `NS`. Confirm the `replit-verify` TXT and the A record exist,
  and that no `CAA` record blocks Let's Encrypt.

**Fix that worked:**
1. Read the exact required records from Replit Domains → Manage (A `@` → IP, and
   TXT `@` → `replit-verify=...`).
2. Add the missing TXT record at the registrar (Namecheap here), host `@`, exact value.
3. Wait for DNS propagation (minutes–1h); confirm via DoH.
4. If the cert still does not issue after the TXT is live + domain "Verified", **remove
   and re-link the domain** in the Replit Domains panel. Re-linking forces a fresh
   verification + certificate request. The panel then shows DNS Record Checks → Routing
   Update → SSL Certificate progressing; cert issues (Let's Encrypt) within minutes.

**Verify success:** `openssl s_client` shows `subject=CN = <domain>`,
`issuer=...Let's Encrypt`, `Verify return code: 0 (ok)`, and `curl` returns HTTP 200.
