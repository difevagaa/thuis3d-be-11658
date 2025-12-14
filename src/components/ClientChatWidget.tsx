import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageCircle, X, Send, Loader2, Paperclip, FileText, Image as ImageIcon, Video, Download, XCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";

interface Message {
  id: string;
  sender_name: string;
  sender_email: string;
  message: string;
  subject?: string;
  is_admin_message: boolean;
  is_read: boolean;
  attachments?: any;
  created_at: string;
}

interface Position {
  x: number;
  y: number;
}

export const ClientChatWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});
  const [unreadCount, setUnreadCount] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Draggable state
  const [position, setPosition] = useState<Position>(() => {
    const saved = localStorage.getItem('chatWidgetPosition');
    return saved ? JSON.parse(saved) : { x: 0, y: 0 };
  });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<Position>({ x: 0, y: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);

  const loadMessages = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return;

      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .or(`user_id.eq.${user.id},sender_email.eq.${user.email}`)
        .order("created_at", { ascending: true });

      if (error) throw error;
      
      // Parsear attachments si es necesario
      const parsedMessages = (data || []).map(msg => ({
        ...msg,
        attachments: typeof msg.attachments === 'string' 
          ? JSON.parse(msg.attachments) 
          : msg.attachments
      }));

      setMessages(parsedMessages);
    } catch (error) {
      console.error("Error loading messages:", error);
    }
  }, []);

  useEffect(() => {
    loadMessages();

    // Realtime subscription para nuevos mensajes
    const channel = supabase
      .channel('client-messages')
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
  }, [loadMessages]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    const count = messages.filter(m => m.is_admin_message && !m.is_read).length;
    setUnreadCount(count);
  }, [messages]);

  // Mark messages as read when chat is opened
  useEffect(() => {
    const markAsRead = async () => {
      if (isOpen && messages.length > 0) {
        const unreadAdminMessages = messages.filter(m => m.is_admin_message && !m.is_read);
        for (const msg of unreadAdminMessages) {
          await supabase
            .from("messages")
            .update({ is_read: true })
            .eq("id", msg.id);
        }
        if (unreadAdminMessages.length > 0) {
          loadMessages();
        }
      }
    };
    markAsRead();
  }, [isOpen, messages, loadMessages]);

  // Draggable handlers
  const handleDragStart = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    setDragStart({
      x: clientX - position.x,
      y: clientY - position.y
    });
  };

  const handleDragMove = useCallback((e: TouchEvent | MouseEvent) => {
    if (!isDragging) return;
    
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    const newX = clientX - dragStart.x;
    const newY = clientY - dragStart.y;
    
    // Limit to screen bounds
    const maxX = window.innerWidth - 60;
    const maxY = window.innerHeight - 60;
    
    const boundedX = Math.max(-maxX + 80, Math.min(0, newX));
    const boundedY = Math.max(-maxY + 80, Math.min(0, newY));
    
    setPosition({ x: boundedX, y: boundedY });
  }, [isDragging, dragStart]);

  const handleDragEnd = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
      localStorage.setItem('chatWidgetPosition', JSON.stringify(position));
    }
  }, [isDragging, position]);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleDragMove);
      window.addEventListener('mouseup', handleDragEnd);
      window.addEventListener('touchmove', handleDragMove);
      window.addEventListener('touchend', handleDragEnd);
      
      return () => {
        window.removeEventListener('mousemove', handleDragMove);
        window.removeEventListener('mouseup', handleDragEnd);
        window.removeEventListener('touchmove', handleDragMove);
        window.removeEventListener('touchend', handleDragEnd);
      };
    }
  }, [isDragging, handleDragMove, handleDragEnd]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!input.trim() && attachments.length === 0) || isLoading) return;

    setIsLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error("Debes iniciar sesión para enviar mensajes");
        return;
      }

      let attachmentData: any[] = [];
      
      if (attachments.length > 0) {
        toast.info("Subiendo archivos adjuntos...");
        attachmentData = await uploadAttachments(attachments);
      }

      const { error } = await supabase
        .from("messages")
        .insert([{
          user_id: user.id,
          sender_name: user.user_metadata?.full_name || user.email || 'Usuario',
          sender_email: user.email || '',
          message: input.trim() || '(Archivo adjunto)',
          subject: 'Mensaje de cliente',
          is_admin_message: false,
          attachments: attachmentData
        }]);

      if (error) throw error;

      toast.success("Mensaje enviado exitosamente");
      setInput("");
      setAttachments([]);
      setUploadProgress({});
      loadMessages();
    } catch (error: any) {
      console.error("Error:", error);
      toast.error(error.message || "Error al enviar mensaje");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter(file => {
      if (file.size > 50 * 1024 * 1024) { // 50MB
        toast.error(`${file.name} excede el límite de 50MB`);
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
        className="flex items-center gap-2 p-2 border rounded hover:bg-muted transition-colors max-w-xs"
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

  if (!isOpen) {
    return (
      <div 
        className="fixed z-50"
        style={{ 
          bottom: `${24 - position.y}px`, 
          right: `${24 - position.x}px`,
          touchAction: 'none'
        }}
      >
        <Button
          ref={buttonRef}
          onClick={() => {
            if (!isDragging) {
              setIsOpen(true);
              loadMessages();
            }
          }}
          onMouseDown={handleDragStart}
          onTouchStart={handleDragStart}
          className={`h-12 w-12 rounded-full shadow-lg transition-transform ${isDragging ? 'scale-110 cursor-grabbing' : 'cursor-grab hover:scale-105'}`}
          size="icon"
          aria-label="Abrir chat"
        >
          <MessageCircle className="h-5 w-5" />
        </Button>
        {unreadCount > 0 && (
          <Badge 
            variant="destructive" 
            className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-[10px] font-bold pointer-events-none"
          >
            {unreadCount}
          </Badge>
        )}
      </div>
    );
  }

  return (
    <Card className="fixed bottom-4 right-4 left-4 sm:left-auto sm:w-96 h-[80vh] sm:h-[500px] max-h-[600px] shadow-xl z-50 flex flex-col rounded-2xl overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 border-b">
        <div>
          <CardTitle className="text-lg">Chat con Soporte</CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Envíanos tus consultas y archivos
          </p>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}>
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
        <ScrollArea className="flex-1 p-4" ref={scrollRef}>
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.is_admin_message ? "justify-start" : "justify-end"}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg px-4 py-2 ${
                    message.is_admin_message
                      ? "bg-muted"
                      : "bg-primary text-primary-foreground"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-xs font-semibold">
                      {message.is_admin_message ? "Soporte" : "Tú"}
                    </p>
                    <p className="text-xs opacity-70">
                      {new Date(message.created_at).toLocaleTimeString('es-ES', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{message.message}</p>
                  
                  {message.attachments && message.attachments.length > 0 && (
                    <div className="mt-2 space-y-2">
                      {message.attachments.map((attachment: any, index: number) => (
                        <div key={index}>
                          {renderAttachment(attachment)}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-lg px-4 py-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
        
        {attachments.length > 0 && (
          <div className="px-4 py-2 border-t bg-muted/50">
            <p className="text-xs font-medium mb-2">Archivos a enviar:</p>
            <div className="space-y-1">
              {attachments.map((file, index) => (
                <div key={index} className="flex items-center gap-2 text-xs bg-background p-2 rounded">
                  {getFileIcon(file.name)}
                  <span className="flex-1 truncate">{file.name}</span>
                  <span className="text-muted-foreground">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeAttachment(index)}
                    className="h-6 w-6 p-0"
                  >
                    <XCircle className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-4 border-t">
          <div className="flex gap-2">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileSelect}
              className="hidden"
              accept="*/*"
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading}
              title="Adjuntar archivo (STL, imágenes, videos, etc.)"
            >
              <Paperclip className="h-4 w-4" />
            </Button>
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Escribe tu mensaje..."
              disabled={isLoading}
            />
            <Button type="submit" size="icon" disabled={isLoading || (!input.trim() && attachments.length === 0)}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Puedes enviar archivos STL, imágenes, videos, documentos (max 50MB)
          </p>
        </form>
      </CardContent>
    </Card>
  );
};
