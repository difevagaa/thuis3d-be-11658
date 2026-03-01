// Multilingual email templates helper
// This provides email content in ES/EN/NL based on user's preferred language

export type SupportedLanguage = 'es' | 'en' | 'nl';

interface EmailContent {
  subject: string;
  greeting: string;
  body: string;
  footer: string;
}

// Order Confirmation Email
export const orderConfirmationEmail = {
  es: {
    subject: '✅ Confirmación de Pedido #{{order_number}}',
    greeting: '¡Gracias por tu pedido{{customer_name}}!',
    thankYou: 'Hemos recibido tu pedido correctamente. A continuación encontrarás los detalles:',
    product: 'Producto',
    quantity: 'Cantidad',
    unitPrice: 'Precio Unit.',
    total: 'Total',
    subtotal: 'Subtotal',
    shipping: 'Envío',
    shippingFree: 'GRATIS',
    tax: 'IVA (21%)',
    discount: 'Descuento',
    totalLabel: 'TOTAL',
    statusInfo: 'Te mantendremos informado sobre el estado de tu pedido. Recibirás una notificación cuando esté listo para envío.',
    footer: 'Este es un correo automático de {{company_name}}',
    contact: 'Si tienes alguna pregunta, contáctanos en {{email}}'
  },
  en: {
    subject: '✅ Order Confirmation #{{order_number}}',
    greeting: 'Thank you for your order{{customer_name}}!',
    thankYou: 'We have received your order successfully. Here are the details:',
    product: 'Product',
    quantity: 'Quantity',
    unitPrice: 'Unit Price',
    total: 'Total',
    subtotal: 'Subtotal',
    shipping: 'Shipping',
    shippingFree: 'FREE',
    tax: 'VAT (21%)',
    discount: 'Discount',
    totalLabel: 'TOTAL',
    statusInfo: 'We will keep you informed about your order status. You will receive a notification when it is ready for shipping.',
    footer: 'This is an automated email from {{company_name}}',
    contact: 'If you have any questions, contact us at {{email}}'
  },
  nl: {
    subject: '✅ Orderbevestiging #{{order_number}}',
    greeting: 'Bedankt voor je bestelling{{customer_name}}!',
    thankYou: 'We hebben je bestelling goed ontvangen. Hier zijn de details:',
    product: 'Product',
    quantity: 'Aantal',
    unitPrice: 'Stukprijs',
    total: 'Totaal',
    subtotal: 'Subtotaal',
    shipping: 'Verzending',
    shippingFree: 'GRATIS',
    tax: 'BTW (21%)',
    discount: 'Korting',
    totalLabel: 'TOTAAL',
    statusInfo: 'We houden je op de hoogte van de status van je bestelling. Je ontvangt een melding wanneer deze klaar is voor verzending.',
    footer: 'Dit is een automatische e-mail van {{company_name}}',
    contact: 'Als je vragen hebt, neem contact met ons op via {{email}}'
  }
};

// Order Status Update Email
export const orderStatusEmail = {
  es: {
    subject: '{{icon}} Actualización de Pedido #{{order_number}}',
    title: 'Actualización de tu Pedido',
    statusChanged: 'Tu pedido <strong>#{{order_number}}</strong> ha sido actualizado:',
    viewOrder: 'Ver Mi Pedido',
    tip: '💡 <strong>Consejo:</strong> Recibirás una notificación cada vez que tu pedido cambie de estado.',
    footer: 'Este es un correo automático de {{company_name}}',
    contact: 'Si tienes alguna pregunta, contáctanos en {{email}}'
  },
  en: {
    subject: '{{icon}} Order Update #{{order_number}}',
    title: 'Your Order Update',
    statusChanged: 'Your order <strong>#{{order_number}}</strong> has been updated:',
    viewOrder: 'View My Order',
    tip: '💡 <strong>Tip:</strong> You will receive a notification every time your order status changes.',
    footer: 'This is an automated email from {{company_name}}',
    contact: 'If you have any questions, contact us at {{email}}'
  },
  nl: {
    subject: '{{icon}} Orderupdate #{{order_number}}',
    title: 'Update van je Bestelling',
    statusChanged: 'Je bestelling <strong>#{{order_number}}</strong> is bijgewerkt:',
    viewOrder: 'Bekijk Mijn Bestelling',
    tip: '💡 <strong>Tip:</strong> Je ontvangt een melding telkens wanneer de status van je bestelling verandert.',
    footer: 'Dit is een automatische e-mail van {{company_name}}',
    contact: 'Als je vragen hebt, neem contact met ons op via {{email}}'
  }
};

