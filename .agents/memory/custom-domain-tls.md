---
name: Custom domain TLS not provisioned
description: Why the native app targets the .replit.app domain instead of the custom domain
---

The custom domain `spellingplayground.com` currently presents **no TLS certificate**
(`openssl s_client` returns "no peer certificate available"). The Replit-managed
default domain (e.g. `*.replit.app`) always has a valid certificate.

**Symptom:** every HTTPS server call from the native (Capacitor) app fails, surfacing
as generic per-feature errors (e.g. guest-mode "Failed to validate words" on iPad),
even though the backend itself is healthy and reachable on the `.replit.app` domain.

**Rule:** the native app's API base (`client/src/lib/apiBase.ts`) must point at the
working `.replit.app` domain, not the custom domain, until the custom domain's
certificate is provisioned.

**Why:** a custom domain with broken/unprovisioned TLS is indistinguishable from a
down backend to the client — the connection never completes the handshake.

**How to diagnose:** compare the two domains directly —
`openssl s_client -connect <host>:443 -servername <host> </dev/null`. "no peer
certificate available" on one but a valid `subject=`/`issuer=` on the other pinpoints
a domain-level TLS problem, not a code/CORS/server bug. Note the dev sandbox may also
fail to reach arbitrary custom domains due to egress allowlisting, so confirm with the
openssl cert check rather than assuming the sandbox result reflects production.

**Fix path for the custom domain:** re-verify / re-provision it in the deployment's
custom-domain settings (DNS + cert), then the app can switch back.
