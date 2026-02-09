import { ReactNode } from 'react';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';

interface ScrollRevealSectionProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  once?: boolean;
  variant?: 'fade-up' | 'fade-in' | 'scale' | 'slide-left' | 'slide-right' | 'blur-in' | 'parallax';
}

/**
 * Apple-style scroll reveal wrapper.
 * Wraps any content and reveals it with a smooth animation as it enters the viewport.
 */
export const ScrollRevealSection = ({
  children,
  className = '',
  delay = 0,
  once = true,
  variant = 'fade-up',
}: ScrollRevealSectionProps) => {
  const { ref, style } = useScrollAnimation({ delay, once, variant });

  return (
    <div ref={ref} style={style} className={className}>
      {children}
    </div>
  );
};