// Invoice Email
export const invoiceEmail = {
  es: {
    subject: '📄 Nueva Factura #{{invoice_number}} - {{company_name}}',
    title: 'Nueva Factura Disponible',
    invoiceGenerated: 'Se ha generado una nueva factura{{order_info}}.',
    totalToPay: 'Total a pagar',
    dueDate: 'Fecha de vencimiento',
    viewInvoice: 'Ver Factura y Pagar',
    tip: '💡 <strong>Consejo:</strong> Puedes descargar e imprimir tu factura desde tu cuenta en cualquier momento.',
    footer: 'Este es un correo automático de {{company_name}}',
    contact: 'Si tienes alguna pregunta, contáctanos en {{email}}'
  },
  en: {
    subject: '📄 New Invoice #{{invoice_number}} - {{company_name}}',
    title: 'New Invoice Available',
    invoiceGenerated: 'A new invoice has been generated{{order_info}}.',
    totalToPay: 'Total to pay',
    dueDate: 'Due date',
    viewInvoice: 'View Invoice and Pay',
    tip: '💡 <strong>Tip:</strong> You can download and print your invoice from your account at any time.',
    footer: 'This is an automated email from {{company_name}}',
    contact: 'If you have any questions, contact us at {{email}}'
  },
  nl: {
    subject: '📄 Nieuwe Factuur #{{invoice_number}} - {{company_name}}',
    title: 'Nieuwe Factuur Beschikbaar',
    invoiceGenerated: 'Er is een nieuwe factuur gegenereerd{{order_info}}.',
    totalToPay: 'Te betalen',
    dueDate: 'Vervaldatum',
    viewInvoice: 'Bekijk Factuur en Betaal',
    tip: '💡 <strong>Tip:</strong> Je kunt je factuur op elk moment downloaden en afdrukken vanuit je account.',
    footer: 'Dit is een automatische e-mail van {{company_name}}',
    contact: 'Als je vragen hebt, neem contact met ons op via {{email}}'
  }
};

// Quote Confirmation Email
export const quoteConfirmationEmail = {
  es: {
    subject: '✅ Solicitud de Cotización Recibida - {{company_name}}',
    title: '¡Gracias por tu solicitud de cotización!',
    greeting: 'Hola {{customer_name}},',
    received: 'Hemos recibido tu solicitud de cotización para {{quote_type}}. A continuación encontrarás los detalles:',
    detailsTitle: 'Detalles de la solicitud:',
    responseTime: 'Nuestro equipo revisará tu solicitud y te contactaremos pronto con una cotización detallada. Normalmente respondemos en un plazo de 24-48 horas laborables.',
    questions: '¿Tienes alguna pregunta?',
    questionsAnswer: 'No dudes en contactarnos a través de nuestro sitio web.',
    footer: 'Este es un correo automático de {{company_name}}',
    contact: 'Si tienes preguntas, contáctanos en {{email}}'
  },
  en: {
    subject: '✅ Quote Request Received - {{company_name}}',
    title: 'Thank you for your quote request!',
    greeting: 'Hello {{customer_name}},',
    received: 'We have received your quote request for {{quote_type}}. Here are the details:',
    detailsTitle: 'Request details:',
    responseTime: 'Our team will review your request and contact you soon with a detailed quote. We typically respond within 24-48 business hours.',
    questions: 'Do you have any questions?',
    questionsAnswer: 'Feel free to contact us through our website.',
    footer: 'This is an automated email from {{company_name}}',
    contact: 'If you have questions, contact us at {{email}}'
  },
  nl: {
    subject: '✅ Offerteaanvraag Ontvangen - {{company_name}}',
    title: 'Bedankt voor je offerteaanvraag!',
    greeting: 'Hallo {{customer_name}},',
    received: 'We hebben je offerteaanvraag voor {{quote_type}} ontvangen. Hier zijn de details:',
    detailsTitle: 'Aanvraagdetails:',
    responseTime: 'Ons team zal je aanvraag bekijken en spoedig contact met je opnemen met een gedetailleerde offerte. We reageren doorgaans binnen 24-48 werkuren.',
    questions: 'Heb je vragen?',
    questionsAnswer: 'Neem gerust contact met ons op via onze website.',
    footer: 'Dit is een automatische e-mail van {{company_name}}',
    contact: 'Als je vragen hebt, neem contact met ons op via {{email}}'
  }
};

