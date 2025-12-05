import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Loader2, GripVertical } from "lucide-react";
import { handleSupabaseError } from "@/lib/errorHandler";
import * as Icons from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface QuickAccessCard {
  id: string;
  icon_name: string;
  title: string;
  description: string;
  button_text: string;
  button_url: string;
  display_order: number;
  is_active: boolean;
}

const ICON_OPTIONS = [
  'Printer', 'FileText', 'Gift', 'Package', 'ShoppingCart', 'Zap', 
  'Star', 'Heart', 'Briefcase', 'Calculator', 'Camera', 'Mail',
  'Phone', 'MapPin', 'Users', 'User', 'Settings', 'Home',
  'Search', 'TrendingUp', 'Award', 'CheckCircle', 'Clock',
  'Download', 'Upload', 'Share2', 'MessageCircle', 'ThumbsUp',
  'Bookmark', 'Flag', 'Archive', 'Inbox', 'Send',
  'Globe', 'Wifi', 'Lock', 'Unlock', 'Key',
  'Truck', 'Box', 'DollarSign', 'CreditCard', 'Wallet'
];

// Sortable Row Component
function SortableCardRow({ 
  card, 
  renderIcon, 
  handleEdit, 
  handleDelete 
}: { 
  card: QuickAccessCard;
  renderIcon: (iconName: string) => React.ReactNode;
  handleEdit: (card: QuickAccessCard) => void;
  handleDelete: (id: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: card.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <TableRow ref={setNodeRef} style={style}>
      <TableCell>
        <div 
          {...attributes} 
          {...listeners} 
          className="cursor-grab active:cursor-grabbing hover:bg-muted/50 rounded p-1 transition-colors"
          title="Arrastra para reordenar"
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>
      </TableCell>
      <TableCell>{renderIcon(card.icon_name)}</TableCell>
      <TableCell className="font-medium">{card.title}</TableCell>
      <TableCell className="text-sm text-muted-foreground">{card.button_url}</TableCell>
      <TableCell>{card.display_order}</TableCell>
      <TableCell>
        <span className={`text-xs px-2 py-1 rounded ${card.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
          {card.is_active ? 'Activa' : 'Inactiva'}
        </span>
      </TableCell>
      <TableCell>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleEdit(card)}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleDelete(card.id)}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

export default function HomepageQuickAccessCards() {
  const [cards, setCards] = useState<QuickAccessCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<QuickAccessCard | null>(null);
  const [formData, setFormData] = useState({
    icon_name: 'Printer',
    title: '',
    description: '',
    button_text: '',
    button_url: '',
    display_order: 0,
    is_active: true
  });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    loadCards();

    const channel = supabase
      .channel('homepage-quick-access-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'homepage_quick_access_cards'
      }, loadCards)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadCards = async () => {
    try {
      const { data, error } = await supabase
        .from("homepage_quick_access_cards")
        .select("*")
        .order("display_order", { ascending: true });

      if (error) throw error;
      setCards(data || []);
    } catch (error: any) {
      console.error("Error al cargar las tarjetas:", error);
      toast.error(error.message || "Error al cargar las tarjetas");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.title.trim() || !formData.description.trim() || 
        !formData.button_text.trim() || !formData.button_url.trim()) {
      toast.error("Todos los campos son obligatorios");
      return;
    }

    try {
      if (editingCard) {
        const { error } = await supabase
          .from("homepage_quick_access_cards")
          .update(formData)
          .eq("id", editingCard.id);

        if (error) throw error;
        toast.success("Tarjeta actualizada correctamente");
      } else {
        const { error } = await supabase
          .from("homepage_quick_access_cards")
          .insert([formData]);

        if (error) throw error;
        toast.success("Tarjeta creada correctamente");
      }

      resetForm();
      setDialogOpen(false);
    } catch (error: any) {
      console.error("Error al guardar la tarjeta:", error);
      toast.error(error.message || "Error al guardar la tarjeta");
    }
  };

  const handleEdit = (card: QuickAccessCard) => {
    setEditingCard(card);
    setFormData({
      icon_name: card.icon_name,
      title: card.title,
      description: card.description,
      button_text: card.button_text,
      button_url: card.button_url,
      display_order: card.display_order,
      is_active: card.is_active
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Estás seguro de eliminar esta tarjeta?")) return;

    try {
      const { error } = await supabase
        .from("homepage_quick_access_cards")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Tarjeta eliminada correctamente");
    } catch (error: any) {
      console.error("Error al eliminar la tarjeta:", error);
      toast.error(error.message || "Error al eliminar la tarjeta");
    }
  };

  const resetForm = () => {
    setEditingCard(null);
    setFormData({
      icon_name: 'Printer',
      title: '',
      description: '',
      button_text: '',
      button_url: '',
      display_order: cards.length,
      is_active: true
    });
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = cards.findIndex((card) => card.id === active.id);
    const newIndex = cards.findIndex((card) => card.id === over.id);

    const newCards = arrayMove(cards, oldIndex, newIndex);
    
    // Update local state immediately for better UX
    setCards(newCards);

    // Update display_order in database using batch update
    try {
      // Prepare all updates in a single batch
      const updates = newCards.map((card, index) => 
        supabase
          .from("homepage_quick_access_cards")
          .update({ display_order: index })
          .eq("id", card.id)
      );

      // Execute all updates in parallel
      const results = await Promise.all(updates);
      
      // Check for any errors
      const errors = results.filter(result => result.error);
      if (errors.length > 0) {
        throw new Error(`Failed to update ${errors.length} card(s)`);
      }

      toast.success("Orden actualizado correctamente");
    } catch (error: any) {
      console.error("Error al actualizar el orden:", error);
      toast.error("Error al actualizar el orden");
      // Reload to restore correct order
      loadCards();
    }
  };

  const renderIcon = (iconName: string) => {
    const IconComponent = Icons[iconName as keyof typeof Icons] as any;
    return IconComponent ? <IconComponent className="h-5 w-5" /> : null;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle>Tarjetas de Acceso Rápido</CardTitle>
            <CardDescription>
              Gestiona las tarjetas que aparecen en la sección de acceso rápido de la página de inicio.
              <br />
              <strong>💡 Arrastra y suelta</strong> las filas para cambiar el orden de las tarjetas.
            </CardDescription>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Nueva Tarjeta
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {editingCard ? 'Editar Tarjeta' : 'Nueva Tarjeta'}
                </DialogTitle>
                <DialogDescription>
                  Configura los detalles de la tarjeta de acceso rápido
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div>
                  <Label>Icono</Label>
                  <Select
                    value={formData.icon_name}
                    onValueChange={(value) => setFormData({ ...formData, icon_name: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ICON_OPTIONS.map((icon) => (
                        <SelectItem key={icon} value={icon}>
                          <div className="flex items-center gap-2">
                            {renderIcon(icon)}
                            <span>{icon}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Título *</Label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Ej: Catálogo de Productos"
                    maxLength={100}
                  />
                </div>

                <div>
                  <Label>Descripción *</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Descripción breve de la tarjeta"
                    rows={3}
                    maxLength={200}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Texto del Botón *</Label>
                    <Input
                      value={formData.button_text}
                      onChange={(e) => setFormData({ ...formData, button_text: e.target.value })}
                      placeholder="Ej: Ver Productos"
                      maxLength={50}
                    />
                  </div>

                  <div>
                    <Label>URL del Botón *</Label>
                    <Input
                      value={formData.button_url}
                      onChange={(e) => setFormData({ ...formData, button_url: e.target.value })}
                      placeholder="Ej: /products"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Orden de Visualización</Label>
                    <Input
                      type="number"
                      value={formData.display_order}
                      onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
                    />
                  </div>

                  <div className="flex items-center gap-2 pt-8">
                    <Switch
                      checked={formData.is_active}
                      onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                    />
                    <Label>Tarjeta Activa</Label>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleSubmit}>
                    {editingCard ? 'Actualizar' : 'Crear'} Tarjeta
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>

      <CardContent>
        {cards.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            No hay tarjetas configuradas. Crea una para comenzar.
          </p>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={cards.map(c => c.id)}
              strategy={verticalListSortingStrategy}
            >
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12"></TableHead>
                    <TableHead>Icono</TableHead>
                    <TableHead>Título</TableHead>
                    <TableHead>URL</TableHead>
                    <TableHead className="w-20">Orden</TableHead>
                    <TableHead className="w-20">Estado</TableHead>
                    <TableHead className="w-24">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cards.map((card) => (
                    <SortableCardRow
                      key={card.id}
                      card={card}
                      renderIcon={renderIcon}
                      handleEdit={handleEdit}
                      handleDelete={handleDelete}
                    />
                  ))}
                </TableBody>
              </Table>
            </SortableContext>
          </DndContext>
        )}
      </CardContent>
    </Card>
  );
}
