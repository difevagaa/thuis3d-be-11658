/**
 * Visual Email Template Editor with Variable Insertion
 * Allows non-technical users to create email templates without knowing HTML
 */

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Plus, User, Mail, Phone, MapPin, ShoppingCart, Receipt, 
  Gift, Calendar, Hash, Building, CreditCard, Package,
  FileText, Link, Image, Type, Bold, Italic, List,
  AlignLeft, AlignCenter, AlignRight, Heading1, Heading2,
  Undo, Redo, Eye, Code, Palette, Save
} from "lucide-react";

interface EmailTemplateVisualEditorProps {
  initialContent?: string;
  initialSubject?: string;
  onSave?: (content: string, subject: string) => void;
  onPreview?: (content: string) => void;
}

// Available variables for email templates
const TEMPLATE_VARIABLES = [
  // User/Customer variables
  { category: "Usuario", variables: [
    { key: "{{customer_name}}", label: "Nombre del cliente", icon: User, description: "Nombre completo del cliente" },
    { key: "{{customer_first_name}}", label: "Primer nombre", icon: User, description: "Solo el primer nombre" },
    { key: "{{customer_email}}", label: "Email", icon: Mail, description: "Correo electrónico" },
    { key: "{{customer_phone}}", label: "Teléfono", icon: Phone, description: "Número de teléfono" },
    { key: "{{customer_address}}", label: "Dirección", icon: MapPin, description: "Dirección de envío" },
    { key: "{{customer_city}}", label: "Ciudad", icon: Building, description: "Ciudad" },
    { key: "{{customer_country}}", label: "País", icon: MapPin, description: "País" },
    { key: "{{customer_postal_code}}", label: "Código postal", icon: Hash, description: "Código postal" },
  ]},
  // Order variables
  { category: "Pedido", variables: [
    { key: "{{order_number}}", label: "Número de pedido", icon: Hash, description: "ID único del pedido" },
    { key: "{{order_date}}", label: "Fecha del pedido", icon: Calendar, description: "Fecha de creación" },
    { key: "{{order_total}}", label: "Total del pedido", icon: CreditCard, description: "Monto total" },
    { key: "{{order_subtotal}}", label: "Subtotal", icon: CreditCard, description: "Subtotal sin IVA" },
    { key: "{{order_tax}}", label: "IVA", icon: Receipt, description: "Impuesto aplicado" },
    { key: "{{order_shipping}}", label: "Costo de envío", icon: Package, description: "Gastos de envío" },
    { key: "{{order_status}}", label: "Estado del pedido", icon: FileText, description: "Estado actual" },
    { key: "{{order_items}}", label: "Lista de productos", icon: ShoppingCart, description: "Productos del pedido" },
    { key: "{{payment_method}}", label: "Método de pago", icon: CreditCard, description: "Forma de pago" },
    { key: "{{tracking_number}}", label: "Número de seguimiento", icon: Package, description: "Tracking de envío" },
  ]},
  // Invoice variables
  { category: "Factura", variables: [
    { key: "{{invoice_number}}", label: "Número de factura", icon: Receipt, description: "ID de la factura" },
    { key: "{{invoice_date}}", label: "Fecha de factura", icon: Calendar, description: "Fecha de emisión" },
    { key: "{{invoice_due_date}}", label: "Fecha de vencimiento", icon: Calendar, description: "Fecha límite de pago" },
    { key: "{{invoice_total}}", label: "Total factura", icon: CreditCard, description: "Monto total a pagar" },
    { key: "{{invoice_link}}", label: "Enlace a factura", icon: Link, description: "URL para ver factura" },
  ]},
  // Quote variables
  { category: "Cotización", variables: [
    { key: "{{quote_number}}", label: "Número de cotización", icon: FileText, description: "ID de la cotización" },
    { key: "{{quote_date}}", label: "Fecha de cotización", icon: Calendar, description: "Fecha de creación" },
    { key: "{{quote_total}}", label: "Total cotización", icon: CreditCard, description: "Monto cotizado" },
    { key: "{{quote_status}}", label: "Estado cotización", icon: FileText, description: "Estado actual" },
    { key: "{{quote_valid_until}}", label: "Válido hasta", icon: Calendar, description: "Fecha de validez" },
  ]},
  // Gift Card variables
  { category: "Tarjeta de Regalo", variables: [
    { key: "{{gift_card_code}}", label: "Código de tarjeta", icon: Gift, description: "Código único" },
    { key: "{{gift_card_amount}}", label: "Monto de tarjeta", icon: CreditCard, description: "Valor de la tarjeta" },
    { key: "{{gift_card_balance}}", label: "Saldo disponible", icon: CreditCard, description: "Saldo restante" },
    { key: "{{gift_card_expires}}", label: "Fecha expiración", icon: Calendar, description: "Cuándo expira" },
    { key: "{{gift_card_sender}}", label: "Remitente", icon: User, description: "Quien envía" },
    { key: "{{gift_card_message}}", label: "Mensaje personal", icon: FileText, description: "Mensaje del remitente" },
  ]},
  // Store variables
  { category: "Tienda", variables: [
    { key: "{{store_name}}", label: "Nombre de la tienda", icon: Building, description: "Nombre del negocio" },
    { key: "{{store_email}}", label: "Email de la tienda", icon: Mail, description: "Email de contacto" },
    { key: "{{store_phone}}", label: "Teléfono tienda", icon: Phone, description: "Teléfono de contacto" },
    { key: "{{store_address}}", label: "Dirección tienda", icon: MapPin, description: "Dirección física" },
    { key: "{{store_website}}", label: "Sitio web", icon: Link, description: "URL del sitio" },
    { key: "{{current_year}}", label: "Año actual", icon: Calendar, description: "Año en curso" },
  ]},
  // Links
  { category: "Enlaces", variables: [
    { key: "{{account_link}}", label: "Mi cuenta", icon: Link, description: "Enlace a la cuenta" },
    { key: "{{orders_link}}", label: "Mis pedidos", icon: Link, description: "Enlace a pedidos" },
    { key: "{{unsubscribe_link}}", label: "Desuscribirse", icon: Link, description: "Enlace para desuscribirse" },
    { key: "{{reset_password_link}}", label: "Restablecer contraseña", icon: Link, description: "Enlace de recuperación" },
  ]},
];

