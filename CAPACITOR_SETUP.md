# Spelling Playground — Capacitor Mobile Build Guide

This guide is for building the iOS and Android apps on your Mac Mini.
The Replit repo already contains all the shared Capacitor configuration;
you only need the Mac-side steps below.

---

## Prerequisites (Mac Mini)

| Tool | Install command |
|------|-----------------|
| Node 18+ | `brew install node` |
| Xcode 15+ | App Store |
| Xcode Command Line Tools | `xcode-select --install` |
| CocoaPods | `sudo gem install cocoapods` |
| Android Studio (optional) | [developer.android.com](https://developer.android.com/studio) |
| Java 17 (Android) | `brew install openjdk@17` |

---

## One-time setup on Mac Mini

```bash
# 1. Clone the repo
git clone <your-repo-url>
cd spelling-playground

# 2. Install dependencies
npm install

# 3. Add native platforms (generates ios/ and android/ folders)
npx cap add ios
npx cap add android   # optional if iOS-only for now
```

---

## Building for production

```bash
# 1. Set the API base URL for the deployed backend (optional — see note below)
export VITE_API_BASE_URL=https://spellingplayground.com

# 2. Build the web bundle
npm run build

# 3. Sync web assets into the native project
npx cap sync

# 4. Open Xcode and archive for the App Store
npx cap open ios
```

> **Note:** `export` only lasts for the current terminal session. If you rebuild
> in a fresh terminal and forget step 1, the bundle still works: when running
> natively, `client/src/lib/apiBase.ts` automatically falls back to the
> production custom domain `https://spellingplayground.com`, so a forgotten
> `VITE_API_BASE_URL` no longer breaks the app.
>
> The custom domain `spellingplayground.com` now has a valid Let's Encrypt TLS
> certificate, so it is the default backend for native builds. If that
> certificate ever breaks again, set
> `export VITE_API_BASE_URL=https://spell-champ-tgs4.replit.app` before building
> to use the Replit-managed domain, which always has a valid certificate.

In Xcode: select **Product → Archive**, then use the Organizer to upload
to App Store Connect.

---

## Development / live-reload on device

For rapid iteration, point the Capacitor server at your running Replit dev URL:

1. Edit `capacitor.config.ts` and add (do **not** commit this change):
   ```ts
   server: {
     url: 'https://<your-replit-preview-url>',
     cleartext: true,
   },
   ```
2. Run `npx cap sync` then `npx cap open ios` and hit Run.

---

## In-App Purchases (Phase 5 — complete)

The IAP infrastructure is fully built and ready to activate.

### App Store Connect setup checklist

1. **Create the app** — bundle ID: `com.spellingplayground.app`
2. **Create a Subscription Group** (e.g. "Family Plan")
3. **Create two Auto-Renewable Subscription products**:
   | Product ID | Price |
   |---|---|
   | `com.spellingplayground.family.monthly` | $1.99/month |
   | `com.spellingplayground.family.annual` | $19.99/year |
4. **Generate a Shared Secret**: App Store Connect → your app →
   In-App Purchases → Manage → App-Specific Shared Secret.
   Copy the 32-character hex string.
5. **Add the shared secret as an environment variable** in Replit Secrets:
   `APPLE_IAP_SHARED_SECRET` = the 32-character hex string.
   This is used by the server's `/api/iap/apple/validate` endpoint to
   validate receipts with Apple.

### Xcode checklist

1. Open your iOS project: `npx cap open ios`
2. Set **Team** and **Bundle Identifier** (`com.spellingplayground.app`)
3. Add the **In-App Purchase** capability (Signing & Capabilities tab)
4. Run on a real device or Simulator with a sandbox account

### Plugin

`cordova-plugin-purchase` is already in `node_modules` and declared in
`package.json`. After `npx cap add ios` + `npx cap sync`, Capacitor
automatically links the plugin to the Xcode project.

### How the purchase flow works

1. User opens Family Signup on iOS → Step 4 shows "Subscribe via App Store"
2. Tapping the button calls `cordova-plugin-purchase` → Apple payment sheet
3. On approval, the app sends the receipt to `POST /api/iap/apple/validate`
4. Our server validates with Apple, marks the family account `vpcStatus=verified`
5. User is advanced to the confirmation screen

### Restore purchases

The "Restore previous purchase" button on Step 4 calls StoreKit's restore
flow and re-validates any existing receipt against our server.

---

## Notes

- **Stripe** stays as the payment provider for the web app.
- **Session cookies** use `SameSite=None; Secure` in production so the
  native WebView (cross-origin) can authenticate.
- **CORS** is open for `capacitor://localhost` and `http://localhost` in
  `server/index.ts`.
- **TTS** is handled by `@capacitor-community/text-to-speech` on device
  and the Web Speech API in the browser — no code changes needed when
  switching between platforms.
