import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Download, User, Mail, FileText, Package, Palette, Ruler, Layers, Settings, CheckCircle2, XCircle, Image as ImageIcon, File } from "lucide-react";
import { Loader2 } from "lucide-react";
import { RichTextDisplay } from "@/components/RichTextDisplay";
import { i18nToast } from "@/lib/i18nToast";

export default function UserQuoteDetail() {
  const { t } = useTranslation(['common', 'account']);
  const { id } = useParams();
  const navigate = useNavigate();
  const [quote, setQuote] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadQuoteDetail();
    }
  }, [id]);

  const loadQuoteDetail = async () => {
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
          quote_statuses(name, color),
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
  };

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
