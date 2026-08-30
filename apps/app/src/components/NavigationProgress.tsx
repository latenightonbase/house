"use client";

import { Suspense, useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import NProgress from "nprogress";

NProgress.configure({
  showSpinner: false,
  minimum: 0.1,
  easing: "ease",
  speed: 300,
  trickleSpeed: 200,
});

const FALLBACK_MS = 2000;

function isInternalNav(anchor: HTMLAnchorElement) {
  if (anchor.target && anchor.target !== "_self") return false;
  if (anchor.hasAttribute("download")) return false;
  const href = anchor.getAttribute("href");
  if (!href || href.startsWith("#")) return false;
  try {
    const url = new URL(anchor.href, window.location.href);
    if (url.origin !== window.location.origin) return false;
    return url.pathname + url.search !== window.location.pathname + window.location.search;
  } catch {
    return false;
  }
}

function NavigationProgressInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    NProgress.done();
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, [pathname, searchParams]);

  useEffect(() => {
    const start = () => {
      NProgress.start();
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
      timeoutRef.current = window.setTimeout(() => {
        NProgress.done();
        timeoutRef.current = null;
      }, FALLBACK_MS);
    };

    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const anchor = (e.target as Element | null)?.closest?.("a");
      if (anchor instanceof HTMLAnchorElement && isInternalNav(anchor)) start();
    };

    const originalPushState = history.pushState.bind(history);
    history.pushState = function (...args: Parameters<History["pushState"]>) {
      const nextUrl = args[2];
      if (typeof nextUrl === "string") {
        try {
          const url = new URL(nextUrl, window.location.href);
          if (
            url.origin === window.location.origin &&
            url.pathname + url.search !== window.location.pathname + window.location.search
          ) {
            start();
          }
        } catch {
          start();
        }
      }
      return originalPushState(...args);
    };

    document.addEventListener("click", onClick, true);
    window.addEventListener("popstate", start);
    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("popstate", start);
      history.pushState = originalPushState;
      NProgress.done();
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, []);

  return null;
}

export function NavigationProgress() {
  return (
    <Suspense fallback={null}>
      <NavigationProgressInner />
    </Suspense>
  );
}
