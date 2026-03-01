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

export default function UserQuoteDetail() {
  const { t, i18n } = useTranslation(['quoteDetail', 'common', 'account']);
  const { id } = useParams();
  const navigate = useNavigate();
  const [quote, setQuote] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [statusIds, setStatusIds] = useState<{ approved?: string; rejected?: string }>({});
  const [fileUrls, setFileUrls] = useState<Record<string, string>>({});

  const getLocale = () => {
    const lang = i18n.language;
    if (lang?.startsWith('nl')) return 'nl-BE';
    if (lang?.startsWith('en')) return 'en-GB';
    return 'es-ES';
  };

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

  const loadFileUrls = useCallback(async (filePaths: string[]) => {
    const urls: Record<string, string> = {};
    for (const filePath of filePaths) {
      const { data, error } = await supabase.storage
        .from('quote-files')
        .createSignedUrl(filePath, 3600);
      if (!error && data) urls[filePath] = data.signedUrl;
    }
    setFileUrls(urls);
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
      if (data?.file_storage_path) {
        const paths = String(data.file_storage_path).split(',').map((p: string) => p.trim()).filter(Boolean);
        if (paths.length > 0) loadFileUrls(paths);
      }
    } catch (error: any) {
      console.error("Error loading quote detail:", error);
      i18nToast.error("error.loadingQuoteFailed");
      navigate("/mi-cuenta?tab=quotes");
    } finally {
      setLoading(false);
    }
  }, [id, navigate, loadFileUrls]);

  useEffect(() => {
    loadStatusIds();
    if (id) {
      loadQuoteDetail();
    }
  }, [id, loadQuoteDetail, loadStatusIds]);

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
      a.download = pathToDownload.split('_').slice(1).join('_') || 'file';
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
    return fileUrls[filePath] || '';
  };

  const isImageFile = (fileName: string) => {
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
    return imageExtensions.some(ext => fileName.toLowerCase().endsWith(ext));
  };

  const handleCustomerAction = async (action: "approve" | "reject" | "comment") => {
    if (!quote || actionLoading) return;

    const trimmedComment = comment.trim();
    if (action === "comment" && !trimmedComment) {
      i18nToast.directWarning(t('messages.emptyComment'));
      return;
    }

    let statusId: string | undefined;
    if (action === "approve") {
      statusId = statusIds.approved;
    } else if (action === "reject") {
      statusId = statusIds.rejected;
    }
    if ((action === "approve" || action === "reject") && !statusId) {
      i18nToast.directError(t('messages.statusError'));
      return;
    }

    try {
      setActionLoading(true);
      const timestamp = new Date().toLocaleString(getLocale());
      const actionLabel = t(`actionLabels.${action}`);
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

      if (action === "approve") {
        i18nToast.directSuccess(t('messages.approved'));

        try {
          const { data, error: fnError } = await supabase.functions.invoke(
            'process-quote-approval',
            {
              body: {
                quote_id: quote.id,
                status_name: 'Aprobada',
                status_slug: 'approved',
                admin_name: quote.customer_name,
                invoked_by_customer: true
              }
            }
          );

          if (fnError) {
            console.error('Error in process-quote-approval:', fnError);
            i18nToast.directWarning(t('messages.approvedError'));
          } else if (data?.success) {
            let msg = t('messages.approvedSuccess');
            if (data.order) msg += ` ${t('messages.orderCreated', { number: data.order.order_number })}`;
            if (data.invoice) msg += ` ${t('messages.invoiceCreated', { number: data.invoice.invoice_number, total: data.invoice.total.toFixed(2) })}`;
            i18nToast.directSuccess(msg);

            setTimeout(() => navigate("/mi-cuenta?tab=invoices"), 2000);
          }
        } catch (autoErr) {
          console.error('Automation error:', autoErr);
          i18nToast.directWarning(t('messages.approvedAutoFailed'));
        }
      } else if (action === "reject") {
        i18nToast.directSuccess(t('messages.rejected'));
      } else {
        i18nToast.directSuccess(t('messages.commentSent'));
      }

      // Notify admins (admin-facing messages stay in Spanish as admin language)
      const adminMessages: Record<typeof action, string> = {
        approve: t('adminNotify.approved', { name: quote.customer_name }),
        reject: t('adminNotify.rejected', { name: quote.customer_name }),
        comment: t('adminNotify.commented', { name: quote.customer_name })
      };
      const adminMessage = adminMessages[action];

      await notifyAdminsWithBroadcast(
        "quote_update",
        t('adminNotify.subject'),
        `${adminMessage}${trimmedComment ? ` Comentario: "${trimmedComment}"` : ""}`,
        `/admin/cotizaciones/${quote.id}`
      );

      try {
        await supabase.functions.invoke("send-admin-notification", {
          body: {
            type: "quote",
            subject: t('adminNotify.subject'),
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
      i18nToast.directError(t('messages.actionFailed'));
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
        <p>{t('notFound')}</p>
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
            <h1 className="text-2xl md:text-3xl font-bold">{t('title')}</h1>
            <p className="text-muted-foreground">
              {new Date(quote.created_at).toLocaleDateString(getLocale(), { 
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
            {quote.quote_statuses?.name || t('pending')}
          </Badge>
          {quote.file_storage_path && (
            <Button onClick={() => handleDownloadFile()} size="sm">
              <Download className="h-4 w-4 mr-2" />
              {t('download')}
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Info */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              {t('information')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <User className="h-4 w-4" />
                <span>{t('name')}</span>
              </div>
              <p className="font-medium">{quote.customer_name}</p>
            </div>

            <Separator />

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Mail className="h-4 w-4" />
                <span>{t('email')}</span>
              </div>
              <p className="font-medium break-all">{quote.customer_email}</p>
            </div>

            <Separator />

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <FileText className="h-4 w-4" />
                <span>{t('type')}</span>
              </div>
              <Badge variant="outline">
                {quote.quote_type === 'file_upload' ? t('types.file_upload') : 
                 quote.quote_type === 'service' ? t('types.service') : 
                 quote.quote_type}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Project Details */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {t('projectDetails')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {quote.description && (
              <div className="space-y-2">
                <h3 className="font-semibold text-sm">{t('description')}</h3>
                <div className="text-sm text-muted-foreground">
                  <RichTextDisplay content={quote.description} />
                </div>
              </div>
            )}

            {quote.service_attachments && quote.service_attachments.length > 0 && (
              <>
                <Separator />
                <div className="space-y-4">
                  <h3 className="font-semibold flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    {t('attachments')} ({quote.service_attachments.length})
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {quote.service_attachments.map((filePath: string, idx: number) => {
                      const fileName = filePath.split('_').slice(2).join('_') || `file-${idx + 1}`;
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
                                  <Button size="sm" variant="ghost" onClick={() => handleDownloadFile(filePath)}>
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
                                <Button size="sm" variant="ghost" onClick={() => handleDownloadFile(filePath)}>
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

            {(quote.materials || quote.colors) && (
              <div className="grid grid-cols-2 gap-4">
                {quote.materials && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Package className="h-4 w-4" />
                      <span>{t('material')}</span>
                    </div>
                    <p className="font-medium">{quote.materials.name}</p>
                  </div>
                )}

                {quote.colors && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Palette className="h-4 w-4" />
                      <span>{t('color')}</span>
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

            {(quote.supports_required !== null || quote.layer_height || quote.let_team_decide_supports || quote.let_team_decide_layer) && (
              <div className="space-y-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  {t('printConfig')}
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-3 bg-muted/50 rounded-lg space-y-2">
                    <p className="text-xs text-muted-foreground">{t('supports')}</p>
                    {quote.let_team_decide_supports ? (
                      <Badge variant="secondary" className="text-xs">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        {t('teamDecision')}
                      </Badge>
                    ) : quote.supports_required !== null ? (
                      <Badge variant={quote.supports_required ? "default" : "outline"} className="text-xs">
                        {quote.supports_required ? <CheckCircle2 className="h-3 w-3 mr-1" /> : <XCircle className="h-3 w-3 mr-1" />}
                        {quote.supports_required ? t('supportsYes') : t('supportsNo')}
                      </Badge>
                    ) : (
                      <span className="text-sm">{t('common:notSpecified', { defaultValue: 'Not specified' })}</span>
                    )}
                  </div>

                  <div className="p-3 bg-muted/50 rounded-lg space-y-2">
                    <p className="text-xs text-muted-foreground">{t('layerHeight')}</p>
                    {quote.let_team_decide_layer ? (
                      <Badge variant="secondary" className="text-xs">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        {t('teamDecision')}
                      </Badge>
                    ) : quote.layer_height ? (
                      <p className="font-mono font-semibold">{quote.layer_height} mm</p>
                    ) : (
                      <span className="text-sm">{t('common:notSpecified', { defaultValue: 'Not specified' })}</span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {(quote.calculated_volume || quote.calculation_details?.dimensions) && <Separator />}

            {(quote.calculated_volume || quote.calculation_details?.dimensions) && (
              <div className="space-y-4">
                <h3 className="font-semibold">{t('fileAnalysis')}</h3>
                <div className="grid grid-cols-2 gap-4">
                  {quote.calculated_volume && (
                    <div className="p-3 bg-primary/5 rounded-lg">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                        <Ruler className="h-3 w-3" />
                        {t('volume')}
                      </div>
                      <p className="font-semibold font-mono">{quote.calculated_volume.toFixed(2)} cm³</p>
                    </div>
                  )}

                  {quote.calculation_details?.dimensions && (
                    <div className="p-3 bg-primary/5 rounded-lg">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                        <Layers className="h-3 w-3" />
                        {t('dimensions')}
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

            {quote.calculation_details?.preview && (
              <div className="space-y-4">
                <h3 className="font-semibold">{t('preview3d')}</h3>
                <div className="rounded-lg overflow-hidden border bg-muted/30 max-w-md mx-auto">
                  <img 
                    src={quote.calculation_details.preview} 
                    alt={t('preview3d')} 
                    className="w-full h-auto"
                  />
                </div>
              </div>
            )}

            {quote.estimated_price && <Separator />}

            {quote.estimated_price && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">{t('estimatedPrice')}</p>
                <p className="text-2xl font-bold text-primary">
                  €{parseFloat(quote.estimated_price).toFixed(2)}
                </p>
              </div>
            )}

            {isPendingClientApproval && (
              <>
                <Separator />
                <div className="space-y-4">
                  <h3 className="font-semibold flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    {t('yourResponse')}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {t('responseDescription')}
                  </p>
                  <Textarea
                    value={comment}
                    onChange={(event) => setComment(event.target.value)}
                    rows={3}
                    placeholder={t('commentPlaceholder')}
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button
                      onClick={() => handleCustomerAction("approve")}
                      disabled={actionLoading}
                    >
                      {t('approve')}
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => handleCustomerAction("reject")}
                      disabled={actionLoading}
                    >
                      {t('reject')}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleCustomerAction("comment")}
                      disabled={actionLoading || !comment.trim()}
                    >
                      {t('sendComment')}
                    </Button>
                  </div>
                </div>
              </>
            )}

            {quote.additional_notes && (
              <>
                <Separator />
                <div className="space-y-2">
                  <h3 className="font-semibold flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    {t('additionalNotes')}
                  </h3>
                  <div className="p-4 bg-muted/30 rounded-lg">
                    <RichTextDisplay content={quote.additional_notes} />
                  </div>
                </div>
              </>
            )}

            {quote.service_description && (
              <>
                <Separator />
                <div className="space-y-2">
                  <h3 className="font-semibold flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    {t('serviceDescription')}
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
