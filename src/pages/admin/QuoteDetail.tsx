import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ArrowLeft, Download, User, Mail, Phone, MapPin, FileText, Package, Palette, Clock, Weight, Ruler, Layers, Settings, CheckCircle2, XCircle, Image as ImageIcon, File, Receipt, MessageSquare, Send } from "lucide-react";
import { Loader2 } from "lucide-react";
import { RichTextDisplay } from "@/components/RichTextDisplay";
import { logger } from '@/lib/logger';

export default function QuoteDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [quote, setQuote] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [taxEnabled, setTaxEnabled] = useState(true);
  const [updatingTax, setUpdatingTax] = useState(false);

  const loadQuoteDetail = useCallback(async () => {
    try {
      setLoading(true);
      logger.log('Loading quote detail for ID:', id);
      
      // Primero obtenemos la cotización
      const { data: quoteData, error: quoteError } = await supabase
        .from("quotes")
        .select(`
          *,
          quote_statuses(name, color),
          materials(name),
          colors(name, hex_code)
        `)
        .eq("id", id)
        .maybeSingle();

      if (quoteError) {
        logger.error('Supabase error loading quote:', quoteError);
        throw quoteError;
      }
      
      if (!quoteData) {
        logger.error('No quote found with id:', id);
        toast.error("Cotización no encontrada");
        setLoading(false);
        return;
      }

      // Luego obtenemos los datos del perfil si existe user_id
      let profileData = null;
      if (quoteData.user_id) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, email, phone")
          .eq("id", quoteData.user_id)
          .maybeSingle();
        
        profileData = profile;
      }

      // Combinamos los datos
      const data = {
        ...quoteData,
        profiles: profileData
      };

      logger.log('Quote data loaded:', data);
      setQuote(data);
      setTaxEnabled((data as any).tax_enabled ?? true);
    } catch (error: any) {
      logger.error("Error loading quote detail:", error);
      toast.error("Error al cargar detalles de la cotización");
    } finally {
      setLoading(false);
    }
  }, [id]); // Depends on id from useParams

  useEffect(() => {
    if (id) {
      loadQuoteDetail();
    }
  }, [id, loadQuoteDetail]); // Now includes loadQuoteDetail

  const handleDownloadFile = async (filePath?: string) => {
    const pathToDownload = filePath || quote?.file_storage_path;
    
    if (!pathToDownload) {
      toast.error("No hay archivo disponible");
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
      
      toast.success("Archivo descargado");
    } catch (error: any) {
      logger.error("Error downloading file:", error);
      toast.error("Error al descargar archivo");
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

  const handleTaxToggle = async (enabled: boolean) => {
    if (!id) return;
    
    try {
      setUpdatingTax(true);
      const { error } = await supabase
        .from('quotes')
        .update({ tax_enabled: enabled } as any)
        .eq('id', id);
      
      if (error) throw error;
      
      setTaxEnabled(enabled);
      setQuote({ ...quote, tax_enabled: enabled });
      toast.success(`IVA ${enabled ? 'habilitado' : 'deshabilitado'} para esta cotización`);
    } catch (error: any) {
      logger.error('Error updating tax setting:', error);
      toast.error('Error al actualizar configuración de IVA');
    } finally {
      setUpdatingTax(false);
    }
  };

  const extractAndDownloadImages = async (htmlContent: string, prefix: string = 'image') => {
    // Crear un elemento temporal para parsear el HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlContent;
    
    // Extraer todas las imágenes
    const images = tempDiv.querySelectorAll('img');
    
    if (images.length === 0) {
      toast.info("No hay imágenes para descargar");
      return;
    }
    
    // Descargar cada imagen
    for (let index = 0; index < images.length; index++) {
      const img = images[index];
      const src = img.getAttribute('src');
      if (!src) continue;
      
      // Si es data URI (base64)
      if (src.startsWith('data:')) {
        // Extraer el tipo de imagen y los datos base64
        const matches = src.match(/^data:image\/([a-zA-Z]+);base64,(.+)$/);
        if (matches) {
          const imageType = matches[1];
          const base64Data = matches[2];
          
          // Convertir base64 a blob
          const byteCharacters = atob(base64Data);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          const blob = new Blob([byteArray], { type: `image/${imageType}` });
          
          // Descargar
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${prefix}_${index + 1}.${imageType}`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }
      } else if (src.startsWith('http')) {
        // Descargar la imagen en calidad original via fetch
        try {
          const response = await fetch(src);
          if (!response.ok) throw new Error('Error al descargar');
          const blob = await response.blob();
          const mimeExt = blob.type.split('/').pop()?.split('+')[0] || 'png';
          const ext = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(mimeExt) ? mimeExt : 'png';
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${prefix}_${index + 1}.${ext}`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        } catch (err) {
          logger.error('Error downloading image from URL:', err);
          // Fallback: abrir en nueva pestaña
          window.open(src, '_blank');
        }
      }
    }
    
    toast.success(`${images.length} imagen(es) descargada(s)`);
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

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin/cotizaciones")}>
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
            {quote.quote_statuses?.name || 'Sin estado'}
          </Badge>
          {quote.file_storage_path && (
            <Button onClick={() => handleDownloadFile()}>
              <Download className="h-4 w-4 mr-2" />
              Descargar Archivo
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Información del Cliente */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Información del Cliente
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

            {quote.profiles?.phone && (
              <>
                <Separator />
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="h-4 w-4" />
                    <span>Teléfono</span>
                  </div>
                  <p className="font-medium">{quote.profiles.phone}</p>
                </div>
              </>
            )}

            <Separator />

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <FileText className="h-4 w-4" />
                <span>Tipo de cotización</span>
              </div>
              <Badge variant="outline">{quote.quote_type === 'file_upload' ? 'Archivo 3D' : quote.quote_type}</Badge>
            </div>

            {quote.user_id && (
              <>
                <Separator />
                <Button 
                  onClick={() => navigate(`/admin/mensajes?userId=${quote.user_id}&userName=${encodeURIComponent(quote.customer_name)}&userEmail=${encodeURIComponent(quote.customer_email)}`)}
                  className="w-full"
                  variant="default"
                >
                  <Send className="h-4 w-4 mr-2" />
                  Contactar Cliente
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {/* Detalles de la Cotización */}
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
                <h3 className="font-semibold text-sm flex items-center justify-between">
                  <span>Descripción</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => extractAndDownloadImages(quote.description, 'descripcion')}
                    className="h-8"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Descargar Imágenes
                  </Button>
                </h3>
                <div className="text-sm text-muted-foreground">
                  <RichTextDisplay content={quote.description} />
                </div>
              </div>
            )}

            {quote.custom_text && (
              <>
                <Separator />
                <div className="space-y-2">
                  <h3 className="font-semibold flex items-center gap-2 text-lg">
                    <MessageSquare className="h-5 w-5 text-primary" />
                    Respuesta del Cliente
                  </h3>
                  <div className="p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg space-y-2">
                    <div className="text-sm whitespace-pre-wrap">
                      {quote.custom_text.split('\n').map((line: string, idx: number) => {
                        const isApproval = line.includes('Aprobación del cliente');
                        const isRejection = line.includes('Rechazo del cliente');
                        const isComment = line.includes('Comentario del cliente');
                        
                        if (isApproval) {
                          return (
                            <div key={idx} className="font-medium text-green-700 dark:text-green-400 py-1 flex items-center gap-2">
                              <CheckCircle2 className="h-4 w-4" />
                              {line}
                            </div>
                          );
                        } else if (isRejection) {
                          return (
                            <div key={idx} className="font-medium text-red-700 dark:text-red-400 py-1 flex items-center gap-2">
                              <XCircle className="h-4 w-4" />
                              {line}
                            </div>
                          );
                        } else if (isComment) {
                          return (
                            <div key={idx} className="font-medium text-blue-700 dark:text-blue-400 py-1 flex items-center gap-2">
                              <MessageSquare className="h-4 w-4" />
                              {line}
                            </div>
                          );
                        } else {
                          return <div key={idx} className="text-gray-700 dark:text-gray-300 py-1">{line}</div>;
                        }
                      })}
                    </div>
                  </div>
                </div>
              </>
            )}

            <Separator />

            {/* Material y Color */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Package className="h-4 w-4" />
                  <span>Material</span>
                </div>
                <p className="font-medium">{quote.materials?.name || 'No especificado'}</p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Palette className="h-4 w-4" />
                  <span>Color</span>
                </div>
                {quote.colors ? (
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-4 h-4 rounded-full border"
                      style={{ backgroundColor: quote.colors.hex_code }}
                    />
                    <span className="font-medium">{quote.colors.name}</span>
                  </div>
                ) : (
                  <p className="font-medium">No especificado</p>
                )}
              </div>
            </div>

            <Separator />

            {/* Configuración Técnica de Impresión */}
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

            <Separator />

            {/* Datos Calculados */}
            {(quote.calculated_volume || quote.calculated_weight || quote.calculated_time_estimate) && (
              <>
                <div className="space-y-4">
                  <h3 className="font-semibold">Análisis del Archivo</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {quote.calculated_time_estimate && (
                      <div className="p-3 bg-primary/5 rounded-lg">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                          <Clock className="h-3 w-3" />
                          Tiempo estimado
                        </div>
                        <p className="font-semibold font-mono">
                          {Math.floor(quote.calculated_time_estimate)}h {Math.round((quote.calculated_time_estimate % 1) * 60)}min
                        </p>
                      </div>
                    )}

                    {quote.calculated_weight && (
                      <div className="p-3 bg-primary/5 rounded-lg">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                          <Weight className="h-3 w-3" />
                          Peso
                        </div>
                        <p className="font-semibold font-mono">{quote.calculated_weight.toFixed(1)}g</p>
                      </div>
                    )}

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
                <Separator />
              </>
            )}

            {/* Vista Previa 3D */}
            {quote.calculation_details?.preview && (
              <>
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
                <Separator />
              </>
            )}

            {/* Archivos Adjuntos del Servicio */}
            {quote.service_attachments && quote.service_attachments.length > 0 && (
              <>
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
                                    <span className="truncate max-w-[200px]" title={fileName}>{fileName}</span>
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
                                  variant="outline"
                                  onClick={() => handleDownloadFile(filePath)}
                                >
                                  <Download className="h-4 w-4 mr-1" />
                                  Descargar
                                </Button>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
                <Separator />
              </>
            )}

            {/* Cantidad */}
            {quote.quantity && quote.quantity > 1 && (
              <>
                <div className="p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <div className="flex items-start gap-3">
                    <Package className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div className="space-y-1">
                      <p className="font-semibold text-blue-900 dark:text-blue-100">
                        Pedido de {quote.quantity} unidades
                      </p>
                      <p className="text-xs text-blue-700 dark:text-blue-300">
                        📋 <strong>Política de precio mínimo:</strong> El precio mínimo se cobra UNA VEZ por pedido, no por unidad. 
                        Las piezas adicionales solo pagan el costo real de impresión.
                      </p>
                      {quote.estimated_price && (
                        <p className="text-xs text-blue-700 dark:text-blue-300 mt-2">
                          💡 Precio efectivo por unidad: <span className="font-semibold">€{(parseFloat(quote.estimated_price) / quote.quantity).toFixed(2)}</span>
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                <Separator />
              </>
            )}

            {/* Configuración de IVA */}
            <Card className="bg-muted/30">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Receipt className="h-5 w-5 text-primary" />
                    <div>
                      <Label htmlFor="tax-enabled" className="text-base font-semibold">
                        Aplicar IVA a esta cotización
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Define si se cobrará IVA al generar la factura
                      </p>
                    </div>
                  </div>
                  <Switch
                    id="tax-enabled"
                    checked={taxEnabled}
                    onCheckedChange={handleTaxToggle}
                    disabled={updatingTax}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Precios */}
            <div className="grid grid-cols-2 gap-4">
              {quote.calculated_material_cost && (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Costo Calculado Automáticamente</p>
                  <p className="text-2xl font-bold text-green-600">
                    €{parseFloat(quote.calculated_material_cost).toFixed(2)}
                  </p>
                </div>
              )}

              {quote.estimated_price && (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Precio Estimado Final{quote.quantity > 1 ? ` (${quote.quantity} unidades)` : ''}
                  </p>
                  <p className="text-2xl font-bold text-primary">
                    €{parseFloat(quote.estimated_price).toFixed(2)}
                  </p>
                  {taxEnabled && (
                    <p className="text-xs text-muted-foreground">
                      + IVA (se aplicará al aprobar)
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Notas Adicionales */}
            {quote.additional_notes && (
              <>
                <Separator />
                <div className="space-y-2">
                  <h3 className="font-semibold flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Notas Adicionales
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => extractAndDownloadImages(quote.additional_notes, 'notas')}
                      className="h-8"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Descargar Imágenes
                    </Button>
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
                  <h3 className="font-semibold flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Descripción del Servicio
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => extractAndDownloadImages(quote.service_description, 'servicio')}
                      className="h-8"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Descargar Imágenes
                    </Button>
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
