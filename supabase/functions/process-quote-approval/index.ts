import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

interface QuoteApprovalRequest {
  quote_id: string;
  status_name: string;
  status_slug?: string;
  admin_name?: string;
  invoked_by_customer?: boolean;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[QUOTE APPROVAL] Starting process...');

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

    const body: QuoteApprovalRequest = await req.json();
    const { quote_id, status_name, status_slug, admin_name, invoked_by_customer } = body;

    // Service client for privileged operations
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Authorization: either admin OR the quote owner
    if (invoked_by_customer) {
      const { data: quote } = await supabase
        .from('quotes')
        .select('user_id')
        .eq('id', quote_id)
        .single();
      
      if (!quote || quote.user_id !== user.id) {
        return new Response(
          JSON.stringify({ error: 'Forbidden: You can only approve your own quotes' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else {
      // Must be admin
      const { data: adminRole } = await supabaseClient
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .in('role', ['admin', 'superadmin'])
        .maybeSingle();

      if (!adminRole) {
        return new Response(
          JSON.stringify({ error: 'Forbidden: Admin access required' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    console.log('[QUOTE APPROVAL] Processing quote:', quote_id);

    const normalizedStatus = status_name?.toLowerCase();
    const isApprovedStatus =
      status_slug?.toLowerCase() === 'approved' ||
      normalizedStatus === 'aprobado' ||
      normalizedStatus === 'aprobada' ||
      normalizedStatus === 'approved';

    if (!isApprovedStatus) {
      return new Response(
        JSON.stringify({ success: true, message: 'Status updated (no automation triggered)' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get quote details
    const { data: quote, error: quoteError } = await supabase
      .from('quotes')
      .select('*')
      .eq('id', quote_id)
      .single();

    if (quoteError || !quote) {
      throw new Error('Quote not found');
    }

    // Get user language preference
    let userLang = 'en';
    if (quote.user_id) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('preferred_language')
        .eq('id', quote.user_id)
        .single();
      userLang = profile?.preferred_language || 'en';
    }

    // Check existing invoice
    const { data: existingInvoice } = await supabase
      .from('invoices')
      .select('id, invoice_number, subtotal, tax, total')
      .eq('quote_id', quote_id)
      .maybeSingle();

    // Tax settings
    const shouldApplyTax = quote.tax_enabled ?? true;
    let taxRate = 0;
    if (shouldApplyTax) {
      const { data: settings } = await supabase
        .from('tax_settings')
        .select('*')
        .eq('is_enabled', true)
        .maybeSingle();
      taxRate = settings?.tax_rate || 0;
    }

    const subtotal = parseFloat(quote.estimated_price || '0');
    const shippingCost = parseFloat(quote.shipping_cost || '0');
    const tax = shouldApplyTax ? (subtotal * taxRate) / 100 : 0;
    const total = subtotal + tax + shippingCost;

    let invoiceNumber = existingInvoice?.invoice_number;
    let invoiceId = existingInvoice?.id;

    // Create order FIRST so we can link invoice to it
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

      let fallbackStatus: { id: string } | null = null;
      if (!orderStatus) {
        const { data } = await supabase
          .from('order_statuses')
          .select('id')
          .order('name', { ascending: true })
          .limit(1)
          .maybeSingle();
        fallbackStatus = data;
      }

      const statusId = orderStatus?.id || fallbackStatus?.id || null;
      const addressParts = [quote.address, quote.city, quote.postal_code, quote.country].filter(Boolean).join(', ');
      const quantity = quote.quantity && quote.quantity > 0 ? quote.quantity : 1;
      const unitPrice = quantity > 0 ? Math.round((subtotal / quantity) * 100) / 100 : subtotal;

      // Extract filename from file_url for product name
      let productName = `Cotización ${quote.quote_type}`;
      if (quote.file_url) {
        try {
          const urlPath = decodeURIComponent(quote.file_url.split('/').pop() || '');
          if (urlPath) productName = urlPath;
        } catch { /* keep default */ }
      } else if (quote.file_storage_path) {
        try {
          const pathName = quote.file_storage_path.split('/').pop() || '';
          if (pathName) productName = pathName;
        } catch { /* keep default */ }
      }

      const { data: newOrder, error: orderError } = await supabase
        .from('orders')
        .insert({
          user_id: quote.user_id,
          status_id: statusId,
          subtotal, tax, discount: 0, shipping: shippingCost, total,
          notes: `Pedido generado automáticamente desde cotización`,
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

        await supabase.from('order_items').insert({
          order_id: newOrder.id,
          product_name: productName,
          quantity,
          unit_price: unitPrice,
          total_price: subtotal,
          selected_material: quote.material_id,
          selected_color: quote.color_id,
          custom_text: quote.description || null
        });
      }
    }

    // Create invoice (linked to order) - invoice_number MUST match order_number
    if (!existingInvoice) {
      // Use order_number as invoice_number for consistency
      invoiceNumber = orderData?.order_number || null;
      
      // Fallback: generate a number only if no order was created
      if (!invoiceNumber) {
        const { data: nextInvoiceNumber, error: invoiceNumError } = await supabase
          .rpc('generate_next_invoice_number');
        if (invoiceNumError) throw new Error('Failed to generate invoice number');
        invoiceNumber = nextInvoiceNumber;
      }

      const { data: newInvoice, error: invoiceError } = await supabase
        .from('invoices')
        .insert({
          invoice_number: invoiceNumber,
          quote_id: quote_id,
          order_id: orderData?.id || null,
          user_id: quote.user_id,
          issue_date: new Date().toISOString(),
          due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          payment_status: 'pending',
          subtotal, tax, total,
          notes: `Factura generada automáticamente`,
          shipping: shippingCost,
          discount: 0
        })
        .select()
        .single();

      if (invoiceError || !newInvoice) throw new Error('Failed to create invoice');
      invoiceId = newInvoice.id;

      // Use same product name and quantity as order_items
      const invoiceQuantity = quote.quantity && quote.quantity > 0 ? quote.quantity : 1;
      const invoiceUnitPrice = invoiceQuantity > 0 ? Math.round((subtotal / invoiceQuantity) * 100) / 100 : subtotal;

      let invoiceProductName = `Cotización ${quote.quote_type}`;
      if (quote.file_url) {
        try {
          const urlPath = decodeURIComponent(quote.file_url.split('/').pop() || '');
          if (urlPath) invoiceProductName = urlPath;
        } catch { /* keep default */ }
      } else if (quote.file_storage_path) {
        try {
          const pathName = quote.file_storage_path.split('/').pop() || '';
          if (pathName) invoiceProductName = pathName;
        } catch { /* keep default */ }
      }

      await supabase.from('invoice_items').insert({
        invoice_id: newInvoice.id,
        product_name: invoiceProductName,
        description: quote.description || 'Servicio de impresión 3D',
        quantity: invoiceQuantity,
        unit_price: invoiceUnitPrice,
        total_price: subtotal,
        tax_enabled: shouldApplyTax
      });
    }

    // Multi-language email
    const { data: companyInfo } = await supabase
      .from('site_customization')
      .select('company_name, site_name, legal_email')
      .maybeSingle();

    const companyName = companyInfo?.company_name || companyInfo?.site_name || 'Thuis3D.be';
    const companyEmail = companyInfo?.legal_email || 'info@thuis3d.be';

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    if (RESEND_API_KEY && quote.customer_email && !existingInvoice) {
      const translations: Record<string, { subject: string; title: string; greeting: string; body: string; invoiceLabel: string; typeLabel: string; payNow: string; footer: string }> = {
        es: {
          subject: `✅ Cotización Aprobada - Factura ${invoiceNumber}`,
          title: '¡Tu Cotización ha sido Aprobada! ✅',
          greeting: `Hola ${escapeHtml(quote.customer_name)},`,
          body: 'Tu cotización ha sido <strong>aprobada</strong>. Se ha generado una factura y un pedido automáticamente.',
          invoiceLabel: 'Factura Generada',
          typeLabel: 'Tipo',
          payNow: 'La factura está lista para ser pagada.',
          footer: `Este es un correo automático de ${escapeHtml(companyName)}`
        },
        en: {
          subject: `✅ Quote Approved - Invoice ${invoiceNumber}`,
          title: 'Your Quote has been Approved! ✅',
          greeting: `Hello ${escapeHtml(quote.customer_name)},`,
          body: 'Your quote has been <strong>approved</strong>. An invoice and order have been automatically generated.',
          invoiceLabel: 'Invoice Generated',
          typeLabel: 'Type',
          payNow: 'The invoice is ready for payment.',
          footer: `This is an automatic email from ${escapeHtml(companyName)}`
        },
        nl: {
          subject: `✅ Offerte Goedgekeurd - Factuur ${invoiceNumber}`,
          title: 'Uw offerte is goedgekeurd! ✅',
          greeting: `Hallo ${escapeHtml(quote.customer_name)},`,
          body: 'Uw offerte is <strong>goedgekeurd</strong>. Er is automatisch een factuur en bestelling aangemaakt.',
          invoiceLabel: 'Factuur Aangemaakt',
          typeLabel: 'Type',
          payNow: 'De factuur is klaar voor betaling.',
          footer: `Dit is een automatisch bericht van ${escapeHtml(companyName)}`
        }
      };

      const t = translations[userLang] || translations['en'];

      const emailHtml = `<!DOCTYPE html><html><head><style>
        body{font-family:Arial,sans-serif;line-height:1.6;color:#333}
        .container{max-width:600px;margin:0 auto;padding:20px;background:#f9f9f9}
        .card{background:white;border-radius:8px;padding:30px;box-shadow:0 2px 4px rgba(0,0,0,0.1)}
        .header{text-align:center;margin-bottom:30px;background:linear-gradient(135deg,#3b82f6,#8b5cf6);color:white;padding:20px;border-radius:8px}
        .logo{font-size:28px;font-weight:bold}
        .badge{background:#10b981;color:white;padding:8px 16px;border-radius:20px;display:inline-block;margin:10px 0}
        .info-box{background:#f0f9ff;padding:20px;border-radius:8px;margin:20px 0;border-left:4px solid #3b82f6}
        .amount{font-size:32px;font-weight:bold;color:#3b82f6;text-align:center;margin:20px 0}
        .footer{text-align:center;margin-top:30px;color:#999;font-size:14px}
      </style></head><body><div class="container"><div class="card">
        <div class="header"><div class="logo">${escapeHtml(companyName)}</div><h2>${t.title}</h2></div>
        <p>${t.greeting}</p><p>${t.body}</p>
        <div class="info-box">
          <h3 style="margin-top:0;color:#3b82f6">📄 ${t.invoiceLabel}</h3>
          <p><strong>${t.invoiceLabel}:</strong> ${escapeHtml(invoiceNumber ?? '')}</p>
          <p><strong>${t.typeLabel}:</strong> ${escapeHtml(quote.quote_type)}</p>
          <p class="amount">€${total.toFixed(2)}</p>
          <p style="font-size:12px;color:#666">Subtotal: €${subtotal.toFixed(2)}${shippingCost > 0 ? ` | Shipping: €${shippingCost.toFixed(2)}` : ''} | Tax (${taxRate}%): €${tax.toFixed(2)}</p>
        </div>
        <div style="text-align:center"><p><strong>${t.payNow}</strong></p></div>
        <div class="footer"><p>${t.footer}</p><p>${escapeHtml(companyEmail)}</p></div>
      </div></div></body></html>`;

      try {
        const emailRes = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${RESEND_API_KEY}` },
          body: JSON.stringify({
            from: `${companyName} <noreply@thuis3d.be>`,
            to: [quote.customer_email],
            subject: t.subject,
            html: emailHtml,
          }),
        });
        const emailData = await emailRes.json();
        if (!emailRes.ok) console.error('[QUOTE APPROVAL] Email failed:', emailData);
      } catch (emailError) {
        console.error('[QUOTE APPROVAL] Email error:', emailError);
      }
    }

    // Notification for customer
    if (quote.user_id && !existingInvoice) {
      const notifMessages: Record<string, { title: string; message: string }> = {
        es: { title: '✅ Cotización Aprobada', message: `Tu cotización ha sido aprobada. Factura ${invoiceNumber} por €${total.toFixed(2)}.` },
        en: { title: '✅ Quote Approved', message: `Your quote has been approved. Invoice ${invoiceNumber} for €${total.toFixed(2)}.` },
        nl: { title: '✅ Offerte Goedgekeurd', message: `Uw offerte is goedgekeurd. Factuur ${invoiceNumber} voor €${total.toFixed(2)}.` }
      };
      const notif = notifMessages[userLang] || notifMessages['en'];

      await supabase.from('notifications').insert({
        user_id: quote.user_id,
        type: 'quote_approved',
        title: notif.title,
        message: notif.message,
        link: `/mis-facturas/${invoiceId}`,
        is_read: false
      });
    }

    // Notify admins
    const { data: adminUsers } = await supabase
      .from('user_roles')
      .select('user_id')
      .in('role', ['admin', 'superadmin']);

    if (adminUsers && adminUsers.length > 0) {
      const orderMsg = orderData ? ` Pedido ${orderData.order_number} generado.` : '';
      const adminNotifications = adminUsers.map(admin => ({
        user_id: admin.user_id,
        type: 'system',
        title: '🤖 Cotización Aprobada',
        message: `Factura ${invoiceNumber} (€${total.toFixed(2)}) para ${quote.customer_name}.${orderMsg}`,
        link: `/admin/facturas`,
        is_read: false
      }));
      await supabase.from('notifications').insert(adminNotifications);
    }

    return new Response(
      JSON.stringify({
        success: true,
        invoice: { id: invoiceId, invoice_number: invoiceNumber, total },
        order: orderData ? { id: orderData.id, order_number: orderData.order_number } : null,
        automations: {
          invoice_created: !existingInvoice,
          order_created: !!orderData && !existingOrder,
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
