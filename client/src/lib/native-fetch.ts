// On native (Capacitor) builds the WebView runs from capacitor://localhost, so
// relative URLs like "/api/..." resolve against that origin and never reach the
// backend. This interceptor rewrites any relative /api request to the configured
// API base (see apiBase.ts) and forces credentials so the cross-origin WebView
// can authenticate. On web builds API_BASE is empty, so nothing is patched.
import { API_BASE } from "./apiBase";

if (API_BASE && typeof window !== "undefined" && !(window as any).__apiFetchPatched) {
  (window as any).__apiFetchPatched = true;
  const originalFetch = window.fetch.bind(window);
  window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    if (typeof input === "string" && input.startsWith("/api")) {
      return originalFetch(API_BASE + input, {
        ...init,
        credentials: init?.credentials ?? "include",
      });
    }
    return originalFetch(input, init);
  };
}