// Quote Ready Email
export const quoteReadyEmail = {
  es: {
    subject: '✅ Tu Cotización está Lista - Factura {{invoice_number}}',
    badge: '✅ Cotización Lista',
    greeting: '¡Hola {{customer_name}}!',
    ready: 'Tenemos excelentes noticias: tu cotización de <strong>{{quote_type}}</strong> ha sido procesada y está lista.',
    invoiceNumber: '📄 Número de Factura:',
    totalToPay: 'Monto Total a Pagar:',
    vatIncluded: 'IVA incluido',
    paymentInfo: 'Puedes proceder con el pago cuando estés listo. Tu factura está disponible en tu panel de usuario.',
    viewInvoice: '💳 Ver Mi Factura y Pagar',
    paymentMethods: '💡 Métodos de Pago Disponibles:',
    questions: 'Si tienes alguna pregunta sobre tu cotización o factura, no dudes en contactarnos a través de nuestro chat de soporte.',
    footer: 'Este es un correo automático de {{company_name}}'
  },
  en: {
    subject: '✅ Your Quote is Ready - Invoice {{invoice_number}}',
    badge: '✅ Quote Ready',
    greeting: 'Hello {{customer_name}}!',
    ready: 'Great news: your quote for <strong>{{quote_type}}</strong> has been processed and is ready.',
    invoiceNumber: '📄 Invoice Number:',
    totalToPay: 'Total Amount to Pay:',
    vatIncluded: 'VAT included',
    paymentInfo: 'You can proceed with the payment when you are ready. Your invoice is available in your user panel.',
    viewInvoice: '💳 View My Invoice and Pay',
    paymentMethods: '💡 Available Payment Methods:',
    questions: 'If you have any questions about your quote or invoice, feel free to contact us through our support chat.',
    footer: 'This is an automated email from {{company_name}}'
  },
  nl: {
    subject: '✅ Je Offerte is Klaar - Factuur {{invoice_number}}',
    badge: '✅ Offerte Klaar',
    greeting: 'Hallo {{customer_name}}!',
    ready: 'Goed nieuws: je offerte voor <strong>{{quote_type}}</strong> is verwerkt en klaar.',
    invoiceNumber: '📄 Factuurnummer:',
    totalToPay: 'Totaal te Betalen:',
    vatIncluded: 'BTW inbegrepen',
    paymentInfo: 'Je kunt doorgaan met de betaling wanneer je klaar bent. Je factuur is beschikbaar in je gebruikerspaneel.',
    viewInvoice: '💳 Bekijk Mijn Factuur en Betaal',
    paymentMethods: '💡 Beschikbare Betaalmethoden:',
    questions: 'Als je vragen hebt over je offerte of factuur, neem gerust contact met ons op via onze supportchat.',
    footer: 'Dit is een automatische e-mail van {{company_name}}'
  }
};

