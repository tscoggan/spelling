// On native (Capacitor) builds, legal pages are reached through plain
// <a href="/legal/..."> anchors scattered across the app (footer, settings,
// auth, dashboards, etc.). Inside the Capacitor WebView a relative route either
// resolves to capacitor://localhost (and can't open in a new context) or
// hard-navigates the SPA to a path that isn't in the bundle, showing a white
// screen. So the user reports "I can't open the legal docs on iOS".
//
// This installs ONE delegated click listener that catches clicks on any
// "/legal/..." link and opens the absolute production URL in the in-app system
// browser via openExternalRoute(). It is a no-op on web because API_BASE is
// empty. Links that already call openExternalRoute inline (e.g. the family
// signup checkboxes) call e.stopPropagation(), so the event never reaches this
// document-level listener and there is no double-open.
import { API_BASE, openExternalRoute } from "./apiBase";

if (API_BASE && typeof document !== "undefined" && !(window as any).__legalLinksPatched) {
  (window as any).__legalLinksPatched = true;
  document.addEventListener("click", (e) => {
    if (e.defaultPrevented) return;
    const target = e.target as HTMLElement | null;
    const anchor = target?.closest?.("a") as HTMLAnchorElement | null;
    if (!anchor) return;
    const href = anchor.getAttribute("href") || "";
    if (!href.startsWith("/legal/")) return;
    if (openExternalRoute(href)) {
      e.preventDefault();
    }
  });
}
