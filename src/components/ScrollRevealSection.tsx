import { ReactNode } from 'react';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';

interface ScrollRevealSectionProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  once?: boolean;
}

/**
 * Apple-style scroll reveal wrapper.
 * Wraps any content and reveals it with a smooth fade-up animation as it enters the viewport.
 */
export const ScrollRevealSection = ({
  children,
  className = '',
  delay = 0,
  once = true,
}: ScrollRevealSectionProps) => {
  const { ref, style } = useScrollAnimation({ delay, once });

  return (
    <div ref={ref} style={style} className={className}>
      {children}
    </div>
  );
};
