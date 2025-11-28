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
    // Use more reliable mobile detection: touch-primary devices without hover
    const isTouchDevice = window.matchMedia('(hover: none) and (pointer: coarse)').matches;
    const isSmallViewport = window.innerWidth <= 768;

    if (!isTouchDevice && !isSmallViewport) return;

    // Force a single layout recalculation by reading offsetHeight
    // This triggers a reflow without visible scroll jumps
    requestAnimationFrame(() => {
      // Reading offsetHeight forces a reflow
      void document.body.offsetHeight;
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
