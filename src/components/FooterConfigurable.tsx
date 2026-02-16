/**
 * Configurable Footer Component - Reads settings from footer_settings table
 */

import { Facebook, Instagram, Twitter, Mail, Linkedin, Youtube } from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState, useEffect } from "react";
import { i18nToast } from "@/lib/i18nToast";
import { supabase } from "@/integrations/supabase/client";

interface FooterSettings {
  show_footer: boolean;
  background_color: string;
  text_color: string;
  border_color: string;
  title_font_size: number;
  title_font_weight: string;
  text_font_size: number;
  link_font_size: number;
  padding_top: number;
  padding_bottom: number;
  padding_horizontal: number;
  section_gap: number;
  show_brand_section: boolean;
  brand_name: string;
  brand_tagline: string;
  show_social_icons: boolean;
  social_icon_size: number;
  social_icon_color: string;
  social_facebook: string;
  social_instagram: string;
  social_twitter: string;
  social_linkedin: string;
  social_tiktok: string;
  social_youtube: string;
  show_help_section: boolean;
  help_section_title: string;
  show_faq_link: boolean;
  show_terms_link: boolean;
  show_privacy_link: boolean;
  show_cookies_link: boolean;
  show_legal_link: boolean;
  show_quick_links: boolean;
  quick_links_title: string;
  show_catalog_link: boolean;
  show_quote_link: boolean;
  show_gift_cards_link: boolean;
  show_blog_link: boolean;
  show_newsletter: boolean;
  newsletter_title: string;
  newsletter_description: string;
  newsletter_placeholder: string;
  newsletter_button_color: string;
  show_payment_methods: boolean;
  payment_methods_title: string;
  show_visa: boolean;
  show_mastercard: boolean;
  show_bancontact: boolean;
  show_paypal: boolean;
  show_ideal: boolean;
  show_copyright: boolean;
  copyright_text: string;
  columns_layout: string;
  border_top_width: number;
  border_top_style: string;
}

const defaultSettings: FooterSettings = {
  show_footer: true,
  background_color: '',
  text_color: '',
  border_color: '',
  title_font_size: 18,
  title_font_weight: '700',
  text_font_size: 14,
  link_font_size: 14,
  padding_top: 48,
  padding_bottom: 48,
  padding_horizontal: 16,
  section_gap: 32,
  show_brand_section: true,
  brand_name: '',
  brand_tagline: '',
  show_social_icons: true,
  social_icon_size: 20,
  social_icon_color: '',
  social_facebook: '',
  social_instagram: '',
  social_twitter: '',
  social_linkedin: '',
  social_tiktok: '',
  social_youtube: '',
  show_help_section: true,
  help_section_title: '',
  show_faq_link: true,
  show_terms_link: true,
  show_privacy_link: true,
  show_cookies_link: true,
  show_legal_link: true,
  show_quick_links: true,
  quick_links_title: '',
  show_catalog_link: true,
  show_quote_link: true,
  show_gift_cards_link: true,
  show_blog_link: true,
  show_newsletter: true,
  newsletter_title: '',
  newsletter_description: '',
  newsletter_placeholder: '',
  newsletter_button_color: '',
  show_payment_methods: true,
  payment_methods_title: '',
  show_visa: true,
  show_mastercard: true,
  show_bancontact: true,
  show_paypal: true,
  show_ideal: false,
  show_copyright: true,
  copyright_text: '',
  columns_layout: '4',
  border_top_width: 1,
  border_top_style: 'solid'
};

