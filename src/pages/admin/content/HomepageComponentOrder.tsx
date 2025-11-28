import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { 
  GripVertical, 
  ChevronUp, 
  ChevronDown, 
  Loader2, 
  Save,
  RotateCcw,
  LayoutGrid,
  CreditCard,
  Award,
  Package,
  Layers
} from "lucide-react";
import { 
  useHomepageOrder, 
  HomepageComponentOrder,
  HomepageComponentType 
} from "@/hooks/useHomepageOrder";
import { handleSupabaseError } from "@/lib/errorHandler";

// Icon mapping for component types
const getComponentIcon = (type: HomepageComponentType) => {
  switch (type) {
    case 'featured_products':
      return Package;
    case 'quick_access_card':
      return CreditCard;
    case 'why_us':
      return Award;
    case 'section':
      return Layers;
    default:
      return LayoutGrid;
  }
};

// Label mapping for component types
const getTypeLabel = (type: HomepageComponentType) => {
  switch (type) {
    case 'featured_products':
      return 'Productos Destacados';
    case 'quick_access_card':
      return 'Tarjetas de Acceso Rápido';
    case 'why_us':
      return 'Por Qué Elegirnos';
    case 'section':
      return 'Sección Personalizada';
    case 'banners':
      return 'Banners';
    default:
      return 'Componente';
  }
};

// Color mapping for component types
const getTypeColor = (type: HomepageComponentType) => {
  switch (type) {
    case 'featured_products':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
    case 'quick_access_card':
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    case 'why_us':
      return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
    case 'section':
      return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
  }
};

export default function HomepageComponentOrder() {
  const { orderConfig, loading, saveOrderConfig, getDefaultOrder } = useHomepageOrder();
  const [components, setComponents] = useState<HomepageComponentOrder[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [quickAccessCards, setQuickAccessCards] = useState<any[]>([]);
  const [features, setFeatures] = useState<any[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Load sections, quick access cards, and features
  useEffect(() => {
    const loadData = async () => {
      try {
        const [sectionsRes, cardsRes, featuresRes] = await Promise.all([
          supabase
            .from("homepage_sections")
            .select("*")
            .order("display_order", { ascending: true, nullsFirst: false }),
          supabase
            .from("homepage_quick_access_cards")
            .select("*")
            .order("display_order", { ascending: true }),
          supabase
            .from("homepage_features")
            .select("*")
            .order("display_order", { ascending: true })
        ]);

        if (sectionsRes.error) throw sectionsRes.error;
        if (cardsRes.error) throw cardsRes.error;
        if (featuresRes.error) throw featuresRes.error;

        setSections(sectionsRes.data || []);
        setQuickAccessCards(cardsRes.data || []);
        setFeatures(featuresRes.data || []);
      } catch (error) {
        console.error("Error loading data:", error);
        handleSupabaseError(error, {
          toastMessage: "Error al cargar los datos",
          context: "loadData"
        });
      } finally {
        setDataLoading(false);
      }
    };

    loadData();
  }, []);

  // Initialize components from saved config or defaults
  useEffect(() => {
    if (!dataLoading && !loading) {
      if (orderConfig?.components && orderConfig.components.length > 0) {
        // Use saved configuration, but validate against current data
        const validatedComponents = orderConfig.components.map(comp => {
          // Update label from current data if available
          let label = comp.label;
          if (comp.type === 'featured_products' || comp.type === 'quick_access_card' || comp.type === 'why_us' || comp.type === 'section') {
            const section = sections.find(s => s.id === comp.id);
            if (section) {
              label = section.title;
            }
          }
          return { ...comp, label };
        });
        setComponents(validatedComponents);
      } else {
        // Generate default order
        const defaultComponents = getDefaultOrder(sections, quickAccessCards, features);
        setComponents(defaultComponents);
      }
    }
  }, [dataLoading, loading, orderConfig, sections, quickAccessCards, features, getDefaultOrder]);

  const moveComponent = useCallback((index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= components.length) return;

    const newComponents = [...components];
    [newComponents[index], newComponents[newIndex]] = [newComponents[newIndex], newComponents[index]];
    
    // Update display order
    newComponents.forEach((comp, idx) => {
      comp.displayOrder = idx;
    });

    setComponents(newComponents);
    setHasChanges(true);
  }, [components]);

  const toggleActive = useCallback((index: number) => {
    const newComponents = [...components];
    newComponents[index] = {
      ...newComponents[index],
      isActive: !newComponents[index].isActive
    };
    setComponents(newComponents);
    setHasChanges(true);
  }, [components]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const result = await saveOrderConfig(components);
      if (result.success) {
        toast.success("Orden de componentes guardado correctamente");
        setHasChanges(false);
      } else {
        throw result.error;
      }
    } catch (error) {
      console.error("Error saving order:", error);
      handleSupabaseError(error, {
        toastMessage: "Error al guardar el orden",
        context: "handleSave"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    const defaultComponents = getDefaultOrder(sections, quickAccessCards, features);
    setComponents(defaultComponents);
    setHasChanges(true);
  };

  if (loading || dataLoading) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <LayoutGrid className="h-5 w-5" />
              Orden de Componentes
            </CardTitle>
            <CardDescription>
              Arrastra y reordena los componentes de la página de inicio. 
              Usa las flechas para mover hacia arriba o abajo, o desactiva componentes que no deseas mostrar.
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleReset}
              disabled={saving}
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Restablecer
            </Button>
            <Button
              onClick={handleSave}
              disabled={!hasChanges || saving}
            >
              {saving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Guardar Orden
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {components.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            No hay componentes configurados. Crea secciones, tarjetas de acceso rápido o características primero.
          </p>
        ) : (
          <div className="space-y-2">
            {components.map((component, index) => {
              const Icon = getComponentIcon(component.type);
              const typeColor = getTypeColor(component.type);
              
              return (
                <div
                  key={component.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                    component.isActive 
                      ? 'bg-background hover:bg-muted/50' 
                      : 'bg-muted/30 opacity-60'
                  }`}
                >
                  {/* Drag handle */}
                  <div className="text-muted-foreground cursor-grab">
                    <GripVertical className="h-5 w-5" />
                  </div>

                  {/* Order buttons */}
                  <div className="flex flex-col gap-0.5">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => moveComponent(index, 'up')}
                      disabled={index === 0}
                    >
                      <ChevronUp className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => moveComponent(index, 'down')}
                      disabled={index === components.length - 1}
                    >
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Position number */}
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-semibold text-sm">
                    {index + 1}
                  </div>

                  {/* Component icon */}
                  <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-muted">
                    <Icon className="h-5 w-5 text-muted-foreground" />
                  </div>

                  {/* Component info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium truncate">{component.label}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${typeColor}`}>
                        {getTypeLabel(component.type)}
                      </span>
                    </div>
                  </div>

                  {/* Active toggle */}
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground hidden md:inline">
                      {component.isActive ? 'Visible' : 'Oculto'}
                    </span>
                    <Switch
                      checked={component.isActive}
                      onCheckedChange={() => toggleActive(index)}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {hasChanges && (
          <div className="mt-4 p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              ⚠️ Tienes cambios sin guardar. Haz clic en "Guardar Orden" para aplicarlos.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
