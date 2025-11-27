import { useEffect, useRef, useState } from 'react';

interface ParallaxOptions {
  speed?: number; // 0.1 to 1, lower = slower movement
  direction?: 'up' | 'down';
  disabled?: boolean;
}

export const useParallax = ({ 
  speed = 0.3, 
  direction = 'up',
  disabled = false 
}: ParallaxOptions = {}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (disabled || !ref.current) return;

    const element = ref.current;
    
    // Intersection Observer for performance - only animate visible elements
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      { threshold: 0, rootMargin: '100px' }
    );

    observer.observe(element);

    const handleScroll = () => {
      if (!isVisible || !element) return;

      const rect = element.getBoundingClientRect();
      const scrollPercent = (window.innerHeight - rect.top) / (window.innerHeight + rect.height);
      
      if (scrollPercent >= 0 && scrollPercent <= 1) {
        const movement = scrollPercent * 100 * speed;
        const yPos = direction === 'up' ? -movement : movement;
        
        // Use transform for better performance
        element.style.transform = `translate3d(0, ${yPos}px, 0)`;
      }
    };

    if (isVisible) {
      window.addEventListener('scroll', handleScroll, { passive: true });
      handleScroll(); // Initial position
    }

    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', handleScroll);
    };
  }, [speed, direction, disabled, isVisible]);

  return ref;
};

export const useParallaxScale = ({ 
  speed = 0.05, 
  disabled = false 
}: { speed?: number; disabled?: boolean } = {}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (disabled || !ref.current) return;

    const element = ref.current;
    
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      { threshold: 0, rootMargin: '100px' }
    );

    observer.observe(element);

    const handleScroll = () => {
      if (!isVisible || !element) return;

      const rect = element.getBoundingClientRect();
      const scrollPercent = (window.innerHeight - rect.top) / (window.innerHeight + rect.height);
      
      if (scrollPercent >= 0 && scrollPercent <= 1) {
        const scale = 1 + (scrollPercent * speed);
        element.style.transform = `scale(${Math.min(scale, 1.1)})`;
      }
    };

    if (isVisible) {
      window.addEventListener('scroll', handleScroll, { passive: true });
      handleScroll();
    }

    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', handleScroll);
    };
  }, [speed, disabled, isVisible]);

  return ref;
};
