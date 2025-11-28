import { useEffect, useLayoutEffect } from "react";
import { useLocation } from "react-router-dom";

export default function ScrollToTop() {
  const { pathname, key } = useLocation();

  // Use useLayoutEffect for synchronous scrolling before paint
  useLayoutEffect(() => {
    // Scroll immediately
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [pathname, key]);

  // Additional effect to handle lazy-loaded components
  useEffect(() => {
    // Ensure scroll after React has committed DOM changes
    const scrollToTop = () => {
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    };

    // Immediate scroll
    scrollToTop();

    // Delayed scroll to handle lazy-loaded content
    const timeoutId = setTimeout(scrollToTop, 0);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [pathname, key]);

  return null;
}
