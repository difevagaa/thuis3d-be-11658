import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useShippingCalculator } from "@/hooks/useShippingCalculator";
import { logger } from "@/lib/logger";
import { handleSupabaseError } from "@/lib/errorHandler";
import { validateShippingInfo, showValidationError } from "@/lib/validation";

export default function ShippingInfo() {
  const navigate = useNavigate();
  const { t } = useTranslation(['shipping', 'common']);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [availableCountries, setAvailableCountries] = useState<any[]>([]);
  const [countriesLoaded, setCountriesLoaded] = useState(false);
  const { getAvailableCountries } = useShippingCalculator();
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    postal_code: "",
    country: "BE",
    country_name: "Bélgica"
  });

  // Load countries only once
  useEffect(() => {
    let cancelled = false;
    const loadCountries = async () => {
      const countries = await getAvailableCountries();
      if (!cancelled) {
        setAvailableCountries(countries);
        setCountriesLoaded(true);
        // Auto-set country if only one available
        if (countries.length === 1) {
          setFormData(prev => ({
            ...prev,
            country: countries[0].country_code,
            country_name: countries[0].country_name
          }));
        } else if (countries.length > 1) {
          // Resolve country_name from the loaded countries based on current code
          setFormData(prev => {
            const match = countries.find(c => c.country_code === prev.country);
            return match ? { ...prev, country_name: match.country_name } : prev;
          });
        }
      }
    };
    loadCountries();
    return () => { cancelled = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    loadUserShippingData();
  }, []);

  const loadUserShippingData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('full_name, email, phone, address, city, postal_code, country')
          .eq('id', user.id)
          .single();

        if (error) throw error;

        if (profile) {
          setFormData(prev => ({
            ...prev,
            full_name: profile.full_name || "",
            email: profile.email || user.email || "",
            phone: profile.phone || "",
            address: profile.address || "",
            city: profile.city || "",
            postal_code: profile.postal_code || "",
            country: profile.country || prev.country,
            country_name: prev.country_name
          }));
        }
      }
    } catch (error) {
      logger.error("Error loading user data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prevent double submission
    if (submitting) return;
    
    // Validate form using centralized validation
    const validation = validateShippingInfo(formData);
    if (!showValidationError(validation)) {
      return;
    }

    setSubmitting(true);

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      // Update user profile with shipping information
      if (user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            full_name: formData.full_name,
            phone: formData.phone,
            address: formData.address,
            city: formData.city,
            postal_code: formData.postal_code,
            country: formData.country
          })
          .eq('id', user.id);

        if (profileError) throw profileError;
      }
      
      // Load cart data to save with checkout session for abandoned cart recovery
      const savedCart = localStorage.getItem("cart");
      let cartData: any[] = [];
      if (savedCart) {
        try {
          cartData = JSON.parse(savedCart);
        } catch (e) {
          logger.error("Error parsing cart data:", e);
        }
      }

      // Check if we already have a checkout session to prevent duplicates
      const existingSessionId = sessionStorage.getItem('checkout_session_id');
      if (existingSessionId) {
        // Update existing session instead of creating new one
        const { error: updateError } = await supabase
          .from('checkout_sessions')
          .update({
            shipping_info: formData,
            cart_data: cartData,
            last_activity: new Date().toISOString(),
            expires_at: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString() // 24 hours for abandoned cart detection
          })
          .eq('id', existingSessionId);
        
        if (!updateError) {
          toast.success(t('shipping:messages.saved'));
          navigate("/resumen-pago");
          return;
        }
        // If update failed (session expired/deleted), create new one
        sessionStorage.removeItem('checkout_session_id');
      }
      
      // Create new checkout session
      const shippingInfo = { ...formData };
      const { data: session, error: sessionError } = await supabase
        .from('checkout_sessions')
        .insert({
          user_id: user ? user.id : null,
          shipping_info: shippingInfo,
          cart_data: cartData,
          status: 'active',
          last_activity: new Date().toISOString(),
          expires_at: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString() // 24 hours for abandoned cart detection
        })
        .select()
        .single();
        
      if (sessionError) {
        handleSupabaseError(sessionError, {
          toastMessage: t('shipping:messages.error'),
          context: 'Create Checkout Session'
        });
        setSubmitting(false);
        return;
      }
      
      if (session?.id) {
        sessionStorage.setItem('checkout_session_id', session.id);
      }

      toast.success(t('shipping:messages.saved'));
      navigate("/resumen-pago");
    } catch (error) {
      handleSupabaseError(error, {
        toastMessage: t('shipping:messages.error'),
        context: "Save Shipping Info"
      });
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="narrow-container py-12">
        <Card>
          <CardContent className="p-8 text-center">
            <p>{t('shipping:messages.loading')}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="narrow-container py-6 md:py-10 pb-24 md:pb-12">
      <Card>
        <CardHeader className="px-4 md:px-6">
          <CardTitle className="text-lg md:text-xl lg:text-2xl">{t('shipping:title')}</CardTitle>
          <CardDescription className="text-sm">{t('shipping:description')}</CardDescription>
        </CardHeader>
        <CardContent className="px-4 md:px-6">
          <form onSubmit={handleSubmit} className="space-y-3 md:space-y-4">
            <div>
              <Label htmlFor="full_name">{t('shipping:form.fullName')} *</Label>
              <Input
                id="full_name"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                placeholder={t('shipping:placeholders.fullName')}
                required
              />
            </div>

            <div>
              <Label htmlFor="email">{t('shipping:form.email')} *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder={t('shipping:placeholders.email')}
                required
              />
            </div>

            <div>
              <Label htmlFor="phone">{t('shipping:form.phone')} *</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder={t('shipping:placeholders.phone')}
                required
              />
            </div>

            <div>
              <Label htmlFor="address">{t('shipping:form.address')} *</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder={t('shipping:placeholders.address')}
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
              <div>
                <Label htmlFor="city" className="text-sm">{t('shipping:form.city')} *</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  placeholder={t('shipping:placeholders.city')}
                  required
                  className="h-10"
                />
              </div>

              <div>
                <Label htmlFor="postal_code" className="text-sm">{t('shipping:form.postalCode')} *</Label>
                <Input
                  id="postal_code"
                  value={formData.postal_code}
                  onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                  placeholder={t('shipping:placeholders.postalCode')}
                  required
                  className="h-10"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="country">{t('shipping:form.country')} *</Label>
              {availableCountries.length <= 1 ? (
                // Only one country available - show as read-only
                <div className="flex items-center h-10 w-full rounded-md border border-input bg-muted px-3 py-2 text-sm">
                  {availableCountries[0]?.country_name || formData.country_name || 'Bélgica'}
                </div>
              ) : (
                // Multiple countries - show dropdown
                <Select 
                  value={formData.country} 
                  onValueChange={(value) => {
                    const country = availableCountries.find(c => c.country_code === value);
                    if (country) {
                      setFormData(prev => ({ 
                        ...prev, 
                        country: value,
                        country_name: country.country_name
                      }));
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('shipping:form.countryPlaceholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    {availableCountries.map((country) => (
                      <SelectItem key={country.country_code} value={country.country_code}>
                        {country.country_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-3 md:gap-4 pt-4">
              <Button type="button" variant="outline" onClick={() => navigate(-1)} className="flex-1 order-2 sm:order-1" disabled={submitting}>
                {t('shipping:buttons.back')}
              </Button>
              <Button type="submit" className="flex-1 order-1 sm:order-2" disabled={submitting}>
                {submitting ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    {t('common:processing') || 'Procesando...'}
                  </span>
                ) : (
                  t('shipping:buttons.continue')
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
