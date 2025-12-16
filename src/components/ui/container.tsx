import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface ContainerProps {
  children: ReactNode;
  className?: string;
  /** Full width background with centered content */
  fullWidthBg?: boolean;
  /** Background color/class for full-width wrapper */
  bgClassName?: string;
  /** Size variant for max-width */
  size?: "sm" | "md" | "lg" | "xl" | "full";
  /** Remove padding (useful when nesting) */
  noPadding?: boolean;
  /** As element type */
  as?: "div" | "section" | "article" | "main" | "aside";
}

const sizeClasses = {
  sm: "max-w-3xl", // 768px
  md: "max-w-5xl", // 1024px
  lg: "max-w-6xl", // 1152px
  xl: "max-w-7xl", // 1280px - Amazon/AliExpress standard
  full: "max-w-[1440px]", // Extra wide for hero sections
};

/**
 * Container Component - Amazon/AliExpress style layout
 * 
 * Usage:
 * - Wrap page content for centered layout with max-width
 * - Use fullWidthBg for sections with full-width backgrounds but centered content
 * - Default max-width is 1280px (xl) which matches Amazon/AliExpress
 * 
 * Mobile: 100% width with 16px padding (safe zones)
 * Tablet: 100% width with 24px padding
 * Desktop: max-width centered with auto margins
 */
export function Container({
  children,
  className,
  fullWidthBg = false,
  bgClassName,
  size = "xl",
  noPadding = false,
  as: Component = "div",
}: ContainerProps) {
  const paddingClasses = noPadding 
    ? "" 
    : "px-4 sm:px-6 lg:px-8";

  const contentClasses = cn(
    "w-full mx-auto",
    sizeClasses[size],
    paddingClasses,
    className
  );

  // If we need full-width background with centered content
  if (fullWidthBg) {
    return (
      <Component className={cn("w-full", bgClassName)}>
        <div className={contentClasses}>{children}</div>
      </Component>
    );
  }

  return (
    <Component className={contentClasses}>{children}</Component>
  );
}

/**
 * PageContainer - For entire page layouts
 * Includes top/bottom padding for page sections
 */
export function PageContainer({
  children,
  className,
  ...props
}: ContainerProps) {
  return (
    <Container
      className={cn("py-4 sm:py-6 lg:py-8", className)}
      {...props}
    >
      {children}
    </Container>
  );
}

/**
 * SectionContainer - For individual sections within a page
 * Full-width background support with centered content
 */
export function SectionContainer({
  children,
  className,
  bgClassName,
  ...props
}: ContainerProps) {
  return (
    <Container
      fullWidthBg
      bgClassName={bgClassName}
      className={cn("py-6 sm:py-8 lg:py-12", className)}
      {...props}
    >
      {children}
    </Container>
  );
}

/**
 * GridContainer - Product grid with responsive columns
 * 2 columns mobile, 3 tablet, 4-5 desktop
 */
export function GridContainer({
  children,
  className,
  columns = "products",
}: {
  children: ReactNode;
  className?: string;
  columns?: "products" | "cards" | "features";
}) {
  const columnClasses = {
    products: "grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5",
    cards: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
    features: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
  };

  return (
    <div
      className={cn(
        "grid gap-3 sm:gap-4 lg:gap-6",
        columnClasses[columns],
        className
      )}
    >
      {children}
    </div>
  );
}

export default Container;
