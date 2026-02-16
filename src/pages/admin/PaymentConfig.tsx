import { useState, useEffect } from "react";
import { logger } from '@/lib/logger';
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { CreditCard, Banknote, Upload, X, Building2 } from "lucide-react";
import { useRoleValidation } from "@/hooks/useRoleValidation";

export default function PaymentConfig() {
  // Validate admin role
  const { isValidating, hasAccess } = useRoleValidation(['admin', 'superadmin']);
  
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [config, setConfig] = useState({
    bank_transfer_enabled: true,
    card_enabled: true,
    paypal_enabled: false,
    revolut_enabled: false,
    bank_account_number: "",
    bank_account_name: "",
    bank_name: "",
    bank_instructions: "",
    paypal_email: "",
    revolut_link: "",
    card_payment_link: "",
    company_info: "",
  });
  const [paymentImages, setPaymentImages] = useState<string[]>([]);

  // Show loading while validating role
  if (isValidating) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Verificando permisos...</p>
        </div>
      </div>
    );
  }

  // Don't render if user doesn't have access
  if (!hasAccess) {
    return null;
  }

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      // Get all payment-related settings by their keys
      const settingKeys = [
        'bank_transfer_enabled', 'card_enabled', 'paypal_enabled', 'revolut_enabled',
        'bank_account_number', 'bank_account_name', 'bank_name', 'bank_instructions',
        'paypal_email', 'revolut_link', 'card_payment_link', 'company_info', 'payment_images'
      ];

      const { data } = await supabase
        .from("site_settings")
        .select("*")
        .in("setting_key", settingKeys);

      if (data && data.length > 0) {
        const settings: any = {};
        data.forEach((setting) => {
          if (setting.setting_key === 'payment_images') {
            try {
              setPaymentImages(JSON.parse(setting.setting_value));
            } catch (e) {
              setPaymentImages([]);
            }
          } else if (setting.setting_key.includes('enabled')) {
            settings[setting.setting_key] = setting.setting_value === "true";
          } else {
            settings[setting.setting_key] = setting.setting_value;
          }
        });
        setConfig({
          bank_transfer_enabled: settings.bank_transfer_enabled ?? true,
          card_enabled: settings.card_enabled ?? true,
          paypal_enabled: settings.paypal_enabled ?? false,
          revolut_enabled: settings.revolut_enabled ?? false,
          bank_account_number: settings.bank_account_number || "",
          bank_account_name: settings.bank_account_name || "",
          bank_name: settings.bank_name || "",
          bank_instructions: settings.bank_instructions || "",
          paypal_email: settings.paypal_email || "",
          revolut_link: settings.revolut_link || "",
          card_payment_link: settings.card_payment_link || "",
          company_info: settings.company_info || "",
        });
      }
    } catch (error) {
      logger.error("Error loading config:", error);
      toast.error("Error al cargar configuración");
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    if (paymentImages.length >= 3) {
      toast.error("Máximo 3 imágenes permitidas");
      return;
    }

    const file = e.target.files[0];
    setUploading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `payment-${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError, data } = await supabase.storage
        .from('product-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('product-images')
        .getPublicUrl(filePath);

      setPaymentImages([...paymentImages, publicUrl]);
      toast.success("Imagen cargada correctamente");
    } catch (error: any) {
      logger.error("Error uploading:", error);
      toast.error("Error al cargar imagen");
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (index: number) => {
    setPaymentImages(paymentImages.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    try {
      const settings = [
        {
          setting_key: "bank_transfer_enabled",
          setting_value: config.bank_transfer_enabled.toString(),
          setting_group: "general"
        },
        {
          setting_key: "card_enabled",
          setting_value: config.card_enabled.toString(),
          setting_group: "general"
        },
        {
          setting_key: "paypal_enabled",
          setting_value: config.paypal_enabled.toString(),
          setting_group: "general"
        },
        {
          setting_key: "revolut_enabled",
          setting_value: config.revolut_enabled.toString(),
          setting_group: "general"
        },
        {
          setting_key: "bank_account_number",
          setting_value: config.bank_account_number,
          setting_group: "general"
        },
        {
          setting_key: "bank_account_name",
          setting_value: config.bank_account_name,
          setting_group: "general"
        },
        {
          setting_key: "bank_name",
          setting_value: config.bank_name,
          setting_group: "general"
        },
        {
          setting_key: "bank_instructions",
          setting_value: config.bank_instructions,
          setting_group: "general"
        },
        {
          setting_key: "paypal_email",
          setting_value: config.paypal_email,
          setting_group: "general"
        },
        {
          setting_key: "revolut_link",
          setting_value: config.revolut_link,
          setting_group: "general"
        },
        {
          setting_key: "card_payment_link",
          setting_value: config.card_payment_link,
          setting_group: "general"
        },
        {
          setting_key: "company_info",
          setting_value: config.company_info,
          setting_group: "general"
        },
        {
          setting_key: "payment_images",
          setting_value: JSON.stringify(paymentImages),
          setting_group: "general"
        }
      ];

      // Update or insert each setting individually
      for (const setting of settings) {
        // Check if setting exists
        const { data: existing } = await supabase
          .from("site_settings")
          .select("id")
          .eq("setting_key", setting.setting_key)
          .single();

        if (existing) {
          // Update existing
          const { error } = await supabase
            .from("site_settings")
            .update({
              setting_value: setting.setting_value,
              updated_at: new Date().toISOString()
            })
            .eq("setting_key", setting.setting_key);

          if (error) throw error;
        } else {
          // Insert new
          const { error } = await supabase
            .from("site_settings")
            .insert(setting);

          if (error) throw error;
        }
      }

      toast.success("Configuración de pagos guardada exitosamente");
      await loadConfig();
    } catch (error: any) {
      logger.error("Error saving payment config:", error);
      toast.error(`Error al guardar configuración: ${error.message || 'Error desconocido'}`);
    }
  };

  if (loading) return <div className="container mx-auto p-6">Cargando...</div>;

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      <h1 className="text-2xl md:text-3xl font-bold">Configuración de Métodos de Pago</h1>

      <Card>
        <CardHeader>
          <CardTitle>Métodos de Pago Disponibles</CardTitle>
          <CardDescription>
            Activa o desactiva los métodos de pago que quieres ofrecer a tus clientes
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between p-4 border rounded-lg gap-4">
            <div className="flex items-center gap-4">
              <Banknote className="h-6 w-6 md:h-8 md:w-8 text-primary flex-shrink-0" />
              <div>
                <Label className="text-sm md:text-base font-semibold">Transferencia Bancaria</Label>
                <p className="text-xs md:text-sm text-muted-foreground">
                  Los clientes recibirán instrucciones para transferencia bancaria
                </p>
              </div>
            </div>
            <Switch
              checked={config.bank_transfer_enabled}
              onCheckedChange={(checked) => 
                setConfig({ ...config, bank_transfer_enabled: checked })
              }
            />
          </div>

          <div className="flex flex-col md:flex-row items-start md:items-center justify-between p-4 border rounded-lg gap-4">
            <div className="flex items-center gap-4">
              <CreditCard className="h-6 w-6 md:h-8 md:w-8 text-primary flex-shrink-0" />
              <div>
                <Label className="text-sm md:text-base font-semibold">Tarjeta de Crédito/Débito</Label>
                <p className="text-xs md:text-sm text-muted-foreground">
                  Pagos con tarjeta Visa, Mastercard, American Express
                </p>
              </div>
            </div>
            <Switch
              checked={config.card_enabled}
              onCheckedChange={(checked) => 
                setConfig({ ...config, card_enabled: checked })
              }
            />
          </div>

          {config.card_enabled && (
            <div className="ml-4 md:ml-12 p-4 bg-muted/50 rounded-lg space-y-3">
              <div className="space-y-2">
                <Label htmlFor="card_payment_link">Enlace de Pago con Tarjeta</Label>
                <Input
                  id="card_payment_link"
                  value={config.card_payment_link}
                  onChange={(e) => setConfig({ ...config, card_payment_link: e.target.value })}
                  placeholder="https://tu-pasarela-de-pago.com/link"
                />
                <p className="text-xs text-muted-foreground">
                  URL de la pasarela de pago donde se redirigirá al cliente para pagar con tarjeta (Stripe, Square, etc.)
                </p>
              </div>
            </div>
          )}

          <div className="flex flex-col md:flex-row items-start md:items-center justify-between p-4 border rounded-lg gap-4">
            <div className="flex items-center gap-4">
              <svg className="h-6 w-6 md:h-8 md:w-8 text-primary flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.067 8.478c.492.88.556 2.014.3 3.327-.74 3.806-3.276 5.12-6.514 5.12h-.5a.805.805 0 00-.794.68l-.04.22-.63 3.993-.028.15a.806.806 0 01-.795.68H8.934c-.414 0-.629-.29-.535-.67l.105-.67.629-3.99.04-.22a.806.806 0 01.794-.68h.5c3.238 0 5.774-1.314 6.514-5.12.256-1.313.192-2.447-.3-3.327z"/>
                <path d="M19.107 5.663c-.382-.636-1.016-1.04-1.922-1.04H9.772C9.274 4.623 8.9 5.05 8.817 5.584L6.456 20.883c-.1.536.22.977.756.977h4.124l1.035-6.572-.032.202c.083-.534.457-.96.955-.96h1.99c3.904 0 6.96-1.586 7.85-6.172.025-.127.048-.251.068-.374.258-1.656-.006-2.78-.745-3.76-.236-.313-.516-.58-.85-.797z"/>
              </svg>
              <div>
                <Label className="text-sm md:text-base font-semibold">PayPal</Label>
                <p className="text-xs md:text-sm text-muted-foreground">
                  Pagos mediante PayPal
                </p>
              </div>
            </div>
            <Switch
              checked={config.paypal_enabled}
              onCheckedChange={(checked) => 
                setConfig({ ...config, paypal_enabled: checked })
              }
            />
          </div>

          <div className="flex flex-col md:flex-row items-start md:items-center justify-between p-4 border rounded-lg gap-4">
            <div className="flex items-center gap-4">
              <svg className="h-6 w-6 md:h-8 md:w-8 text-primary flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.31-8.86c-1.77-.45-2.34-.94-2.34-1.67 0-.84.79-1.43 2.1-1.43 1.38 0 1.9.66 1.94 1.64h1.71c-.05-1.34-.87-2.57-2.49-2.97V5H10.9v1.69c-1.51.32-2.72 1.3-2.72 2.81 0 1.79 1.49 2.69 3.66 3.21 1.95.46 2.34 1.15 2.34 1.87 0 .53-.39 1.39-2.1 1.39-1.6 0-2.23-.72-2.32-1.64H8.04c.1 1.7 1.36 2.66 2.86 2.97V19h2.34v-1.67c1.52-.29 2.72-1.16 2.73-2.77-.01-2.2-1.9-2.96-3.66-3.42z"/>
              </svg>
              <div>
                <Label className="text-sm md:text-base font-semibold">Revolut</Label>
                <p className="text-xs md:text-sm text-muted-foreground">
                  Pagos mediante enlace de Revolut
                </p>
              </div>
            </div>
            <Switch
              checked={config.revolut_enabled}
              onCheckedChange={(checked) => 
                setConfig({ ...config, revolut_enabled: checked })
              }
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Información de la Empresa</CardTitle>
          <CardDescription>
            Esta información se mostrará en la página de pago
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="company_info">Información de la Empresa</Label>
            <Textarea
              id="company_info"
              value={config.company_info}
              onChange={(e) => setConfig({ ...config, company_info: e.target.value })}
              placeholder="Nombre de empresa, dirección, teléfono, etc."
              rows={4}
            />
          </div>
        </CardContent>
      </Card>

      {config.paypal_enabled && (
        <Card>
          <CardHeader>
            <CardTitle>Configuración de PayPal</CardTitle>
            <CardDescription>
              Ingresa tu email de PayPal para recibir pagos
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="paypal_email">Email de PayPal</Label>
              <Input
                id="paypal_email"
                type="email"
                value={config.paypal_email}
                onChange={(e) => setConfig({ ...config, paypal_email: e.target.value })}
                placeholder="tu-email@paypal.com"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {config.revolut_enabled && (
        <Card>
          <CardHeader>
            <CardTitle>Configuración de Revolut</CardTitle>
            <CardDescription>
              Ingresa tu enlace de pago de Revolut
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="revolut_link">Enlace de Pago de Revolut</Label>
              <Input
                id="revolut_link"
                value={config.revolut_link}
                onChange={(e) => setConfig({ ...config, revolut_link: e.target.value })}
                placeholder="https://revolut.me/tu-usuario"
              />
              <p className="text-xs text-muted-foreground">
                Puedes obtener tu enlace de pago en la app de Revolut → Payments → Payment Link
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Información Bancaria</CardTitle>
          <CardDescription>
            Configuración de datos bancarios para transferencias
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="bank_name">Nombre del Banco</Label>
              <Input
                id="bank_name"
                value={config.bank_name}
                onChange={(e) => setConfig({ ...config, bank_name: e.target.value })}
                placeholder="Ej: Banco Santander"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bank_account_name">Nombre del Titular</Label>
              <Input
                id="bank_account_name"
                value={config.bank_account_name}
                onChange={(e) => setConfig({ ...config, bank_account_name: e.target.value })}
                placeholder="Nombre completo"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="bank_account_number">Número de Cuenta / IBAN</Label>
            <Input
              id="bank_account_number"
              value={config.bank_account_number}
              onChange={(e) => setConfig({ ...config, bank_account_number: e.target.value })}
              placeholder="ES00 0000 0000 0000 0000 0000"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bank_instructions">Instrucciones Adicionales</Label>
            <Textarea
              id="bank_instructions"
              value={config.bank_instructions}
              onChange={(e) => setConfig({ ...config, bank_instructions: e.target.value })}
              placeholder="Instrucciones para los clientes sobre cómo realizar la transferencia..."
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label>Imágenes de Referencia (máximo 3)</Label>
            <p className="text-sm text-muted-foreground">
              Puedes subir códigos QR, capturas de pantalla de datos bancarios, etc.
              Añade un texto descriptivo debajo de cada imagen (ej. "QR Revolut", "IBAN Transferencia")
            </p>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
              {paymentImages.map((img, index) => (
                <div key={index} className="relative aspect-square border rounded-lg overflow-hidden">
                  <img src={img} alt={`Payment ${index + 1}`} className="w-full h-full object-cover" />
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2 h-6 w-6"
                    onClick={() => removeImage(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              
              {paymentImages.length < 3 && (
                <label className="aspect-square border-2 border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-muted/50 transition-colors">
                  <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                  <span className="text-xs text-muted-foreground text-center px-2">
                    {uploading ? "Subiendo..." : "Subir imagen"}
                  </span>
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={uploading}
                  />
                </label>
              )}
            </div>
          </div>

          <Button onClick={handleSave} className="w-full">
            Guardar Configuración
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}