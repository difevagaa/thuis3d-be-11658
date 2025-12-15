import { useState, useEffect } from "react";
import { logger } from '@/lib/logger';
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Percent, Save } from "lucide-react";

export default function TaxConfiguration() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [taxEnabled, setTaxEnabled] = useState(true);
  const [taxRate, setTaxRate] = useState("21");

  useEffect(() => {
    loadTaxSettings();
  }, []);

  const loadTaxSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("site_settings")
        .select("setting_key, setting_value")
        .in("setting_key", ["tax_enabled", "tax_rate"]);

      if (error) throw error;

      data?.forEach(setting => {
        if (setting.setting_key === "tax_enabled") {
          setTaxEnabled(setting.setting_value === "true");
        } else if (setting.setting_key === "tax_rate") {
          setTaxRate(setting.setting_value);
        }
      });
    } catch (error) {
      logger.error("Error loading tax settings:", error);
      toast.error("Error al cargar configuración de IVA");
    } finally {
      setLoading(false);
    }
  };

  const saveTaxSettings = async () => {
    setSaving(true);
    try {
      // Validate tax rate
      const rate = parseFloat(taxRate);
      if (isNaN(rate) || rate < 0 || rate > 100) {
        toast.error("La tasa de IVA debe estar entre 0 y 100");
        return;
      }

      // Update tax_enabled
      const { error: enabledError } = await supabase
        .from("site_settings")
        .update({ setting_value: taxEnabled.toString() })
        .eq("setting_key", "tax_enabled");

      if (enabledError) throw enabledError;

      // Update tax_rate
      const { error: rateError } = await supabase
        .from("site_settings")
        .update({ setting_value: taxRate })
        .eq("setting_key", "tax_rate");

      if (rateError) throw rateError;

      toast.success("Configuración de IVA guardada exitosamente");
    } catch (error) {
      logger.error("Error saving tax settings:", error);
      toast.error("Error al guardar configuración");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <p>Cargando...</p>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Percent className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Configuración de IVA</h1>
            <p className="text-muted-foreground">
              Administra la configuración de impuestos para productos y tarjetas regalo
            </p>
          </div>
        </div>

        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Configuración Global de IVA</CardTitle>
              <CardDescription>
                Esta configuración afecta a todos los productos y tarjetas regalo que tengan el IVA habilitado
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="tax-enabled">IVA Habilitado</Label>
                  <p className="text-sm text-muted-foreground">
                    Activar o desactivar el cobro de IVA en todo el sistema
                  </p>
                </div>
                <Switch
                  id="tax-enabled"
                  checked={taxEnabled}
                  onCheckedChange={setTaxEnabled}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tax-rate">Tasa de IVA (%)</Label>
                <div className="flex gap-2 items-center">
                  <Input
                    id="tax-rate"
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={taxRate}
                    onChange={(e) => setTaxRate(e.target.value)}
                    className="max-w-xs"
                  />
                  <span className="text-muted-foreground">%</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Tasa de IVA estándar en Bélgica: 21%
                </p>
              </div>

              <Button 
                onClick={saveTaxSettings} 
                disabled={saving}
                className="w-full"
              >
                <Save className="mr-2 h-4 w-4" />
                {saving ? "Guardando..." : "Guardar Configuración"}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Información</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>
                <strong>IVA Global:</strong> Cuando el IVA global está habilitado, se aplicará
                a todos los productos y tarjetas regalo que tengan su campo de IVA individual activado.
              </p>
              <p>
                <strong>IVA por Producto:</strong> Cada producto y tarjeta regalo puede configurarse
                individualmente para aplicar o no IVA. Esta configuración se hace en las páginas de
                edición de productos y tarjetas regalo.
              </p>
              <p>
                <strong>Cálculo:</strong> El IVA se calcula sobre el subtotal después de aplicar
                descuentos de cupones y tarjetas regalo.
              </p>
              <div className="bg-primary/10 p-4 rounded-lg">
                <p className="font-semibold text-foreground">Ejemplo de Cálculo:</p>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Subtotal: €100.00</li>
                  <li>Descuento: -€10.00</li>
                  <li>Base imponible: €90.00</li>
                  <li>IVA (21%): €18.90</li>
                  <li><strong>Total: €108.90</strong></li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}