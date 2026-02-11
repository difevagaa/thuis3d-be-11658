import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Download, User, Mail, FileText, Package, Palette, Ruler, Layers, Settings, CheckCircle2, XCircle, Image as ImageIcon, File, MessageSquare } from "lucide-react";
import { Loader2 } from "lucide-react";
import { RichTextDisplay } from "@/components/RichTextDisplay";
import { i18nToast } from "@/lib/i18nToast";
import { Textarea } from "@/components/ui/textarea";
import { notifyAdminsWithBroadcast } from "@/lib/notificationUtils";
import { QuoteResponseTimeline } from "@/components/QuoteResponseTimeline";

export default function UserQuoteDetail() {
  const { t } = useTranslation(['common', 'account']);
  const { id } = useParams();
  const navigate = useNavigate();
  const [quote, setQuote] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [statusIds, setStatusIds] = useState<{ approved?: string; rejected?: string }>({});

  const loadStatusIds = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("quote_statuses")
        .select("id, name, slug")
        .is("deleted_at", null);

      if (error || !data) return;

      const approved = data.find(status =>
        status.slug === "approved" || status.name?.toLowerCase() === "aprobada" || status.name?.toLowerCase() === "aprobado"
      );
      const rejected = data.find(status =>
        status.slug === "rejected" || status.name?.toLowerCase() === "rechazada" || status.name?.toLowerCase() === "rechazado"
      );

      setStatusIds({
        approved: approved?.id,
        rejected: rejected?.id
      });
    } catch {
      // Ignore status lookup errors
    }
  }, []);

  const loadQuoteDetail = useCallback(async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        i18nToast.error("error.unauthorized");
        navigate("/auth");
        return;
      }

      const { data, error } = await supabase
        .from("quotes")
        .select(`
          *,
          quote_statuses(name, color, slug),
          materials(name),
          colors(name, hex_code)
        `)
        .eq("id", id)
        .or(`user_id.eq.${user.id},customer_email.eq.${user.email}`)
        .maybeSingle();

      if (error) throw error;
      
      if (!data) {
        i18nToast.error("error.quoteNotFound");
        navigate("/mi-cuenta?tab=quotes");
        return;
      }

      setQuote(data);
    } catch (error: any) {
      console.error("Error loading quote detail:", error);
      i18nToast.error("error.loadingQuoteFailed");
      navigate("/mi-cuenta?tab=quotes");
    } finally {
      setLoading(false);
    }
  }, [id, navigate]); // Depends on id and navigate

  useEffect(() => {
    loadStatusIds();
    if (id) {
      loadQuoteDetail();
    }
  }, [id, loadQuoteDetail, loadStatusIds]); // Now includes loadQuoteDetail

  const handleDownloadFile = async (filePath?: string) => {
    const pathToDownload = filePath || quote?.file_storage_path;
    
    if (!pathToDownload) {
      i18nToast.error("error.noFileAvailable");
      return;
    }

    try {
      const { data, error } = await supabase.storage
        .from('quote-files')
        .download(pathToDownload);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = pathToDownload.split('_').slice(1).join('_') || 'archivo';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      i18nToast.success("success.fileDownloaded");
    } catch (error: any) {
      console.error("Error downloading file:", error);
      i18nToast.error("error.downloadFailed");
    }
  };

  const getFilePreviewUrl = (filePath: string) => {
    const { data } = supabase.storage
      .from('quote-files')
      .getPublicUrl(filePath);
    return data.publicUrl;
  };

  const isImageFile = (fileName: string) => {
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
    return imageExtensions.some(ext => fileName.toLowerCase().endsWith(ext));
  };

  const handleCustomerAction = async (action: "approve" | "reject" | "comment") => {
    if (!quote || actionLoading) return;

    const trimmedComment = comment.trim();
    if (action === "comment" && !trimmedComment) {
      i18nToast.directWarning("Por favor escribe un comentario antes de enviar.");
      return;
    }

    let statusId: string | undefined;
    if (action === "approve") {
      statusId = statusIds.approved;
    } else if (action === "reject") {
      statusId = statusIds.rejected;
    }
    if ((action === "approve" || action === "reject") && !statusId) {
      i18nToast.directError("No se pudo determinar el estado de la cotización.");
      return;
    }

    try {
      setActionLoading(true);
      const timestamp = new Date().toLocaleString("es-ES");
      const actionLabels: Record<typeof action, string> = {
        approve: "Aprobación del cliente",
        reject: "Rechazo del cliente",
        comment: "Comentario del cliente"
      };
      const actionLabel = actionLabels[action];
      const entry = `${timestamp} - ${actionLabel}${trimmedComment ? `: ${trimmedComment}` : ""}`;
      const updatedCustomText = quote.custom_text ? `${quote.custom_text}\n${entry}` : entry;

      const updatePayload: { custom_text: string; status_id?: string } = { custom_text: updatedCustomText };
      if (statusId) {
        updatePayload.status_id = statusId;
      }

      const { error } = await supabase
        .from("quotes")
        .update(updatePayload)
        .eq("id", quote.id);

      if (error) throw error;

      // If client approved, trigger automatic invoice and order generation
      if (action === "approve") {
        try {
          const { data: statusData } = await supabase
            .from("quote_statuses")
            .select("name, slug")
            .eq("id", statusId)
            .maybeSingle();

          const { data: automationResult, error: automationError } = await supabase.functions.invoke(
            'process-quote-approval',
            {
              body: {
                quote_id: quote.id,
                status_name: statusData?.name || 'Aprobada',
                status_slug: statusData?.slug || 'approved',
                admin_name: quote.customer_name
              }
            }
          );

          if (!automationError && automationResult?.success) {
            let successMessage = "✅ Tu respuesta ha sido enviada correctamente.";
            if (automationResult.invoice) {
              successMessage += `\n📄 Factura ${automationResult.invoice.invoice_number} generada automáticamente.`;
            }
            if (automationResult.order) {
              successMessage += `\n📦 Pedido ${automationResult.order.order_number} generado automáticamente.`;
            }
            successMessage += "\n\nPuedes proceder con el pago desde tu panel de facturas.";
            i18nToast.directSuccess(successMessage);
          } else {
            console.error("Automation error:", automationError);
            i18nToast.directSuccess("Tu respuesta se ha enviado correctamente. La factura y pedido se generarán automáticamente.");
          }
        } catch (automationErr) {
          console.error("Error triggering automation:", automationErr);
          i18nToast.directSuccess("Tu respuesta se ha enviado correctamente. La factura y pedido se generarán automáticamente.");
        }
      } else {
        i18nToast.directSuccess("Tu respuesta se ha enviado correctamente.");
      }

      const adminMessages: Record<typeof action, string> = {
        approve: `El cliente ${quote.customer_name} aprobó la cotización.`,
        reject: `El cliente ${quote.customer_name} rechazó la cotización.`,
        comment: `El cliente ${quote.customer_name} envió un comentario en su cotización.`
      };
      const adminMessage = adminMessages[action];

      await notifyAdminsWithBroadcast(
        "quote_update",
        "Respuesta del cliente en cotización",
        `${adminMessage}${trimmedComment ? ` Comentario: "${trimmedComment}"` : ""}`,
        `/admin/cotizaciones/${quote.id}`
      );

      try {
        await supabase.functions.invoke("send-admin-notification", {
          body: {
            type: "quote",
            subject: "Respuesta del cliente en cotización",
            message: `${adminMessage}${trimmedComment ? ` Comentario: "${trimmedComment}"` : ""}`,
            customer_name: quote.customer_name,
            customer_email: quote.customer_email,
            link: `/admin/cotizaciones/${quote.id}`
          }
        });
      } catch {
        // Non-blocking email errors
      }

      setComment("");
      await loadQuoteDetail();
    } catch (error) {
      console.error("Error updating quote:", error);
      i18nToast.directError("No se pudo enviar tu respuesta. Inténtalo de nuevo.");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!quote) {
    return (
      <div className="container mx-auto p-6">
        <p>Cotización no encontrada</p>
      </div>
    );
  }

  const statusName = quote.quote_statuses?.name?.toLowerCase() || "";
  const statusSlug = quote.quote_statuses?.slug?.toLowerCase() || "";
  const pendingApprovalSlugs = ["pending_customer_approval", "pending_client_approval"];
  const isPendingClientApproval =
    pendingApprovalSlugs.includes(statusSlug) ||
    (statusName.includes("aprobación") && statusName.includes("cliente"));

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/mi-cuenta?tab=quotes")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Detalles de Cotización</h1>
            <p className="text-muted-foreground">
              {new Date(quote.created_at).toLocaleDateString('es-ES', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge 
            style={{ 
              backgroundColor: quote.quote_statuses?.color || '#3b82f6',
              color: 'white'
            }}
          >
            {quote.quote_statuses?.name || 'Pendiente'}
          </Badge>
          {quote.file_storage_path && (
            <Button onClick={() => handleDownloadFile()} size="sm">
              <Download className="h-4 w-4 mr-2" />
              Descargar
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Información Básica */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Información
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <User className="h-4 w-4" />
                <span>Nombre</span>
              </div>
              <p className="font-medium">{quote.customer_name}</p>
            </div>

            <Separator />

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Mail className="h-4 w-4" />
                <span>Email</span>
              </div>
              <p className="font-medium break-all">{quote.customer_email}</p>
            </div>

            <Separator />

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <FileText className="h-4 w-4" />
                <span>Tipo</span>
              </div>
              <Badge variant="outline">
                {quote.quote_type === 'file_upload' ? 'Archivo 3D' : 
                 quote.quote_type === 'service' ? 'Servicio' : 
                 quote.quote_type}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Detalles del Proyecto */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Detalles del Proyecto
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Descripción */}
            {quote.description && (
              <div className="space-y-2">
                <h3 className="font-semibold text-sm">Descripción</h3>
                <div className="text-sm text-muted-foreground">
                  <RichTextDisplay content={quote.description} />
                </div>
              </div>
            )}

            {/* Archivos Adjuntos del Servicio */}
            {quote.service_attachments && quote.service_attachments.length > 0 && (
              <>
                <Separator />
                <div className="space-y-4">
                  <h3 className="font-semibold flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Archivos Adjuntos ({quote.service_attachments.length})
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {quote.service_attachments.map((filePath: string, idx: number) => {
                      const fileName = filePath.split('_').slice(2).join('_') || `archivo-${idx + 1}`;
                      const isImage = isImageFile(fileName);
                      
                      return (
                        <Card key={idx} className="overflow-hidden">
                          <CardContent className="p-4">
                            {isImage ? (
                              <div className="space-y-2">
                                <div className="rounded-lg overflow-hidden border bg-muted/30">
                                  <img 
                                    src={getFilePreviewUrl(filePath)} 
                                    alt={fileName}
                                    className="w-full h-48 object-cover cursor-pointer hover:scale-105 transition-transform"
                                    onClick={() => window.open(getFilePreviewUrl(filePath), '_blank')}
                                  />
                                </div>
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2 text-sm">
                                    <ImageIcon className="h-4 w-4 text-muted-foreground" />
                                    <span className="truncate max-w-[150px]" title={fileName}>{fileName}</span>
                                  </div>
                                  <Button 
                                    size="sm" 
                                    variant="ghost"
                                    onClick={() => handleDownloadFile(filePath)}
                                  >
                                    <Download className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <File className="h-5 w-5 text-muted-foreground" />
                                  <span className="text-sm truncate max-w-[200px]" title={fileName}>{fileName}</span>
                                </div>
                                <Button 
                                  size="sm" 
                                  variant="ghost"
                                  onClick={() => handleDownloadFile(filePath)}
                                >
                                  <Download className="h-4 w-4" />
                                </Button>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              </>
            )}

            {(quote.materials || quote.colors) && <Separator />}

            {/* Material y Color */}
            {(quote.materials || quote.colors) && (
              <div className="grid grid-cols-2 gap-4">
                {quote.materials && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Package className="h-4 w-4" />
                      <span>Material</span>
                    </div>
                    <p className="font-medium">{quote.materials.name}</p>
                  </div>
                )}

                {quote.colors && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Palette className="h-4 w-4" />
                      <span>Color</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-4 h-4 rounded-full border"
                        style={{ backgroundColor: quote.colors.hex_code }}
                      />
                      <span className="font-medium">{quote.colors.name}</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {(quote.supports_required !== null || quote.layer_height) && <Separator />}

            {/* Configuración de Impresión */}
            {(quote.supports_required !== null || quote.layer_height || quote.let_team_decide_supports || quote.let_team_decide_layer) && (
              <div className="space-y-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Configuración de Impresión
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Soportes */}
                  <div className="p-3 bg-muted/50 rounded-lg space-y-2">
                    <p className="text-xs text-muted-foreground">Soportes</p>
                    {quote.let_team_decide_supports ? (
                      <Badge variant="secondary" className="text-xs">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Decisión del Equipo
                      </Badge>
                    ) : quote.supports_required !== null ? (
                      <Badge variant={quote.supports_required ? "default" : "outline"} className="text-xs">
                        {quote.supports_required ? <CheckCircle2 className="h-3 w-3 mr-1" /> : <XCircle className="h-3 w-3 mr-1" />}
                        {quote.supports_required ? 'Sí requiere' : 'No requiere'}
                      </Badge>
                    ) : (
                      <span className="text-sm">No especificado</span>
                    )}
                  </div>

                  {/* Altura de Capa */}
                  <div className="p-3 bg-muted/50 rounded-lg space-y-2">
                    <p className="text-xs text-muted-foreground">Altura de Capa</p>
                    {quote.let_team_decide_layer ? (
                      <Badge variant="secondary" className="text-xs">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Decisión del Equipo
                      </Badge>
                    ) : quote.layer_height ? (
                      <p className="font-mono font-semibold">{quote.layer_height} mm</p>
                    ) : (
                      <span className="text-sm">No especificado</span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {(quote.calculated_volume || quote.calculation_details?.dimensions) && <Separator />}

            {/* Datos Calculados */}
            {(quote.calculated_volume || quote.calculation_details?.dimensions) && (
              <div className="space-y-4">
                <h3 className="font-semibold">Análisis del Archivo</h3>
                <div className="grid grid-cols-2 gap-4">
                  {quote.calculated_volume && (
                    <div className="p-3 bg-primary/5 rounded-lg">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                        <Ruler className="h-3 w-3" />
                        Volumen
                      </div>
                      <p className="font-semibold font-mono">{quote.calculated_volume.toFixed(2)} cm³</p>
                    </div>
                  )}

                  {quote.calculation_details?.dimensions && (
                    <div className="p-3 bg-primary/5 rounded-lg">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                        <Layers className="h-3 w-3" />
                        Dimensiones
                      </div>
                      <p className="font-semibold font-mono text-xs">
                        {quote.calculation_details.dimensions.x.toFixed(1)}×
                        {quote.calculation_details.dimensions.y.toFixed(1)}×
                        {quote.calculation_details.dimensions.z.toFixed(1)} cm
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {quote.calculation_details?.preview && <Separator />}

            {/* Vista Previa 3D */}
            {quote.calculation_details?.preview && (
              <div className="space-y-4">
                <h3 className="font-semibold">Vista Previa 3D</h3>
                <div className="rounded-lg overflow-hidden border bg-muted/30 max-w-md mx-auto">
                  <img 
                    src={quote.calculation_details.preview} 
                    alt="Vista previa 3D" 
                    className="w-full h-auto"
                  />
                </div>
              </div>
            )}

            {quote.estimated_price && <Separator />}

            {/* Precios */}
            {quote.estimated_price && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Precio Estimado</p>
                <p className="text-2xl font-bold text-primary">
                  €{parseFloat(quote.estimated_price).toFixed(2)}
                </p>
              </div>
            )}

            {/* Client Response History */}
            {quote.custom_text && (
              <>
                <Separator />
                <div className="space-y-4">
                  <h3 className="font-semibold flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Historial de Respuestas
                  </h3>
                  <QuoteResponseTimeline customText={quote.custom_text} />
                </div>
              </>
            )}

            {isPendingClientApproval && (
              <>
                <Separator />
                <div className="space-y-4">
                  <h3 className="font-semibold flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Tu respuesta a la cotización
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Revisa los cambios y confirma si apruebas la cotización o envía un comentario.
                  </p>
                  <Textarea
                    value={comment}
                    onChange={(event) => setComment(event.target.value)}
                    rows={3}
                    placeholder="Escribe un comentario para el administrador (opcional)"
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button
                      onClick={() => handleCustomerAction("approve")}
                      disabled={actionLoading}
                    >
                      Aprobar cambios
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => handleCustomerAction("reject")}
                      disabled={actionLoading}
                    >
                      Rechazar cambios
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleCustomerAction("comment")}
                      disabled={actionLoading || !comment.trim()}
                    >
                      Enviar comentario
                    </Button>
                  </div>
                </div>
              </>
            )}

            {/* Notas Adicionales */}
            {quote.additional_notes && (
              <>
                <Separator />
                <div className="space-y-2">
                  <h3 className="font-semibold flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Notas Adicionales
                  </h3>
                  <div className="p-4 bg-muted/30 rounded-lg">
                    <RichTextDisplay content={quote.additional_notes} />
                  </div>
                </div>
              </>
            )}

            {/* Descripción del Servicio */}
            {quote.service_description && (
              <>
                <Separator />
                <div className="space-y-2">
                  <h3 className="font-semibold flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Descripción del Servicio
                  </h3>
                  <div className="p-4 bg-muted/30 rounded-lg">
                    <RichTextDisplay content={quote.service_description} />
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
