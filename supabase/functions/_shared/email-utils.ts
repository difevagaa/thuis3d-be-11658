/**
 * ============================================================================
 * SHARED EMAIL UTILITIES FOR EDGE FUNCTIONS
 * ============================================================================
 * 
 * Common utilities used across all email edge functions to avoid code duplication.
 * Import this in your edge functions to use shared functionality.
 * 
 * Usage in edge function:
 * ```typescript
 * import { corsHeaders, escapeHtml, getLangFromEmail } from '../_shared/email-utils.ts';
 * ```
 * ============================================================================
 */

/**
 * CORS headers for all edge functions
 * Allows cross-origin requests from any origin
 */
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Escapes HTML special characters to prevent XSS attacks
 * Use this for ALL user-generated content in emails
 * 
 * @param text - Text to escape
 * @returns HTML-safe text
 */
export function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

/**
 * Gets the language preference from user email or defaults to Spanish
 * 
 * @param email - User email address
 * @param userLanguage - Optional explicit language preference
 * @returns Language code: 'es', 'en', or 'nl'
 */
export function getLangFromEmail(email: string, userLanguage?: string | null): string {
  if (userLanguage) {
    const lang = userLanguage.toLowerCase();
    if (['es', 'en', 'nl'].includes(lang)) {
      return lang;
    }
  }
  
  // Default to Spanish
  return 'es';
}

/**
 * Formats currency amount with proper symbol and locale
 * 
 * @param amount - Amount to format
 * @param currency - Currency code (default: EUR)
 * @param lang - Language for formatting
 * @returns Formatted currency string
 */
export function formatCurrency(amount: number, currency: string = 'EUR', lang: string = 'es'): string {
  const symbol = currency === 'EUR' ? '€' : currency;
  return `${symbol}${amount.toFixed(2)}`;
}

/**
 * Formats date according to language locale
 * 
 * @param date - Date to format
 * @param lang - Language for formatting
 * @returns Formatted date string
 */
export function formatDate(date: Date | string, lang: string = 'es'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  
  const locales: Record<string, string> = {
    'es': 'es-ES',
    'en': 'en-GB',
    'nl': 'nl-NL'
  };
  
  return d.toLocaleDateString(locales[lang] || 'es-ES', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });
}

/**
 * Common translations used across email templates
 */
export const emailTranslations = {
  orderConfirmation: {
    es: 'Confirmación de Pedido',
    en: 'Order Confirmation',
    nl: 'Bestelbevestiging'
  },
  invoice: {
    es: 'Factura',
    en: 'Invoice',
    nl: 'Factuur'
  },
  quote: {
    es: 'Cotización',
    en: 'Quote',
    nl: 'Offerte'
  },
  total: {
    es: 'Total',
    en: 'Total',
    nl: 'Totaal'
  },
  subtotal: {
    es: 'Subtotal',
    en: 'Subtotal',
    nl: 'Subtotaal'
  },
  tax: {
    es: 'IVA',
    en: 'VAT',
    nl: 'BTW'
  },
  shipping: {
    es: 'Envío',
    en: 'Shipping',
    nl: 'Verzending'
  },
  viewDetails: {
    es: 'Ver Detalles',
    en: 'View Details',
    nl: 'Bekijk Details'
  },
  thankYou: {
    es: 'Gracias',
    en: 'Thank you',
    nl: 'Dank u'
  },
  questions: {
    es: 'Si tienes alguna pregunta, no dudes en contactarnos.',
    en: 'If you have any questions, please contact us.',
    nl: 'Als u vragen heeft, neem dan contact met ons op.'
  }
};

/**
 * Gets translated text for a key
 * 
 * @param key - Translation key (from emailTranslations object)
 * @param lang - Language code
 * @returns Translated text
 */
export function t(key: keyof typeof emailTranslations, lang: string = 'es'): string {
  const translation = emailTranslations[key];
  if (!translation) return key;
  return translation[lang as keyof typeof translation] || translation.es;
}

/**
 * Common email styles
 * Include this in the <style> tag of email templates
 */
