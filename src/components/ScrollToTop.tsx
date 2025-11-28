import { useEffect, useLayoutEffect } from "react";
import { useLocation } from "react-router-dom";

export default function ScrollToTop() {
  const { pathname, key } = useLocation();

  // Disable browser's automatic scroll restoration
  useEffect(() => {
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }
  }, []);

  // Use useLayoutEffect for synchronous scrolling before paint
  // The 'key' dependency ensures scroll happens on back/forward navigation
  useLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [pathname, key]);

  return null;
}
