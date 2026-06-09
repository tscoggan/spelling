import { Capacitor } from "@capacitor/core";

// Production backend used by native builds.
// Uses the custom domain. Its TLS certificate is provisioned and valid
// (Let's Encrypt), so HTTPS requests from the native WebView succeed.
// If the custom domain's certificate ever breaks again, fall back to the
// Replit-managed domain "https://spell-champ-tgs4.replit.app", which always
// has a valid Replit-managed certificate.
const PRODUCTION_API_URL = "https://spellingplayground.com";

// Build-time override (set on mobile builds, empty on web).
const envBase = (import.meta.env.VITE_API_BASE_URL as string) ?? "";

// On web builds this stays empty so requests are relative (same-origin).
// On native (Capacitor) builds, requests must reach the deployed backend rather
// than capacitor://localhost. Prefer the build-time VITE_API_BASE_URL, but fall
// back to the known production URL so the app still works if that env var was
// omitted when building the bundle.
export const API_BASE = envBase || (Capacitor.isNativePlatform() ? PRODUCTION_API_URL : "");

// On native, <img>/<audio> tags bypass the fetch interceptor, so a relative
// "/objects/..." (object-storage image) or "/api/..." path resolves to
// capacitor://localhost and 404s. Prepend API_BASE so these load from the
// deployed backend. No-op on web because API_BASE is empty.
export function assetUrl(path: string | null | undefined): string {
  if (!path) return path ?? "";
  if (API_BASE && (path.startsWith("/objects/") || path.startsWith("/api/"))) {
    return API_BASE + path;
  }
  return path;
}
