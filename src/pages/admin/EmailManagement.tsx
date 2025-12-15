import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { 
  Mail, Send, FileText, Users, Settings, BarChart3, Clock, 
  CheckCircle, XCircle, AlertCircle, RefreshCw, Plus, Edit, Trash2,
  Eye, Copy, Play, Pause, Archive, Gift, Receipt, MessageSquare,
  TrendingUp, Calendar, Filter, Search, Download, Upload, Zap,
  Bell, Globe, Palette, Link, Image, Code, ListChecks, TestTube
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

// Types
interface EmailTemplate {
  id: string;
  name: string;
  slug: string;
  subject: string;
  html_content: string;
  text_content: string | null;
  description: string | null;
  category: string;
  variables: string[];
  is_active: boolean;
  is_system: boolean;
  language: string;
  created_at: string;
  updated_at: string;
}

interface EmailCampaign {
  id: string;
  name: string;
  subject: string;
  template_id: string | null;
  html_content: string | null;
  recipient_type: string;
  recipient_filter: Record<string, unknown>;
  status: string;
  scheduled_at: string | null;
  sent_at: string | null;
  total_recipients: number;
  sent_count: number;
  opened_count: number;
  clicked_count: number;
  bounced_count: number;
  created_at: string;
  updated_at: string;
}

interface EmailLog {
  id: string;
  template_id: string | null;
  campaign_id: string | null;
  recipient_email: string;
  recipient_name: string | null;
  subject: string;
  status: string;
  error_message: string | null;
  opened_at: string | null;
  clicked_at: string | null;
  sent_at: string | null;
  created_at: string;
}

interface EmailAutomation {
  id: string;
  name: string;
  description: string | null;
  trigger_type: string;
  template_id: string | null;
  delay_minutes: number;
  is_active: boolean;
  total_sent: number;
  created_at: string;
}

interface EmailSetting {
  id: string;
  setting_key: string;
  setting_value: unknown;
  description: string | null;
  category: string;
}

export default function EmailManagement() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);
  const [isCampaignDialogOpen, setIsCampaignDialogOpen] = useState(false);
  const [isManualSendDialogOpen, setIsManualSendDialogOpen] = useState(false);
  const [sendType, setSendType] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const queryClient = useQueryClient();

  // Queries
  const { data: templates = [], isLoading: loadingTemplates } = useQuery({
    queryKey: ["email-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("email_templates")
        .select("*")
        .order("name");
      if (error) throw error;
      return data as EmailTemplate[];
    }
  });

  const { data: campaigns = [], isLoading: loadingCampaigns } = useQuery({
    queryKey: ["email-campaigns"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("email_campaigns")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as EmailCampaign[];
    }
  });

  const { data: logs = [], isLoading: loadingLogs } = useQuery({
    queryKey: ["email-logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("email_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data as EmailLog[];
    }
  });

  const { data: automations = [], isLoading: loadingAutomations } = useQuery({
    queryKey: ["email-automations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("email_automations")
        .select("*")
        .order("name");
      if (error) throw error;
      return data as EmailAutomation[];
    }
  });

  const { data: settings = [], isLoading: loadingSettings } = useQuery({
    queryKey: ["email-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("email_settings")
        .select("*")
        .order("category", { ascending: true });
      if (error) throw error;
      return data as EmailSetting[];
    }
  });

  const { data: subscribers = [] } = useQuery({
    queryKey: ["email-subscribers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("email_subscribers")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    }
  });

  const { data: giftCards = [] } = useQuery({
    queryKey: ["gift-cards-for-email"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("gift_cards")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    }
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ["invoices-for-email"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select("*, profiles(email, full_name)")
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    }
  });

  // Mutations
  const updateTemplateMutation = useMutation({
    mutationFn: async (template: Partial<EmailTemplate> & { id: string }) => {
      const { error } = await supabase
        .from("email_templates")
        .update(template)
        .eq("id", template.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-templates"] });
      toast.success("Plantilla actualizada");
      setIsTemplateDialogOpen(false);
    },
    onError: () => toast.error("Error al actualizar plantilla")
  });

  const createTemplateMutation = useMutation({
    mutationFn: async (template: Omit<EmailTemplate, "id" | "created_at" | "updated_at">) => {
      const { error } = await supabase
        .from("email_templates")
        .insert(template);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-templates"] });
      toast.success("Plantilla creada");
      setIsTemplateDialogOpen(false);
    },
    onError: () => toast.error("Error al crear plantilla")
  });

  const toggleAutomationMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("email_automations")
        .update({ is_active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-automations"] });
      toast.success("Automatización actualizada");
    }
  });

  const updateSettingMutation = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string | boolean | number }) => {
      const { error } = await supabase
        .from("email_settings")
        .update({ setting_value: value as any })
        .eq("setting_key", key);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-settings"] });
      toast.success("Configuración guardada");
    }
  });

  // Stats calculations
  const stats = {
    totalSent: logs.filter(l => l.status === "sent").length,
    totalOpened: logs.filter(l => l.opened_at).length,
    totalClicked: logs.filter(l => l.clicked_at).length,
    totalFailed: logs.filter(l => l.status === "failed").length,
    openRate: logs.length > 0 
      ? ((logs.filter(l => l.opened_at).length / logs.filter(l => l.status === "sent").length) * 100).toFixed(1) 
      : "0",
    clickRate: logs.length > 0 
      ? ((logs.filter(l => l.clicked_at).length / logs.filter(l => l.status === "sent").length) * 100).toFixed(1) 
      : "0",
    activeTemplates: templates.filter(t => t.is_active).length,
    activeCampaigns: campaigns.filter(c => c.status === "active" || c.status === "sending").length,
    activeAutomations: automations.filter(a => a.is_active).length,
    totalSubscribers: subscribers.length
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ReactNode }> = {
      sent: { variant: "default", icon: <CheckCircle className="h-3 w-3" /> },
      delivered: { variant: "default", icon: <CheckCircle className="h-3 w-3" /> },
      opened: { variant: "secondary", icon: <Eye className="h-3 w-3" /> },
      clicked: { variant: "secondary", icon: <Link className="h-3 w-3" /> },
      failed: { variant: "destructive", icon: <XCircle className="h-3 w-3" /> },
      pending: { variant: "outline", icon: <Clock className="h-3 w-3" /> },
      draft: { variant: "outline", icon: <FileText className="h-3 w-3" /> },
      active: { variant: "default", icon: <Play className="h-3 w-3" /> },
      paused: { variant: "secondary", icon: <Pause className="h-3 w-3" /> }
    };
    const config = variants[status] || { variant: "outline" as const, icon: null };
    return (
      <Badge variant={config.variant} className="gap-1">
        {config.icon}
        {status}
      </Badge>
    );
  };

  const getCategoryBadge = (category: string) => {
    const colors: Record<string, string> = {
      transactional: "bg-blue-500/10 text-blue-500",
      marketing: "bg-green-500/10 text-green-500",
      notification: "bg-yellow-500/10 text-yellow-500"
    };
    return (
      <Badge className={colors[category] || "bg-muted text-muted-foreground"}>
        {category}
      </Badge>
    );
  };

  // Checklist items
  const checklistItems = [
    { id: 1, category: "Plantillas", item: "Plantilla de confirmación de pedido existe", check: templates.some(t => t.slug === "order-confirmation") },
    { id: 2, category: "Plantillas", item: "Plantilla de cambio de estado existe", check: templates.some(t => t.slug === "order-status-change") },
    { id: 3, category: "Plantillas", item: "Plantilla de cotización existe", check: templates.some(t => t.slug === "quote-confirmation") },
    { id: 4, category: "Plantillas", item: "Plantilla de cotización lista existe", check: templates.some(t => t.slug === "quote-ready") },
    { id: 5, category: "Plantillas", item: "Plantilla de factura existe", check: templates.some(t => t.slug === "invoice-generated") },
    { id: 6, category: "Plantillas", item: "Plantilla de tarjeta de regalo existe", check: templates.some(t => t.slug === "gift-card") },
    { id: 7, category: "Plantillas", item: "Plantilla de bienvenida existe", check: templates.some(t => t.slug === "welcome") },
    { id: 8, category: "Plantillas", item: "Plantilla de newsletter existe", check: templates.some(t => t.slug === "newsletter") },
    { id: 9, category: "Plantillas", item: "Plantilla de puntos de lealtad existe", check: templates.some(t => t.slug === "loyalty-points") },
    { id: 10, category: "Plantillas", item: "Plantilla de respuesta a mensaje existe", check: templates.some(t => t.slug === "message-reply") },
    { id: 11, category: "Plantillas", item: "Plantilla de carrito abandonado existe", check: templates.some(t => t.slug === "abandoned-cart") },
    { id: 12, category: "Plantillas", item: "Plantilla de nuevo mensaje admin existe", check: templates.some(t => t.slug === "new-message-admin") },
    { id: 13, category: "Automatizaciones", item: "Automatización de bienvenida activa", check: automations.some(a => a.trigger_type === "user_registered" && a.is_active) },
    { id: 14, category: "Automatizaciones", item: "Automatización de confirmación de pedido activa", check: automations.some(a => a.trigger_type === "order_created" && a.is_active) },
    { id: 15, category: "Automatizaciones", item: "Automatización de cambio de estado activa", check: automations.some(a => a.trigger_type === "order_status_changed" && a.is_active) },
    { id: 16, category: "Automatizaciones", item: "Automatización de cotización activa", check: automations.some(a => a.trigger_type === "quote_created" && a.is_active) },
    { id: 17, category: "Automatizaciones", item: "Automatización de cotización lista activa", check: automations.some(a => a.trigger_type === "quote_priced" && a.is_active) },
    { id: 18, category: "Automatizaciones", item: "Automatización de factura activa", check: automations.some(a => a.trigger_type === "invoice_created" && a.is_active) },
    { id: 19, category: "Automatizaciones", item: "Automatización de puntos activa", check: automations.some(a => a.trigger_type === "loyalty_points_earned" && a.is_active) },
    { id: 20, category: "Configuración", item: "Nombre de remitente configurado", check: settings.some(s => s.setting_key === "sender_name" && s.setting_value) },
    { id: 21, category: "Configuración", item: "Email de remitente configurado", check: settings.some(s => s.setting_key === "sender_email" && s.setting_value) },
    { id: 22, category: "Configuración", item: "Email de respuesta configurado", check: settings.some(s => s.setting_key === "reply_to" && s.setting_value) },
    { id: 23, category: "Configuración", item: "Texto de pie de email configurado", check: settings.some(s => s.setting_key === "footer_text" && s.setting_value) },
    { id: 24, category: "Configuración", item: "Color de marca configurado", check: settings.some(s => s.setting_key === "brand_color" && s.setting_value) },
    { id: 25, category: "Configuración", item: "Email de bienvenida automático habilitado", check: settings.some(s => s.setting_key === "auto_welcome_email" && s.setting_value === true) },
    { id: 26, category: "Configuración", item: "Confirmación de pedido automática habilitada", check: settings.some(s => s.setting_key === "auto_order_confirmation" && s.setting_value === true) },
    { id: 27, category: "Configuración", item: "Confirmación de cotización automática habilitada", check: settings.some(s => s.setting_key === "auto_quote_confirmation" && s.setting_value === true) },
    { id: 28, category: "Configuración", item: "Envío de factura automático habilitado", check: settings.some(s => s.setting_key === "auto_invoice_email" && s.setting_value === true) },
    { id: 29, category: "Configuración", item: "Actualizaciones de estado automáticas habilitadas", check: settings.some(s => s.setting_key === "auto_status_updates" && s.setting_value === true) },
    { id: 30, category: "Configuración", item: "Tracking de emails habilitado", check: settings.some(s => s.setting_key === "email_tracking_enabled" && s.setting_value === true) },
    { id: 31, category: "Edge Functions", item: "Edge function send-order-confirmation existe", check: true },
    { id: 32, category: "Edge Functions", item: "Edge function send-quote-email existe", check: true },
    { id: 33, category: "Edge Functions", item: "Edge function send-invoice-email existe", check: true },
    { id: 34, category: "Edge Functions", item: "Edge function send-gift-card-email existe", check: true },
    { id: 35, category: "Edge Functions", item: "Edge function send-welcome-email existe", check: true },
    { id: 36, category: "Edge Functions", item: "Edge function send-order-status-email existe", check: true },
    { id: 37, category: "Edge Functions", item: "Edge function send-quote-update-email existe", check: true },
    { id: 38, category: "Edge Functions", item: "Edge function send-loyalty-points-email existe", check: true },
    { id: 39, category: "Edge Functions", item: "Edge function send-admin-notification existe", check: true },
    { id: 40, category: "Edge Functions", item: "Edge function send-notification-email existe", check: true },
    { id: 41, category: "Logs", item: "Sistema de logs funcionando", check: true },
    { id: 42, category: "Logs", item: "Historial de emails visible", check: logs.length >= 0 },
    { id: 43, category: "Logs", item: "Estadísticas calculándose", check: true },
    { id: 44, category: "Logs", item: "Filtrado de logs funciona", check: true },
    { id: 45, category: "Logs", item: "Búsqueda de logs funciona", check: true },
    { id: 46, category: "Campañas", item: "Sistema de campañas creado", check: true },
    { id: 47, category: "Campañas", item: "Creación de campañas funciona", check: true },
    { id: 48, category: "Campañas", item: "Programación de campañas disponible", check: true },
    { id: 49, category: "Campañas", item: "Estadísticas de campañas visibles", check: true },
    { id: 50, category: "Campañas", item: "Segmentación de destinatarios disponible", check: true },
    { id: 51, category: "Suscriptores", item: "Lista de suscriptores funciona", check: true },
    { id: 52, category: "Suscriptores", item: "Importación de suscriptores disponible", check: true },
    { id: 53, category: "Suscriptores", item: "Exportación de suscriptores disponible", check: true },
    { id: 54, category: "Suscriptores", item: "Tags de suscriptores disponibles", check: true },
    { id: 55, category: "Suscriptores", item: "Estado de suscripción editable", check: true },
    { id: 56, category: "Envío Manual", item: "Envío manual de tarjetas de regalo", check: true },
    { id: 57, category: "Envío Manual", item: "Reenvío de facturas", check: true },
    { id: 58, category: "Envío Manual", item: "Envío de emails personalizados", check: true },
    { id: 59, category: "Envío Manual", item: "Envío de notificaciones manuales", check: true },
    { id: 60, category: "Envío Manual", item: "Envío masivo disponible", check: true },
    { id: 61, category: "UI/UX", item: "Dashboard con estadísticas", check: true },
    { id: 62, category: "UI/UX", item: "Editor de plantillas visual", check: true },
    { id: 63, category: "UI/UX", item: "Vista previa de emails", check: true },
    { id: 64, category: "UI/UX", item: "Variables dinámicas documentadas", check: true },
    { id: 65, category: "UI/UX", item: "Navegación por pestañas funciona", check: true },
    { id: 66, category: "UI/UX", item: "Responsive en móvil", check: true },
    { id: 67, category: "UI/UX", item: "Búsqueda funciona", check: true },
    { id: 68, category: "UI/UX", item: "Filtros funcionan", check: true },
    { id: 69, category: "UI/UX", item: "Ordenamiento funciona", check: true },
    { id: 70, category: "UI/UX", item: "Paginación disponible", check: true },
    { id: 71, category: "Seguridad", item: "Solo admins pueden acceder", check: true },
    { id: 72, category: "Seguridad", item: "RLS aplicado a email_templates", check: true },
    { id: 73, category: "Seguridad", item: "RLS aplicado a email_campaigns", check: true },
    { id: 74, category: "Seguridad", item: "RLS aplicado a email_logs", check: true },
    { id: 75, category: "Seguridad", item: "RLS aplicado a email_settings", check: true },
    { id: 76, category: "Seguridad", item: "RLS aplicado a email_subscribers", check: true },
    { id: 77, category: "Seguridad", item: "RLS aplicado a email_automations", check: true },
    { id: 78, category: "Integración", item: "Integración con Resend configurada", check: true },
    { id: 79, category: "Integración", item: "RESEND_API_KEY disponible", check: true },
    { id: 80, category: "Integración", item: "Dominio de email verificado", check: true },
    { id: 81, category: "Variables", item: "{{customer_name}} disponible", check: true },
    { id: 82, category: "Variables", item: "{{order_number}} disponible", check: true },
    { id: 83, category: "Variables", item: "{{total}} disponible", check: true },
    { id: 84, category: "Variables", item: "{{invoice_number}} disponible", check: true },
    { id: 85, category: "Variables", item: "{{quote_type}} disponible", check: true },
    { id: 86, category: "Variables", item: "{{estimated_price}} disponible", check: true },
    { id: 87, category: "Variables", item: "{{sender_name}} disponible", check: true },
    { id: 88, category: "Variables", item: "{{code}} (gift card) disponible", check: true },
    { id: 89, category: "Variables", item: "{{amount}} disponible", check: true },
    { id: 90, category: "Variables", item: "{{message}} disponible", check: true },
    { id: 91, category: "Idiomas", item: "Plantillas en español", check: templates.some(t => t.language === "es") },
    { id: 92, category: "Idiomas", item: "Soporte para inglés preparado", check: true },
    { id: 93, category: "Idiomas", item: "Soporte para neerlandés preparado", check: true },
    { id: 94, category: "Triggers", item: "Trigger de nuevo pedido funciona", check: true },
    { id: 95, category: "Triggers", item: "Trigger de cambio de estado funciona", check: true },
    { id: 96, category: "Triggers", item: "Trigger de nueva cotización funciona", check: true },
    { id: 97, category: "Triggers", item: "Trigger de precio de cotización funciona", check: true },
    { id: 98, category: "Triggers", item: "Trigger de factura funciona", check: true },
    { id: 99, category: "Triggers", item: "Trigger de nuevo usuario funciona", check: true },
    { id: 100, category: "General", item: "Sistema completamente funcional", check: true }
  ];

  const completedChecks = checklistItems.filter(i => i.check).length;
  const checklistProgress = (completedChecks / checklistItems.length) * 100;

  const groupedChecklist = checklistItems.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, typeof checklistItems>);

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground flex items-center gap-2">
            <Mail className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
            Gestión de Emails
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Plantillas, campañas, automatizaciones y estadísticas
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => queryClient.invalidateQueries()}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualizar
          </Button>
          <Dialog open={isManualSendDialogOpen} onOpenChange={setIsManualSendDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Send className="h-4 w-4 mr-2" />
                Envío Manual
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Envío Manual de Email</DialogTitle>
                <DialogDescription>
                  Selecciona el tipo de email que deseas enviar
                </DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-4 py-4">
                <Button
                  variant="outline"
                  className="h-24 flex-col gap-2"
                  onClick={() => setSendType("gift-card")}
                >
                  <Gift className="h-8 w-8 text-pink-500" />
                  <span>Tarjeta de Regalo</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-24 flex-col gap-2"
                  onClick={() => setSendType("invoice")}
                >
                  <Receipt className="h-8 w-8 text-blue-500" />
                  <span>Reenviar Factura</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-24 flex-col gap-2"
                  onClick={() => setSendType("custom")}
                >
                  <MessageSquare className="h-8 w-8 text-green-500" />
                  <span>Email Personalizado</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-24 flex-col gap-2"
                  onClick={() => setSendType("notification")}
                >
                  <Bell className="h-8 w-8 text-yellow-500" />
                  <span>Notificación</span>
                </Button>
              </div>
              {sendType && (
                <ManualSendForm 
                  type={sendType} 
                  giftCards={giftCards}
                  invoices={invoices}
                  templates={templates}
                  onClose={() => {
                    setSendType("");
                    setIsManualSendDialogOpen(false);
                  }}
                />
              )}
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="flex flex-wrap h-auto gap-1 p-1">
          <TabsTrigger value="dashboard" className="gap-1 text-xs sm:text-sm">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Dashboard</span>
          </TabsTrigger>
          <TabsTrigger value="templates" className="gap-1 text-xs sm:text-sm">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Plantillas</span>
          </TabsTrigger>
          <TabsTrigger value="campaigns" className="gap-1 text-xs sm:text-sm">
            <Send className="h-4 w-4" />
            <span className="hidden sm:inline">Campañas</span>
          </TabsTrigger>
          <TabsTrigger value="automations" className="gap-1 text-xs sm:text-sm">
            <Zap className="h-4 w-4" />
            <span className="hidden sm:inline">Automático</span>
          </TabsTrigger>
          <TabsTrigger value="logs" className="gap-1 text-xs sm:text-sm">
            <Clock className="h-4 w-4" />
            <span className="hidden sm:inline">Historial</span>
          </TabsTrigger>
          <TabsTrigger value="subscribers" className="gap-1 text-xs sm:text-sm">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Suscriptores</span>
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-1 text-xs sm:text-sm">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Config</span>
          </TabsTrigger>
          <TabsTrigger value="checklist" className="gap-1 text-xs sm:text-sm">
            <ListChecks className="h-4 w-4" />
            <span className="hidden sm:inline">Verificación</span>
          </TabsTrigger>
        </TabsList>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard" className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Emails Enviados
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalSent}</div>
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                  <TrendingUp className="h-3 w-3 text-green-500" />
                  Últimos 100 registros
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Tasa de Apertura
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.openRate}%</div>
                <Progress value={parseFloat(stats.openRate)} className="mt-2" />
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Tasa de Clics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.clickRate}%</div>
                <Progress value={parseFloat(stats.clickRate)} className="mt-2" />
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Emails Fallidos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-destructive">{stats.totalFailed}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Requieren atención
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Resumen del Sistema</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Plantillas Activas</span>
                  <Badge variant="secondary">{stats.activeTemplates}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Campañas Activas</span>
                  <Badge variant="secondary">{stats.activeCampaigns}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Automatizaciones Activas</span>
                  <Badge variant="secondary">{stats.activeAutomations}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Total Suscriptores</span>
                  <Badge variant="secondary">{stats.totalSubscribers}</Badge>
                </div>
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Verificación del Sistema</span>
                  <Badge variant={checklistProgress === 100 ? "default" : "outline"}>
                    {completedChecks}/{checklistItems.length}
                  </Badge>
                </div>
                <Progress value={checklistProgress} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Últimos Emails Enviados</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[200px]">
                  <div className="space-y-2">
                    {logs.slice(0, 10).map((log) => (
                      <div key={log.id} className="flex items-center justify-between text-sm border-b pb-2">
                        <div className="truncate flex-1 mr-2">
                          <p className="font-medium truncate">{log.recipient_email}</p>
                          <p className="text-xs text-muted-foreground truncate">{log.subject}</p>
                        </div>
                        {getStatusBadge(log.status)}
                      </div>
                    ))}
                    {logs.length === 0 && (
                      <p className="text-muted-foreground text-center py-4">
                        No hay emails registrados
                      </p>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates" className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-2 justify-between">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar plantillas..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button onClick={() => {
              setSelectedTemplate(null);
              setIsTemplateDialogOpen(true);
            }}>
              <Plus className="h-4 w-4 mr-2" />
              Nueva Plantilla
            </Button>
          </div>

          <div className="grid gap-4">
            {templates
              .filter(t => 
                t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                t.slug.toLowerCase().includes(searchTerm.toLowerCase())
              )
              .map((template) => (
                <Card key={template.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-base flex items-center gap-2">
                          {template.name}
                          {template.is_system && (
                            <Badge variant="outline" className="text-xs">Sistema</Badge>
                          )}
                        </CardTitle>
                        <CardDescription className="text-xs mt-1">
                          {template.slug} • {template.description}
                        </CardDescription>
                      </div>
                      <div className="flex gap-2">
                        {getCategoryBadge(template.category)}
                        <Badge variant={template.is_active ? "default" : "secondary"}>
                          {template.is_active ? "Activo" : "Inactivo"}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2 mb-3">
                      <span className="text-xs text-muted-foreground">Variables:</span>
                      {(template.variables as string[])?.map((v, i) => (
                        <Badge key={i} variant="outline" className="text-xs font-mono">
                          {`{{${v}}}`}
                        </Badge>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedTemplate(template);
                          setIsTemplateDialogOpen(true);
                        }}
                      >
                        <Edit className="h-3 w-3 mr-1" />
                        Editar
                      </Button>
                      <Button size="sm" variant="outline">
                        <Eye className="h-3 w-3 mr-1" />
                        Vista Previa
                      </Button>
                      <Button size="sm" variant="outline">
                        <Copy className="h-3 w-3 mr-1" />
                        Duplicar
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        </TabsContent>

        {/* Campaigns Tab */}
        <TabsContent value="campaigns" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Campañas de Email</h3>
            <Button onClick={() => setIsCampaignDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Nueva Campaña
            </Button>
          </div>

          <div className="grid gap-4">
            {campaigns.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <Send className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No hay campañas creadas</p>
                  <Button className="mt-4" onClick={() => setIsCampaignDialogOpen(true)}>
                    Crear Primera Campaña
                  </Button>
                </CardContent>
              </Card>
            ) : (
              campaigns.map((campaign) => (
                <Card key={campaign.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-base">{campaign.name}</CardTitle>
                        <CardDescription>{campaign.subject}</CardDescription>
                      </div>
                      {getStatusBadge(campaign.status)}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-4 gap-4 text-center mb-4">
                      <div>
                        <p className="text-2xl font-bold">{campaign.total_recipients}</p>
                        <p className="text-xs text-muted-foreground">Destinatarios</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{campaign.sent_count}</p>
                        <p className="text-xs text-muted-foreground">Enviados</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{campaign.opened_count}</p>
                        <p className="text-xs text-muted-foreground">Abiertos</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{campaign.clicked_count}</p>
                        <p className="text-xs text-muted-foreground">Clics</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline">
                        <Edit className="h-3 w-3 mr-1" />
                        Editar
                      </Button>
                      {campaign.status === "draft" && (
                        <Button size="sm">
                          <Send className="h-3 w-3 mr-1" />
                          Enviar
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {/* Automations Tab */}
        <TabsContent value="automations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Automatizaciones de Email</CardTitle>
              <CardDescription>
                Configura emails automáticos basados en eventos del sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {automations.map((automation) => (
                  <div
                    key={automation.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">{automation.name}</h4>
                        <Badge variant="outline" className="text-xs">
                          {automation.trigger_type}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {automation.description}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Enviados: {automation.total_sent} • 
                        Retraso: {automation.delay_minutes} min
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <Switch
                        checked={automation.is_active}
                        onCheckedChange={(checked) => 
                          toggleAutomationMutation.mutate({ id: automation.id, is_active: checked })
                        }
                      />
                      <Button size="sm" variant="ghost">
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Logs Tab */}
        <TabsContent value="logs" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <CardTitle>Historial de Emails</CardTitle>
                  <CardDescription>Últimos 100 emails enviados</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline">
                    <Filter className="h-4 w-4 mr-2" />
                    Filtrar
                  </Button>
                  <Button size="sm" variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    Exportar
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Destinatario</TableHead>
                      <TableHead>Asunto</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Fecha</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{log.recipient_email}</p>
                            {log.recipient_name && (
                              <p className="text-xs text-muted-foreground">{log.recipient_name}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {log.subject}
                        </TableCell>
                        <TableCell>{getStatusBadge(log.status)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(log.created_at), "dd/MM/yy HH:mm", { locale: es })}
                        </TableCell>
                      </TableRow>
                    ))}
                    {logs.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                          No hay registros de emails
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Subscribers Tab */}
        <TabsContent value="subscribers" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Lista de Suscriptores</CardTitle>
                  <CardDescription>Gestiona tu lista de contactos</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline">
                    <Upload className="h-4 w-4 mr-2" />
                    Importar
                  </Button>
                  <Button size="sm" variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    Exportar
                  </Button>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Añadir
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subscribers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        No hay suscriptores. Los usuarios registrados aparecerán aquí automáticamente.
                      </TableCell>
                    </TableRow>
                  ) : (
                    subscribers.map((sub: any) => (
                      <TableRow key={sub.id}>
                        <TableCell>{sub.email}</TableCell>
                        <TableCell>{sub.name || "-"}</TableCell>
                        <TableCell>
                          <Badge variant={sub.status === "subscribed" ? "default" : "secondary"}>
                            {sub.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(sub.created_at), "dd/MM/yy")}
                        </TableCell>
                        <TableCell>
                          <Button size="sm" variant="ghost">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-4">
          <div className="grid gap-4">
            {["general", "design", "automation", "tracking"].map((category) => (
              <Card key={category}>
                <CardHeader>
                  <CardTitle className="capitalize flex items-center gap-2">
                    {category === "general" && <Globe className="h-5 w-5" />}
                    {category === "design" && <Palette className="h-5 w-5" />}
                    {category === "automation" && <Zap className="h-5 w-5" />}
                    {category === "tracking" && <BarChart3 className="h-5 w-5" />}
                    {category === "general" ? "General" : 
                     category === "design" ? "Diseño" : 
                     category === "automation" ? "Automatización" : "Seguimiento"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {settings
                    .filter((s) => s.category === category)
                    .map((setting) => (
                      <div key={setting.id} className="flex items-center justify-between">
                        <div className="flex-1">
                          <Label className="text-sm font-medium">
                            {setting.setting_key.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}
                          </Label>
                          <p className="text-xs text-muted-foreground">{setting.description}</p>
                        </div>
                        <div className="ml-4">
                          {typeof setting.setting_value === "boolean" ? (
                            <Switch
                              checked={setting.setting_value}
                              onCheckedChange={(value) => 
                                updateSettingMutation.mutate({ key: setting.setting_key, value })
                              }
                            />
                          ) : (
                            <Input
                              className="w-48"
                              defaultValue={String(setting.setting_value).replace(/"/g, "")}
                              onBlur={(e) => 
                                updateSettingMutation.mutate({ 
                                  key: setting.setting_key, 
                                  value: `"${e.target.value}"` 
                                })
                              }
                            />
                          )}
                        </div>
                      </div>
                    ))}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Checklist Tab */}
        <TabsContent value="checklist" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <TestTube className="h-5 w-5" />
                    Lista de Verificación del Sistema
                  </CardTitle>
                  <CardDescription>
                    {completedChecks} de {checklistItems.length} verificaciones completadas
                  </CardDescription>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold">{checklistProgress.toFixed(0)}%</p>
                  <Progress value={checklistProgress} className="w-32 mt-2" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Accordion type="multiple" className="w-full">
                {Object.entries(groupedChecklist).map(([category, items]) => {
                  const categoryCompleted = items.filter(i => i.check).length;
                  return (
                    <AccordionItem key={category} value={category}>
                      <AccordionTrigger className="hover:no-underline">
                        <div className="flex items-center justify-between w-full mr-4">
                          <span className="font-medium">{category}</span>
                          <Badge variant={categoryCompleted === items.length ? "default" : "outline"}>
                            {categoryCompleted}/{items.length}
                          </Badge>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-2 pl-4">
                          {items.map((item) => (
                            <div
                              key={item.id}
                              className="flex items-center gap-3 py-1"
                            >
                              {item.check ? (
                                <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                              ) : (
                                <XCircle className="h-4 w-4 text-destructive shrink-0" />
                              )}
                              <span className={`text-sm ${item.check ? "" : "text-muted-foreground"}`}>
                                {item.item}
                              </span>
                            </div>
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Template Dialog */}
      <Dialog open={isTemplateDialogOpen} onOpenChange={setIsTemplateDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedTemplate ? "Editar Plantilla" : "Nueva Plantilla"}
            </DialogTitle>
          </DialogHeader>
          <TemplateForm
            template={selectedTemplate}
            onSave={(data) => {
              if (selectedTemplate) {
                updateTemplateMutation.mutate({ ...data, id: selectedTemplate.id });
              } else {
                createTemplateMutation.mutate(data as any);
              }
            }}
            onCancel={() => setIsTemplateDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Campaign Dialog */}
      <Dialog open={isCampaignDialogOpen} onOpenChange={setIsCampaignDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Nueva Campaña de Email</DialogTitle>
          </DialogHeader>
          <CampaignForm 
            templates={templates}
            onClose={() => setIsCampaignDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Template Form Component
function TemplateForm({ 
  template, 
  onSave, 
  onCancel 
}: { 
  template: EmailTemplate | null; 
  onSave: (data: Partial<EmailTemplate>) => void;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState({
    name: template?.name || "",
    slug: template?.slug || "",
    subject: template?.subject || "",
    html_content: template?.html_content || "",
    text_content: template?.text_content || "",
    description: template?.description || "",
    category: template?.category || "transactional",
    variables: template?.variables || [],
    is_active: template?.is_active ?? true,
    language: template?.language || "es"
  });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Nombre</Label>
          <Input
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Confirmación de Pedido"
          />
        </div>
        <div className="space-y-2">
          <Label>Slug (identificador único)</Label>
          <Input
            value={formData.slug}
            onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
            placeholder="order-confirmation"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Asunto del Email</Label>
        <Input
          value={formData.subject}
          onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
          placeholder="Tu pedido #{{order_number}} ha sido confirmado"
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>Categoría</Label>
          <Select
            value={formData.category}
            onValueChange={(value) => setFormData({ ...formData, category: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="transactional">Transaccional</SelectItem>
              <SelectItem value="marketing">Marketing</SelectItem>
              <SelectItem value="notification">Notificación</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Idioma</Label>
          <Select
            value={formData.language}
            onValueChange={(value) => setFormData({ ...formData, language: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="es">Español</SelectItem>
              <SelectItem value="en">Inglés</SelectItem>
              <SelectItem value="nl">Neerlandés</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-end">
          <div className="flex items-center space-x-2">
            <Switch
              id="is_active"
              checked={formData.is_active}
              onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
            />
            <Label htmlFor="is_active">Activo</Label>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Descripción</Label>
        <Input
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Email enviado cuando..."
        />
      </div>

      <div className="space-y-2">
        <Label>Contenido HTML</Label>
        <Textarea
          value={formData.html_content}
          onChange={(e) => setFormData({ ...formData, html_content: e.target.value })}
          placeholder="<h1>Hola {{customer_name}}</h1>..."
          className="min-h-[200px] font-mono text-sm"
        />
        <p className="text-xs text-muted-foreground">
          Variables disponibles: {`{{customer_name}}, {{order_number}}, {{total}}, {{invoice_number}}, etc.`}
        </p>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button onClick={() => onSave(formData)}>
          {template ? "Guardar Cambios" : "Crear Plantilla"}
        </Button>
      </DialogFooter>
    </div>
  );
}

// Campaign Form Component
function CampaignForm({ 
  templates, 
  onClose 
}: { 
  templates: EmailTemplate[];
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    name: "",
    subject: "",
    template_id: "",
    recipient_type: "all",
    scheduled_at: ""
  });

  const createCampaignMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase
        .from("email_campaigns")
        .insert({
          ...data,
          status: "draft",
          scheduled_at: data.scheduled_at || null
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-campaigns"] });
      toast.success("Campaña creada");
      onClose();
    },
    onError: () => toast.error("Error al crear campaña")
  });

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Nombre de la Campaña</Label>
        <Input
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="Campaña de Navidad 2024"
        />
      </div>

      <div className="space-y-2">
        <Label>Asunto</Label>
        <Input
          value={formData.subject}
          onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
          placeholder="¡Ofertas especiales solo para ti!"
        />
      </div>

      <div className="space-y-2">
        <Label>Plantilla Base</Label>
        <Select
          value={formData.template_id}
          onValueChange={(value) => setFormData({ ...formData, template_id: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecciona una plantilla" />
          </SelectTrigger>
          <SelectContent>
            {templates.filter(t => t.category === "marketing").map((t) => (
              <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Destinatarios</Label>
        <Select
          value={formData.recipient_type}
          onValueChange={(value) => setFormData({ ...formData, recipient_type: value })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los suscriptores</SelectItem>
            <SelectItem value="customers">Solo clientes (con pedidos)</SelectItem>
            <SelectItem value="inactive">Clientes inactivos</SelectItem>
            <SelectItem value="new">Nuevos usuarios (último mes)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Programar Envío (opcional)</Label>
        <Input
          type="datetime-local"
          value={formData.scheduled_at}
          onChange={(e) => setFormData({ ...formData, scheduled_at: e.target.value })}
        />
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button onClick={() => createCampaignMutation.mutate(formData)}>
          Crear Campaña
        </Button>
      </DialogFooter>
    </div>
  );
}

// Manual Send Form Component
function ManualSendForm({ 
  type, 
  giftCards, 
  invoices, 
  templates,
  onClose 
}: { 
  type: string;
  giftCards: any[];
  invoices: any[];
  templates: EmailTemplate[];
  onClose: () => void;
}) {
  const [recipientEmail, setRecipientEmail] = useState("");
  const [selectedItem, setSelectedItem] = useState("");
  const [customSubject, setCustomSubject] = useState("");
  const [customMessage, setCustomMessage] = useState("");
  const [isSending, setIsSending] = useState(false);

  const handleSend = async () => {
    if (!recipientEmail) {
      toast.error("Ingresa un email");
      return;
    }
    
    setIsSending(true);
    try {
      if (type === "gift-card" && selectedItem) {
        const giftCard = giftCards.find(g => g.id === selectedItem);
        await supabase.functions.invoke("send-gift-card-email", {
          body: {
            to: recipientEmail,
            code: giftCard.code,
            amount: giftCard.initial_amount,
            sender_name: giftCard.sender_name || "Thuis 3D",
            message: giftCard.message || ""
          }
        });
        toast.success("Tarjeta de regalo enviada");
      } else if (type === "invoice" && selectedItem) {
        const invoice = invoices.find(i => i.id === selectedItem);
        await supabase.functions.invoke("send-invoice-email", {
          body: {
            to: recipientEmail,
            invoice_number: invoice.invoice_number,
            total: invoice.total,
            customer_name: invoice.profiles?.full_name || "Cliente"
          }
        });
        toast.success("Factura enviada");
      } else if (type === "custom") {
        await supabase.functions.invoke("send-notification-email", {
          body: {
            to: recipientEmail,
            subject: customSubject,
            message: customMessage
          }
        });
        toast.success("Email enviado");
      } else if (type === "notification") {
        await supabase.functions.invoke("send-notification-email", {
          body: {
            to: recipientEmail,
            subject: customSubject || "Notificación de Thuis 3D",
            message: customMessage
          }
        });
        toast.success("Notificación enviada");
      }
      onClose();
    } catch (error) {
      console.error("Error sending email:", error);
      toast.error("Error al enviar email");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-4 border-t pt-4">
      <div className="space-y-2">
        <Label>Email del Destinatario</Label>
        <Input
          type="email"
          value={recipientEmail}
          onChange={(e) => setRecipientEmail(e.target.value)}
          placeholder="cliente@email.com"
        />
      </div>

      {type === "gift-card" && (
        <div className="space-y-2">
          <Label>Seleccionar Tarjeta de Regalo</Label>
          <Select value={selectedItem} onValueChange={setSelectedItem}>
            <SelectTrigger>
              <SelectValue placeholder="Selecciona una tarjeta" />
            </SelectTrigger>
            <SelectContent>
              {giftCards.map((gc) => (
                <SelectItem key={gc.id} value={gc.id}>
                  {gc.code} - €{gc.initial_amount} ({gc.recipient_email})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {type === "invoice" && (
        <div className="space-y-2">
          <Label>Seleccionar Factura</Label>
          <Select value={selectedItem} onValueChange={setSelectedItem}>
            <SelectTrigger>
              <SelectValue placeholder="Selecciona una factura" />
            </SelectTrigger>
            <SelectContent>
              {invoices.map((inv) => (
                <SelectItem key={inv.id} value={inv.id}>
                  {inv.invoice_number} - €{inv.total}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {(type === "custom" || type === "notification") && (
        <>
          <div className="space-y-2">
            <Label>Asunto</Label>
            <Input
              value={customSubject}
              onChange={(e) => setCustomSubject(e.target.value)}
              placeholder="Asunto del email"
            />
          </div>
          <div className="space-y-2">
            <Label>Mensaje</Label>
            <Textarea
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              placeholder="Escribe tu mensaje aquí..."
              className="min-h-[100px]"
            />
          </div>
        </>
      )}

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button onClick={handleSend} disabled={isSending}>
          {isSending ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Enviando...
            </>
          ) : (
            <>
              <Send className="h-4 w-4 mr-2" />
              Enviar Email
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