// Welcome Email
export const welcomeEmail = {
  es: {
    subject: '¡Bienvenido/a a {{company_name}}! 🎉',
    title: '¡Bienvenido/a!',
    greeting: '¡Hola {{customer_name}}! 👋',
    welcome: 'Nos alegra que te hayas unido a nuestra comunidad. Tu cuenta ha sido creada exitosamente.',
    whatCanYouDo: '¿Qué puedes hacer ahora?',
    feature1: 'Explorar nuestro catálogo completo de productos de impresión 3D',
    feature2: 'Realizar pedidos y seguir su estado en tiempo real',
    feature3: 'Solicitar cotizaciones personalizadas para tus proyectos',
    feature4: 'Recibir notificaciones sobre tus pedidos y facturas',
    feature5: 'Acceder a tu historial de compras y facturas',
    startShopping: 'Comenzar a Comprar',
    tip: '💡 <strong>Consejo:</strong> Completa tu perfil en "Mi Cuenta" para una experiencia personalizada.',
    footer: 'Si tienes alguna pregunta, no dudes en contactarnos en {{email}}'
  },
  en: {
    subject: 'Welcome to {{company_name}}! 🎉',
    title: 'Welcome!',
    greeting: 'Hello {{customer_name}}! 👋',
    welcome: 'We are glad you have joined our community. Your account has been created successfully.',
    whatCanYouDo: 'What can you do now?',
    feature1: 'Explore our complete 3D printing product catalog',
    feature2: 'Place orders and track their status in real time',
    feature3: 'Request personalized quotes for your projects',
    feature4: 'Receive notifications about your orders and invoices',
    feature5: 'Access your purchase history and invoices',
    startShopping: 'Start Shopping',
    tip: '💡 <strong>Tip:</strong> Complete your profile in "My Account" for a personalized experience.',
    footer: 'If you have any questions, feel free to contact us at {{email}}'
  },
  nl: {
    subject: 'Welkom bij {{company_name}}! 🎉',
    title: 'Welkom!',
    greeting: 'Hallo {{customer_name}}! 👋',
    welcome: 'We zijn blij dat je lid bent geworden van onze community. Je account is succesvol aangemaakt.',
    whatCanYouDo: 'Wat kun je nu doen?',
    feature1: 'Ontdek onze volledige catalogus van 3D-printproducten',
    feature2: 'Plaats bestellingen en volg de status in realtime',
    feature3: 'Vraag gepersonaliseerde offertes aan voor je projecten',
    feature4: 'Ontvang meldingen over je bestellingen en facturen',
    feature5: 'Toegang tot je aankoopgeschiedenis en facturen',
    startShopping: 'Begin met Winkelen',
    tip: '💡 <strong>Tip:</strong> Vul je profiel in bij "Mijn Account" voor een gepersonaliseerde ervaring.',
    footer: 'Als je vragen hebt, neem gerust contact met ons op via {{email}}'
  }
};

