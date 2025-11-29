import { useEffect, useCallback, useRef } from "react";
import { useLocation } from "react-router-dom";

/**
 * Custom hook to reset viewport on mobile devices.
 * Ensures the page adapts properly to screen size after refresh,
 * form submissions, or navigation events.
 * 
 * Enhanced for 2024 with better device detection and smoother transitions.
 */
export function useViewportReset() {
  const location = useLocation();
  const lastWidth = useRef<number>(window.innerWidth);
  const resizeDebounceRef = useRef<number | null>(null);

  /**
   * Check if device is touch-primary (mobile/tablet)
   */
  const isTouchDevice = useCallback(() => {
    return window.matchMedia('(hover: none) and (pointer: coarse)').matches;
  }, []);

  /**
   * Check if viewport is considered small
   */
  const isSmallViewport = useCallback(() => {
    return window.innerWidth <= 768;
  }, []);

  /**
   * Reset viewport to ensure proper adaptation on mobile devices
   */
  const resetViewport = useCallback(() => {
    if (!isTouchDevice() && !isSmallViewport()) return;

    // Force a single layout recalculation by reading offsetHeight
    // This triggers a reflow without visible scroll jumps
    requestAnimationFrame(() => {
      // Reading offsetHeight forces a reflow
      void document.body.offsetHeight;
      
      // Update CSS custom property for viewport height (handles mobile browser chrome)
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    });
  }, [isTouchDevice, isSmallViewport]);

  /**
   * Handle orientation change with proper timing
   */
  const handleOrientationChange = useCallback(() => {
    // Wait for the browser to finish orientation change
    setTimeout(() => {
      resetViewport();
    }, 100);
  }, [resetViewport]);

  /**
   * Debounced resize handler to prevent excessive reflows
   */
  const handleResize = useCallback(() => {
    if (resizeDebounceRef.current) {
      window.cancelAnimationFrame(resizeDebounceRef.current);
    }
    
    resizeDebounceRef.current = requestAnimationFrame(() => {
      const currentWidth = window.innerWidth;
      
      // Only reset if width changed significantly (ignores mobile browser chrome changes)
      if (Math.abs(currentWidth - lastWidth.current) > 50) {
        lastWidth.current = currentWidth;
        resetViewport();
      }
    });
  }, [resetViewport]);

  // Reset viewport on location change (navigation)
  useEffect(() => {
    // Small delay to let page content render
    const timer = setTimeout(() => {
      resetViewport();
    }, 50);
    
    return () => clearTimeout(timer);
  }, [location.pathname, resetViewport]);

  // Reset viewport on page load and visibility change
  useEffect(() => {
    // Set initial viewport height
    const vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
    
    // Reset on initial load
    resetViewport();

    // Reset when page becomes visible again (coming back from another tab)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        resetViewport();
      }
    };

    // Reset on focus (when app regains focus)
    const handleFocus = () => {
      resetViewport();
    };

    // Handle orientation change on mobile
    const handleOrientation = () => {
      handleOrientationChange();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('resize', handleResize);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('orientationchange', handleOrientation);

    // Listen for session recovery events
    const handleSessionRecovered = () => {
      resetViewport();
    };
    window.addEventListener('session-recovered', handleSessionRecovered);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('orientationchange', handleOrientation);
      window.removeEventListener('session-recovered', handleSessionRecovered);
      
      if (resizeDebounceRef.current) {
        window.cancelAnimationFrame(resizeDebounceRef.current);
      }
    };
  }, [resetViewport, handleResize, handleOrientationChange]);

  return resetViewport;
}
