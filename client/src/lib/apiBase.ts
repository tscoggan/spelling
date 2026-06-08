import { Capacitor } from "@capacitor/core";

// Production backend used by native builds.
// NOTE: we intentionally use the Replit-managed *.replit.app domain rather than
// the custom domain (spellingplayground.com). The custom domain's TLS
// certificate is currently not provisioned ("no peer certificate available"),
// so HTTPS requests to it fail and break every server call inside the native
// app. The .replit.app domain always has a valid Replit-managed certificate.
// Once the custom domain's certificate is fixed, this can be switched back.
const PRODUCTION_API_URL = "https://spell-champ-tgs4.replit.app";

// Build-time override (set on mobile builds, empty on web).
const envBase = (import.meta.env.VITE_API_BASE_URL as string) ?? "";

// On web builds this stays empty so requests are relative (same-origin).
// On native (Capacitor) builds, requests must reach the deployed backend rather
// than capacitor://localhost. Prefer the build-time VITE_API_BASE_URL, but fall
// back to the known production URL so the app still works if that env var was
// omitted when building the bundle.
export const API_BASE = envBase || (Capacitor.isNativePlatform() ? PRODUCTION_API_URL : "");
