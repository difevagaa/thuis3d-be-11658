import React, { createContext, useContext, useEffect, useState, useMemo, ReactNode } from 'react';

export type Breakpoint = 'mobile' | 'tablet' | 'desktop';

interface ResponsiveContextType {
  // Current device type
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  
  // Current breakpoint name
  breakpoint: Breakpoint;
  
  // Screen width
  width: number;
  
  // Helpers
  isTouch: boolean;
  orientation: 'portrait' | 'landscape';
  
  // Viewport-aware values
  itemsPerRow: (mobileItems: number, tabletItems: number, desktopItems: number) => number;
}

const ResponsiveContext = createContext<ResponsiveContextType | undefined>(undefined);

// Breakpoint thresholds (matching Tailwind)
const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
};

interface ResponsiveProviderProps {
  children: ReactNode;
}

export function ResponsiveProvider({ children }: ResponsiveProviderProps) {
  const [width, setWidth] = useState(() => 
    typeof window !== 'undefined' ? window.innerWidth : 1024
  );
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>(() =>
    typeof window !== 'undefined' 
      ? window.innerHeight > window.innerWidth ? 'portrait' : 'landscape'
      : 'portrait'
  );

  useEffect(() => {
    const handleResize = () => {
      setWidth(window.innerWidth);
      setOrientation(window.innerHeight > window.innerWidth ? 'portrait' : 'landscape');
    };

    // Throttle resize events
    let timeoutId: NodeJS.Timeout;
    const throttledResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(handleResize, 100);
    };

    window.addEventListener('resize', throttledResize);
    window.addEventListener('orientationchange', handleResize);
    
    // Initial check
    handleResize();

    return () => {
      window.removeEventListener('resize', throttledResize);
      window.removeEventListener('orientationchange', handleResize);
      clearTimeout(timeoutId);
    };
  }, []);

  const value = useMemo(() => {
    const isMobile = width < BREAKPOINTS.sm;
    const isTablet = width >= BREAKPOINTS.sm && width < BREAKPOINTS.lg;
    const isDesktop = width >= BREAKPOINTS.lg;
    
    const breakpoint: Breakpoint = isMobile ? 'mobile' : isTablet ? 'tablet' : 'desktop';
    
    // Check for touch capability
    const isTouch = typeof window !== 'undefined' && (
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0
    );

    // Helper function to get items per row based on device
    const itemsPerRow = (mobileItems: number, tabletItems: number, desktopItems: number): number => {
      if (isMobile) return mobileItems;
      if (isTablet) return tabletItems;
      return desktopItems;
    };

    return {
      isMobile,
      isTablet,
      isDesktop,
      breakpoint,
      width,
      isTouch,
      orientation,
      itemsPerRow,
    };
  }, [width, orientation]);

  return (
    <ResponsiveContext.Provider value={value}>
      {children}
    </ResponsiveContext.Provider>
  );
}

export function useResponsive(): ResponsiveContextType {
  const context = useContext(ResponsiveContext);
  if (context === undefined) {
    throw new Error('useResponsive must be used within a ResponsiveProvider');
  }
  return context;
}

// Optional hook that doesn't throw if used outside provider (returns defaults)
export function useResponsiveSafe(): ResponsiveContextType {
  const context = useContext(ResponsiveContext);
  
  if (context === undefined) {
    // Return sensible defaults when used outside provider
    const width = typeof window !== 'undefined' ? window.innerWidth : 1024;
    const isMobile = width < BREAKPOINTS.sm;
    const isTablet = width >= BREAKPOINTS.sm && width < BREAKPOINTS.lg;
    const isDesktop = width >= BREAKPOINTS.lg;
    
    return {
      isMobile,
      isTablet,
      isDesktop,
      breakpoint: isMobile ? 'mobile' : isTablet ? 'tablet' : 'desktop',
      width,
      isTouch: typeof window !== 'undefined' && 'ontouchstart' in window,
      orientation: 'portrait',
      itemsPerRow: (m, t, d) => isMobile ? m : isTablet ? t : d,
    };
  }
  
  return context;
}