export default function EmailTemplateVisualEditor({ 
  initialContent = "", 
  initialSubject = "",
  onSave,
  onPreview 
}: EmailTemplateVisualEditorProps) {
  const [subject, setSubject] = useState(initialSubject);
  const [content, setContent] = useState(initialContent);
  const [activeTab, setActiveTab] = useState("visual");
  const [selectedCategory, setSelectedCategory] = useState<string>("Usuario");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const subjectRef = useRef<HTMLInputElement>(null);
  const [insertTarget, setInsertTarget] = useState<"subject" | "content">("content");

  // Insert variable at cursor position
  const insertVariable = (variable: string) => {
    if (insertTarget === "subject") {
      const input = subjectRef.current;
      if (input) {
        const start = input.selectionStart || 0;
        const end = input.selectionEnd || 0;
        const newValue = subject.substring(0, start) + variable + subject.substring(end);
        setSubject(newValue);
        // Set cursor after inserted variable
        setTimeout(() => {
          input.focus();
          input.setSelectionRange(start + variable.length, start + variable.length);
        }, 0);
      }
    } else {
      if (activeTab === "visual") {
        // For visual mode, append to content
        setContent(prev => prev + variable);
      } else {
        // For code mode, insert at cursor
        const textarea = textareaRef.current;
        if (textarea) {
          const start = textarea.selectionStart || 0;
          const end = textarea.selectionEnd || 0;
          const newValue = content.substring(0, start) + variable + content.substring(end);
          setContent(newValue);
          setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(start + variable.length, start + variable.length);
          }, 0);
        }
      }
    }
  };

  // Format text (for visual editor)
  const formatText = (format: string) => {
    let wrapper = "";
    switch (format) {
      case "bold":
        wrapper = "<strong>Texto en negrita</strong>";
        break;
      case "italic":
        wrapper = "<em>Texto en cursiva</em>";
        break;
      case "h1":
        wrapper = "<h1 style=\"font-size: 24px; font-weight: bold; margin-bottom: 16px;\">Título Principal</h1>";
        break;
      case "h2":
        wrapper = "<h2 style=\"font-size: 20px; font-weight: bold; margin-bottom: 12px;\">Subtítulo</h2>";
        break;
      case "list":
        wrapper = "<ul style=\"margin-left: 20px;\"><li>Elemento 1</li><li>Elemento 2</li></ul>";
        break;
      case "link":
        wrapper = "<a href=\"#\" style=\"color: #2563eb; text-decoration: underline;\">Enlace</a>";
        break;
      case "button":
        wrapper = "<a href=\"#\" style=\"display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold;\">Botón</a>";
        break;
      case "divider":
        wrapper = "<hr style=\"border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;\" />";
        break;
      case "paragraph":
        wrapper = "<p style=\"margin-bottom: 16px;\">Escribe tu párrafo aquí...</p>";
        break;
    }
    setContent(prev => prev + wrapper);
  };

  // Generate basic HTML template
  const generateBaseTemplate = () => {
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
    .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
    .header { background-color: #2563eb; color: white; padding: 20px; text-align: center; }
    .content { padding: 30px; }
    .footer { background-color: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #64748b; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>{{store_name}}</h1>
    </div>
    <div class="content">
      ${content || "<p>Hola {{customer_name}},</p><p>Escribe tu mensaje aquí...</p>"}
    </div>
    <div class="footer">
      <p>© {{current_year}} {{store_name}}. Todos los derechos reservados.</p>
      <p><a href="{{unsubscribe_link}}">Desuscribirse</a></p>
    </div>
  </div>
</body>
</html>`;
  };

  // Preview HTML
  const previewHtml = () => {
    const html = generateBaseTemplate();
    const previewWindow = window.open("", "_blank");
    if (previewWindow) {
      previewWindow.document.write(html);
      previewWindow.document.close();
    }
  };

  const currentCategory = TEMPLATE_VARIABLES.find(c => c.category === selectedCategory);

  return (
    <div className="space-y-4">
      {/* Subject Line */}
      <div className="space-y-2">
        <Label htmlFor="email-subject" className="flex items-center gap-2">
          <Mail className="h-4 w-4" />
          Asunto del Email
        </Label>
        <div className="flex gap-2">
          <Input
            ref={subjectRef}
            id="email-subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Ej: Hola {{customer_name}}, tu pedido {{order_number}} está listo"
            onFocus={() => setInsertTarget("subject")}
            className="flex-1"
          />
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="icon" title="Insertar variable en asunto">
                <Plus className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="end">
              <div className="space-y-2">
                <p className="text-sm font-medium">Insertar variable en asunto</p>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TEMPLATE_VARIABLES.map(cat => (
                      <SelectItem key={cat.category} value={cat.category}>{cat.category}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <ScrollArea className="h-48">
                  <div className="space-y-1">
                    {currentCategory?.variables.map(v => (
                      <Button
                        key={v.key}
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start text-left"
                        onClick={() => {
                          setInsertTarget("subject");
                          insertVariable(v.key);
                        }}
                      >
                        <v.icon className="h-4 w-4 mr-2 text-muted-foreground" />
                        <div className="flex-1">
                          <p className="font-medium">{v.label}</p>
                          <p className="text-xs text-muted-foreground">{v.key}</p>
                        </div>
                      </Button>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <Separator />

      {/* Editor Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="visual" className="gap-2">
              <Type className="h-4 w-4" />
              Editor Visual
            </TabsTrigger>
            <TabsTrigger value="code" className="gap-2">
              <Code className="h-4 w-4" />
              Código HTML
            </TabsTrigger>
          </TabsList>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={previewHtml}>
              <Eye className="h-4 w-4 mr-2" />
              Vista Previa
            </Button>
            {onSave && (
              <Button size="sm" onClick={() => onSave(generateBaseTemplate(), subject)}>
                <Save className="h-4 w-4 mr-2" />
                Guardar
              </Button>
            )}
          </div>
        </div>

        <TabsContent value="visual" className="space-y-4">
          {/* Formatting Toolbar */}
          <Card>
            <CardContent className="py-2">
              <div className="flex flex-wrap gap-1">
                <Button variant="ghost" size="sm" onClick={() => formatText("h1")} title="Título principal">
                  <Heading1 className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => formatText("h2")} title="Subtítulo">
                  <Heading2 className="h-4 w-4" />
                </Button>
                <Separator orientation="vertical" className="h-6" />
                <Button variant="ghost" size="sm" onClick={() => formatText("bold")} title="Negrita">
                  <Bold className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => formatText("italic")} title="Cursiva">
                  <Italic className="h-4 w-4" />
                </Button>
                <Separator orientation="vertical" className="h-6" />
                <Button variant="ghost" size="sm" onClick={() => formatText("paragraph")} title="Párrafo">
                  <AlignLeft className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => formatText("list")} title="Lista">
                  <List className="h-4 w-4" />
                </Button>
                <Separator orientation="vertical" className="h-6" />
                <Button variant="ghost" size="sm" onClick={() => formatText("link")} title="Enlace">
                  <Link className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => formatText("button")} title="Botón">
                  <CreditCard className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => formatText("divider")} title="Separador">
                  <Separator className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Content Area */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-base">Contenido del Email</CardTitle>
                  <CardDescription>Escribe tu mensaje y usa el panel derecho para insertar variables</CardDescription>
                </CardHeader>
                <CardContent>
                  <Textarea
                    ref={textareaRef}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    onFocus={() => setInsertTarget("content")}
                    placeholder="Escribe tu mensaje aquí...

Ejemplo:
Hola {{customer_name}},

Gracias por tu pedido #{{order_number}}.

Tu pedido ha sido confirmado y está siendo procesado.

Saludos,
{{store_name}}"
                    className="min-h-[400px] font-sans"
                  />
                </CardContent>
              </Card>
            </div>

            {/* Variables Panel */}
            <div>
              <Card className="sticky top-4">
                <CardHeader className="py-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Insertar Variable
                  </CardTitle>
                  <CardDescription>Haz clic para agregar al contenido</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TEMPLATE_VARIABLES.map(cat => (
                        <SelectItem key={cat.category} value={cat.category}>{cat.category}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  <ScrollArea className="h-[350px]">
                    <div className="space-y-1">
                      {currentCategory?.variables.map(v => (
                        <Button
                          key={v.key}
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start text-left h-auto py-2"
                          onClick={() => {
                            setInsertTarget("content");
                            insertVariable(v.key);
                          }}
                        >
                          <v.icon className="h-4 w-4 mr-2 text-primary shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{v.label}</p>
                            <p className="text-xs text-muted-foreground truncate">{v.description}</p>
                          </div>
                        </Button>
                      ))}
                    </div>
                  </ScrollArea>

                  <Separator />
                  
                  <div className="text-xs text-muted-foreground space-y-1">
                    <p className="font-medium">💡 Consejo:</p>
                    <p>Las variables se reemplazan automáticamente con los datos reales cuando se envía el email.</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="code" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* HTML Code Area */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-base">Código HTML</CardTitle>
                  <CardDescription>Edita directamente el código HTML de la plantilla</CardDescription>
                </CardHeader>
                <CardContent>
                  <Textarea
                    ref={textareaRef}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    onFocus={() => setInsertTarget("content")}
                    placeholder="<p>Hola {{customer_name}},</p>
<p>Gracias por tu pedido.</p>"
                    className="min-h-[400px] font-mono text-sm"
                  />
                </CardContent>
              </Card>
            </div>

            {/* Variables Panel for Code Mode */}
            <div>
              <Card className="sticky top-4">
                <CardHeader className="py-3">
                  <CardTitle className="text-base">Variables Disponibles</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TEMPLATE_VARIABLES.map(cat => (
                        <SelectItem key={cat.category} value={cat.category}>{cat.category}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  <ScrollArea className="h-[350px]">
                    <div className="space-y-1">
                      {currentCategory?.variables.map(v => (
                        <Button
                          key={v.key}
                          variant="outline"
                          size="sm"
                          className="w-full justify-start text-left h-auto py-2"
                          onClick={() => {
                            setInsertTarget("content");
                            insertVariable(v.key);
                          }}
                        >
                          <code className="text-xs bg-muted px-1 rounded mr-2">{v.key}</code>
                          <span className="text-xs text-muted-foreground truncate">{v.label}</span>
                        </Button>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Variable Reference */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-base">Referencia de Variables</CardTitle>
          <CardDescription>Todas las variables disponibles organizadas por categoría</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {TEMPLATE_VARIABLES.map(cat => (
              <div key={cat.category}>
                <h4 className="font-medium mb-2 text-sm">{cat.category}</h4>
                <div className="flex flex-wrap gap-1">
                  {cat.variables.map(v => (
                    <Badge 
                      key={v.key} 
                      variant="secondary" 
                      className="cursor-pointer text-xs"
                      onClick={() => insertVariable(v.key)}
                    >
                      {v.label}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
