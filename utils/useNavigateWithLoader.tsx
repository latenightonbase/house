"use client";
import { useRouter } from 'next/navigation';
import NProgress from 'nprogress';
import { useEffect } from 'react';

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
