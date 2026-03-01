import { Link } from "react-router-dom";
import { useLogoSettings } from "@/hooks/useLogoSettings";
import { useResponsiveSafe } from "@/contexts/ResponsiveContext";
import { Package } from "lucide-react";
import { useState, useEffect } from "react";

interface SiteLogoProps {
  variant?: "header" | "footer" | "mobile-menu";
  className?: string;
}

export function SiteLogo({ variant = "header", className = "" }: SiteLogoProps) {
  const { logoSettings: s } = useLogoSettings();
  const { isMobile } = useResponsiveSafe();
  const [isScrolled, setIsScrolled] = useState(false);
  const isDark = document.documentElement.classList.contains("dark");

  useEffect(() => {
    if (!s.logo_hide_on_scroll) return;
    const onScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [s.logo_hide_on_scroll]);

  if (s.logo_hide_on_scroll && isScrolled) return null;
  if (s.logo_hide_on_mobile && isMobile && variant === "header") return null;

  const imgW = isMobile ? s.logo_mobile_width : s.logo_width;
  const imgH = isMobile ? s.logo_mobile_height : s.logo_height;
  const logoUrl = isDark && s.logo_dark_url ? s.logo_dark_url : s.logo_url;
  const hasImage = s.logo_show_image && logoUrl;

  const shadowMap: Record<string, string> = {
    none: "none",
    sm: "0 1px 2px rgba(0,0,0,0.1)",
    md: "0 4px 6px rgba(0,0,0,0.15)",
    lg: "0 10px 15px rgba(0,0,0,0.2)",
    glow: "0 0 12px hsl(var(--primary) / 0.4)",
  };

  const hoverMap: Record<string, string> = {
    none: "",
    scale: "hover:scale-110",
    rotate: "hover:rotate-3",
    brightness: "hover:brightness-110",
    "bounce": "hover:animate-bounce",
    "pulse": "hover:animate-pulse",
  };

  const animationMap: Record<string, string> = {
    none: "",
    "fade-in": "animate-fade-in",
    pulse: "animate-pulse",
    bounce: "animate-bounce",
  };

  const imgStyle: React.CSSProperties = {
    width: `${imgW}px`,
    height: `${imgH}px`,
    maxWidth: `${s.logo_max_width}px`,
    maxHeight: `${s.logo_max_height}px`,
    objectFit: s.logo_object_fit as any,
    opacity: s.logo_opacity / 100,
    borderRadius: s.logo_border_radius,
    padding: `${s.logo_padding}px`,
    border: s.logo_border_width > 0 ? `${s.logo_border_width}px solid ${s.logo_border_color}` : "none",
    backgroundColor: s.logo_bg_enabled ? s.logo_bg_color : "transparent",
    boxShadow: shadowMap[s.logo_shadow] || "none",
    filter: s.logo_invert_on_dark && isDark ? "invert(1) brightness(2)" : "none",
  };

  const textStyle: React.CSSProperties = {
    fontSize: `${s.logo_text_size}px`,
    fontWeight: s.logo_text_weight as any,
    color: s.logo_text_color || "hsl(var(--primary))",
    fontFamily: s.logo_text_font || "inherit",
  };

  const containerClass = [
    "flex items-center notranslate flex-shrink-0 min-w-0 transition-all duration-300",
    hoverMap[s.logo_hover_effect] || "",
    animationMap[s.logo_animation] || "",
    className,
  ].filter(Boolean).join(" ");

  const content = (
    <div className={containerClass} style={{ gap: `${s.logo_gap}px` }}>
      {hasImage ? (
        <img src={logoUrl} alt={s.logo_custom_text || "Logo"} style={imgStyle} className="flex-shrink-0" />
      ) : s.logo_show_image ? (
        <div
          className="bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center flex-shrink-0"
          style={{
            width: `${imgW}px`,
            height: `${imgH}px`,
            borderRadius: s.logo_border_radius,
          }}
        >
          <Package className="text-primary-foreground" style={{ width: `${imgW * 0.5}px`, height: `${imgH * 0.5}px` }} />
        </div>
      ) : null}
      {s.logo_show_text && s.logo_custom_text && (
        <span className="truncate" style={textStyle}>
          {s.logo_custom_text}
        </span>
      )}
    </div>
  );

  if (variant === "mobile-menu") return content;

  return (
    <Link to="/" className="flex items-center flex-shrink-0 min-w-0">
      {content}
    </Link>
  );
}
