import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Mail, Pencil, Trash2, Download, Info, Gift } from "lucide-react";
import { logger } from '@/lib/logger';

function generateGiftCardCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const segments = 4;
  const segmentLength = 4;
  
  const code = Array.from({ length: segments }, () => {
    return Array.from({ length: segmentLength }, () => 
      chars.charAt(Math.floor(Math.random() * chars.length))
    ).join('');
  }).join('-');
  
  return code;
}

export default function GiftCardsEnhanced() {
  const [giftCards, setGiftCards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingCard, setEditingCard] = useState<any>(null);
  const [newCard, setNewCard] = useState({
    recipient_email: "",
    sender_name: "",
    initial_amount: 0,
    message: "",
    tax_enabled: false // FALSE por defecto: las tarjetas regalo NO deben tener IVA
  });

  useEffect(() => {
    loadGiftCards();

    // Realtime subscription con logging
    const channel = supabase
      .channel('gift-cards-enhanced-admin-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'gift_cards'
      }, (payload) => {
        logger.log('🔔 Realtime event in GiftCardsEnhanced:', payload);
        loadGiftCards();
      })
      .subscribe((status) => {
        logger.log('📡 Realtime subscription status (Enhanced):', status);
      });

    return () => {
      logger.log('🔌 Unsubscribing from gift-cards-enhanced-admin-changes');
      supabase.removeChannel(channel);
    };
  }, []);

  const loadGiftCards = async () => {
    try {
      logger.log('📥 Loading gift cards (Enhanced)...');
      const { data, error } = await supabase
        .from("gift_cards")
        .select("*")
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

      if (error) throw error;
      logger.log('✅ Gift cards loaded (Enhanced):', data?.length);
      setGiftCards(data || []);
    } catch (error) {
      logger.error('❌ Error loading gift cards (Enhanced):', error);
      toast.error("Error al cargar tarjetas regalo");
    } finally {
      setLoading(false);
    }
  };

  const createGiftCard = async () => {
    if (newCard.initial_amount <= 0) {
      toast.error("El monto debe ser mayor a 0");
      return;
    }

    if (!newCard.recipient_email.trim()) {
      toast.error("El email del destinatario es obligatorio");
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newCard.recipient_email)) {
      toast.error("El email no tiene un formato válido");
      return;
    }

    try {
      const code = generateGiftCardCode();

      const { data: newGiftCard, error } = await supabase
        .from("gift_cards")
        .insert([{
          code,
          recipient_email: newCard.recipient_email,
          sender_name: newCard.sender_name || "Administrador",
          initial_amount: newCard.initial_amount,
          current_balance: newCard.initial_amount,
          message: newCard.message,
          is_active: true,
          tax_enabled: newCard.tax_enabled
        }])
        .select()
        .single();

      if (error) throw error;

      // Send email
      await sendGiftCardEmail(newGiftCard);

      toast.success("Tarjeta regalo creada y email enviado exitosamente");
      setNewCard({ recipient_email: "", sender_name: "", initial_amount: 0, message: "", tax_enabled: false });
      
      // Actualizar lista inmediatamente sin esperar al realtime
      await loadGiftCards();
    } catch (error: any) {
      logger.error("Error creating gift card:", error);
      toast.error("Error al crear tarjeta regalo: " + (error.message || "Error desconocido"));
    }
  };

  const sendGiftCardEmail = async (card: any) => {
    try {
      // Parse message to extract customization data
      let userMessage = card.message;
      let themeId = 'ocean';
      let iconId = 'gift';
      
      if (card.message) {
        try {
          const parsed = JSON.parse(card.message);
          userMessage = parsed.userMessage || null;
          themeId = parsed.themeId || 'ocean';
          iconId = parsed.iconId || 'gift';
        } catch {
          // If not JSON, use as plain message
          userMessage = card.message;
        }
      }
      
      const { error } = await supabase.functions.invoke('send-gift-card-email', {
        body: {
          recipient_email: card.recipient_email,
          sender_name: card.sender_name || "Thuis3d.be",
          gift_card_code: card.code,
          amount: card.initial_amount,
          message: userMessage,
          themeId,
          iconId
        }
      });

      if (error) throw error;
    } catch (error: any) {
      logger.error('Email error:', error);
      toast.error("Tarjeta creada pero falló el envío de email");
    }
  };

  const updateGiftCard = async () => {
    if (!editingCard) return;

    if (editingCard.current_balance < 0) {
      toast.error("El saldo no puede ser negativo");
      return;
    }

    if (editingCard.initial_amount < 0) {
      toast.error("El monto inicial no puede ser negativo");
      return;
    }

    try {
      const { error } = await supabase
        .from("gift_cards")
        .update({ 
          current_balance: editingCard.current_balance,
          initial_amount: editingCard.initial_amount,
          is_active: editingCard.is_active,
          expires_at: editingCard.expires_at
        })
        .eq("id", editingCard.id);

      if (error) throw error;
      toast.success("Tarjeta actualizada exitosamente");
      setEditingCard(null);
      
      // Actualizar lista inmediatamente sin esperar al realtime
      await loadGiftCards();
    } catch (error: any) {
      logger.error("Error updating gift card:", error);
      toast.error("Error al actualizar tarjeta: " + (error.message || "Error desconocido"));
    }
  };

  const deleteCard = async (id: string) => {
    if (!confirm("¿Eliminar esta tarjeta regalo permanentemente?")) return;

    try {
      logger.log('🗑️ Deleting gift card (Enhanced):', id);
      const { error } = await supabase
        .from("gift_cards")
        .delete()
        .eq("id", id);

      if (error) {
        logger.error('❌ Delete error (Enhanced):', error);
        throw error;
      }
      
      logger.log('✅ Gift card deleted successfully (Enhanced)');
      toast.success("Tarjeta eliminada exitosamente");
      
      // Actualizar lista inmediatamente sin esperar al realtime
      await loadGiftCards();
    } catch (error: any) {
      logger.error("❌ Error deleting gift card (Enhanced):", error);
      toast.error("Error al eliminar tarjeta: " + (error.message || "Error desconocido"));
    }
  };

  const resendEmail = async (card: any) => {
    try {
      await sendGiftCardEmail(card);
      toast.success("Email reenviado exitosamente");
    } catch (error) {
      toast.error("Error al reenviar email");
    }
  };

  if (loading) return <div>Cargando...</div>;

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="bg-gradient-to-br from-blue-500 to-teal-600 p-3 rounded-lg">
          <Gift className="h-8 w-8 text-white" />
        </div>
        <h1 className="text-3xl font-bold">Gestión de Tarjetas Regalo</h1>
      </div>

      <Card className="mb-6 border-2 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-blue-500/10 to-teal-500/10 border-b">
          <CardTitle>Crear Nueva Tarjeta Regalo</CardTitle>
          <CardDescription>Genera y envía tarjetas regalo por email</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert className="bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-800">
            <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <AlertDescription className="text-blue-800 dark:text-blue-300">
              <strong>Producto Digital:</strong> Las tarjetas regalo NO tienen costo de envío porque son productos digitales. 
              Tampoco deberían tener IVA aplicado (salvo requerimiento legal específico).
            </AlertDescription>
          </Alert>
          
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label>Email del Destinatario *</Label>
              <Input
                type="email"
                value={newCard.recipient_email}
                onChange={(e) => setNewCard({ ...newCard, recipient_email: e.target.value })}
                placeholder="cliente@ejemplo.com"
              />
            </div>
            <div>
              <Label>Nombre del Remitente</Label>
              <Input
                value={newCard.sender_name}
                onChange={(e) => setNewCard({ ...newCard, sender_name: e.target.value })}
                placeholder="Administrador"
              />
            </div>
          </div>
          <div>
            <Label>Monto (€) *</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={newCard.initial_amount}
              onChange={(e) => setNewCard({ ...newCard, initial_amount: e.target.value === '' ? 0 : parseFloat(e.target.value) })}
              placeholder="Ej: 50.00"
            />
          </div>
          <div>
            <Label>Mensaje Personal (opcional)</Label>
            <Textarea
              value={newCard.message}
              onChange={(e) => setNewCard({ ...newCard, message: e.target.value })}
              placeholder="¡Disfruta tu regalo!"
              rows={3}
            />
          </div>
          <div className="flex items-center justify-between pt-2 border-t">
            <div>
              <Label>Aplicar IVA a esta tarjeta</Label>
              <p className="text-xs text-muted-foreground">
                ⚠️ Las tarjetas regalo son productos digitales y normalmente NO deben tener IVA. 
                Solo activa esto si tu legislación local lo requiere.
              </p>
            </div>
            <Switch 
              checked={newCard.tax_enabled} 
              onCheckedChange={(checked) => setNewCard({ ...newCard, tax_enabled: checked })} 
            />
          </div>
          <Button onClick={createGiftCard} disabled={!newCard.recipient_email || newCard.initial_amount <= 0} className="bg-gradient-to-r from-blue-500 to-teal-600 hover:from-blue-600 hover:to-teal-700">
            <Gift className="mr-2 h-4 w-4" />
            Crear y Enviar Tarjeta
          </Button>
        </CardContent>
      </Card>

      <Card className="border-2 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-cyan-500/10 to-sky-500/10 border-b">
          <CardTitle>Tarjetas Regalo Existentes</CardTitle>
          <CardDescription>Administra todas las tarjetas regalo</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Destinatario</TableHead>
                <TableHead>Monto Inicial</TableHead>
                <TableHead>Saldo Actual</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {giftCards.map((card) => (
                <TableRow key={card.id}>
                  <TableCell className="font-mono">{card.code}</TableCell>
                  <TableCell>{card.recipient_email}</TableCell>
                  <TableCell>€{card.initial_amount}</TableCell>
                  <TableCell className="font-bold">€{card.current_balance}</TableCell>
                  <TableCell>
                    <Badge variant={card.is_active ? "default" : "secondary"} className={card.is_active ? "bg-teal-500 hover:bg-teal-600" : ""}>
                      {card.is_active ? "Activa" : "Inactiva"}
                    </Badge>
                  </TableCell>
                  <TableCell>{new Date(card.created_at).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditingCard(card)}
                        title="Editar saldo"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => resendEmail(card)}
                        title="Reenviar email"
                      >
                        <Mail className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => deleteCard(card.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {giftCards.length === 0 && (
            <p className="text-center text-muted-foreground py-8">No hay tarjetas regalo todavía</p>
          )}
        </CardContent>
      </Card>

      {/* Edit Gift Card Dialog */}
      <Dialog open={!!editingCard} onOpenChange={(open) => !open && setEditingCard(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Tarjeta Regalo</DialogTitle>
            <DialogDescription>
              Código: {editingCard?.code}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Monto Inicial (€)</Label>
              <Input
                type="number"
                step="0.01"
                value={editingCard?.initial_amount || ''}
                onChange={(e) => setEditingCard({ ...editingCard, initial_amount: e.target.value === '' ? 0 : parseFloat(e.target.value) })}
                placeholder="Ej: 50.00"
              />
            </div>
            <div>
              <Label>Saldo Actual (€)</Label>
              <Input
                type="number"
                step="0.01"
                value={editingCard?.current_balance || ''}
                onChange={(e) => setEditingCard({ ...editingCard, current_balance: e.target.value === '' ? 0 : parseFloat(e.target.value) })}
                placeholder="Ej: 50.00"
              />
            </div>
            <div>
              <Label>Fecha de Caducidad</Label>
              <Input
                type="date"
                value={editingCard?.expires_at ? new Date(editingCard.expires_at).toISOString().split('T')[0] : ''}
                onChange={(e) => setEditingCard({ ...editingCard, expires_at: e.target.value })}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>Estado Activo</Label>
              <Switch
                checked={editingCard?.is_active || false}
                onCheckedChange={(checked) => setEditingCard({ ...editingCard, is_active: checked })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingCard(null)}>
              Cancelar
            </Button>
            <Button onClick={updateGiftCard}>
              Guardar Cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