export const emailStyles = `
  body { 
    font-family: Arial, sans-serif; 
    line-height: 1.6; 
    color: #333; 
    margin: 0;
    padding: 0;
  }
  .container { 
    max-width: 600px; 
    margin: 0 auto; 
    padding: 20px; 
    background: #f9f9f9; 
  }
  .card { 
    background: white; 
    border-radius: 8px; 
    padding: 30px; 
    box-shadow: 0 2px 4px rgba(0,0,0,0.1); 
  }
  .header { 
    text-align: center; 
    margin-bottom: 30px; 
    background: linear-gradient(135deg, #3b82f6, #8b5cf6); 
    color: white; 
    padding: 20px; 
    border-radius: 8px; 
  }
  .logo { 
    font-size: 28px; 
    font-weight: bold; 
  }
  .badge { 
    background: #10b981; 
    color: white; 
    padding: 8px 16px; 
    border-radius: 20px; 
    display: inline-block; 
    margin: 10px 0; 
  }
  .info-box { 
    background: #f0f9ff; 
    padding: 20px; 
    border-radius: 8px; 
    margin: 20px 0; 
    border-left: 4px solid #3b82f6; 
  }
  .amount { 
    font-size: 32px; 
    font-weight: bold; 
    color: #3b82f6; 
    text-align: center; 
    margin: 20px 0; 
  }
  .button { 
    display: inline-block; 
    background: #3b82f6; 
    color: white !important; 
    padding: 12px 30px; 
    text-decoration: none; 
    border-radius: 6px; 
    margin: 20px 0; 
    font-weight: bold;
  }
  .button:hover {
    background: #2563eb;
  }
  .footer { 
    text-align: center; 
    margin-top: 30px; 
    color: #999; 
    font-size: 14px; 
  }
  table {
    width: 100%;
    border-collapse: collapse;
    margin: 20px 0;
  }
  th, td {
    padding: 12px;
    text-align: left;
    border-bottom: 1px solid #ddd;
  }
  th {
    background-color: #f0f9ff;
    font-weight: bold;
    color: #3b82f6;
  }
  .text-right {
    text-align: right;
  }
  .text-center {
    text-align: center;
  }
  .alert {
    background: #fef3c7;
    border-left: 4px solid #f59e0b;
    padding: 15px;
    margin: 20px 0;
    border-radius: 4px;
  }
  .success {
    background: #d1fae5;
    border-left: 4px solid #10b981;
  }
`;

/**
 * Creates a standard email header
 * 
 * @param companyName - Company name to display
 * @param title - Email title
 * @param subtitle - Optional subtitle
 * @returns HTML string for email header
 */
export function createEmailHeader(
  companyName: string,
  title: string,
  subtitle?: string
): string {
  const escapedCompanyName = escapeHtml(companyName);
  const escapedTitle = escapeHtml(title);
  const escapedSubtitle = subtitle ? escapeHtml(subtitle) : '';
  
  return `
    <div class="header">
      <div class="logo">${escapedCompanyName}</div>
      <h2>${escapedTitle}</h2>
      ${escapedSubtitle ? `<div class="badge">${escapedSubtitle}</div>` : ''}
    </div>
  `;
}

/**
 * Creates a standard email footer
 * 
 * @param companyName - Company name
 * @param contactEmail - Contact email
 * @param lang - Language for footer text
 * @returns HTML string for email footer
 */
export function createEmailFooter(
  companyName: string,
  contactEmail: string,
  lang: string = 'es'
): string {
  const escapedCompanyName = escapeHtml(companyName);
  const escapedEmail = escapeHtml(contactEmail);
  
  const footerText = {
    es: `Este es un correo automático de ${escapedCompanyName}`,
    en: `This is an automated email from ${escapedCompanyName}`,
    nl: `Dit is een geautomatiseerde e-mail van ${escapedCompanyName}`
  };
  
  const contactText = {
    es: 'Contacto',
    en: 'Contact',
    nl: 'Contact'
  };
  
  return `
    <div class="footer">
      <p>${footerText[lang as keyof typeof footerText] || footerText.es}</p>
      <p>${contactText[lang as keyof typeof contactText]}: ${escapedEmail}</p>
    </div>
  `;
}

/**
 * Wraps email content in standard HTML structure
 * 
 * @param content - Email body HTML
 * @param title - Email title (for browser tab)
 * @returns Complete HTML document string
 */
export function wrapEmailContent(content: string, title: string = 'Email'): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${escapeHtml(title)}</title>
        <style>
          ${emailStyles}
        </style>
      </head>
      <body>
        <div class="container">
          <div class="card">
            ${content}
          </div>
        </div>
      </body>
    </html>
  `;
}

/**
 * Error response helper
 */
export function errorResponse(message: string, status: number = 500) {
  return new Response(
    JSON.stringify({ error: message }),
    { 
      status, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    }
  );
}

/**
 * Success response helper
 */
export function successResponse(data: Record<string, any>) {
  return new Response(
    JSON.stringify(data),
    { 
      status: 200, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    }
  );
}
