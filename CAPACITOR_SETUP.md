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
# 1. Set the API base URL for the deployed backend
export VITE_API_BASE_URL=https://spellingplayground.com

# 2. Build the web bundle
npm run build

# 3. Sync web assets into the native project
npx cap sync

# 4. Open Xcode and archive for the App Store
npx cap open ios
```

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

## In-App Purchases (Phase 5)

Native IAP will be wired up once your Apple Developer Organization account
is approved (DUNS number required). Placeholder:
- Product IDs: `com.spellingplayground.family.monthly`,
  `com.spellingplayground.family.annual`
- Plugin: `@capacitor/purchases` (RevenueCat) or `@ionic-native/in-app-purchase-2`

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
