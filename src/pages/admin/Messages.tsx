import { useState, useEffect } from "react";
import { logger } from '@/lib/logger';
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Mail, MailOpen, PenSquare, Paperclip, X, Download, Image as ImageIcon, FileText, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import UserSearchSelector from "@/components/admin/UserSearchSelector";
import { sendNotificationWithBroadcast, notifyAdminsWithBroadcast } from "@/lib/notificationUtils";

export default function Messages() {
  const [messages, setMessages] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<any>(null);
  const [reply, setReply] = useState("");
  const [loading, setLoading] = useState(true);
  const [showComposeDialog, setShowComposeDialog] = useState(false);
  const [newMessage, setNewMessage] = useState({
    recipient_id: "",
    subject: "",
    message: ""
  });
  const [attachments, setAttachments] = useState<File[]>([]);
  const [replyAttachments, setReplyAttachments] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});

  useEffect(() => {
    loadMessages();
    loadUsers();

    // Realtime subscription
    const channel = supabase
      .channel('messages-changes')
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
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setMessages(data || []);
    } catch (error: any) {
      logger.error("Error loading messages:", error);
      toast.error("Error al cargar mensajes: " + (error.message || "Error desconocido"));
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email");

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      logger.error("Error loading users:", error);
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
      logger.error("Error marking as read:", error);
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
      
      const { data, error } = await supabase.storage
        .from('message-attachments')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('message-attachments')
        .getPublicUrl(fileName);

      uploadedUrls.push({
        name: file.name,
        url: publicUrl,
        size: file.size,
        type: file.type
      });

      setUploadProgress(prev => ({ ...prev, [file.name]: 100 }));
    }

    return uploadedUrls;
  };

  const sendReply = async () => {
    if (!selectedMessage || !reply.trim()) return;

    try {
      let attachmentData: any[] = [];
      
      if (replyAttachments.length > 0) {
        toast.info("Subiendo archivos adjuntos...");
        attachmentData = await uploadAttachments(replyAttachments);
      }

      const { error } = await supabase
        .from("messages")
        .insert([{
          sender_name: "Admin",
          sender_email: "admin@thuis3d.be",
          message: reply,
          subject: `Re: ${selectedMessage.subject || 'Respuesta'}`,
          parent_message_id: selectedMessage.id,
          is_admin_message: true,
          user_id: selectedMessage.user_id,
          attachments: attachmentData
        }]);

      if (error) throw error;
      toast.success("Respuesta enviada exitosamente");

      // Send notification to the client
      if (selectedMessage.user_id) {
        await sendNotificationWithBroadcast(
          selectedMessage.user_id,
          "new_message",
          "Nuevo mensaje del administrador",
          `Has recibido una respuesta a tu mensaje: "${selectedMessage.subject || 'Sin asunto'}"`,
          "/mi-cuenta?tab=messages"
        );
      }

      // Send email notification to the client
      if (selectedMessage.sender_email) {
        try {
          await supabase.functions.invoke("send-chat-notification-email", {
            body: {
              to_email: selectedMessage.sender_email,
              sender_name: "Equipo de soporte",
              message_preview: reply.substring(0, 200),
              is_admin: true,
              has_attachments: replyAttachments.length > 0,
              user_id: selectedMessage.user_id
            }
          });
        } catch {
          // Non-blocking email errors
        }
      }

      setReply("");
      setReplyAttachments([]);
      setUploadProgress({});
      await loadMessages();
    } catch (error: any) {
      logger.error("Error sending reply:", error);
      toast.error("Error al enviar respuesta: " + (error.message || "Error desconocido"));
    }
  };

  const sendNewMessage = async () => {
    if (!newMessage.recipient_id || !newMessage.message.trim()) {
      toast.error("Por favor completa todos los campos obligatorios");
      return;
    }

    if (newMessage.message.length > 1000) {
      toast.error("El mensaje no puede exceder 1000 caracteres");
      return;
    }

    try {
      let attachmentData: any[] = [];
      
      if (attachments.length > 0) {
        toast.info("Subiendo archivos adjuntos...");
        attachmentData = await uploadAttachments(attachments);
      }

      const { error } = await supabase
        .from("messages")
        .insert([{
          sender_name: "Admin",
          sender_email: "admin@thuis3d.be",
          message: newMessage.message,
          subject: newMessage.subject || 'Mensaje del Administrador',
          is_admin_message: true,
          user_id: newMessage.recipient_id,
          attachments: attachmentData
        }]);

      if (error) throw error;
      toast.success("Mensaje enviado exitosamente");

      // Send notification to the recipient
      if (newMessage.recipient_id) {
        await sendNotificationWithBroadcast(
          newMessage.recipient_id,
          "new_message",
          "Nuevo mensaje del administrador",
          `Has recibido un nuevo mensaje: "${newMessage.subject || 'Mensaje del Administrador'}"`,
          "/mi-cuenta?tab=messages"
        );

        // Send email notification to the recipient
        try {
          const { data: recipientProfile } = await supabase
            .from("profiles")
            .select("email, full_name")
            .eq("id", newMessage.recipient_id)
            .single();

          if (recipientProfile?.email) {
            await supabase.functions.invoke("send-chat-notification-email", {
              body: {
                to_email: recipientProfile.email,
                sender_name: "Equipo de soporte",
                message_preview: newMessage.message.substring(0, 200),
                is_admin: true,
                has_attachments: attachments.length > 0,
                user_id: newMessage.recipient_id
              }
            });
          }
        } catch {
          // Non-blocking email errors
        }
      }

      setNewMessage({ recipient_id: "", subject: "", message: "" });
      setAttachments([]);
      setUploadProgress({});
      setShowComposeDialog(false);
      await loadMessages();
    } catch (error: any) {
      logger.error("Error sending message:", error);
      toast.error("Error al enviar mensaje: " + (error.message || "Error desconocido"));
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, isReply: boolean = false) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter(file => {
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name} excede el límite de 10MB`);
        return false;
      }
      return true;
    });

    if (isReply) {
      setReplyAttachments(prev => [...prev, ...validFiles]);
    } else {
      setAttachments(prev => [...prev, ...validFiles]);
    }
  };

  const removeAttachment = (index: number, isReply: boolean = false) => {
    if (isReply) {
      setReplyAttachments(prev => prev.filter((_, i) => i !== index));
    } else {
      setAttachments(prev => prev.filter((_, i) => i !== index));
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este mensaje?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('messages')
        .delete()
        .eq('id', messageId);

      if (error) throw error;
      
      // Si el mensaje eliminado es el seleccionado, limpiar selección
      if (selectedMessage?.id === messageId) {
        setSelectedMessage(null);
        setReply("");
      }
      
      toast.success('Mensaje eliminado correctamente');
      await loadMessages();
    } catch (error: any) {
      logger.error('Error deleting message:', error);
      toast.error('Error al eliminar mensaje: ' + (error.message || 'Error desconocido'));
    }
  };

  const renderAttachment = (attachment: any, isPreview: boolean = false) => {
    const isImage = attachment.type?.startsWith('image/') || attachment.url?.match(/\.(jpg|jpeg|png|gif|webp)$/i);
    
    if (isImage && attachment.url) {
      return (
        <div className="relative group">
          <img 
            src={attachment.url} 
            alt={attachment.name}
            className="max-w-full max-h-48 rounded border object-contain"
          />
          <a
            href={attachment.url}
            download
            target="_blank"
            rel="noopener noreferrer"
            className="absolute top-2 right-2 p-2 bg-background/80 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <Download className="h-4 w-4" />
          </a>
        </div>
      );
    }

    return (
      <a
        href={attachment.url}
        download
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 p-3 border rounded hover:bg-muted transition-colors"
      >
        <FileText className="h-5 w-5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{attachment.name}</p>
          {attachment.size && (
            <p className="text-xs text-muted-foreground">
              {(attachment.size / 1024).toFixed(2)} KB
            </p>
          )}
        </div>
        <Download className="h-4 w-4" />
      </a>
    );
  };

  const unreadCount = messages.filter(m => !m.is_read && !m.is_admin_message).length;

  if (loading) return <div>Cargando...</div>;

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Bandeja de Entrada</h1>
        <div className="flex items-center gap-4">
          <Dialog open={showComposeDialog} onOpenChange={setShowComposeDialog}>
            <DialogTrigger asChild>
              <Button>
                <PenSquare className="h-4 w-4 mr-2" />
                Componer Mensaje
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nuevo Mensaje</DialogTitle>
                <DialogDescription>
                  Envía un mensaje a un usuario
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Destinatario *</Label>
                  <UserSearchSelector
                    value={newMessage.recipient_id}
                    onValueChange={(value) => setNewMessage({ ...newMessage, recipient_id: value })}
                    label=""
                    placeholder="Buscar usuario por nombre o email..."
                  />
                </div>
                <div>
                  <Label>Asunto</Label>
                  <Input
                    value={newMessage.subject}
                    onChange={(e) => setNewMessage({ ...newMessage, subject: e.target.value })}
                    placeholder="Asunto del mensaje"
                  />
                </div>
                <div>
                  <Label>Mensaje *</Label>
                  <Textarea
                    value={newMessage.message}
                    onChange={(e) => setNewMessage({ ...newMessage, message: e.target.value })}
                    placeholder="Escribe tu mensaje..."
                    rows={6}
                  />
                </div>
                
                <div>
                  <Label>Archivos Adjuntos</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="file"
                      multiple
                      onChange={(e) => handleFileSelect(e, false)}
                      accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip"
                      className="hidden"
                      id="new-message-file-input"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => document.getElementById('new-message-file-input')?.click()}
                    >
                      <Paperclip className="h-4 w-4 mr-2" />
                      Adjuntar Archivos
                    </Button>
                    <span className="text-sm text-muted-foreground">Max 10MB por archivo</span>
                  </div>
                  
                  {attachments.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {attachments.map((file, index) => (
                        <div key={index} className="flex items-center gap-2 p-2 border rounded">
                          {file.type.startsWith('image/') ? (
                            <ImageIcon className="h-4 w-4" />
                          ) : (
                            <FileText className="h-4 w-4" />
                          )}
                          <span className="flex-1 text-sm truncate">{file.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {(file.size / 1024).toFixed(2)} KB
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeAttachment(index, false)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <DialogFooter>
                <Button onClick={sendNewMessage} disabled={uploadProgress && Object.keys(uploadProgress).length > 0}>
                  {Object.keys(uploadProgress).length > 0 ? "Subiendo..." : "Enviar Mensaje"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Badge variant="default" className="text-lg px-4 py-2">
            {unreadCount} no leídos
          </Badge>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Mensajes</CardTitle>
            <CardDescription>Todos los mensajes recibidos</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {messages.filter(m => !m.is_admin_message).map((message) => (
                <div
                  key={message.id}
                  onClick={() => {
                    setSelectedMessage(message);
                    if (!message.is_read) markAsRead(message.id);
                  }}
                  className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                    selectedMessage?.id === message.id ? 'bg-primary/10 border-primary' : 'hover:bg-muted'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {message.is_read ? (
                          <MailOpen className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Mail className="h-4 w-4 text-primary" />
                        )}
                        <span className="font-semibold">{message.sender_name}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">{message.sender_email}</p>
                      {message.subject && (
                        <p className="text-sm font-medium mt-1">{message.subject}</p>
                      )}
                      <p className="text-sm mt-1 line-clamp-2">{message.message}</p>
                    </div>
                    {!message.is_read && (
                      <Badge variant="default" className="ml-2">Nuevo</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {new Date(message.created_at).toLocaleString()}
                  </p>
                </div>
              ))}
              {messages.filter(m => !m.is_admin_message).length === 0 && (
                <p className="text-center text-muted-foreground py-8">No hay mensajes</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Detalles del Mensaje</CardTitle>
            <CardDescription>
              {selectedMessage ? 'Responder al mensaje' : 'Selecciona un mensaje'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {selectedMessage ? (
              <div className="space-y-4">
                <div className="border-b pb-4">
                  <p className="font-semibold">{selectedMessage.sender_name}</p>
                  <p className="text-sm text-muted-foreground">{selectedMessage.sender_email}</p>
                  {selectedMessage.subject && (
                    <p className="text-sm font-medium mt-2">Asunto: {selectedMessage.subject}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-2">
                    {new Date(selectedMessage.created_at).toLocaleString()}
                  </p>
                </div>
                
                <div>
                  <p className="whitespace-pre-wrap">{selectedMessage.message}</p>
                </div>

                {selectedMessage.attachments && selectedMessage.attachments.length > 0 && (
                  <div className="border-t pt-4">
                    <p className="text-sm font-medium mb-3">📎 Archivos Adjuntos ({selectedMessage.attachments.length})</p>
                    <div className="space-y-2">
                      {selectedMessage.attachments.map((attachment: any, index: number) => (
                        <div key={index}>
                          {renderAttachment(attachment)}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="border-t pt-4 flex gap-2">
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDeleteMessage(selectedMessage.id)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Eliminar Mensaje
                  </Button>
                </div>

                <div className="border-t pt-4">
                  <label className="text-sm font-medium mb-2 block">Responder:</label>
                  <Textarea
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    placeholder="Escribe tu respuesta..."
                    rows={6}
                  />
                  
                  <div className="mt-3">
                    <Input
                      type="file"
                      multiple
                      onChange={(e) => handleFileSelect(e, true)}
                      accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip"
                      className="hidden"
                      id="reply-file-input"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => document.getElementById('reply-file-input')?.click()}
                    >
                      <Paperclip className="h-4 w-4 mr-2" />
                      Adjuntar Archivos
                    </Button>
                    
                    {replyAttachments.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {replyAttachments.map((file, index) => (
                          <div key={index} className="flex items-center gap-2 p-2 border rounded">
                            {file.type.startsWith('image/') ? (
                              <ImageIcon className="h-4 w-4" />
                            ) : (
                              <FileText className="h-4 w-4" />
                            )}
                            <span className="flex-1 text-sm truncate">{file.name}</span>
                            <span className="text-xs text-muted-foreground">
                              {(file.size / 1024).toFixed(2)} KB
                            </span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeAttachment(index, true)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  <Button onClick={sendReply} className="mt-4 w-full" disabled={Object.keys(uploadProgress).length > 0}>
                    {Object.keys(uploadProgress).length > 0 ? "Subiendo..." : "Enviar Respuesta"}
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                Selecciona un mensaje de la lista para ver sus detalles
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
