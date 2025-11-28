import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Mail, Paperclip, X, Image as ImageIcon, FileText } from "lucide-react";

export function SendAdminMessage() {
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);

  const uploadAttachments = async (files: File[]) => {
    const uploadedUrls: any[] = [];
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) throw new Error("Usuario no autenticado");

    for (const file of files) {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      
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
    }

    return uploadedUrls;
  };

  const handleSend = async () => {
    if (!message.trim()) {
      i18nToast.error("error.writeMessage");
      return;
    }

    try {
      setSending(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        i18nToast.error("error.mustLogin");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, email")
        .eq("id", user.id)
        .single();

      let attachmentData: any[] = [];
      
      if (attachments.length > 0) {
        i18nToast.info("info.uploadingFiles");
        attachmentData = await uploadAttachments(attachments);
      }

      // Get all admin users
      const { data: adminRoles } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin");

      if (!adminRoles || adminRoles.length === 0) {
        i18nToast.error("error.noAdminsAvailable");
        return;
      }

      // Send message to all admins
      for (const adminRole of adminRoles) {
        await supabase.from("messages").insert({
          sender_name: profile?.full_name || "Cliente",
          sender_email: profile?.email || user.email || "",
          subject: subject || "Mensaje de Cliente",
          message: message,
          user_id: adminRole.user_id,
          is_admin_message: false,
          attachments: attachmentData
        });
      }

      // Send email notification to admins
      try {
        await supabase.functions.invoke('send-admin-notification', {
          body: {
            type: 'message',
            subject: subject || 'Nuevo mensaje de cliente',
            message: `${profile?.full_name || 'Un cliente'} ha enviado un mensaje: ${message}`,
            customer_name: profile?.full_name || 'Cliente',
            customer_email: profile?.email || user.email || '',
            link: '/admin/mensajes'
          }
        });
      } catch (emailError) {
        console.error('Error sending admin email notification:', emailError);
      }

      i18nToast.success("success.adminMessageSent");
      setSubject("");
      setMessage("");
      setAttachments([]);
      setOpen(false);
    } catch (error: any) {
      console.error("Error sending message:", error);
      toast.error("Error al enviar mensaje: " + (error.message || "Error desconocido"));
    } finally {
      setSending(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter(file => {
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name} excede el límite de 10MB`);
        return false;
      }
      return true;
    });
    setAttachments(prev => [...prev, ...validFiles]);
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full">
          <Mail className="h-4 w-4 mr-2" />
          📧 Enviar Mensaje a Administradores
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Enviar Mensaje a Administradores</DialogTitle>
          <DialogDescription>
            Tu mensaje será enviado a todos los administradores del sitio
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Asunto (opcional)</Label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Asunto del mensaje"
            />
          </div>
          <div>
            <Label>Mensaje *</Label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Escribe tu mensaje aquí..."
              rows={6}
            />
          </div>
          
          <div>
            <Label>Archivos Adjuntos</Label>
            <div className="flex items-center gap-2">
              <Input
                type="file"
                multiple
                onChange={handleFileSelect}
                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip"
                className="hidden"
                id="user-message-file-input"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => document.getElementById('user-message-file-input')?.click()}
              >
                <Paperclip className="h-4 w-4 mr-2" />
                Adjuntar Archivos
              </Button>
              <span className="text-sm text-muted-foreground">Max 10MB</span>
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
                      onClick={() => removeAttachment(index)}
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
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSend} disabled={sending}>
            {sending ? "Enviando..." : "Enviar Mensaje"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