export const FooterConfigurable = () => {
  const { t, i18n } = useTranslation('footer');
  const [email, setEmail] = useState("");
  const [settings, setSettings] = useState<FooterSettings>(defaultSettings);
  const [customization, setCustomization] = useState<any>(null);
  const [footerLinks, setFooterLinks] = useState<any[]>([]);

  useEffect(() => {
    // Load data only once on mount and language change - Realtime is overkill for footer
    loadFooterData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i18n.language]);

  const loadFooterData = async () => {
    const baseLang = (i18n.language || 'es').split('-')[0];

    try {
      // Load footer settings
      const { data: footerSettings } = await supabase
        .from('footer_settings')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (footerSettings) {
        let nextSettings = footerSettings as FooterSettings;

        if (baseLang !== 'es') {
          const translatableFields = [
            'brand_name',
            'brand_tagline',
            'help_section_title',
            'quick_links_title',
            'newsletter_title',
            'newsletter_description',
            'newsletter_placeholder',
            'payment_methods_title',
            'copyright_text'
          ];

          const { data: settingsTranslations } = await supabase
            .from('translations')
            .select('field_name, translated_text')
            .eq('entity_type', 'footer_settings')
            .eq('entity_id', footerSettings.id)
            .eq('language', baseLang)
            .in('field_name', translatableFields);

          const overrides: Partial<FooterSettings> = {};
          settingsTranslations?.forEach((tr) => {
            (overrides as any)[tr.field_name] = tr.translated_text;
          });

          nextSettings = { ...(footerSettings as any), ...overrides } as FooterSettings;
        }

        setSettings(nextSettings);
      }

      // Load site settings for fallback values
      const { data: settingsData } = await supabase
        .from("site_settings")
        .select("*")
        .in('setting_key', ['social_facebook', 'social_instagram', 'social_twitter', 'social_linkedin', 'social_tiktok', 'site_name', 'copyright_text']);

      const siteSettings: any = {};
      settingsData?.forEach(setting => {
        siteSettings[setting.setting_key] = setting.setting_value;
      });

      // Load customization
      const { data: customData } = await supabase
        .from("site_customization")
        .select("*")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const merged = { ...customData, ...siteSettings };
      setCustomization(merged);

      // Load footer links
      const { data: linksData } = await supabase
        .from("footer_links")
        .select("*")
        .eq("is_active", true)
        .order("display_order", { ascending: true });

      if (linksData) {
        let nextLinks = linksData;

        if (baseLang !== 'es' && linksData.length > 0) {
          const ids = linksData.map((l) => l.id);

          const { data: linkTranslations } = await supabase
            .from('translations')
            .select('entity_id, translated_text')
            .eq('entity_type', 'footer_links')
            .eq('field_name', 'title')
            .eq('language', baseLang)
            .in('entity_id', ids);

          const map = new Map<string, string>();
          linkTranslations?.forEach((tr: any) => {
            if (tr?.entity_id && tr?.translated_text) map.set(tr.entity_id, tr.translated_text);
          });

          nextLinks = linksData.map((link) => {
            const translatedTitle = map.get(link.id);
            return translatedTitle ? { ...link, title: translatedTitle } : link;
          });
        }

        setFooterLinks(nextLinks);
      }
    } catch (error) {
      console.error("Error loading footer data:", error);
    }
  };

  const [subscribing, setSubscribing] = useState(false);

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || subscribing) return;
    
    setSubscribing(true);
    try {
      // Check if already subscribed
      const { data: existing } = await supabase
        .from("email_subscribers")
        .select("id, status")
        .eq("email", email)
        .maybeSingle();
      
      if (existing) {
        if (existing.status === "subscribed") {
          i18nToast.info("info.alreadySubscribed");
        } else {
          // Reactivate subscription
          await supabase
            .from("email_subscribers")
            .update({ status: "subscribed", subscribed_at: new Date().toISOString() })
            .eq("id", existing.id);
          i18nToast.success("success.subscribed");
        }
      } else {
        // New subscription
        const { error } = await supabase
          .from("email_subscribers")
          .insert({
            email,
            status: "subscribed",
            subscribed_at: new Date().toISOString()
          });
        
        if (error) throw error;
        i18nToast.success("success.subscribed");
      }
      setEmail("");
    } catch (error: any) {
      console.error("Error subscribing:", error);
      i18nToast.error("error.general");
    } finally {
      setSubscribing(false);
    }
  };

  // Don't render if footer is disabled
  if (!settings.show_footer) {
    return null;
  }

  // Merge settings with fallbacks from customization/site_settings
  const getSocialUrl = (key: keyof FooterSettings) => {
    const settingsValue = settings[key] as string;
    if (settingsValue) return settingsValue;
    return customization?.[key] || '';
  };

  const brandName = settings.brand_name || customization?.site_name || "Thuis3D.be";
  const brandTagline = settings.brand_tagline || t('brand.tagline');
  const copyrightText = settings.copyright_text || customization?.copyright_text || `© ${new Date().getFullYear()} ${brandName} - ${t('copyright')}`;

  // Calculate column classes based on layout
  const getColumnClass = () => {
    const cols = settings.columns_layout || '4';
    switch (cols) {
      case '2': return 'sm:grid-cols-2';
      case '3': return 'sm:grid-cols-2 lg:grid-cols-3';
      case '4': 
      default: return 'sm:grid-cols-2 lg:grid-cols-4';
    }
  };

  // Generate inline styles
  const footerStyle: React.CSSProperties = {
    backgroundColor: settings.background_color || undefined,
    color: settings.text_color || undefined,
    borderTopColor: settings.border_color || undefined,
    borderTopWidth: `${settings.border_top_width}px`,
    borderTopStyle: settings.border_top_style as any,
    paddingTop: `${settings.padding_top}px`,
    paddingBottom: `${settings.padding_bottom}px`
  };

  const titleStyle: React.CSSProperties = {
    fontSize: `${settings.title_font_size}px`,
    fontWeight: settings.title_font_weight as any
  };

  const textStyle: React.CSSProperties = {
    fontSize: `${settings.text_font_size}px`
  };

  const linkStyle: React.CSSProperties = {
    fontSize: `${settings.link_font_size}px`
  };

  const iconSize = settings.social_icon_size || 20;
  const iconColor = settings.social_icon_color || undefined;

  return (
    <footer className="bg-muted border-t mt-8 md:mt-16" style={footerStyle}>
      <div 
        className="container mx-auto pb-24 md:pb-12"
        style={{ 
          paddingLeft: `${settings.padding_horizontal}px`,
          paddingRight: `${settings.padding_horizontal}px`
        }}
      >
        <div 
          className={`grid grid-cols-1 ${getColumnClass()}`}
          style={{ gap: `${settings.section_gap}px` }}
        >
          {/* Brand & Social */}
          {settings.show_brand_section && (
            <div>
              <h3 className="font-bold mb-3 md:mb-4" style={titleStyle}>{brandName}</h3>
              <p className="text-muted-foreground mb-3 md:mb-4" style={textStyle}>
                {brandTagline}
              </p>
              {settings.show_social_icons && (
                <div className="flex gap-2.5 md:gap-3">
                  {getSocialUrl('social_facebook') && (
                    <a href={getSocialUrl('social_facebook')} target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors" style={{ color: iconColor }}>
                      <Facebook style={{ width: iconSize, height: iconSize }} />
                    </a>
                  )}
                  {getSocialUrl('social_instagram') && (
                    <a href={getSocialUrl('social_instagram')} target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors" style={{ color: iconColor }}>
                      <Instagram style={{ width: iconSize, height: iconSize }} />
                    </a>
                  )}
                  {getSocialUrl('social_twitter') && (
                    <a href={getSocialUrl('social_twitter')} target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors" style={{ color: iconColor }}>
                      <Twitter style={{ width: iconSize, height: iconSize }} />
                    </a>
                  )}
                  {getSocialUrl('social_linkedin') && (
                    <a href={getSocialUrl('social_linkedin')} target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors" style={{ color: iconColor }}>
                      <Linkedin style={{ width: iconSize, height: iconSize }} />
                    </a>
                  )}
                  {getSocialUrl('social_youtube') && (
                    <a href={getSocialUrl('social_youtube')} target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors" style={{ color: iconColor }}>
                      <Youtube style={{ width: iconSize, height: iconSize }} />
                    </a>
                  )}
                  {getSocialUrl('social_tiktok') && (
                    <a href={getSocialUrl('social_tiktok')} target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors" style={{ color: iconColor }}>
                      <svg style={{ width: iconSize, height: iconSize }} fill="currentColor" viewBox="0 0 24 24">
                        <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z"/>
                      </svg>
                    </a>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Help Links */}
          {settings.show_help_section && (
            <div>
              <h4 className="font-semibold mb-3 md:mb-4" style={titleStyle}>
                {settings.help_section_title || t('help.title')}
              </h4>
              <ul className="space-y-1.5 md:space-y-2">
                {settings.show_faq_link && (
                  <li>
                    <Link to="/page/faq" className="text-muted-foreground hover:text-primary transition-colors" style={linkStyle}>
                      {t('help.faq')}
                    </Link>
                  </li>
                )}
                {settings.show_terms_link && (
                  <li>
                    <Link to="/legal/terms" className="text-muted-foreground hover:text-primary transition-colors" style={linkStyle}>
                      {t('help.terms')}
                    </Link>
                  </li>
                )}
                {settings.show_privacy_link && (
                  <li>
                    <Link to="/legal/privacy" className="text-muted-foreground hover:text-primary transition-colors" style={linkStyle}>
                      {t('help.privacy')}
                    </Link>
                  </li>
                )}
                {settings.show_cookies_link && (
                  <li>
                    <Link to="/legal/cookies" className="text-muted-foreground hover:text-primary transition-colors" style={linkStyle}>
                      {t('help.cookies')}
                    </Link>
                  </li>
                )}
                {settings.show_legal_link && (
                  <li>
                    <Link to="/legal/legal_notice" className="text-muted-foreground hover:text-primary transition-colors" style={linkStyle}>
                      {t('help.legal')}
                    </Link>
                  </li>
                )}
                {footerLinks.filter(link => link.section === 'help').map((link) => (
                  <li key={link.id}>
                    <Link to={link.url} className="text-muted-foreground hover:text-primary transition-colors" style={linkStyle}>
                      {link.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Quick Links */}
          {settings.show_quick_links && (
            <div>
              <h4 className="font-semibold mb-3 md:mb-4" style={titleStyle}>
                {settings.quick_links_title || t('quickLinks.title')}
              </h4>
              <ul className="space-y-1.5 md:space-y-2">
                {settings.show_catalog_link && (
                  <li>
                    <Link to="/productos" className="text-muted-foreground hover:text-primary transition-colors" style={linkStyle}>
                      {t('quickLinks.catalog')}
                    </Link>
                  </li>
                )}
                {settings.show_quote_link && (
                  <li>
                    <Link to="/cotizaciones" className="text-muted-foreground hover:text-primary transition-colors" style={linkStyle}>
                      {t('quickLinks.requestQuote')}
                    </Link>
                  </li>
                )}
                {settings.show_gift_cards_link && (
                  <li>
                    <Link to="/tarjetas-regalo" className="text-muted-foreground hover:text-primary transition-colors" style={linkStyle}>
                      {t('quickLinks.giftCards')}
                    </Link>
                  </li>
                )}
                {settings.show_blog_link && (
                  <li>
                    <Link to="/blog" className="text-muted-foreground hover:text-primary transition-colors" style={linkStyle}>
                      {t('quickLinks.blog')}
                    </Link>
                  </li>
                )}
              </ul>
            </div>
          )}

          {/* Newsletter */}
          {settings.show_newsletter && (
            <div>
              <h4 className="font-semibold mb-3 md:mb-4" style={titleStyle}>
                {settings.newsletter_title || t('newsletter.title')}
              </h4>
              <p className="text-muted-foreground mb-2 md:mb-3" style={textStyle}>
                {settings.newsletter_description || t('newsletter.description')}
              </p>
              <form onSubmit={handleNewsletterSubmit} className="flex gap-1.5 md:gap-2">
                <Input
                  type="email"
                  placeholder={settings.newsletter_placeholder || t('newsletter.placeholder')}
                  className="text-sm h-9"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <Button 
                  type="submit" 
                  size="icon" 
                  className="h-9 w-9"
                  style={settings.newsletter_button_color ? { backgroundColor: settings.newsletter_button_color } : undefined}
                >
                  <Mail className="h-4 w-4" />
                </Button>
              </form>
              
              {/* Payment Methods Icons */}
              {settings.show_payment_methods && (
                <div className="mt-4 md:mt-6">
                  <p className="text-xs text-muted-foreground mb-2 md:mb-3">
                    {settings.payment_methods_title || t('payment.title')}
                  </p>
                  <div className="flex gap-2 md:gap-3 items-center flex-wrap">
                    {settings.show_visa && (
                      <div className="bg-background border rounded px-2 md:px-3 py-1.5 md:py-2 h-8 md:h-10 flex items-center">
                        <svg className="h-4 md:h-6 w-auto" viewBox="0 0 48 32" fill="none">
                          <rect width="48" height="32" rx="4" fill="white"/>
                          <path d="M18.5 11.5L16 20.5H13.5L12 13.8C11.9 13.4 11.7 13.1 11.4 12.9C10.8 12.5 9.9 12.1 9 11.9L9.1 11.5H13.3C13.8 11.5 14.2 11.9 14.3 12.4L15.1 16.8L17 11.5H18.5ZM24 18.3C24 16.7 21.5 16.6 21.5 15.8C21.5 15.5 21.8 15.2 22.4 15.1C22.7 15.1 23.5 15 24.4 15.4L24.8 13.6C24.2 13.4 23.5 13.2 22.6 13.2C21.2 13.2 20.2 14 20.2 15.1C20.2 15.9 20.9 16.4 21.4 16.7C22 17 22.2 17.2 22.2 17.5C22.2 17.9 21.7 18.1 21.2 18.1C20.4 18.1 20 18 19.3 17.7L18.9 19.5C19.6 19.8 20.9 20 21.3 20C22.8 20 23.8 19.2 24 18.3ZM28.5 20.5H30L28.7 11.5H27.3C26.9 11.5 26.5 11.7 26.4 12.1L23.5 20.5H25L25.5 19H27.5L28.5 20.5ZM26 17.5L26.9 14.8L27.5 17.5H26ZM35.5 11.5L33.8 20.5H32.3L34 11.5H35.5Z" fill="#1434CB"/>
                        </svg>
                      </div>
                    )}
                    
                    {settings.show_mastercard && (
                      <div className="bg-background border rounded px-2 md:px-3 py-1.5 md:py-2 h-8 md:h-10 flex items-center">
                        <svg className="h-4 md:h-6 w-auto" viewBox="0 0 48 32" fill="none">
                          <rect width="48" height="32" rx="4" fill="white"/>
                          <circle cx="18" cy="16" r="7" fill="#EB001B"/>
                          <circle cx="30" cy="16" r="7" fill="#F79E1B"/>
                          <path d="M24 11.2C25.3 12.3 26.1 14 26.1 16C26.1 18 25.3 19.7 24 20.8C22.7 19.7 21.9 18 21.9 16C21.9 14 22.7 12.3 24 11.2Z" fill="#FF5F00"/>
                        </svg>
                      </div>
                    )}
                    
                    {settings.show_bancontact && (
                      <div className="bg-background border rounded px-2 md:px-3 py-1.5 md:py-2 h-8 md:h-10 flex items-center">
                        <svg className="h-4 md:h-6 w-auto" viewBox="0 0 48 32" fill="none">
                          <rect width="48" height="32" rx="4" fill="white"/>
                          <path d="M12 12H18V20H12V12Z" fill="#005498"/>
                          <path d="M18 12H24V20H18V12Z" fill="#009DE0"/>
                          <path d="M24 12H30V20H24V12Z" fill="#71C5E8"/>
                          <path d="M30 12H36V20H30V12Z" fill="#FFED00"/>
                        </svg>
                      </div>
                    )}

                    {settings.show_paypal && (
                      <div className="bg-background border rounded px-2 md:px-3 py-1.5 md:py-2 h-8 md:h-10 flex items-center">
                        <span className="text-xs font-bold text-[#003087]">PayPal</span>
                      </div>
                    )}

                    {settings.show_ideal && (
                      <div className="bg-background border rounded px-2 md:px-3 py-1.5 md:py-2 h-8 md:h-10 flex items-center">
                        <span className="text-xs font-bold text-[#CC0066]">iDEAL</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {settings.show_copyright && (
          <div className="border-t mt-6 md:mt-8 pt-4 md:pt-6 text-center" style={textStyle}>
            <p className="text-muted-foreground">{copyrightText}</p>
          </div>
        )}
      </div>
    </footer>
  );
};