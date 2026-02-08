import { useEffect, useRef, useState, CSSProperties } from 'react';

interface ScrollAnimationOptions {
  /** Threshold at which element starts becoming visible (0-1) */
  threshold?: number;
  /** Root margin for intersection observer */
  rootMargin?: string;
  /** Whether animation should only trigger once */
  once?: boolean;
  /** Animation delay in ms */
  delay?: number;
  /** Whether the hook is disabled */
  disabled?: boolean;
}

interface ScrollAnimationResult {
  ref: React.RefObject<HTMLDivElement>;
  style: CSSProperties;
  isVisible: boolean;
}

/**
 * Apple-style scroll-driven reveal animation hook.
 * Elements fade in, slide up, and optionally scale as they enter the viewport.
 */
export const useScrollAnimation = ({
  threshold = 0.1,
  rootMargin = '0px 0px -60px 0px',
  once = true,
  delay = 0,
  disabled = false,
}: ScrollAnimationOptions = {}): ScrollAnimationResult => {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (disabled || !ref.current) return;

    const element = ref.current;
    let timerId: ReturnType<typeof setTimeout> | null = null;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          if (delay > 0) {
            timerId = setTimeout(() => setIsVisible(true), delay);
          } else {
            setIsVisible(true);
          }
          if (once) observer.unobserve(element);
        } else if (!once) {
          setIsVisible(false);
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
      if (timerId) clearTimeout(timerId);
    };
  }, [threshold, rootMargin, once, delay, disabled]);

  const style: CSSProperties = {
    opacity: isVisible ? 1 : 0,
    transform: isVisible ? 'translateY(0)' : 'translateY(40px)',
    transition: `opacity 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94) ${delay}ms, transform 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94) ${delay}ms`,
    willChange: 'opacity, transform',
  };

  return { ref: ref as React.RefObject<HTMLDivElement>, style, isVisible };
};

/**
 * Apple-style scroll progress hook.
 * Returns a value 0–1 representing how far through the element the viewport has scrolled.
 */
export const useScrollProgress = (disabled = false) => {
  const ref = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (disabled || !ref.current) return;

    const element = ref.current;

    const handleScroll = () => {
      if (!element) return;
      const rect = element.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      const raw = (windowHeight - rect.top) / (windowHeight + rect.height);
      setProgress(Math.max(0, Math.min(1, raw)));
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener('scroll', handleScroll);
  }, [disabled]);

  return { ref, progress };
};
