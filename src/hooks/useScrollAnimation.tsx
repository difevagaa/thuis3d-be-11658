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
  /** Animation variant */
  variant?: 'fade-up' | 'fade-in' | 'scale' | 'slide-left' | 'slide-right' | 'blur-in' | 'parallax';
}

interface ScrollAnimationResult {
  ref: React.RefObject<HTMLDivElement>;
  style: CSSProperties;
  isVisible: boolean;
}

const getVariantStyles = (variant: string, isVisible: boolean, delay: number): CSSProperties => {
  const transition = `opacity 1s cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms, transform 1s cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms, filter 0.8s ease ${delay}ms`;
  
  switch (variant) {
    case 'fade-in':
      return {
        opacity: isVisible ? 1 : 0,
        transition,
        willChange: 'opacity',
      };
    case 'scale':
      return {
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'scale(1)' : 'scale(0.92)',
        transition,
        willChange: 'opacity, transform',
      };
    case 'slide-left':
      return {
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateX(0)' : 'translateX(-60px)',
        transition,
        willChange: 'opacity, transform',
      };
    case 'slide-right':
      return {
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateX(0)' : 'translateX(60px)',
        transition,
        willChange: 'opacity, transform',
      };
    case 'blur-in':
      return {
        opacity: isVisible ? 1 : 0,
        filter: isVisible ? 'blur(0px)' : 'blur(8px)',
        transform: isVisible ? 'translateY(0) scale(1)' : 'translateY(20px) scale(0.98)',
        transition,
        willChange: 'opacity, transform, filter',
      };
    case 'parallax':
      return {
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0)' : 'translateY(80px)',
        transition: `opacity 1.2s cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms, transform 1.4s cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms`,
        willChange: 'opacity, transform',
      };
    case 'fade-up':
    default:
      return {
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0)' : 'translateY(40px)',
        transition,
        willChange: 'opacity, transform',
      };
  }
};

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
  variant = 'fade-up',
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

  const style = getVariantStyles(variant, isVisible, delay);

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