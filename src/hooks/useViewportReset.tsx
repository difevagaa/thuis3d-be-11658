import { useEffect, useCallback } from "react";
import { useLocation } from "react-router-dom";

/**
 * Custom hook to reset viewport on mobile devices.
 * Ensures the page adapts properly to screen size after refresh,
 * form submissions, or navigation events.
 */
export function useViewportReset() {
  const location = useLocation();

  /**
   * Reset viewport to ensure proper adaptation on mobile devices
   */
  const resetViewport = useCallback(() => {
    // Check if we're on a mobile device
    const isMobile = window.innerWidth <= 768 || 
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    if (!isMobile) return;

    // Force a layout recalculation
    const scrollPos = window.scrollY;
    
    // Reset scroll position to trigger viewport adaptation
    window.scrollTo(0, 0);
    
    // Use requestAnimationFrame for smooth reset
    requestAnimationFrame(() => {
      // Restore scroll position
      window.scrollTo(0, scrollPos);
      
      // Force body width recalculation
      document.body.style.width = '';
      document.body.style.width = '100%';
    });
  }, []);

  // Reset viewport on location change (navigation)
  useEffect(() => {
    resetViewport();
  }, [location.pathname, resetViewport]);

  // Reset viewport on page load and visibility change
  useEffect(() => {
    // Reset on initial load
    resetViewport();

    // Reset when page becomes visible again (coming back from another tab)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        resetViewport();
      }
    };

    // Reset on resize (orientation change on mobile)
    const handleResize = () => {
      requestAnimationFrame(resetViewport);
    };

    // Reset on focus (when app regains focus)
    const handleFocus = () => {
      resetViewport();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('resize', handleResize);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('focus', handleFocus);
    };
  }, [resetViewport]);

  return resetViewport;
}
