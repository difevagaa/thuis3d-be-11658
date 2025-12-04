import { Facebook, Instagram, Twitter, Mail, Linkedin } from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Footer = () => {
  const { t } = useTranslation('footer');
  const [email, setEmail] = useState("");
  const [customization, setCustomization] = useState<any>(null);
  const [footerLinks, setFooterLinks] = useState<any[]>([]);

  useEffect(() => {
    loadFooterData();

    // Subscribe to real-time changes
    const footerChannel = supabase
      .channel('footer-realtime-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'site_settings'
      }, loadFooterData)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'footer_links'
      }, loadFooterData)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'site_customization'
      }, loadFooterData)
      .subscribe();

    return () => {
      supabase.removeChannel(footerChannel);
    };
  }, []);

  const loadFooterData = async () => {
    try {
      // Load social links from site_settings
      const { data: settingsData } = await supabase
        .from("site_settings")
        .select("*")
        .in('setting_key', ['social_facebook', 'social_instagram', 'social_twitter', 'social_linkedin', 'social_tiktok', 'site_name', 'copyright_text']);
      
      const settings: any = {};
      settingsData?.forEach(setting => {
        settings[setting.setting_key] = setting.setting_value;
      });
      
      // Also load from site_customization for backward compatibility
      const { data: customData } = await supabase
        .from("site_customization")
        .select("*")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      
      const merged = { ...customData, ...settings };
      setCustomization(merged);

      // Load footer links
      const { data: linksData } = await supabase
        .from("footer_links")
        .select("*")
        .eq("is_active", true)
        .order("display_order", { ascending: true });
      
      if (linksData) {
        setFooterLinks(linksData);
      }
    } catch (error) {
      console.error("Error loading footer data:", error);
    }
  };

  const handleNewsletterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    toast.success(t('newsletter.subscribed'));
    setEmail("");
  };

  return (
    <footer className="bg-[#232F3E] text-white border-t border-[#37475A] mt-8 md:mt-16">
      {/* Back to top button - Amazon style */}
      <div 
        className="bg-[#37475A] hover:bg-[#485769] transition-colors cursor-pointer py-3 text-center text-sm font-medium"
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      >
        {t('backToTop', { defaultValue: 'Back to top' })}
      </div>

      <div className="container mx-auto px-4 py-8 md:py-12 pb-24 md:pb-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
          {/* Get to Know Us */}
          <div>
            <h4 className="font-bold text-base mb-3 md:mb-4">Get to Know Us</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/page/about" className="text-white/80 hover:text-white transition-colors">
                  About Us
                </Link>
              </li>
              <li>
                <Link to="/blog" className="text-white/80 hover:text-white transition-colors">
                  {t('quickLinks.blog')}
                </Link>
              </li>
              <li>
                <Link to="/galeria" className="text-white/80 hover:text-white transition-colors">
                  Gallery
                </Link>
              </li>
            </ul>
          </div>

          {/* Products & Services */}
          <div>
            <h4 className="font-bold text-base mb-3 md:mb-4">Products & Services</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/productos" className="text-white/80 hover:text-white transition-colors">
                  {t('quickLinks.catalog')}
                </Link>
              </li>
              <li>
                <Link to="/cotizaciones" className="text-white/80 hover:text-white transition-colors">
                  {t('quickLinks.requestQuote')}
                </Link>
              </li>
              <li>
                <Link to="/tarjetas-regalo" className="text-white/80 hover:text-white transition-colors">
                  {t('quickLinks.giftCards')}
                </Link>
              </li>
            </ul>
          </div>

          {/* Customer Service */}
          <div>
            <h4 className="font-bold text-base mb-3 md:mb-4">{t('help.title')}</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/page/faq" className="text-white/80 hover:text-white transition-colors">
                  {t('help.faq')}
                </Link>
              </li>
              <li>
                <Link to="/legal/terms" className="text-white/80 hover:text-white transition-colors">
                  {t('help.terms')}
                </Link>
              </li>
              <li>
                <Link to="/legal/privacy" className="text-white/80 hover:text-white transition-colors">
                  {t('help.privacy')}
                </Link>
              </li>
              <li>
                <Link to="/legal/cookies" className="text-white/80 hover:text-white transition-colors">
                  {t('help.cookies')}
                </Link>
              </li>
            </ul>
          </div>

          {/* Connect With Us */}
          <div>
            <h4 className="font-bold text-base mb-3 md:mb-4">Connect With Us</h4>
            <div className="flex gap-3 mb-4">
              {customization?.social_facebook && (
                <a href={customization.social_facebook} target="_blank" rel="noopener noreferrer" className="text-white/80 hover:text-white transition-colors">
                  <Facebook className="h-5 w-5" />
                </a>
              )}
              {customization?.social_instagram && (
                <a href={customization.social_instagram} target="_blank" rel="noopener noreferrer" className="text-white/80 hover:text-white transition-colors">
                  <Instagram className="h-5 w-5" />
                </a>
              )}
              {customization?.social_twitter && (
                <a href={customization.social_twitter} target="_blank" rel="noopener noreferrer" className="text-white/80 hover:text-white transition-colors">
                  <Twitter className="h-5 w-5" />
                </a>
              )}
              {customization?.social_linkedin && (
                <a href={customization.social_linkedin} target="_blank" rel="noopener noreferrer" className="text-white/80 hover:text-white transition-colors">
                  <Linkedin className="h-5 w-5" />
                </a>
              )}
            </div>
            
            {/* Newsletter */}
            <div className="mt-4">
              <p className="text-white/80 text-sm mb-2">
                {t('newsletter.description')}
              </p>
              <form onSubmit={handleNewsletterSubmit} className="flex gap-2">
                <Input
                  type="email"
                  placeholder={t('newsletter.placeholder')}
                  className="text-sm h-9 bg-background text-foreground border-white/20"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <Button type="submit" size="icon" className="h-9 w-9 bg-primary hover:bg-primary/90">
                  <Mail className="h-4 w-4" />
                </Button>
              </form>
            </div>
          </div>
        </div>

        {/* Payment Methods */}
        <div className="mt-8 pt-6 border-t border-white/10">
          <div className="flex flex-wrap gap-4 items-center justify-center">
            <div className="text-sm text-white/60">We accept:</div>
            {/* Visa */}
            <div className="bg-white rounded px-3 py-1.5 h-10 flex items-center">
              <svg className="h-6 w-auto" viewBox="0 0 48 32" fill="none">
                <path d="M18.5 11.5L16 20.5H13.5L12 13.8C11.9 13.4 11.7 13.1 11.4 12.9C10.8 12.5 9.9 12.1 9 11.9L9.1 11.5H13.3C13.8 11.5 14.2 11.9 14.3 12.4L15.1 16.8L17 11.5H18.5ZM24 18.3C24 16.7 21.5 16.6 21.5 15.8C21.5 15.5 21.8 15.2 22.4 15.1C22.7 15.1 23.5 15 24.4 15.4L24.8 13.6C24.2 13.4 23.5 13.2 22.6 13.2C21.2 13.2 20.2 14 20.2 15.1C20.2 15.9 20.9 16.4 21.4 16.7C22 17 22.2 17.2 22.2 17.5C22.2 17.9 21.7 18.1 21.2 18.1C20.4 18.1 20 18 19.3 17.7L18.9 19.5C19.6 19.8 20.9 20 21.3 20C22.8 20 23.8 19.2 24 18.3ZM28.5 20.5H30L28.7 11.5H27.3C26.9 11.5 26.5 11.7 26.4 12.1L23.5 20.5H25L25.5 19H27.5L28.5 20.5ZM26 17.5L26.9 14.8L27.5 17.5H26ZM35.5 11.5L33.8 20.5H32.3L34 11.5H35.5Z" fill="#1434CB"/>
              </svg>
            </div>
            
            {/* Mastercard */}
            <div className="bg-white rounded px-3 py-1.5 h-10 flex items-center">
              <svg className="h-6 w-auto" viewBox="0 0 48 32" fill="none">
                <circle cx="18" cy="16" r="7" fill="#EB001B"/>
                <circle cx="30" cy="16" r="7" fill="#F79E1B"/>
                <path d="M24 11.2C25.3 12.3 26.1 14 26.1 16C26.1 18 25.3 19.7 24 20.8C22.7 19.7 21.9 18 21.9 16C21.9 14 22.7 12.3 24 11.2Z" fill="#FF5F00"/>
              </svg>
            </div>
            
            {/* Bancontact */}
            <div className="bg-white rounded px-3 py-1.5 h-10 flex items-center">
              <svg className="h-6 w-auto" viewBox="0 0 48 32" fill="none">
                <path d="M12 12H18V20H12V12Z" fill="#005498"/>
                <path d="M18 12H24V20H18V12Z" fill="#009DE0"/>
                <path d="M24 12H30V20H24V12Z" fill="#71C5E8"/>
                <path d="M30 12H36V20H30V12Z" fill="#FFED00"/>
              </svg>
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-6 pt-6 border-t border-white/10 text-center text-xs text-white/60">
          <p>{customization?.copyright_text || `© ${new Date().getFullYear()} Thuis3D.be - ${t('copyright')}`}</p>
        </div>
      </div>
    </footer>
  );
};
