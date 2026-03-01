import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Mail, MailOpen, Send, Paperclip, X, Download, Image as ImageIcon, FileText, Video } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { i18nToast } from "@/lib/i18nToast";

export default function UserMessages() {
  const { t } = useTranslation(['account', 'messages']);
  const [messages, setMessages] = useState<any[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<any>(null);
  const [reply, setReply] = useState("");
  const [loading, setLoading] = useState(true);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});

  useEffect(() => {
    loadMessages();

    // Realtime subscription
    const channel = supabase
      .channel('user-messages-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'messages'
      }, () => {
        loadMessages();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadMessages = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return;

      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .or(`user_id.eq.${user.id},sender_email.eq.${user.email}`)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setMessages(data || []);
    } catch (error: any) {
      console.error("Error loading messages:", error);
      i18nToast.error("error.loadingMessagesFailed");
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (messageId: string) => {
    try {
      const { error } = await supabase
        .from("messages")
        .update({ is_read: true })
        .eq("id", messageId);

      if (error) throw error;
      loadMessages();
    } catch (error) {
      console.error("Error marking as read:", error);
    }
  };

  const uploadAttachments = async (files: File[]) => {
    const uploadedUrls: any[] = [];
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) throw new Error("Usuario no autenticado");

    for (const file of files) {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      
      setUploadProgress(prev => ({ ...prev, [file.name]: 0 }));
      
      const { error } = await supabase.storage
        .from('message-attachments')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) throw error;

      const { data: signedData, error: signError } = await supabase.storage
        .from('message-attachments')
        .createSignedUrl(fileName, 86400);

      if (signError) throw signError;

      uploadedUrls.push({
        name: file.name,
        url: signedData.signedUrl,
        size: file.size,
        type: file.type
      });

      setUploadProgress(prev => ({ ...prev, [file.name]: 100 }));
    }

    return uploadedUrls;
  };

  const sendReply = async () => {
    if (!selectedConversation || (!reply.trim() && attachments.length === 0)) {
      i18nToast.error("error.writeMessageOrAttach");
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return;

      let attachmentData: any[] = [];
      
      if (attachments.length > 0) {
        i18nToast.info("info.uploadingFiles");
        attachmentData = await uploadAttachments(attachments);
      }

      const { error } = await supabase
        .from("messages")
        .insert([{
          user_id: user.id,
          sender_name: user.user_metadata?.full_name || user.email || 'Usuario',
          sender_email: user.email || '',
          message: reply.trim() || '(Archivo adjunto)',
          subject: `Re: ${selectedConversation.subject || 'Respuesta'}`,
          parent_message_id: selectedConversation.id,
          is_admin_message: false,
          attachments: attachmentData
        }]);

      if (error) throw error;
      i18nToast.success("success.replySent");
      setReply("");
      setAttachments([]);
      setUploadProgress({});
      loadMessages();
    } catch (error: any) {
      console.error("Error sending reply:", error);
      i18nToast.error("error.sendingReplyFailed");
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter(file => {
      if (file.size > 50 * 1024 * 1024) {
        i18nToast.error("error.fileTooLarge", { filename: file.name, size: "50" });
        return false;
      }
      return true;
    });

    setAttachments(prev => [...prev, ...validFiles]);
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const getFileIcon = (fileName: string) => {
    const ext = fileName.toLowerCase().split('.').pop();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext || '')) {
      return <ImageIcon className="h-4 w-4" />;
    }
    if (['mp4', 'mov', 'avi', 'mkv'].includes(ext || '')) {
      return <Video className="h-4 w-4" />;
    }
    return <FileText className="h-4 w-4" />;
  };

  const renderAttachment = (attachment: any) => {
    const isImage = attachment.type?.startsWith('image/') || attachment.url?.match(/\.(jpg|jpeg|png|gif|webp)$/i);
    const isVideo = attachment.type?.startsWith('video/') || attachment.url?.match(/\.(mp4|mov|avi|mkv)$/i);
    
    if (isImage && attachment.url) {
      return (
        <div className="relative group max-w-xs">
          <img 
            src={attachment.url} 
            alt={attachment.name}
            className="max-w-full rounded border cursor-pointer hover:opacity-90 transition-opacity"
            onClick={() => window.open(attachment.url, '_blank')}
          />
          <a
            href={attachment.url}
            download
            className="absolute top-2 right-2 p-2 bg-background/90 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <Download className="h-4 w-4" />
          </a>
        </div>
      );
    }

    if (isVideo && attachment.url) {
      return (
        <video 
          src={attachment.url} 
          controls 
          className="max-w-xs rounded border"
        />
      );
    }

    return (
      <a
        href={attachment.url}
        download
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 p-2 border rounded hover:bg-muted transition-colors"
      >
        {getFileIcon(attachment.name)}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium truncate">{attachment.name}</p>
          {attachment.size && (
            <p className="text-xs text-muted-foreground">
              {(attachment.size / 1024 / 1024).toFixed(2)} MB
            </p>
          )}
        </div>
        <Download className="h-4 w-4" />
      </a>
    );
  };

  const unreadCount = messages.filter(m => !m.is_read && m.is_admin_message).length;

  if (loading) return <div>Cargando...</div>;

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Mis Mensajes</h1>
          <p className="text-muted-foreground">Conversaciones con el equipo de soporte</p>
        </div>
        <Badge variant="default" className="text-lg px-4 py-2">
          {unreadCount} no leídos
        </Badge>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Conversaciones</CardTitle>
            <CardDescription>Tus mensajes y respuestas del equipo</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[600px]">
              <div className="space-y-2">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    onClick={() => {
                      setSelectedConversation(message);
                      if (!message.is_read && message.is_admin_message) {
                        markAsRead(message.id);
                      }
                    }}
                    className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                      selectedConversation?.id === message.id ? 'bg-primary/10 border-primary' : 'hover:bg-muted'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          {message.is_read || !message.is_admin_message ? (
                            <MailOpen className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <Mail className="h-4 w-4 text-primary" />
                          )}
                          <span className="font-semibold text-sm">
                            {message.is_admin_message ? "Soporte" : "Tú"}
                          </span>
                        </div>
                        {message.subject && (
                          <p className="text-sm font-medium mt-1">{message.subject}</p>
                        )}
                        <p className="text-sm mt-1 line-clamp-2">{message.message}</p>
                        {message.attachments && Array.isArray(message.attachments) && message.attachments.length > 0 && (
                          <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                            <Paperclip className="h-3 w-3" />
                            <span>{message.attachments.length} archivo(s)</span>
                          </div>
                        )}
                      </div>
                      {!message.is_read && message.is_admin_message && (
                        <Badge variant="default" className="ml-2">Nuevo</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      {new Date(message.created_at).toLocaleString('es-ES')}
                    </p>
                  </div>
                ))}
                {messages.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">
                    No hay mensajes. Usa el chat flotante para enviar tu primera consulta.
                  </p>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Detalles del Mensaje</CardTitle>
            <CardDescription>
              {selectedConversation ? 'Responder al mensaje' : 'Selecciona un mensaje'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {selectedConversation ? (
              <div className="space-y-4">
                <div className="border-b pb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant={selectedConversation.is_admin_message ? "default" : "secondary"}>
                      {selectedConversation.is_admin_message ? "Soporte" : "Tú"}
                    </Badge>
                    <p className="text-sm font-semibold">{selectedConversation.sender_name}</p>
                  </div>
                  <p className="text-sm text-muted-foreground">{selectedConversation.sender_email}</p>
                  {selectedConversation.subject && (
                    <p className="text-sm font-medium mt-2">Asunto: {selectedConversation.subject}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-2">
                    {new Date(selectedConversation.created_at).toLocaleString('es-ES')}
                  </p>
                </div>
                
                <div>
                  <p className="whitespace-pre-wrap">{selectedConversation.message}</p>
                </div>

                {selectedConversation.attachments && Array.isArray(selectedConversation.attachments) && selectedConversation.attachments.length > 0 && (
                  <div className="border-t pt-4">
                    <p className="text-sm font-medium mb-3">📎 Archivos Adjuntos ({selectedConversation.attachments.length})</p>
                    <div className="space-y-2">
                      {selectedConversation.attachments.map((attachment: any, index: number) => (
                        <div key={index}>
                          {renderAttachment(attachment)}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="border-t pt-4">
                  <Label>Responder</Label>
                  <Textarea
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    placeholder="Escribe tu respuesta..."
                    rows={4}
                    className="mt-2"
                  />

                  <div className="mt-3">
                    <div className="flex items-center gap-2">
                      <Input
                        type="file"
                        multiple
                        onChange={handleFileSelect}
                        accept="*/*"
                        className="hidden"
                        id="reply-file-input"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => document.getElementById('reply-file-input')?.click()}
                      >
                        <Paperclip className="h-4 w-4 mr-2" />
                        Adjuntar Archivos
                      </Button>
                      <span className="text-xs text-muted-foreground">Max 50MB</span>
                    </div>
                    
                    {attachments.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {attachments.map((file, index) => (
                          <div key={index} className="flex items-center gap-2 p-2 border rounded">
                            {getFileIcon(file.name)}
                            <span className="flex-1 text-sm truncate">{file.name}</span>
                            <span className="text-xs text-muted-foreground">
                              {(file.size / 1024 / 1024).toFixed(2)} MB
                            </span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeAttachment(index)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <Button 
                    onClick={sendReply} 
                    className="mt-3 w-full"
                    disabled={!reply.trim() && attachments.length === 0}
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Enviar Respuesta
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                Selecciona un mensaje para ver los detalles y responder
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
