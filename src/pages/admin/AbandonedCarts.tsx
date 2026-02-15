import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ShoppingCart, Mail, Phone, Calendar, Euro, Loader2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface AbandonedCart {
  id: string;
  user_id: string | null;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  cart_data: any[];
  created_at: string;
  expires_at: string;
  last_activity: string;
  cart_total: number;
  user_full_name: string | null;
  user_email: string | null;
}

export default function AbandonedCarts() {
  const [abandonedCarts, setAbandonedCarts] = useState<AbandonedCart[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadAbandonedCarts();
  }, []);

  const loadAbandonedCarts = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('abandoned_carts_view')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setAbandonedCarts(data || []);
    } catch (error: any) {
      logger.error('Error loading abandoned carts:', error);
      toast.error('Error al cargar carritos abandonados');
    } finally {
      setLoading(false);
    }
  };

  const markAbandoned = async () => {
    try {
      setProcessing(true);
      
      // Call the function to mark expired carts as abandoned
      const { error } = await supabase.rpc('mark_abandoned_carts');
      
      if (error) throw error;
      
      toast.success('Carritos actualizados correctamente');
      loadAbandonedCarts();
    } catch (error: any) {
      logger.error('Error marking abandoned carts:', error);
      toast.error('Error al actualizar carritos');
    } finally {
      setProcessing(false);
    }
  };

  const sendRecoveryEmail = async (cart: AbandonedCart) => {
    toast.info('Funcionalidad de email de recuperación próximamente');
    // TODO: Implement recovery email functionality
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ShoppingCart className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Carritos Abandonados</h1>
            <p className="text-muted-foreground">
              Checkouts no completados en las últimas 24 horas
            </p>
          </div>
        </div>
        <Button 
          onClick={markAbandoned} 
          disabled={processing}
          variant="outline"
        >
          {processing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Procesando...
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              Actualizar
            </>
          )}
        </Button>
      </div>

      {abandonedCarts.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <ShoppingCart className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No hay carritos abandonados</h3>
            <p className="text-muted-foreground">
              Los checkouts abandonados aparecerán aquí después de 24 horas sin completarse
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>
              {abandonedCarts.length} Carrito{abandonedCarts.length !== 1 ? 's' : ''} Abandonado{abandonedCarts.length !== 1 ? 's' : ''}
            </CardTitle>
            <CardDescription>
              Oportunidades de recuperación de ventas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Contacto</TableHead>
                    <TableHead>Productos</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Fecha Abandono</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {abandonedCarts.map((cart) => (
                    <TableRow key={cart.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">
                            {cart.customer_name || cart.user_full_name || 'Anónimo'}
                          </p>
                          {cart.user_id && (
                            <Badge variant="secondary" className="text-xs mt-1">
                              Usuario registrado
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1 text-sm">
                          {(cart.customer_email || cart.user_email) && (
                            <div className="flex items-center gap-1">
                              <Mail className="h-3 w-3 text-muted-foreground" />
                              <span>{cart.customer_email || cart.user_email}</span>
                            </div>
                          )}
                          {cart.customer_phone && (
                            <div className="flex items-center gap-1">
                              <Phone className="h-3 w-3 text-muted-foreground" />
                              <span>{cart.customer_phone}</span>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm">
                          {cart.cart_data?.length || 0} producto{cart.cart_data?.length !== 1 ? 's' : ''}
                        </p>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 font-medium">
                          <Euro className="h-4 w-4" />
                          {cart.cart_total.toFixed(2)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(cart.created_at), 'dd MMM yyyy HH:mm', { locale: es })}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => sendRecoveryEmail(cart)}
                          disabled={!cart.customer_email && !cart.user_email}
                        >
                          <Mail className="h-4 w-4 mr-1" />
                          Enviar Email
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-blue-900">💡 Consejo Pro</CardTitle>
        </CardHeader>
        <CardContent className="text-blue-800">
          <p className="text-sm">
            Los carritos se marcan automáticamente como abandonados 24 horas después de ser creados sin completar el pago.
            Puedes enviar emails de recuperación personalizados para incentivar la finalización de la compra.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
