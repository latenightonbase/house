"use client";
import { useRouter } from 'next/navigation';
import NProgress from 'nprogress';
import { useEffect, ReactNode } from 'react';

// Hook to navigate with loading indicator
export function useNavigateWithLoader() {
  const router = useRouter();

  return (url: string) => {
    NProgress.start();
    router.push(url);
    
    // For client-side navigation in Next.js, we need to manually complete
    // the progress bar after a short delay since there's no built-in
    // navigation event system
    setTimeout(() => {
      NProgress.done();
    }, 500); // Adjust timing as needed
  };
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

// Hook to set up NProgress for all navigation events
export function useNProgressLoader() {
  useEffect(() => {
    // Configure NProgress
    NProgress.configure({ 
      showSpinner: false,
      minimum: 0.1,
      easing: 'ease',
      speed: 300
    });
    
    const handleRouteChangeStart = () => {
      NProgress.start();
    };

    const handleRouteChangeComplete = () => {
      NProgress.done();
    };

    const handleRouteChangeError = () => {
      NProgress.done();
    };

    // Add event listeners for route changes
    window.addEventListener('beforeunload', handleRouteChangeStart);
    
    // Remove event listeners on cleanup
    return () => {
      window.removeEventListener('beforeunload', handleRouteChangeStart);
    };
  }, []);

  return null;
}
