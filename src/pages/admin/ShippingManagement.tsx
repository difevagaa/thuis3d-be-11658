import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { i18nToast } from "@/lib/i18nToast";
import { Plus, Trash2, Save, Edit, X, MapPin, CheckSquare, Square } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { logger } from "@/lib/logger";

interface ShippingZone {
  id: string;
  zone_name: string;
  country: string;
  postal_code_prefix: string;
  base_cost: number;
  cost_per_kg: number;
  minimum_cost: number;
  is_active: boolean;
  is_default: boolean;
  applies_to_products: boolean | null;
  applies_to_quotes: boolean | null;
  quotes_base_cost: number | null;
  quotes_cost_per_kg: number | null;
  quotes_minimum_cost: number | null;
  created_at: string;
  updated_at: string;
}

interface PostalCode {
  id: string;
  country_code: string;
  postal_code: string;
  shipping_cost: number;
  is_enabled: boolean | null;
  applies_to_products: boolean | null;
  applies_to_quotes: boolean | null;
  quotes_shipping_cost: number | null;
}

interface EditingPostalCode extends PostalCode {
  isEditing?: boolean;
}

export default function ShippingManagement() {
  const [settings, setSettings] = useState<any>(null);
  const [countries, setCountries] = useState<any[]>([]);
  const [postalCodes, setPostalCodes] = useState<PostalCode[]>([]);
  const [zones, setZones] = useState<ShippingZone[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPostalCodeId, setEditingPostalCodeId] = useState<string | null>(null);
  const [editingPostalCodeData, setEditingPostalCodeData] = useState<EditingPostalCode | null>(null);
  const [editingZoneId, setEditingZoneId] = useState<string | null>(null);
  const [showZoneForm, setShowZoneForm] = useState(false);
  
  // Estados para edición masiva
  const [selectedZones, setSelectedZones] = useState<string[]>([]);
  const [showBulkEdit, setShowBulkEdit] = useState(false);
  const [bulkEditData, setBulkEditData] = useState({
    base_cost: '',
    cost_per_kg: '',
    minimum_cost: ''
  });
  
  const [zoneFormData, setZoneFormData] = useState({
    zone_name: '',
    country: 'Bélgica',
    postal_code_prefix: '',
    base_cost: '5.00',
    cost_per_kg: '2.00',
    minimum_cost: '5.00',
    is_active: true,
    is_default: false,
    applies_to_products: true,
    applies_to_quotes: true,
    quotes_base_cost: '' as string,
    quotes_cost_per_kg: '' as string,
    quotes_minimum_cost: '' as string
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [settingsRes, countriesRes, postalCodesRes, zonesRes] = await Promise.all([
        supabase.from("shipping_settings").select("*").maybeSingle(),
        supabase.from("shipping_countries").select("*").order("country_name"),
        supabase.from("shipping_postal_codes").select("*").order("country_code, postal_code"),
        supabase.from("shipping_zones").select("*").order("postal_code_prefix", { ascending: true })
      ]);

      // If no settings exist, initialize with default values
      if (settingsRes.data) {
        setSettings(settingsRes.data);
      } else {
        // Create default settings object for the UI
        setSettings({
          id: null,
          is_enabled: true,
          free_shipping_threshold: null,
          default_shipping_cost: 5.00,
          free_shipping_products_only: false,
          enable_shipping_for_quotes: true,
          quotes_default_shipping_cost: null,
          quotes_free_shipping_threshold: null
        });
      }
      
      if (countriesRes.data) setCountries(countriesRes.data);
      if (postalCodesRes.data) setPostalCodes(postalCodesRes.data);
      if (zonesRes.data) setZones(zonesRes.data);
    } catch (error) {
      logger.error("Error loading data:", error);
      i18nToast.error("error.loadingFailed");
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    try {
      if (!settings) {
        i18nToast.error("error.noConfigToSave");
        return;
      }

      const settingsData = {
        free_shipping_threshold: settings.free_shipping_threshold,
        default_shipping_cost: settings.default_shipping_cost,
        is_enabled: settings.is_enabled,
        free_shipping_products_only: settings.free_shipping_products_only ?? false,
        enable_shipping_for_quotes: settings.enable_shipping_for_quotes ?? true,
        quotes_default_shipping_cost: settings.quotes_default_shipping_cost,
        quotes_free_shipping_threshold: settings.quotes_free_shipping_threshold
      };

      // Use upsert to handle both insert and update scenarios
      if (settings.id) {
        // Update existing settings
        const { error } = await supabase
          .from("shipping_settings")
          .update(settingsData)
          .eq("id", settings.id);

        if (error) throw error;
      } else {
        // Insert new settings if no id exists
        const { data, error } = await supabase
          .from("shipping_settings")
          .insert(settingsData)
          .select()
          .single();

        if (error) throw error;
        
        // Update local state with the new record including its id
        if (data) {
          setSettings(data);
        }
      }

      i18nToast.success("success.configSaved");
    } catch (error) {
      logger.error("Error saving settings:", error);
      i18nToast.error("error.configSaveFailed");
    }
  };

  const updateCountry = async (id: string, field: string, value: any) => {
    try {
      const { error } = await supabase
        .from("shipping_countries")
        .update({ [field]: value })
        .eq("id", id);

      if (error) throw error;
      i18nToast.success("success.countryUpdated");
      loadData();
    } catch (error) {
      logger.error("Error updating country:", error);
      i18nToast.error("error.countrySaveFailed");
    }
  };

  const addCountry = async (data: { country_name: string; country_code: string; shipping_cost: number }) => {
    try {
      const { error } = await supabase
        .from("shipping_countries")
        .insert({
          ...data,
          is_enabled: true
        });

      if (error) throw error;
      i18nToast.success("success.countryAdded");
      loadData();
    } catch (error) {
      logger.error("Error adding country:", error);
      i18nToast.error("error.countrySaveFailed");
    }
  };

  const deleteCountry = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este país?')) return;
    
    try {
      const { error } = await supabase
        .from("shipping_countries")
        .delete()
        .eq("id", id);

      if (error) throw error;
      i18nToast.success("success.countryDeleted");
      loadData();
    } catch (error) {
      logger.error("Error deleting country:", error);
      i18nToast.error("error.countryDeleteFailed");
    }
  };

  const addPostalCode = async (data: { 
    country_code: string; 
    postal_code: string; 
    shipping_cost: number;
    applies_to_products?: boolean;
    applies_to_quotes?: boolean;
    quotes_shipping_cost?: number | null;
  }) => {
    try {
      const { error } = await supabase
        .from("shipping_postal_codes")
        .insert({
          country_code: data.country_code,
          postal_code: data.postal_code,
          shipping_cost: data.shipping_cost,
          applies_to_products: data.applies_to_products ?? true,
          applies_to_quotes: data.applies_to_quotes ?? true,
          quotes_shipping_cost: data.quotes_shipping_cost ?? null
        });

      if (error) throw error;
      i18nToast.success("success.postalCodeAdded");
      loadData();
    } catch (error) {
      logger.error("Error adding postal code:", error);
      i18nToast.error("error.postalCodeSaveFailed");
    }
  };

  const updatePostalCode = async (data: {
    id: string;
    shipping_cost: number;
    applies_to_products: boolean;
    applies_to_quotes: boolean;
    quotes_shipping_cost: number | null;
  }) => {
    try {
      const { error } = await supabase
        .from("shipping_postal_codes")
        .update({
          shipping_cost: data.shipping_cost,
          applies_to_products: data.applies_to_products,
          applies_to_quotes: data.applies_to_quotes,
          quotes_shipping_cost: data.quotes_shipping_cost
        })
        .eq("id", data.id);

      if (error) throw error;
      i18nToast.success("success.postalCodeUpdated");
      setEditingPostalCodeId(null);
      setEditingPostalCodeData(null);
      loadData();
    } catch (error) {
      logger.error("Error updating postal code:", error);
      i18nToast.error("error.postalCodeSaveFailed");
    }
  };

  const startEditingPostalCode = (pc: PostalCode) => {
    setEditingPostalCodeId(pc.id);
    setEditingPostalCodeData({
      ...pc,
      applies_to_products: pc.applies_to_products ?? true,
      applies_to_quotes: pc.applies_to_quotes ?? true
    });
  };

  const cancelEditingPostalCode = () => {
    setEditingPostalCodeId(null);
    setEditingPostalCodeData(null);
  };

  const deletePostalCode = async (id: string) => {
    try {
      const { error } = await supabase
        .from("shipping_postal_codes")
        .delete()
        .eq("id", id);

      if (error) throw error;
      i18nToast.success("success.postalCodeDeleted");
      loadData();
    } catch (error) {
      logger.error("Error deleting postal code:", error);
      i18nToast.error("error.postalCodeDeleteFailed");
    }
  };

  // Funciones para zonas de envío
  const handleSaveZone = async () => {
    try {
      // Validate required fields
      if (!zoneFormData.zone_name || zoneFormData.zone_name.trim() === '') {
        i18nToast.error("error.zoneNameRequired");
        return;
      }

      if (!zoneFormData.country || zoneFormData.country.trim() === '') {
        i18nToast.error("error.countryRequired");
        return;
      }

      // Validate numeric fields
      const baseCost = parseFloat(zoneFormData.base_cost);
      const costPerKg = parseFloat(zoneFormData.cost_per_kg);
      const minimumCost = parseFloat(zoneFormData.minimum_cost);

      if (isNaN(baseCost) || baseCost < 0) {
        i18nToast.error("error.baseCostInvalid");
        return;
      }

      if (isNaN(costPerKg) || costPerKg < 0) {
        i18nToast.error("error.costPerKgInvalid");
        return;
      }

      if (isNaN(minimumCost) || minimumCost < 0) {
        i18nToast.error("error.minimumCostInvalid");
        return;
      }

      // Si se marca como predeterminada, desmarcar las demás primero
      if (zoneFormData.is_default) {
        await supabase
          .from('shipping_zones')
          .update({ is_default: false })
          .eq('country', zoneFormData.country);
      }

      const zoneData = {
        zone_name: zoneFormData.zone_name.trim(),
        country: zoneFormData.country.trim(),
        postal_code_prefix: zoneFormData.postal_code_prefix.trim(),
        base_cost: baseCost,
        cost_per_kg: costPerKg,
        minimum_cost: minimumCost,
        is_active: zoneFormData.is_active,
        is_default: zoneFormData.is_default,
        applies_to_products: zoneFormData.applies_to_products,
        applies_to_quotes: zoneFormData.applies_to_quotes,
        quotes_base_cost: zoneFormData.quotes_base_cost ? parseFloat(zoneFormData.quotes_base_cost) : null,
        quotes_cost_per_kg: zoneFormData.quotes_cost_per_kg ? parseFloat(zoneFormData.quotes_cost_per_kg) : null,
        quotes_minimum_cost: zoneFormData.quotes_minimum_cost ? parseFloat(zoneFormData.quotes_minimum_cost) : null
      };

      if (editingZoneId) {
        const { error } = await supabase
          .from('shipping_zones')
          .update(zoneData)
          .eq('id', editingZoneId);

        if (error) throw error;
        toast.success('Zona actualizada correctamente');
      } else {
        const { error } = await supabase
          .from('shipping_zones')
          .insert(zoneData);

        if (error) throw error;
        toast.success('Zona creada correctamente');
      }

      resetZoneForm();
      await loadData();
    } catch (error) {
      logger.error('Error saving zone:', error);
      toast.error('Error al guardar zona');
    }
  };

  const handleEditZone = (zone: ShippingZone) => {
    setZoneFormData({
      zone_name: zone.zone_name,
      country: zone.country,
      postal_code_prefix: zone.postal_code_prefix,
      base_cost: zone.base_cost.toString(),
      cost_per_kg: zone.cost_per_kg.toString(),
      minimum_cost: zone.minimum_cost?.toString() || '5.00',
      is_active: zone.is_active,
      is_default: zone.is_default || false,
      applies_to_products: zone.applies_to_products ?? true,
      applies_to_quotes: zone.applies_to_quotes ?? true,
      quotes_base_cost: zone.quotes_base_cost?.toString() || '',
      quotes_cost_per_kg: zone.quotes_cost_per_kg?.toString() || '',
      quotes_minimum_cost: zone.quotes_minimum_cost?.toString() || ''
    });
    setEditingZoneId(zone.id);
    setShowZoneForm(true);
  };

  const handleDeleteZone = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar esta zona?')) return;

    try {
      const { error } = await supabase
        .from('shipping_zones')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Zona eliminada correctamente');
      await loadData();
    } catch (error) {
      logger.error('Error deleting zone:', error);
      toast.error('Error al eliminar zona');
    }
  };

  const toggleZoneActive = async (id: string, currentState: boolean) => {
    try {
      const { error } = await supabase
        .from('shipping_zones')
        .update({ is_active: !currentState })
        .eq('id', id);

      if (error) throw error;
      toast.success('Estado actualizado');
      loadData();
    } catch (error) {
      logger.error('Error updating status:', error);
      toast.error('Error al actualizar estado');
    }
  };

  const resetZoneForm = () => {
    setZoneFormData({
      zone_name: '',
      country: 'Bélgica',
      postal_code_prefix: '',
      base_cost: '5.00',
      cost_per_kg: '2.00',
      minimum_cost: '5.00',
      is_active: true,
      is_default: false,
      applies_to_products: true,
      applies_to_quotes: true,
      quotes_base_cost: '',
      quotes_cost_per_kg: '',
      quotes_minimum_cost: ''
    });
    setEditingZoneId(null);
    setShowZoneForm(false);
  };

  // Funciones para edición masiva
  const toggleZoneSelection = (zoneId: string) => {
    setSelectedZones(prev => 
      prev.includes(zoneId) 
        ? prev.filter(id => id !== zoneId)
        : [...prev, zoneId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedZones.length === zones.length) {
      setSelectedZones([]);
    } else {
      setSelectedZones(zones.map(z => z.id));
    }
  };

  const handleBulkEdit = async () => {
    if (selectedZones.length === 0) {
      i18nToast.error("error.selectAtLeastOneZone");
      return;
    }

    try {
      const updates: any = {};
      
      if (bulkEditData.base_cost) {
        updates.base_cost = parseFloat(bulkEditData.base_cost);
      }
      if (bulkEditData.cost_per_kg) {
        updates.cost_per_kg = parseFloat(bulkEditData.cost_per_kg);
      }
      if (bulkEditData.minimum_cost) {
        updates.minimum_cost = parseFloat(bulkEditData.minimum_cost);
      }

      if (Object.keys(updates).length === 0) {
        i18nToast.error("error.enterAtLeastOneValue");
        return;
      }

      // Actualizar todas las zonas seleccionadas
      const updatePromises = selectedZones.map(zoneId =>
        supabase
          .from('shipping_zones')
          .update(updates)
          .eq('id', zoneId)
      );

      const results = await Promise.all(updatePromises);
      
      const hasError = results.some(r => r.error);
      if (hasError) {
        throw new Error('Error al actualizar algunas zonas');
      }

      i18nToast.success("success.shippingZonesUpdated", { count: selectedZones.length });
      
      // Recargar datos y limpiar selección
      await loadData();
      setSelectedZones([]);
      setShowBulkEdit(false);
      setBulkEditData({
        base_cost: '',
        cost_per_kg: '',
        minimum_cost: ''
      });
    } catch (error) {
      logger.error('Error in bulk edit:', error);
      toast.error('Error al actualizar zonas masivamente');
    }
  };


  if (loading) {
    return <div className="p-8">Cargando...</div>;
  }

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">Gestión de Envíos</h1>

      <Tabs defaultValue="zones" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="zones">
            <MapPin className="h-4 w-4 mr-2" />
            Zonas por Peso
          </TabsTrigger>
          <TabsTrigger value="settings">Configuración General</TabsTrigger>
          <TabsTrigger value="countries">Países</TabsTrigger>
          <TabsTrigger value="postal-codes">Códigos Postales Especiales</TabsTrigger>
        </TabsList>

        {/* TAB 1: ZONAS DE ENVÍO */}
        <TabsContent value="zones">
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold">Zonas de Envío por Peso</h2>
                <p className="text-muted-foreground">
                  Configura tarifas basadas en código postal y peso del paquete
                </p>
              </div>
              <div className="flex gap-2">
                {selectedZones.length > 0 && (
                  <Button variant="secondary" onClick={() => setShowBulkEdit(!showBulkEdit)}>
                    <Edit className="h-4 w-4 mr-2" />
                    Editar {selectedZones.length} seleccionada(s)
                  </Button>
                )}
                {!showZoneForm && (
                  <Button onClick={() => setShowZoneForm(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Nueva Zona
                  </Button>
                )}
              </div>
            </div>

            {/* Panel de Edición Masiva */}
            {showBulkEdit && selectedZones.length > 0 && (
              <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200">
                <CardHeader>
                  <CardTitle className="text-lg">Edición Masiva - {selectedZones.length} zona(s) seleccionada(s)</CardTitle>
                  <CardDescription>
                    Los campos que completes se aplicarán a todas las zonas seleccionadas. Deja vacío lo que no quieras cambiar.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="bulk-base">Costo Base (€)</Label>
                      <Input
                        id="bulk-base"
                        type="number"
                        step="0.01"
                        value={bulkEditData.base_cost}
                        onChange={(e) => setBulkEditData({ ...bulkEditData, base_cost: e.target.value })}
                        placeholder="Dejar vacío para no cambiar"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="bulk-kg">Costo por kg (€)</Label>
                      <Input
                        id="bulk-kg"
                        type="number"
                        step="0.01"
                        value={bulkEditData.cost_per_kg}
                        onChange={(e) => setBulkEditData({ ...bulkEditData, cost_per_kg: e.target.value })}
                        placeholder="Dejar vacío para no cambiar"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="bulk-min">Costo Mínimo (€)</Label>
                      <Input
                        id="bulk-min"
                        type="number"
                        step="0.01"
                        value={bulkEditData.minimum_cost}
                        onChange={(e) => setBulkEditData({ ...bulkEditData, minimum_cost: e.target.value })}
                        placeholder="Dejar vacío para no cambiar"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleBulkEdit}>
                      <Save className="h-4 w-4 mr-2" />
                      Guardar Cambios Masivos
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setShowBulkEdit(false);
                        setBulkEditData({ base_cost: '', cost_per_kg: '', minimum_cost: '' });
                      }}
                    >
                      <X className="h-4 w-4 mr-2" />
                      Cancelar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {showZoneForm && (
              <Card>
                <CardHeader>
                  <CardTitle>{editingZoneId ? 'Editar Zona' : 'Nueva Zona'}</CardTitle>
                  <CardDescription>
                    Define el costo de envío para un área específica basada en prefijo postal y peso
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="zone_name">Nombre de la Zona *</Label>
                      <Input
                        id="zone_name"
                        value={zoneFormData.zone_name}
                        onChange={(e) => setZoneFormData({ ...zoneFormData, zone_name: e.target.value })}
                        placeholder="Ej: Bruselas Capital, Flandes"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="zone_country">País *</Label>
                      <Input
                        id="zone_country"
                        value={zoneFormData.country}
                        onChange={(e) => setZoneFormData({ ...zoneFormData, country: e.target.value })}
                        placeholder="Bélgica"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="postal_prefix">Prefijo Código Postal</Label>
                      <Input
                        id="postal_prefix"
                        value={zoneFormData.postal_code_prefix}
                        onChange={(e) => setZoneFormData({ ...zoneFormData, postal_code_prefix: e.target.value })}
                        placeholder="1, 2, 4, etc. (vacío = zona por defecto)"
                      />
                      <p className="text-xs text-muted-foreground">
                        Los códigos postales que empiecen con este prefijo usarán esta tarifa
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="base_cost">Costo Base (€) *</Label>
                      <Input
                        id="base_cost"
                        type="number"
                        step="0.01"
                        value={zoneFormData.base_cost}
                        onChange={(e) => setZoneFormData({ ...zoneFormData, base_cost: e.target.value })}
                      />
                      <p className="text-xs text-muted-foreground">Costo fijo de envío</p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="cost_per_kg">Costo por kg (€) *</Label>
                      <Input
                        id="cost_per_kg"
                        type="number"
                        step="0.01"
                        value={zoneFormData.cost_per_kg}
                        onChange={(e) => setZoneFormData({ ...zoneFormData, cost_per_kg: e.target.value })}
                      />
                      <p className="text-xs text-muted-foreground">Costo adicional por cada kilogramo</p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="minimum_cost">Costo Mínimo (€) *</Label>
                      <Input
                        id="minimum_cost"
                        type="number"
                        step="0.01"
                        value={zoneFormData.minimum_cost}
                        onChange={(e) => setZoneFormData({ ...zoneFormData, minimum_cost: e.target.value })}
                      />
                      <p className="text-xs text-muted-foreground">Costo mínimo garantizado</p>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch
                        id="zone_active"
                        checked={zoneFormData.is_active}
                        onCheckedChange={(checked) => setZoneFormData({ ...zoneFormData, is_active: checked })}
                      />
                      <Label htmlFor="zone_active">Zona activa</Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch
                        id="zone_default"
                        checked={zoneFormData.is_default}
                        onCheckedChange={(checked) => setZoneFormData({ ...zoneFormData, is_default: checked })}
                      />
                      <Label htmlFor="zone_default">Zona predeterminada</Label>
                    </div>
                  </div>

                  {/* Configuración de aplicación */}
                  <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 mt-4">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg">📦 Aplicación de Tarifas</CardTitle>
                      <CardDescription>
                        Define si esta zona aplica para productos, cotizaciones, o ambos
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex items-center space-x-2">
                          <Switch
                            id="applies_to_products"
                            checked={zoneFormData.applies_to_products}
                            onCheckedChange={(checked) => setZoneFormData({ ...zoneFormData, applies_to_products: checked })}
                          />
                          <Label htmlFor="applies_to_products">Aplicar a productos</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Switch
                            id="applies_to_quotes"
                            checked={zoneFormData.applies_to_quotes}
                            onCheckedChange={(checked) => setZoneFormData({ ...zoneFormData, applies_to_quotes: checked })}
                          />
                          <Label htmlFor="applies_to_quotes">Aplicar a cotizaciones</Label>
                        </div>
                      </div>
                      
                      {/* Costos específicos para cotizaciones */}
                      {zoneFormData.applies_to_quotes && (
                        <div className="pt-4 border-t">
                          <p className="text-sm font-medium mb-3">💬 Costos específicos para cotizaciones (opcional)</p>
                          <p className="text-xs text-muted-foreground mb-4">
                            Si dejas estos campos vacíos, se usarán los costos base. Completa solo si quieres tarifas diferentes para cotizaciones.
                          </p>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="quotes_base_cost">Costo Base Cotizaciones (€)</Label>
                              <Input
                                id="quotes_base_cost"
                                type="number"
                                step="0.01"
                                value={zoneFormData.quotes_base_cost}
                                onChange={(e) => setZoneFormData({ ...zoneFormData, quotes_base_cost: e.target.value })}
                                placeholder="Usar costo base"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="quotes_cost_per_kg">Costo por kg Cotizaciones (€)</Label>
                              <Input
                                id="quotes_cost_per_kg"
                                type="number"
                                step="0.01"
                                value={zoneFormData.quotes_cost_per_kg}
                                onChange={(e) => setZoneFormData({ ...zoneFormData, quotes_cost_per_kg: e.target.value })}
                                placeholder="Usar costo por kg"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="quotes_minimum_cost">Mínimo Cotizaciones (€)</Label>
                              <Input
                                id="quotes_minimum_cost"
                                type="number"
                                step="0.01"
                                value={zoneFormData.quotes_minimum_cost}
                                onChange={(e) => setZoneFormData({ ...zoneFormData, quotes_minimum_cost: e.target.value })}
                                placeholder="Usar costo mínimo"
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <div className="flex gap-2 mt-4">
                    <Button type="button" onClick={handleSaveZone}>
                      <Save className="h-4 w-4 mr-2" />
                      Guardar
                    </Button>
                    <Button type="button" variant="outline" onClick={resetZoneForm}>
                      <X className="h-4 w-4 mr-2" />
                      Cancelar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Zonas Configuradas</CardTitle>
                <CardDescription>
                  Listado de todas las zonas de envío y sus tarifas por peso
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <p className="text-center text-muted-foreground py-8">Cargando...</p>
                ) : zones.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No hay zonas configuradas</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[50px]">
                          <Checkbox
                            checked={selectedZones.length === zones.length && zones.length > 0}
                            onCheckedChange={toggleSelectAll}
                          />
                        </TableHead>
                        <TableHead>Zona</TableHead>
                        <TableHead>País</TableHead>
                        <TableHead>Prefijo</TableHead>
                        <TableHead>Base</TableHead>
                        <TableHead>Por kg</TableHead>
                        <TableHead>Mínimo</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {zones.map((zone) => (
                        <TableRow key={zone.id} className={selectedZones.includes(zone.id) ? 'bg-blue-50 dark:bg-blue-950/20' : ''}>
                          <TableCell>
                            <Checkbox
                              checked={selectedZones.includes(zone.id)}
                              onCheckedChange={() => toggleZoneSelection(zone.id)}
                            />
                          </TableCell>
                          <TableCell className="font-medium">{zone.zone_name}</TableCell>
                          <TableCell>{zone.country}</TableCell>
                          <TableCell>
                            {zone.postal_code_prefix ? (
                              <Badge variant="outline">{zone.postal_code_prefix}XXX</Badge>
                            ) : (
                              <Badge variant="secondary">Vacío</Badge>
                            )}
                            {zone.is_default && <Badge className="ml-1">Predeterminada</Badge>}
                          </TableCell>
                          <TableCell>€{zone.base_cost.toFixed(2)}</TableCell>
                          <TableCell>€{zone.cost_per_kg.toFixed(2)}</TableCell>
                          <TableCell>€{zone.minimum_cost?.toFixed(2) || '5.00'}</TableCell>
                          <TableCell>
                            <Switch
                              checked={zone.is_active}
                              onCheckedChange={() => toggleZoneActive(zone.id, zone.is_active)}
                            />
                          </TableCell>
                          <TableCell className="text-right space-x-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEditZone(zone)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDeleteZone(zone.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            <Card className="bg-muted/50">
              <CardHeader>
                <CardTitle className="text-lg">ℹ️ Cómo Funciona</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p><strong>Sistema de Prefijos:</strong> Busca el prefijo más específico primero:</p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Código <code>1000</code> → Busca prefijo "1" → Usa "Bruselas Capital"</li>
                  <li>Código <code>2500</code> → Busca prefijo "2" → Usa "Flandes - Amberes"</li>
                  <li>Código <code>9999</code> → Sin prefijo coincidente → Usa zona "Por defecto"</li>
                </ul>
                <p className="mt-4"><strong>Cálculo por Peso:</strong></p>
                <p className="font-mono bg-background p-2 rounded">
                  Costo = MAX(Costo Base + (Peso en kg × Costo por kg), Costo Mínimo)
                </p>
                <p className="text-muted-foreground">
                  Ejemplo: Paquete de 500g a Bruselas = MAX(€5.00 + (0.5kg × €1.50), €5.00) = €5.75
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Configuración General de Envíos</CardTitle>
              <CardDescription>Configura las opciones globales de envío</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Sistema de envíos activo</Label>
                  <p className="text-sm text-muted-foreground">Habilita o deshabilita el cálculo de envíos</p>
                </div>
                <Switch
                  checked={settings?.is_enabled}
                  onCheckedChange={(checked) => setSettings({ ...settings, is_enabled: checked })}
                />
              </div>

              <div className="space-y-2">
                <Label>Umbral de envío gratis (€)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={settings?.free_shipping_threshold ?? ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    setSettings({ 
                      ...settings, 
                      free_shipping_threshold: value === '' ? null : parseFloat(value)
                    });
                  }}
                  placeholder="0.00"
                />
                <p className="text-sm text-muted-foreground">Pedidos superiores a este monto tendrán envío gratis</p>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Envío gratis solo para productos</Label>
                  <p className="text-sm text-muted-foreground">El umbral de envío gratis aplica solo a productos (no a cotizaciones)</p>
                </div>
                <Switch
                  checked={settings?.free_shipping_products_only ?? false}
                  onCheckedChange={(checked) => setSettings({ ...settings, free_shipping_products_only: checked })}
                />
              </div>

              <div className="space-y-2">
                <Label>Costo de envío por defecto (€)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={settings?.default_shipping_cost ?? ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    setSettings({ 
                      ...settings, 
                      default_shipping_cost: value === '' ? null : parseFloat(value)
                    });
                  }}
                  placeholder="0.00"
                />
                <p className="text-sm text-muted-foreground">Se usa cuando no hay tarifa específica configurada</p>
              </div>

              <Button type="button" onClick={saveSettings}>
                <Save className="mr-2 h-4 w-4" />
                Guardar Configuración
              </Button>
            </CardContent>
          </Card>

          {/* Configuración específica para cotizaciones */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>💬 Configuración de Envíos para Cotizaciones</CardTitle>
              <CardDescription>
                Configura opciones de envío específicas para cotizaciones (pedidos 3D personalizados).
                Si no configuras valores específicos, se usará la configuración general.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Calcular envío para cotizaciones</Label>
                  <p className="text-sm text-muted-foreground">
                    Cuando está activado, se calcula el envío para pedidos de cotización
                  </p>
                </div>
                <Switch
                  checked={settings?.enable_shipping_for_quotes ?? true}
                  onCheckedChange={(checked) => setSettings({ ...settings, enable_shipping_for_quotes: checked })}
                />
              </div>

              <div className="space-y-2">
                <Label>Costo de envío por defecto para cotizaciones (€)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={settings?.quotes_default_shipping_cost ?? ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    setSettings({ 
                      ...settings, 
                      quotes_default_shipping_cost: value === '' ? null : parseFloat(value)
                    });
                  }}
                  placeholder="Usar costo por defecto general"
                />
                <p className="text-sm text-muted-foreground">
                  Costo de envío específico para cotizaciones cuando no hay tarifa configurada
                </p>
              </div>

              <div className="space-y-2">
                <Label>Umbral de envío gratis para cotizaciones (€)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={settings?.quotes_free_shipping_threshold ?? ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    setSettings({ 
                      ...settings, 
                      quotes_free_shipping_threshold: value === '' ? null : parseFloat(value)
                    });
                  }}
                  placeholder="Usar umbral general"
                />
                <p className="text-sm text-muted-foreground">
                  Cotizaciones superiores a este monto tendrán envío gratis (deja vacío para usar umbral general)
                </p>
              </div>

              <Button type="button" onClick={saveSettings}>
                <Save className="mr-2 h-4 w-4" />
                Guardar Configuración
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="countries">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Países Disponibles para Envío</CardTitle>
                  <CardDescription>Gestiona los países disponibles en toda la aplicación</CardDescription>
                </div>
                <AddCountryDialog onAdd={addCountry} />
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>País</TableHead>
                    <TableHead>Código</TableHead>
                    <TableHead>Costo Envío (€)</TableHead>
                    <TableHead>Disponible</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {countries.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        No hay países configurados
                      </TableCell>
                    </TableRow>
                  ) : (
                    countries.map((country) => (
                      <TableRow key={country.id}>
                        <TableCell className="font-medium">{country.country_name}</TableCell>
                        <TableCell>{country.country_code}</TableCell>
                        <TableCell>€{Number(country.shipping_cost || 0).toFixed(2)}</TableCell>
                        <TableCell>
                          <Switch
                            checked={country.is_enabled}
                            onCheckedChange={(checked) => updateCountry(country.id, "is_enabled", checked)}
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => deleteCountry(country.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="postal-codes">
          <Card>
            <CardHeader>
              <CardTitle>Códigos Postales Especiales (Tarifa Fija)</CardTitle>
              <CardDescription>
                Define tarifas fijas para códigos postales específicos (no se calcula por peso).
                Tiene prioridad sobre las zonas de envío.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <AddPostalCodeDialog countries={countries} onAdd={addPostalCode} />
              
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>País</TableHead>
                    <TableHead>Código Postal</TableHead>
                    <TableHead>Costo Productos (€)</TableHead>
                    <TableHead>Costo Cotizaciones (€)</TableHead>
                    <TableHead>Aplica a</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {postalCodes.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        No hay códigos postales especiales configurados
                      </TableCell>
                    </TableRow>
                  ) : (
                    postalCodes.map((pc) => (
                      <TableRow key={pc.id}>
                        <TableCell>{pc.country_code}</TableCell>
                        <TableCell className="font-mono font-medium">{pc.postal_code}</TableCell>
                        <TableCell>
                          {editingPostalCodeId === pc.id ? (
                            <Input
                              type="number"
                              step="0.01"
                              className="w-24"
                              value={editingPostalCodeData?.shipping_cost ?? ''}
                              onChange={(e) => setEditingPostalCodeData(prev => prev ? {
                                ...prev,
                                shipping_cost: parseFloat(e.target.value) || 0
                              } : null)}
                            />
                          ) : (
                            <span>€{Number(pc.shipping_cost).toFixed(2)}</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {editingPostalCodeId === pc.id ? (
                            <Input
                              type="number"
                              step="0.01"
                              className="w-24"
                              value={editingPostalCodeData?.quotes_shipping_cost ?? ''}
                              onChange={(e) => setEditingPostalCodeData(prev => prev ? {
                                ...prev,
                                quotes_shipping_cost: e.target.value === '' ? null : parseFloat(e.target.value)
                              } : null)}
                              placeholder="Mismo"
                            />
                          ) : (
                            <span>
                              {pc.quotes_shipping_cost != null 
                                ? `€${Number(pc.quotes_shipping_cost).toFixed(2)}`
                                : <span className="text-muted-foreground text-xs">Mismo costo</span>
                              }
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          {editingPostalCodeId === pc.id ? (
                            <div className="flex flex-col gap-2">
                              <div className="flex items-center gap-2">
                                <Checkbox
                                  id={`edit-pc-products-${pc.id}`}
                                  checked={editingPostalCodeData?.applies_to_products ?? true}
                                  onCheckedChange={(checked) => setEditingPostalCodeData(prev => prev ? {
                                    ...prev,
                                    applies_to_products: !!checked
                                  } : null)}
                                />
                                <Label htmlFor={`edit-pc-products-${pc.id}`} className="text-xs">Productos</Label>
                              </div>
                              <div className="flex items-center gap-2">
                                <Checkbox
                                  id={`edit-pc-quotes-${pc.id}`}
                                  checked={editingPostalCodeData?.applies_to_quotes ?? true}
                                  onCheckedChange={(checked) => setEditingPostalCodeData(prev => prev ? {
                                    ...prev,
                                    applies_to_quotes: !!checked
                                  } : null)}
                                />
                                <Label htmlFor={`edit-pc-quotes-${pc.id}`} className="text-xs">Cotizaciones</Label>
                              </div>
                            </div>
                          ) : (
                            <div className="flex flex-wrap gap-1">
                              {(pc.applies_to_products ?? true) && (
                                <Badge variant="secondary" className="text-xs">Productos</Badge>
                              )}
                              {(pc.applies_to_quotes ?? true) && (
                                <Badge variant="outline" className="text-xs">Cotizaciones</Badge>
                              )}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            {editingPostalCodeId === pc.id ? (
                              <>
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    if (editingPostalCodeData) {
                                      updatePostalCode({
                                        id: pc.id,
                                        shipping_cost: editingPostalCodeData.shipping_cost,
                                        applies_to_products: editingPostalCodeData.applies_to_products ?? true,
                                        applies_to_quotes: editingPostalCodeData.applies_to_quotes ?? true,
                                        quotes_shipping_cost: editingPostalCodeData.quotes_shipping_cost
                                      });
                                    }
                                  }}
                                >
                                  <Save className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={cancelEditingPostalCode}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </>
                            ) : (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => startEditingPostalCode(pc)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => deletePostalCode(pc.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function AddCountryDialog({ onAdd }: { onAdd: (data: any) => void }) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    country_name: '',
    country_code: '',
    shipping_cost: '5.00'
  });

  const handleSubmit = () => {
    if (!formData.country_name || !formData.country_code) {
      toast.error('Por favor completa todos los campos requeridos');
      return;
    }

    onAdd({
      country_name: formData.country_name,
      country_code: formData.country_code,
      shipping_cost: parseFloat(formData.shipping_cost)
    });
    
    setFormData({ country_name: '', country_code: '', shipping_cost: '5.00' });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Añadir País
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Añadir Nuevo País</DialogTitle>
          <DialogDescription>
            Añade un país que estará disponible en todos los formularios de envío
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="country-name">Nombre del País *</Label>
            <Input
              id="country-name"
              value={formData.country_name}
              onChange={(e) => setFormData({ ...formData, country_name: e.target.value })}
              placeholder="Ej: Bélgica"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="country-code">Código del País *</Label>
            <Input
              id="country-code"
              value={formData.country_code}
              onChange={(e) => setFormData({ ...formData, country_code: e.target.value })}
              placeholder="Ej: BE"
              maxLength={2}
            />
            <p className="text-xs text-muted-foreground">Código de 2 letras (ISO 3166-1 alpha-2)</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="shipping-cost">Costo de Envío (€) *</Label>
            <Input
              id="shipping-cost"
              type="number"
              step="0.01"
              value={formData.shipping_cost}
              onChange={(e) => setFormData({ ...formData, shipping_cost: e.target.value })}
              placeholder="5.00"
            />
          </div>
          <Button onClick={handleSubmit} className="w-full">
            Añadir País
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AddPostalCodeDialog({ countries, onAdd }: any) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    country_code: "",
    postal_code: "",
    shipping_cost: 0,
    applies_to_products: true,
    applies_to_quotes: true,
    quotes_shipping_cost: "" as string | number
  });

  const handleSubmit = () => {
    // Validate required fields
    if (!formData.country_code || formData.country_code.trim() === '') {
      toast.error('Por favor selecciona un país');
      return;
    }

    if (!formData.postal_code || formData.postal_code.trim() === '') {
      toast.error('El código postal es obligatorio');
      return;
    }

    // Validate shipping cost
    const shippingCost = Number(formData.shipping_cost);
    if (isNaN(shippingCost) || shippingCost < 0) {
      toast.error('El costo de envío debe ser un número válido mayor o igual a 0');
      return;
    }

    onAdd({
      country_code: formData.country_code.trim(),
      postal_code: formData.postal_code.trim(),
      shipping_cost: shippingCost,
      applies_to_products: formData.applies_to_products,
      applies_to_quotes: formData.applies_to_quotes,
      quotes_shipping_cost: formData.quotes_shipping_cost === "" ? null : Number(formData.quotes_shipping_cost)
    });
    setOpen(false);
    setFormData({ 
      country_code: "", 
      postal_code: "", 
      shipping_cost: 0,
      applies_to_products: true,
      applies_to_quotes: true,
      quotes_shipping_cost: ""
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Añadir Código Postal
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Añadir Código Postal Especial</DialogTitle>
          <DialogDescription>Define una tarifa especial para un código postal</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>País</Label>
            <Select value={formData.country_code} onValueChange={(value) => setFormData({ ...formData, country_code: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona un país" />
              </SelectTrigger>
              <SelectContent>
                {countries.map((country: any) => (
                  <SelectItem key={country.country_code} value={country.country_code}>
                    {country.country_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Código Postal</Label>
            <Input
              value={formData.postal_code}
              onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
              placeholder="1000"
            />
          </div>
          <div className="space-y-2">
            <Label>Costo de Envío (€)</Label>
            <Input
              type="number"
              step="0.01"
              value={formData.shipping_cost}
              onChange={(e) => setFormData({ ...formData, shipping_cost: e.target.value === '' ? 0 : parseFloat(e.target.value) })}
              placeholder="Ej: 5.00"
            />
            <p className="text-xs text-muted-foreground">0.00 = Envío gratis</p>
          </div>
          
          {/* Aplicación por tipo */}
          <div className="space-y-3 pt-2 border-t">
            <Label className="text-sm font-medium">📦 Aplicar a:</Label>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="pc_applies_products"
                checked={formData.applies_to_products}
                onCheckedChange={(checked) => setFormData({ ...formData, applies_to_products: !!checked })}
              />
              <Label htmlFor="pc_applies_products" className="text-sm">Productos</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="pc_applies_quotes"
                checked={formData.applies_to_quotes}
                onCheckedChange={(checked) => setFormData({ ...formData, applies_to_quotes: !!checked })}
              />
              <Label htmlFor="pc_applies_quotes" className="text-sm">Cotizaciones</Label>
            </div>
          </div>

          {/* Costo específico para cotizaciones */}
          {formData.applies_to_quotes && (
            <div className="space-y-2 pt-2 border-t">
              <Label>💬 Costo de Envío para Cotizaciones (€)</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.quotes_shipping_cost}
                onChange={(e) => setFormData({ ...formData, quotes_shipping_cost: e.target.value === '' ? '' : parseFloat(e.target.value) })}
                placeholder="Usar costo general"
              />
              <p className="text-xs text-muted-foreground">
                Deja vacío para usar el costo general. Completa si quieres un costo diferente para cotizaciones.
              </p>
            </div>
          )}
          
          <Button type="button" onClick={handleSubmit} className="w-full">Añadir</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

