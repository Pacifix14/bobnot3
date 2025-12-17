"use client";

/**
 * Client component that preserves the login animation flag through redirects
 * This ensures the flag set in auth-modal.tsx persists when NextAuth redirects
 * 
 * This runs synchronously before children render to ensure the flag is available
 * for useState initializers in child components
 */
export function LoginAnimationWrapper({ children }: { children: React.ReactNode }) {
  // Run synchronously (not in useEffect) so flag is available before children render
  if (typeof window !== 'undefined') {
    // Check URL for any NextAuth callback indicators
    const urlParams = new URLSearchParams(window.location.search);
    const hasCallback = urlParams.has('callbackUrl') || urlParams.has('error') || urlParams.has('token');
    
    // Check referrer for auth pages
    const referrer = document.referrer;
    const fromAuth = referrer && (referrer.includes('/api/auth') || referrer.includes('/auth'));
    
    // If we're coming from auth and don't have the flag, set it
    // This is a fallback in case the flag from auth-modal was lost
    if ((hasCallback || fromAuth) && !sessionStorage.getItem('just-logged-in')) {
      sessionStorage.setItem('just-logged-in', 'true');
    }
    
    // Clean up URL params if present (for cleaner URLs)
    if (hasCallback && window.history.replaceState) {
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, '', cleanUrl);
    }
  }

  return <>{children}</>;
}

