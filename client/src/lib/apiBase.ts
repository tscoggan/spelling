import { Capacitor } from "@capacitor/core";

// Known production backend. Used as a fallback for native builds.
const PRODUCTION_API_URL = "https://spellingplayground.com";

// Build-time override (set on mobile builds, empty on web).
const envBase = (import.meta.env.VITE_API_BASE_URL as string) ?? "";

// On web builds this stays empty so requests are relative (same-origin).
// On native (Capacitor) builds, requests must reach the deployed backend rather
// than capacitor://localhost. Prefer the build-time VITE_API_BASE_URL, but fall
// back to the known production URL so the app still works if that env var was
// omitted when building the bundle.
export const API_BASE = envBase || (Capacitor.isNativePlatform() ? PRODUCTION_API_URL : "");
