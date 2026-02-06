import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

interface QuoteApprovalRequest {
  quote_id: string;
  status_name: string;
  status_slug?: string;
  admin_name?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[QUOTE APPROVAL] Starting process...');

    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user is admin
    const { data: adminRole } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (!adminRole) {
      return new Response(
        JSON.stringify({ error: 'Forbidden: Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { quote_id, status_name, status_slug, admin_name }: QuoteApprovalRequest = await req.json();

    console.log('[QUOTE APPROVAL] Processing quote:', quote_id, 'Status:', status_name);

    const normalizedStatus = status_name?.toLowerCase();
    const isApprovedStatus =
      status_slug?.toLowerCase() === 'approved' ||
      normalizedStatus === 'aprobado' ||
      normalizedStatus === 'aprobada' ||
      normalizedStatus === 'approved';

    // Only process if status is "Aprobado/Aprobada"
    if (!isApprovedStatus) {
      console.log('[QUOTE APPROVAL] Status is not approved, skipping automation');
      return new Response(
        JSON.stringify({ success: true, message: 'Status updated (no automation triggered)' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get quote details with service client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: quote, error: quoteError } = await supabase
      .from('quotes')
      .select('*')
      .eq('id', quote_id)
      .single();

    if (quoteError || !quote) {
      console.error('[QUOTE APPROVAL] Error fetching quote:', quoteError);
      throw new Error('Quote not found');
    }

    console.log('[QUOTE APPROVAL] Quote found:', quote.customer_name);

    // Check if invoice already exists for this quote
    const { data: existingInvoice } = await supabase
      .from('invoices')
      .select('id, invoice_number, subtotal, tax, total')
      .eq('quote_id', quote_id)
      .maybeSingle();

    // Get tax settings - solo si la cotización tiene tax_enabled = true
    const shouldApplyTax = quote.tax_enabled ?? true; // Default true si no existe el campo
    let taxRate = 0;
    let taxSettings = null;
    
    if (shouldApplyTax) {
      const { data: settings } = await supabase
        .from('tax_settings')
        .select('*')
        .eq('is_enabled', true)
        .maybeSingle();
      
      taxSettings = settings;
      taxRate = settings?.tax_rate || 0;
    }

    const subtotal = parseFloat(quote.estimated_price || '0');
    // CRÍTICO: Incluir el costo de envío de la cotización si existe
    const shippingCost = parseFloat(quote.shipping_cost || '0');
    const tax = shouldApplyTax ? (subtotal * taxRate) / 100 : 0;
    const total = subtotal + tax + shippingCost;

    console.log('[QUOTE APPROVAL] Tax calculation:', { 
      quote_tax_enabled: quote.tax_enabled,
      shouldApplyTax, 
      taxRate, 
      subtotal,
      shippingCost,
      tax, 
      total 
    });

    let invoiceNumber = existingInvoice?.invoice_number;
    let invoiceId = existingInvoice?.id;

    if (!existingInvoice) {
      // Get next invoice number
      const { data: nextInvoiceNumber, error: invoiceNumError } = await supabase
        .rpc('generate_next_invoice_number');

      if (invoiceNumError) {
        console.error('[QUOTE APPROVAL] Error generating invoice number:', invoiceNumError);
        throw new Error('Failed to generate invoice number');
      }

      invoiceNumber = nextInvoiceNumber;
      console.log('[QUOTE APPROVAL] Generated invoice number:', invoiceNumber);

      // Create invoice
      const { data: newInvoice, error: invoiceError } = await supabase
        .from('invoices')
        .insert({
          invoice_number: invoiceNumber,
          quote_id: quote_id,
          user_id: quote.user_id,
          issue_date: new Date().toISOString(),
          due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
          payment_status: 'pending',
          subtotal: subtotal,
          tax: tax,
          total: total,
          notes: `Factura generada automáticamente para cotización ${quote.quote_type}`,
          shipping: shippingCost,
          discount: 0
        })
        .select()
        .single();

      if (invoiceError || !newInvoice) {
        console.error('[QUOTE APPROVAL] Error creating invoice:', invoiceError);
        throw new Error('Failed to create invoice');
      }

      invoiceId = newInvoice.id;
      console.log('[QUOTE APPROVAL] Invoice created:', newInvoice.invoice_number);

      // Create invoice items
      const { error: invoiceItemError } = await supabase
        .from('invoice_items')
        .insert({
          invoice_id: newInvoice.id,
          product_name: `Cotización ${quote.quote_type}`,
          description: quote.description || 'Servicio de impresión 3D',
          quantity: 1,
          unit_price: subtotal,
          total_price: subtotal,
          tax_enabled: shouldApplyTax
        });

      if (invoiceItemError) {
        console.error('[QUOTE APPROVAL] Error creating invoice item:', invoiceItemError);
      }
    }

    const quoteMarker = `quote_id:${quote_id}`;
    const { data: existingOrder } = await supabase
      .from('orders')
      .select('id, order_number')
      .ilike('admin_notes', `%${quoteMarker}%`)
      .maybeSingle();

    let orderData: { id: string; order_number: string } | null = existingOrder ?? null;

    if (!existingOrder) {
      const { data: orderStatus } = await supabase
        .from('order_statuses')
        .select('id')
        .eq('name', 'Recibido')
        .maybeSingle();

      const { data: fallbackStatus } = orderStatus ? { data: null } : await supabase
        .from('order_statuses')
        .select('id')
        .order('name', { ascending: true })
        .limit(1)
        .maybeSingle();

      const statusId = orderStatus?.id || fallbackStatus?.id || null;
      const addressParts = [quote.address, quote.city, quote.postal_code, quote.country].filter(Boolean).join(', ');
      const quantity = quote.quantity && quote.quantity > 0 ? quote.quantity : 1;
      const unitPrice = quantity > 0 ? subtotal / quantity : subtotal;

      const { data: newOrder, error: orderError } = await supabase
        .from('orders')
        .insert({
          user_id: quote.user_id,
          status_id: statusId,
          subtotal: subtotal,
          tax: tax,
          discount: 0,
          shipping: shippingCost,
          total: total,
          notes: `Pedido generado automáticamente desde la cotización ${quote.quote_type}`,
          admin_notes: quoteMarker,
          shipping_address: addressParts || null,
          billing_address: addressParts || null,
          payment_status: 'pending'
        })
        .select('id, order_number')
        .single();

      if (orderError || !newOrder) {
        console.error('[QUOTE APPROVAL] Error creating order:', orderError);
      } else {
        orderData = newOrder;

        const { error: orderItemsError } = await supabase
          .from('order_items')
          .insert({
            order_id: newOrder.id,
            product_name: `Cotización ${quote.quote_type}`,
            quantity: quantity,
            unit_price: unitPrice,
            total_price: subtotal,
            selected_material: quote.material_id,
            selected_color: quote.color_id,
            custom_text: quote.description || null
          });

        if (orderItemsError) {
          console.error('[QUOTE APPROVAL] Error creating order items:', orderItemsError);
        }
      }
    }

    // Get company info for email
    const { data: companyInfo } = await supabase
      .from('site_customization')
      .select('company_name, site_name, legal_email')
      .maybeSingle();

    const companyName = companyInfo?.company_name || companyInfo?.site_name || 'Thuis3D.be';
    const companyEmail = companyInfo?.legal_email || 'info@thuis3d.be';

    // Send email to customer
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    if (RESEND_API_KEY && quote.customer_email && !existingInvoice) {
      console.log('[QUOTE APPROVAL] Sending email to customer:', quote.customer_email);

      const safeCustomerName = escapeHtml(quote.customer_name);
      const safeInvoiceNumber = escapeHtml(invoiceNumber ?? '');
      const safeCompanyName = escapeHtml(companyName);

      const emailHtml = `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; background: #f9f9f9; }
              .card { background: white; border-radius: 8px; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
              .header { text-align: center; margin-bottom: 30px; background: linear-gradient(135deg, #3b82f6, #8b5cf6); color: white; padding: 20px; border-radius: 8px; }
              .logo { font-size: 28px; font-weight: bold; }
              .badge { background: #10b981; color: white; padding: 8px 16px; border-radius: 20px; display: inline-block; margin: 10px 0; }
              .info-box { background: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #3b82f6; }
              .amount { font-size: 32px; font-weight: bold; color: #3b82f6; text-align: center; margin: 20px 0; }
              .button { display: inline-block; background: #3b82f6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
              .footer { text-align: center; margin-top: 30px; color: #999; font-size: 14px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="card">
                <div class="header">
                  <div class="logo">${safeCompanyName}</div>
                  <h2>¡Tu Cotización ha sido Aprobada! ✅</h2>
                  <div class="badge">APROBADA</div>
                </div>
                
                <p>Hola ${safeCustomerName},</p>
                <p>¡Excelentes noticias! Tu cotización ha sido <strong>aprobada</strong> por nuestro equipo.</p>
                
                <div class="info-box">
                  <h3 style="margin-top: 0; color: #3b82f6;">📄 Factura Generada</h3>
                  <p><strong>Número de Factura:</strong> ${safeInvoiceNumber}</p>
                  <p><strong>Tipo:</strong> ${escapeHtml(quote.quote_type)}</p>
                  <p class="amount">€${total.toFixed(2)}</p>
                  <p style="font-size: 12px; color: #666;">Subtotal: €${subtotal.toFixed(2)}${shippingCost > 0 ? ` | Envío: €${shippingCost.toFixed(2)}` : ''} | IVA (${taxRate}%): €${tax.toFixed(2)}</p>
                </div>
                
                <div style="text-align: center;">
                  <p><strong>La factura está lista para ser pagada</strong></p>
                  <p>Puedes revisar los detalles y proceder con el pago desde tu panel de usuario.</p>
                </div>
                
                <p style="margin-top: 30px;">Si tienes alguna pregunta, no dudes en contactarnos.</p>
                
                <div class="footer">
                  <p>Este es un correo automático de ${safeCompanyName}</p>
                  <p>Contacto: ${escapeHtml(companyEmail)}</p>
                </div>
              </div>
            </div>
          </body>
        </html>
      `;

      try {
        const emailRes = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: `${companyName} <noreply@thuis3d.be>`,
            to: [quote.customer_email],
            subject: `✅ Cotización Aprobada - Factura ${invoiceNumber}`,
            html: emailHtml,
          }),
        });

        const emailData = await emailRes.json();
        if (!emailRes.ok) {
          console.error('[QUOTE APPROVAL] Email sending failed:', emailData);
        } else {
          console.log('[QUOTE APPROVAL] Email sent successfully');
        }
      } catch (emailError) {
        console.error('[QUOTE APPROVAL] Error sending email:', emailError);
      }
    }

    // Create notification for customer
    if (quote.user_id && !existingInvoice) {
      console.log('[QUOTE APPROVAL] Creating notification for user:', quote.user_id);
      
      const { error: notifError } = await supabase
        .from('notifications')
        .insert({
          user_id: quote.user_id,
          type: 'quote_approved',
          title: '✅ Cotización Aprobada',
          message: `Tu cotización ha sido aprobada. Se ha generado la factura ${invoiceNumber} por €${total.toFixed(2)}. Puedes proceder con el pago.`,
          link: `/mis-facturas/${invoiceId}`,
          is_read: false
        });

      if (notifError) {
        console.error('[QUOTE APPROVAL] Error creating notification:', notifError);
      }
    }

    // Notify all admins about the automation
    const { data: adminUsers } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'admin');

    if (adminUsers && adminUsers.length > 0) {
      console.log('[QUOTE APPROVAL] Notifying admins about automation');
       
      const orderMessage = orderData ? ` Se generó también el pedido ${orderData.order_number}.` : '';
      const adminTitle = existingInvoice ? '🤖 Automatización: Pedido Generado' : '🤖 Automatización: Factura Generada';
      const invoiceMessage = existingInvoice
        ? `La factura ${invoiceNumber} ya existía`
        : `Se generó automáticamente la factura ${invoiceNumber} (€${total.toFixed(2)})`;
      const adminNotifications = adminUsers.map(admin => ({
        user_id: admin.user_id,
        type: 'system',
        title: adminTitle,
        message: `${invoiceMessage} para la cotización de ${quote.customer_name}.${orderMessage} El cliente ha sido notificado por email.`,
        link: `/admin/facturas`,
        is_read: false
      }));

      await supabase.from('notifications').insert(adminNotifications);
    }

    console.log('[QUOTE APPROVAL] Process completed successfully');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Quote approved successfully',
        invoice: {
          id: invoiceId,
          invoice_number: invoiceNumber,
          total: total
        },
        order: orderData ? {
          id: orderData.id,
          order_number: orderData.order_number
        } : null,
        automations: {
          invoice_created: !existingInvoice,
          order_created: !!orderData,
          email_sent: !!RESEND_API_KEY && !!quote.customer_email && !existingInvoice,
          customer_notified: !!quote.user_id && !existingInvoice,
          admin_notified: true
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[QUOTE APPROVAL] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
};

serve(handler);
