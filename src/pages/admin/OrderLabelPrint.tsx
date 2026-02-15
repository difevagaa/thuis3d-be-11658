import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Printer, Download, ArrowLeft, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';

interface Order {
  id: string;
  order_number: string;
  created_at: string;
  total: number;
  shipping_address: string;
  billing_address: string;
  notes: string | null;
  user_id: string | null;
  payment_status: string;
}

interface OrderItem {
  id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  selected_material: string | null;
  selected_color: string | null;
}

interface CustomerInfo {
  full_name: string;
  email: string;
  phone: string;
}

interface ParsedAddress {
  full_name?: string;
  address?: string;
  street?: string;
  city?: string;
  postal_code?: string;
  postalCode?: string;
  country?: string;
  phone?: string;
  email?: string;
}

export default function OrderLabelPrint() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadOrderData();
    }
  }, [id]);

  const loadOrderData = async () => {
    try {
      setLoading(true);

      // Load order
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', id)
        .single();

      if (orderError) throw orderError;
      setOrder(orderData);

      // Load order items
      const { data: itemsData, error: itemsError } = await supabase
        .from('order_items')
        .select('*')
        .eq('order_id', id);

      if (itemsError) throw itemsError;
      setOrderItems(itemsData || []);

      // Load customer info if user_id exists
      if (orderData.user_id) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('full_name, email, phone')
          .eq('id', orderData.user_id)
          .single();

        if (profileData) {
          setCustomerInfo(profileData);
        }
      }
    } catch (error: any) {
      logger.error('Error loading order data:', error);
      toast.error('Error al cargar datos del pedido');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const parseAddress = (addressStr: string | null): ParsedAddress => {
    if (!addressStr) return {};
    try {
      return JSON.parse(addressStr);
    } catch {
      return { address: addressStr };
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p>Pedido no encontrado</p>
        <Button onClick={() => navigate('/admin/pedidos')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver a Pedidos
        </Button>
      </div>
    );
  }

  const shippingAddr = parseAddress(order.shipping_address);

  return (
    <>
      {/* Print Controls - Hidden when printing */}
      <div className="print:hidden fixed top-4 right-4 z-50 flex gap-2">
        <Button onClick={() => navigate(`/admin/pedidos/${id}`)} variant="outline">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver
        </Button>
        <Button onClick={handlePrint}>
          <Printer className="mr-2 h-4 w-4" />
          Imprimir
        </Button>
      </div>

      {/* Printable Label */}
      <div className="max-w-4xl mx-auto p-8 bg-white">
        {/* Header with Logo and Order Number */}
        <div className="flex justify-between items-start mb-8 pb-4 border-b-2 border-black">
          <div>
            <h1 className="text-3xl font-bold">Thuis3D.be</h1>
            <p className="text-sm text-gray-600">Impresión 3D Profesional</p>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-600">PEDIDO</div>
            <div className="text-2xl font-bold">{order.order_number}</div>
            <div className="text-xs text-gray-500 mt-1">
              {new Date(order.created_at).toLocaleDateString('es-ES')}
            </div>
          </div>
        </div>

        {/* Barcode - Using Code 128 compatible format */}
        {/* TODO: Replace with actual barcode library (e.g., react-barcode or JsBarcode) for scannable barcodes */}
        <div className="mb-8 text-center">
          <svg 
            className="mx-auto" 
            width="250" 
            height="80"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Simple barcode representation - decorative placeholder */}
            <rect x="10" y="10" width="2" height="50" fill="black" />
            <rect x="14" y="10" width="4" height="50" fill="black" />
            <rect x="20" y="10" width="2" height="50" fill="black" />
            <rect x="24" y="10" width="6" height="50" fill="black" />
            <rect x="32" y="10" width="2" height="50" fill="black" />
            <rect x="36" y="10" width="4" height="50" fill="black" />
            <rect x="42" y="10" width="2" height="50" fill="black" />
            <rect x="46" y="10" width="6" height="50" fill="black" />
            <rect x="54" y="10" width="4" height="50" fill="black" />
            <rect x="60" y="10" width="2" height="50" fill="black" />
            <rect x="64" y="10" width="6" height="50" fill="black" />
            <rect x="72" y="10" width="2" height="50" fill="black" />
            <rect x="76" y="10" width="4" height="50" fill="black" />
            <rect x="82" y="10" width="6" height="50" fill="black" />
            <rect x="90" y="10" width="2" height="50" fill="black" />
            <rect x="94" y="10" width="4" height="50" fill="black" />
            <rect x="100" y="10" width="2" height="50" fill="black" />
            <rect x="104" y="10" width="6" height="50" fill="black" />
            <rect x="112" y="10" width="4" height="50" fill="black" />
            <rect x="118" y="10" width="2" height="50" fill="black" />
            <text x="125" y="75" fontSize="12" fontFamily="monospace">{order.order_number}</text>
          </svg>
        </div>

        {/* Two Column Layout for Addresses */}
        <div className="grid grid-cols-2 gap-8 mb-8">
          {/* Shipping Address */}
          <div className="border-2 border-black p-4">
            <h2 className="font-bold text-lg mb-2">ENVIAR A:</h2>
            <div className="text-sm space-y-1">
              <p className="font-semibold">{shippingAddr.full_name || customerInfo?.full_name || 'N/A'}</p>
              <p>{shippingAddr.address || shippingAddr.street || 'N/A'}</p>
              <p>{shippingAddr.city || 'N/A'}, {shippingAddr.postal_code || shippingAddr.postalCode || 'N/A'}</p>
              <p className="font-medium">{shippingAddr.country || 'N/A'}</p>
              {(shippingAddr.phone || customerInfo?.phone) && (
                <p className="mt-2">Tel: {shippingAddr.phone || customerInfo?.phone}</p>
              )}
              {(shippingAddr.email || customerInfo?.email) && (
                <p>Email: {shippingAddr.email || customerInfo?.email}</p>
              )}
            </div>
          </div>

          {/* Order Summary */}
          <div className="border border-gray-300 p-4">
            <h2 className="font-bold text-lg mb-2">RESUMEN PEDIDO:</h2>
            <div className="text-sm space-y-1">
              <div className="flex justify-between">
                <span>Total Items:</span>
                <span className="font-semibold">{orderItems.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Cantidad Total:</span>
                <span className="font-semibold">
                  {orderItems.reduce((sum, item) => sum + item.quantity, 0)} unidades
                </span>
              </div>
              <div className="flex justify-between pt-2 border-t mt-2">
                <span className="font-bold">Total:</span>
                <span className="font-bold text-lg">€{order.total.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Estado Pago:</span>
                <span className={`font-semibold ${order.payment_status === 'paid' ? 'text-green-600' : 'text-orange-600'}`}>
                  {order.payment_status === 'paid' ? 'PAGADO' : 'PENDIENTE'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Items List */}
        <div className="mb-8">
          <h2 className="font-bold text-lg mb-3 border-b pb-2">ITEMS DEL PEDIDO:</h2>
          <table className="w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="text-left p-2 border">Producto</th>
                <th className="text-left p-2 border">Material/Color</th>
                <th className="text-center p-2 border">Cant.</th>
                <th className="text-right p-2 border">Precio</th>
              </tr>
            </thead>
            <tbody>
              {orderItems.map((item) => (
                <tr key={item.id}>
                  <td className="p-2 border">{item.product_name}</td>
                  <td className="p-2 border text-xs">
                    {item.selected_material && <div>Mat: {item.selected_material}</div>}
                    {item.selected_color && <div>Color: {item.selected_color}</div>}
                  </td>
                  <td className="p-2 border text-center">{item.quantity}</td>
                  <td className="p-2 border text-right">€{item.total_price.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Notes */}
        {order.notes && (
          <div className="border border-gray-300 p-4 bg-yellow-50">
            <h3 className="font-bold mb-2">NOTAS:</h3>
            <p className="text-sm whitespace-pre-wrap">{order.notes}</p>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 pt-4 border-t text-center text-xs text-gray-500">
          <p>Thuis3D.be - Impresión 3D Profesional</p>
          <p>info@thuis3d.be | www.thuis3d.be</p>
        </div>
      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          body {
            margin: 0;
            padding: 0;
          }
          .print\\:hidden {
            display: none !important;
          }
          @page {
            size: A4;
            margin: 1cm;
          }
        }
      `}</style>
    </>
  );
}
