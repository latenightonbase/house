"use client";
import { useRouter, usePathname } from 'next/navigation';
import NProgress from 'nprogress';
import { useEffect, ReactNode, useRef, useCallback } from 'react';

// Hook to navigate with loading indicator
export function useNavigateWithLoader() {
  const router = useRouter();
  const pathname = usePathname();
  const targetUrlRef = useRef<string | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Monitor pathname changes to complete the progress bar
  useEffect(() => {
    if (targetUrlRef.current) {
      const targetPath = new URL(targetUrlRef.current, window.location.origin).pathname;
      
      // Check if we've navigated to the target URL
      if (pathname === targetPath) {
        // Wait a bit for the page to render
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            NProgress.done();
            targetUrlRef.current = null;
            
            // Clear any pending timeout
            if (timeoutRef.current) {
              clearTimeout(timeoutRef.current);
              timeoutRef.current = null;
            }
          });
        });
      }
    }
  }, [pathname]);

  return useCallback((url: string) => {
    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    targetUrlRef.current = url;
    NProgress.start();
    router.push(url);
    
    // Fallback timeout in case pathname change isn't detected (e.g., same route with different hash)
    timeoutRef.current = setTimeout(() => {
      if (targetUrlRef.current) {
        NProgress.done();
        targetUrlRef.current = null;
        timeoutRef.current = null;
      }
    }, 2000);
  }, [router]);
}

// Provider component to configure NProgress globally
export function NProgressProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    // Configure NProgress with your green theme
    NProgress.configure({ 
      showSpinner: false,
      minimum: 0.1,
      easing: 'ease',
      speed: 300,
      trickleSpeed: 200
    });
  }, []);

  return <>{children}</>;
}
