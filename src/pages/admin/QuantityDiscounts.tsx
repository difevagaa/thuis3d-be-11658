import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Plus, Trash2, Save, Edit, X, TrendingDown, Package } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface DiscountTier {
  id: string;
  tier_name: string;
  min_quantity: number;
  max_quantity: number | null;
  discount_type: string;
  discount_value: number;
  is_active: boolean;
  display_order: number;
  created_at?: string;
  updated_at?: string;
}

export default function QuantityDiscounts() {
  const [tiers, setTiers] = useState<DiscountTier[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTierId, setEditingTierId] = useState<string | null>(null);
  const [showTierForm, setShowTierForm] = useState(false);
  
  const [tierFormData, setTierFormData] = useState({
    tier_name: '',
    min_quantity: 1,
    max_quantity: null as number | null,
    discount_type: 'percentage' as string,
    discount_value: 0,
    is_active: true,
    display_order: 0
  });

  useEffect(() => {
    loadTiers();
  }, []);

  const loadTiers = async () => {
    try {
      const { data, error } = await supabase
        .from('quantity_discount_tiers')
        .select('*')
        .order('display_order');

      if (error) throw error;
      setTiers(data || []);
    } catch (error) {
      console.error('Error loading tiers:', error);
      toast.error('Error al cargar los descuentos');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTier = async () => {
    try {
      const tierData = {
        tier_name: tierFormData.tier_name,
        min_quantity: tierFormData.min_quantity,
        max_quantity: tierFormData.max_quantity,
        discount_type: tierFormData.discount_type,
        discount_value: tierFormData.discount_value,
        is_active: tierFormData.is_active,
        display_order: tierFormData.display_order
      };

      if (editingTierId) {
        const { error } = await supabase
          .from('quantity_discount_tiers')
          .update(tierData)
          .eq('id', editingTierId);

        if (error) throw error;
        toast.success('Descuento actualizado correctamente');
      } else {
        const { error } = await supabase
          .from('quantity_discount_tiers')
          .insert(tierData);

        if (error) throw error;
        toast.success('Descuento creado correctamente');
      }

      resetTierForm();
      await loadTiers();
    } catch (error) {
      console.error('Error saving tier:', error);
      toast.error('Error al guardar descuento');
    }
  };

  const handleEditTier = (tier: DiscountTier) => {
    setTierFormData({
      tier_name: tier.tier_name,
      min_quantity: tier.min_quantity,
      max_quantity: tier.max_quantity,
      discount_type: tier.discount_type,
      discount_value: tier.discount_value,
      is_active: tier.is_active,
      display_order: tier.display_order
    });
    setEditingTierId(tier.id);
    setShowTierForm(true);
  };

  const handleDeleteTier = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este descuento?')) return;

    try {
      const { error } = await supabase
        .from('quantity_discount_tiers')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Descuento eliminado correctamente');
      await loadTiers();
    } catch (error) {
      console.error('Error deleting tier:', error);
      toast.error('Error al eliminar descuento');
    }
  };

  const toggleTierActive = async (id: string, currentState: boolean) => {
    try {
      const { error } = await supabase
        .from('quantity_discount_tiers')
        .update({ is_active: !currentState })
        .eq('id', id);

      if (error) throw error;
      toast.success('Estado actualizado');
      loadTiers();
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Error al actualizar estado');
    }
  };

  const resetTierForm = () => {
    setTierFormData({
      tier_name: '',
      min_quantity: 1,
      max_quantity: null,
      discount_type: 'percentage',
      discount_value: 0,
      is_active: true,
      display_order: 0
    });
    setEditingTierId(null);
    setShowTierForm(false);
  };

  if (loading) {
    return <div className="p-8">Cargando...</div>;
  }

  return (
    <div className="container mx-auto p-8">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <TrendingDown className="h-8 w-8" />
            Descuentos por Cantidad
          </h1>
          <p className="text-muted-foreground mt-2">
            Configura descuentos automáticos según la cantidad de piezas a imprimir
          </p>
        </div>

        <Alert>
          <Package className="h-4 w-4" />
          <AlertDescription>
            Los descuentos se aplicarán automáticamente al calcular cotizaciones según la cantidad de piezas solicitadas.
            Los descuentos de tipo <strong>porcentaje</strong> reducen el precio total, mientras que los de <strong>monto fijo</strong> restan una cantidad específica en euros.
          </AlertDescription>
        </Alert>

        <div className="flex justify-between items-center">
          {!showTierForm && (
            <Button onClick={() => setShowTierForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Nivel de Descuento
            </Button>
          )}
        </div>

        {showTierForm && (
          <Card>
            <CardHeader>
              <CardTitle>{editingTierId ? 'Editar Descuento' : 'Nuevo Descuento'}</CardTitle>
              <CardDescription>
                Define los rangos de cantidad y el descuento aplicable
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="tier_name">Nombre del Nivel *</Label>
                  <Input
                    id="tier_name"
                    value={tierFormData.tier_name}
                    onChange={(e) => setTierFormData({ ...tierFormData, tier_name: e.target.value })}
                    placeholder="Ej: Mayorista, Gran Volumen"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="discount_type">Tipo de Descuento *</Label>
                  <Select
                    value={tierFormData.discount_type}
                    onValueChange={(value: 'percentage' | 'fixed_amount') => 
                      setTierFormData({ ...tierFormData, discount_type: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">Porcentaje (%)</SelectItem>
                      <SelectItem value="fixed_amount">Monto Fijo (€)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="min_quantity">Cantidad Mínima *</Label>
                  <Input
                    id="min_quantity"
                    type="number"
                    min="1"
                    value={tierFormData.min_quantity}
                    onChange={(e) => setTierFormData({ ...tierFormData, min_quantity: parseInt(e.target.value) || 1 })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="max_quantity">Cantidad Máxima</Label>
                  <Input
                    id="max_quantity"
                    type="number"
                    min="1"
                    value={tierFormData.max_quantity || ''}
                    onChange={(e) => setTierFormData({ 
                      ...tierFormData, 
                      max_quantity: e.target.value ? parseInt(e.target.value) : null 
                    })}
                    placeholder="Dejar vacío = sin límite"
                  />
                  <p className="text-xs text-muted-foreground">
                    Si dejas esto vacío, aplicará para cantidades mayores al mínimo
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="discount_value">
                    Valor del Descuento *
                    {tierFormData.discount_type === 'percentage' && ' (%)'}
                    {tierFormData.discount_type === 'fixed_amount' && ' (€)'}
                  </Label>
                  <Input
                    id="discount_value"
                    type="number"
                    step="0.01"
                    min="0"
                    value={tierFormData.discount_value}
                    onChange={(e) => setTierFormData({ ...tierFormData, discount_value: parseFloat(e.target.value) || 0 })}
                  />
                  <p className="text-xs text-muted-foreground">
                    {tierFormData.discount_type === 'percentage' 
                      ? 'Ejemplo: 10 = 10% de descuento' 
                      : 'Ejemplo: 5.50 = €5.50 de descuento'}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="display_order">Orden de Visualización</Label>
                  <Input
                    id="display_order"
                    type="number"
                    min="0"
                    value={tierFormData.display_order}
                    onChange={(e) => setTierFormData({ ...tierFormData, display_order: parseInt(e.target.value) || 0 })}
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="tier_active"
                    checked={tierFormData.is_active}
                    onCheckedChange={(checked) => setTierFormData({ ...tierFormData, is_active: checked })}
                  />
                  <Label htmlFor="tier_active">Nivel activo</Label>
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button onClick={handleSaveTier}>
                  <Save className="h-4 w-4 mr-2" />
                  Guardar
                </Button>
                <Button variant="outline" onClick={resetTierForm}>
                  <X className="h-4 w-4 mr-2" />
                  Cancelar
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Niveles de Descuento Configurados</CardTitle>
            <CardDescription>
              Listado de todos los descuentos por cantidad configurados
            </CardDescription>
          </CardHeader>
          <CardContent>
            {tiers.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No hay descuentos configurados</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nivel</TableHead>
                    <TableHead>Rango de Cantidad</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Descuento</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tiers.map((tier) => (
                    <TableRow key={tier.id}>
                      <TableCell className="font-medium">{tier.tier_name}</TableCell>
                      <TableCell>
                        {tier.min_quantity}
                        {tier.max_quantity ? ` - ${tier.max_quantity}` : '+'} piezas
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {tier.discount_type === 'percentage' ? 'Porcentaje' : 'Monto Fijo'}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-semibold text-green-600">
                        {tier.discount_type === 'percentage' 
                          ? `-${tier.discount_value}%` 
                          : `-€${tier.discount_value.toFixed(2)}`
                        }
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={tier.is_active}
                          onCheckedChange={() => toggleTierActive(tier.id, tier.is_active)}
                        />
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEditTier(tier)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeleteTier(tier.id)}
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

        <Card>
          <CardHeader>
            <CardTitle>Ejemplo de Aplicación</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-sm">
                <strong>Ejemplo:</strong> Si un cliente solicita cotizar <strong>8 piezas</strong> y el precio calculado es de <strong>€100</strong>:
              </p>
              <ul className="list-disc list-inside text-sm space-y-1 ml-4">
                {tiers
                  .filter(t => t.is_active)
                  .map(tier => {
                    const quantity = 8;
                    const applies = quantity >= tier.min_quantity && 
                                   (tier.max_quantity === null || quantity <= tier.max_quantity);
                    
                    if (!applies) return null;
                    
                    const originalPrice = 100;
                    let finalPrice = originalPrice;
                    let discountAmount = 0;
                    
                    if (tier.discount_type === 'percentage') {
                      discountAmount = (originalPrice * tier.discount_value) / 100;
                      finalPrice = originalPrice - discountAmount;
                    } else {
                      discountAmount = tier.discount_value;
                      finalPrice = originalPrice - discountAmount;
                    }
                    
                    return (
                      <li key={tier.id} className="text-green-600">
                        ✓ Se aplicaría <strong>{tier.tier_name}</strong>: 
                        Precio original €{originalPrice.toFixed(2)} 
                        → Descuento de €{discountAmount.toFixed(2)} 
                        = <strong>€{finalPrice.toFixed(2)}</strong>
                      </li>
                    );
                  })}
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
