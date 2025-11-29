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
  const [availableCountries, setAvailableCountries] = useState<any[]>([]);
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

  useEffect(() => {
    loadUserShippingData();
    loadAvailableCountries();
  }, []);

  const loadAvailableCountries = async () => {
    const countries = await getAvailableCountries();
    setAvailableCountries(countries);
  };

  const loadUserShippingData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        // Load profile data to prefill form
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('full_name, email, phone, address, city, postal_code, country')
          .eq('id', user.id)
          .single();

        if (error) throw error;

        if (profile) {
          setFormData({
            full_name: profile.full_name || "",
            email: profile.email || user.email || "",
            phone: profile.phone || "",
            address: profile.address || "",
            city: profile.city || "",
            postal_code: profile.postal_code || "",
            country: profile.country || "BE",
            country_name: "Bélgica"
          });
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
    
    // Validate form using centralized validation
    const validation = validateShippingInfo(formData);
    if (!showValidationError(validation)) {
      return;
    }

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
      
      // Crear/actualizar sesión de checkout con la info de envío
      const shippingInfo = { ...formData };
      try {
        const { data: session, error: sessionError } = await supabase
          .from('checkout_sessions')
          .insert({
            user_id: user ? user.id : null,
            shipping_info: shippingInfo,
            expires_at: new Date(Date.now() + 1000 * 60 * 60 * 2).toISOString() // 2h
          })
          .select()
          .single();
        if (sessionError) throw sessionError;
        if (session?.id) {
          sessionStorage.setItem('checkout_session_id', session.id);
        }
      } catch (sessionErr) {
        handleSupabaseError(sessionErr, {
          toastMessage: t('shipping:messages.error'),
          context: 'Create Checkout Session'
        });
        return;
      }

      toast.success(t('shipping:messages.saved'));
      navigate("/resumen-pago");
    } catch (error) {
      handleSupabaseError(error, {
        toastMessage: t('shipping:messages.error'),
        context: "Save Shipping Info"
      });
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-12 max-w-2xl">
        <Card>
          <CardContent className="p-8 text-center">
            <p>{t('shipping:messages.loading')}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-2 xs:px-3 sm:px-4 py-6 xs:py-8 sm:py-12 max-w-2xl">
      <Card>
        <CardHeader className="p-3 xs:p-4 sm:p-6">
          <CardTitle className="text-base xs:text-lg sm:text-xl">{t('shipping:title')}</CardTitle>
          <CardDescription className="text-xs xs:text-sm">{t('shipping:description')}</CardDescription>
        </CardHeader>
        <CardContent className="p-3 xs:p-4 sm:p-6 pt-0">
          <form onSubmit={handleSubmit} className="space-y-3 xs:space-y-4">
            <div>
              <Label htmlFor="full_name" className="text-xs xs:text-sm">{t('shipping:form.fullName')} *</Label>
              <Input
                id="full_name"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                placeholder={t('shipping:placeholders.fullName')}
                required
                className="text-sm xs:text-base h-9 xs:h-10"
              />
            </div>

            <div>
              <Label htmlFor="email" className="text-xs xs:text-sm">{t('shipping:form.email')} *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder={t('shipping:placeholders.email')}
                required
                className="text-sm xs:text-base h-9 xs:h-10"
              />
            </div>

            <div>
              <Label htmlFor="phone" className="text-xs xs:text-sm">{t('shipping:form.phone')} *</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder={t('shipping:placeholders.phone')}
                required
                className="text-sm xs:text-base h-9 xs:h-10"
              />
            </div>

            <div>
              <Label htmlFor="address" className="text-xs xs:text-sm">{t('shipping:form.address')} *</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder={t('shipping:placeholders.address')}
                required
                className="text-sm xs:text-base h-9 xs:h-10"
              />
            </div>

            <div className="grid grid-cols-1 xs:grid-cols-2 gap-3 xs:gap-4">
              <div>
                <Label htmlFor="city" className="text-xs xs:text-sm">{t('shipping:form.city')} *</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  placeholder={t('shipping:placeholders.city')}
                  required
                  className="text-sm xs:text-base h-9 xs:h-10"
                />
              </div>

              <div>
                <Label htmlFor="postal_code" className="text-xs xs:text-sm">{t('shipping:form.postalCode')} *</Label>
                <Input
                  id="postal_code"
                  value={formData.postal_code}
                  onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                  placeholder={t('shipping:placeholders.postalCode')}
                  required
                  className="text-sm xs:text-base h-9 xs:h-10"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="country" className="text-xs xs:text-sm">{t('shipping:form.country')} *</Label>
              <Select 
                value={formData.country} 
                onValueChange={(value) => {
                  const country = availableCountries.find(c => c.country_code === value);
                  setFormData({ 
                    ...formData, 
                    country: value,
                    country_name: country?.country_name || value
                  });
                }}
              >
                <SelectTrigger className="text-sm xs:text-base h-9 xs:h-10">
                  <SelectValue placeholder={t('shipping:form.countryPlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  {availableCountries.map((country) => (
                    <SelectItem key={country.country_code} value={country.country_code} className="text-sm xs:text-base">
                      {country.country_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[10px] xs:text-xs text-muted-foreground mt-1">
                {t('shipping:form.selectCountry')}
              </p>
            </div>

            <div className="flex flex-col xs:flex-row gap-2 xs:gap-4 pt-3 xs:pt-4">
              <Button type="button" variant="outline" onClick={() => navigate(-1)} className="flex-1 text-sm xs:text-base h-9 xs:h-10">
                {t('shipping:buttons.back')}
              </Button>
              <Button type="submit" className="flex-1 text-sm xs:text-base h-9 xs:h-10">
                {t('shipping:buttons.continue')}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