// Gift Card Email
export const giftCardEmail = {
  es: {
    subject: '🎁 ¡Has recibido una Tarjeta Regalo de {{company_name}}!',
    title: '🎁 ¡Has Recibido una Tarjeta Regalo!',
    fromPerson: 'De parte de {{sender_name}}',
    giftCardTitle: 'Tarjeta Regalo',
    notForSale: 'No vendible',
    from: 'De:',
    website: 'www.thuis3d.be • Uso exclusivo tienda online',
    howToUse: '¿Cómo usar tu tarjeta regalo?',
    step1: 'Visita nuestro sitio web: <strong>{{company_name}}</strong>',
    step2: 'Selecciona los productos que desees',
    step3: 'En el carrito, ingresa el código de tu tarjeta regalo',
    step4: '¡El descuento se aplicará automáticamente!',
    important: '📌 Importante:',
    saveEmail: 'Guarda este email en un lugar seguro. Necesitarás el código para usar tu tarjeta regalo.',
    footer: 'Este es un correo automático de {{company_name}}',
    contact: 'Si tienes preguntas, contáctanos en {{email}}'
  },
  en: {
    subject: '🎁 You have received a Gift Card from {{company_name}}!',
    title: '🎁 You Have Received a Gift Card!',
    fromPerson: 'From {{sender_name}}',
    giftCardTitle: 'Gift Card',
    notForSale: 'Not for sale',
    from: 'From:',
    website: 'www.thuis3d.be • Online store use only',
    howToUse: 'How to use your gift card?',
    step1: 'Visit our website: <strong>{{company_name}}</strong>',
    step2: 'Select the products you want',
    step3: 'In the cart, enter your gift card code',
    step4: 'The discount will be applied automatically!',
    important: '📌 Important:',
    saveEmail: 'Save this email in a safe place. You will need the code to use your gift card.',
    footer: 'This is an automated email from {{company_name}}',
    contact: 'If you have questions, contact us at {{email}}'
  },
  nl: {
    subject: '🎁 Je hebt een Cadeaukaart ontvangen van {{company_name}}!',
    title: '🎁 Je Hebt een Cadeaukaart Ontvangen!',
    fromPerson: 'Van {{sender_name}}',
    giftCardTitle: 'Cadeaukaart',
    notForSale: 'Niet te koop',
    from: 'Van:',
    website: 'www.thuis3d.be • Alleen voor online winkelgebruik',
    howToUse: 'Hoe gebruik je je cadeaukaart?',
    step1: 'Bezoek onze website: <strong>{{company_name}}</strong>',
    step2: 'Selecteer de producten die je wilt',
    step3: 'Voer in het winkelmandje je cadeaukaartcode in',
    step4: 'De korting wordt automatisch toegepast!',
    important: '📌 Belangrijk:',
    saveEmail: 'Bewaar deze e-mail op een veilige plaats. Je hebt de code nodig om je cadeaukaart te gebruiken.',
    footer: 'Dit is een automatische e-mail van {{company_name}}',
    contact: 'Als je vragen hebt, neem contact met ons op via {{email}}'
  }
};

// Helper function to get template by language
export function getEmailTemplate<T extends Record<SupportedLanguage, any>>(
  templates: T,
  language: string | null | undefined
): T[SupportedLanguage] {
  const lang = (language?.split('-')[0]?.toLowerCase() || 'en') as SupportedLanguage;
  return templates[lang] || templates['en'];
}

// Status translations
export const statusTranslations: Record<SupportedLanguage, Record<string, string>> = {
  es: {
    'pending': 'Pendiente',
    'processing': 'Procesando',
    'shipped': 'Enviado',
    'delivered': 'Entregado',
    'cancelled': 'Cancelado',
    'paid': 'Pagado',
    'unpaid': 'No pagado'
  },
  en: {
    'pending': 'Pending',
    'processing': 'Processing',
    'shipped': 'Shipped',
    'delivered': 'Delivered',
    'cancelled': 'Cancelled',
    'paid': 'Paid',
    'unpaid': 'Unpaid'
  },
  nl: {
    'pending': 'In afwachting',
    'processing': 'Verwerken',
    'shipped': 'Verzonden',
    'delivered': 'Afgeleverd',
    'cancelled': 'Geannuleerd',
    'paid': 'Betaald',
    'unpaid': 'Niet betaald'
  }
};

// Quote type translations
export const quoteTypeTranslations: Record<SupportedLanguage, Record<string, string>> = {
  es: {
    'file_upload': 'Archivo 3D',
    'service': 'Servicio',
    'default': 'Cotización'
  },
  en: {
    'file_upload': '3D File',
    'service': 'Service',
    'default': 'Quote'
  },
  nl: {
    'file_upload': '3D-bestand',
    'service': 'Dienst',
    'default': 'Offerte'
  }
};

export function translateQuoteType(quoteType: string, language: string): string {
  const lang = (language?.split('-')[0]?.toLowerCase() || 'en') as SupportedLanguage;
  const translations = quoteTypeTranslations[lang] || quoteTypeTranslations['en'];
  return translations[quoteType] || translations['default'];
}

export function translateStatus(status: string, language: string): string {
  const lang = (language?.split('-')[0]?.toLowerCase() || 'en') as SupportedLanguage;
  const translations = statusTranslations[lang] || statusTranslations['en'];
  return translations[status.toLowerCase()] || status;
}
