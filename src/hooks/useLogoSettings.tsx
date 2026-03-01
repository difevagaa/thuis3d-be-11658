import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface LogoSettings {
  logo_url: string;
  logo_dark_url: string;
  logo_show_image: boolean;
  logo_show_text: boolean;
  logo_custom_text: string;
  logo_width: number;
  logo_height: number;
  logo_max_width: number;
  logo_max_height: number;
  logo_border_radius: string;
  logo_padding: number;
  logo_gap: number;
  logo_position: string;
  logo_object_fit: string;
  logo_opacity: number;
  logo_shadow: string;
  logo_border_width: number;
  logo_border_color: string;
  logo_bg_color: string;
  logo_bg_enabled: boolean;
  logo_text_size: number;
  logo_text_weight: string;
  logo_text_color: string;
  logo_text_font: string;
  logo_hide_on_scroll: boolean;
  logo_hide_on_mobile: boolean;
  logo_mobile_width: number;
  logo_mobile_height: number;
  logo_animation: string;
  logo_hover_effect: string;
  logo_invert_on_dark: boolean;
}

const DEFAULT_LOGO: LogoSettings = {
  logo_url: "",
  logo_dark_url: "",
  logo_show_image: true,
  logo_show_text: true,
  logo_custom_text: "Thuis3D.be",
  logo_width: 40,
  logo_height: 40,
  logo_max_width: 200,
  logo_max_height: 60,
  logo_border_radius: "0.5rem",
  logo_padding: 0,
  logo_gap: 8,
  logo_position: "left",
  logo_object_fit: "contain",
  logo_opacity: 100,
  logo_shadow: "none",
  logo_border_width: 0,
  logo_border_color: "#000000",
  logo_bg_color: "transparent",
  logo_bg_enabled: false,
  logo_text_size: 16,
  logo_text_weight: "700",
  logo_text_color: "",
  logo_text_font: "",
  logo_hide_on_scroll: false,
  logo_hide_on_mobile: false,
  logo_mobile_width: 32,
  logo_mobile_height: 32,
  logo_animation: "none",
  logo_hover_effect: "none",
  logo_invert_on_dark: false,
};

export function useLogoSettings() {
  const [logoSettings, setLogoSettings] = useState<LogoSettings>(() => {
    const cached = localStorage.getItem("logo_settings");
    if (cached) {
      try { return { ...DEFAULT_LOGO, ...JSON.parse(cached) }; } catch { /* ignore */ }
    }
    return DEFAULT_LOGO;
  });
  const [loading, setLoading] = useState(true);

  const loadSettings = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("site_customization")
        .select("*")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      if (data) {
        const d = data as any;
        const settings: LogoSettings = {
          logo_url: d.logo_url || "",
          logo_dark_url: d.logo_dark_url || "",
          logo_show_image: d.logo_show_image ?? true,
          logo_show_text: d.logo_show_text ?? true,
          logo_custom_text: d.logo_custom_text || "Thuis3D.be",
          logo_width: d.logo_width ?? 40,
          logo_height: d.logo_height ?? 40,
          logo_max_width: d.logo_max_width ?? 200,
          logo_max_height: d.logo_max_height ?? 60,
          logo_border_radius: d.logo_border_radius || "0.5rem",
          logo_padding: d.logo_padding ?? 0,
          logo_gap: d.logo_gap ?? 8,
          logo_position: d.logo_position || "left",
          logo_object_fit: d.logo_object_fit || "contain",
          logo_opacity: d.logo_opacity ?? 100,
          logo_shadow: d.logo_shadow || "none",
          logo_border_width: d.logo_border_width ?? 0,
          logo_border_color: d.logo_border_color || "#000000",
          logo_bg_color: d.logo_bg_color || "transparent",
          logo_bg_enabled: d.logo_bg_enabled ?? false,
          logo_text_size: d.logo_text_size ?? 16,
          logo_text_weight: d.logo_text_weight || "700",
          logo_text_color: d.logo_text_color || "",
          logo_text_font: d.logo_text_font || "",
          logo_hide_on_scroll: d.logo_hide_on_scroll ?? false,
          logo_hide_on_mobile: d.logo_hide_on_mobile ?? false,
          logo_mobile_width: d.logo_mobile_width ?? 32,
          logo_mobile_height: d.logo_mobile_height ?? 32,
          logo_animation: d.logo_animation || "none",
          logo_hover_effect: d.logo_hover_effect || "none",
          logo_invert_on_dark: d.logo_invert_on_dark ?? false,
        };
        setLogoSettings(settings);
        localStorage.setItem("logo_settings", JSON.stringify(settings));
      }
    } catch (err) {
      console.error("Error loading logo settings:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
    const channel = supabase
      .channel("logo-settings-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "site_customization" }, loadSettings)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [loadSettings]);

  return { logoSettings, loading, refetch: loadSettings };
}
