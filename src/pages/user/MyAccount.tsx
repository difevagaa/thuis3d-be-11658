import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useNavigate, useLocation } from "react-router-dom";
import { User, Package, MessageSquare, Gift, Award, FileText, Download, Paperclip, X, Image as ImageIcon } from "lucide-react";
import { SendAdminMessage } from "@/components/SendAdminMessage";
import GiftCardPrintable from "@/components/GiftCardPrintable";
import { RichTextDisplay } from "@/components/RichTextDisplay";
import { useTranslation } from "react-i18next";
import { i18nToast } from "@/lib/i18nToast";
import { logger } from "@/lib/logger";

export default function MyAccount() {
  const { t, i18n } = useTranslation(['account', 'common', 'messages']);
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [quotes, setQuotes] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [giftCards, setGiftCards] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loyaltyPoints, setLoyaltyPoints] = useState(0);
  const [lifetimePoints, setLifetimePoints] = useState(0);
  const [availableRewards, setAvailableRewards] = useState<any[]>([]);
  const [availableCoupons, setAvailableCoupons] = useState<any[]>([]);
  const [myRedemptions, setMyRedemptions] = useState<any[]>([]);
  const [myCoupons, setMyCoupons] = useState<any[]>([]);
  const [replyStates, setReplyStates] = useState<{[key: string]: { show: boolean; text: string; attachments: File[] }}>({});
  const [activeTab, setActiveTab] = useState("profile");
  const [showCouponNotification, setShowCouponNotification] = useState(false);
  const [newCouponNotification, setNewCouponNotification] = useState<any>(null);

  useEffect(() => {
    checkAuth();

    // Check for tab parameter in URL
    const params = new URLSearchParams(location.search);
    const tabParam = params.get('tab');
    if (tabParam) {
      setActiveTab(tabParam);
    }

    // Realtime subscription para tarjetas de regalo
    const giftCardsChannel = supabase
      .channel('gift-cards-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'gift_cards'
      }, async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profileData } = await supabase
            .from("profiles")
            .select("email")
            .eq("id", user.id)
            .single();
          
          if (profileData?.email) {
            const { data } = await supabase
              .from("gift_cards")
              .select("*")
              .eq("recipient_email", profileData.email)
              .is("deleted_at", null)
              .order("created_at", { ascending: false });
            
            setGiftCards(data || []);
          }
        }
      })
      .subscribe();

    // Realtime subscription para notificaciones
    const notificationsChannel = supabase
      .channel('notifications-changes')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${profile?.id}`
      }, (payload) => {
        const newNotification = payload.new;
        // Mostrar notificación de cupón disponible
        if (newNotification.type === 'loyalty_coupon_available' && !newNotification.is_read) {
          setNewCouponNotification(newNotification);
          setShowCouponNotification(true);
        }
        // Toast para otras notificaciones
        if (newNotification.type === 'loyalty_points') {
          toast.success(newNotification.title);
        }
      })
      .subscribe();

    // Realtime subscription para loyalty points
    const loyaltyChannel = supabase
      .channel('loyalty-points-changes')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'loyalty_points',
        filter: `user_id=eq.${profile?.id}`
      }, (payload) => {
        const newPoints = payload.new as any;
        setLoyaltyPoints(newPoints.points_balance || 0);
        setLifetimePoints(newPoints.lifetime_points || 0);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(giftCardsChannel);
      supabase.removeChannel(notificationsChannel);
      supabase.removeChannel(loyaltyChannel);
    };
  }, [location]);

  const checkAuth = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        i18nToast.error("error.unauthorized");
        navigate("/auth");
        return;
      }

      await loadUserData(user.id);
    } catch (error) {
      i18nToast.error("error.general");
    } finally {
      setLoading(false);
    }
  };

  const loadUserData = async (userId: string) => {
    try {
      const { data: profileData } = await supabase.from("profiles").select("*").eq("id", userId).single();
      
      const [ordersRes, quotesRes, messagesRes, pointsRes, giftCardsRes, invoicesRes, rewardsRes, redemptionsRes, couponsRes] = await Promise.all([
        supabase.from("orders").select("*").eq("user_id", userId).is("deleted_at", null).order("created_at", { ascending: false }),
        supabase.from("quotes").select("*").or(`user_id.eq.${userId},customer_email.eq.${profileData?.email || ""}`).is("deleted_at", null).order("created_at", { ascending: false }),
        supabase.from("messages").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
        supabase.from("loyalty_points").select("*").eq("user_id", userId).maybeSingle(),
        supabase.from("gift_cards").select("*").eq("recipient_email", profileData?.email || "").is("deleted_at", null).order("created_at", { ascending: false }),
        supabase.from("invoices").select("*, order:orders!invoices_order_id_fkey(order_number)").eq("user_id", userId).is("deleted_at", null).order("created_at", { ascending: false }),
        supabase.from("loyalty_rewards").select("*").eq("is_active", true).is("deleted_at", null).order("points_required"),
        supabase.from("loyalty_redemptions").select("*, loyalty_rewards:reward_id(name), coupons:coupon_code(code, discount_type, discount_value, min_purchase, is_active, times_used, max_uses)").eq("user_id", userId).order("created_at", { ascending: false }),
        supabase.from("coupons").select("*, product:products(name)").eq("is_loyalty_reward", true).eq("is_active", true).is("deleted_at", null).not("points_required", "is", null).order("points_required")
      ]);

      setProfile(profileData);
      setOrders(ordersRes.data || []);
      setQuotes(quotesRes.data || []);
      setMessages(messagesRes.data || []);
      setLoyaltyPoints(pointsRes.data?.points_balance || 0);
      setLifetimePoints(pointsRes.data?.lifetime_points || 0);
      setGiftCards(giftCardsRes.data || []);
      setInvoices(invoicesRes.data || []);
      setAvailableRewards(rewardsRes.data || []);
      setMyRedemptions(redemptionsRes.data || []);
      setAvailableCoupons(couponsRes.data || []);
      
      // Cargar cupones canjeados directamente desde loyalty_redemptions
      const userCoupons = redemptionsRes.data?.map(redemption => ({
        id: redemption.id,
        code: redemption.coupon_code,
        discount_type: 'percentage', // Default, idealmente obtenerlo del cupón original
        discount_value: 10, // Default
        created_at: redemption.created_at,
        status: redemption.status,
        reward_name: redemption.loyalty_rewards?.name || 'Cupón de Lealtad'
      })) || [];
      
      setMyCoupons(userCoupons);
    } catch (error) {
      logger.error("Error loading user data:", error);
    }
  };

  const updateProfile = async () => {
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: profile.full_name,
          phone: profile.phone,
          address: profile.address,
          city: profile.city,
          postal_code: profile.postal_code,
          country: profile.country
        })
        .eq("id", profile.id);

      if (error) throw error;
      i18nToast.success("success.profileUpdated");
    } catch (error) {
      i18nToast.error("error.profileUpdateFailed");
    }
  };

  const toggleReply = (messageId: string) => {
    setReplyStates(prev => ({
      ...prev,
      [messageId]: {
        show: !prev[messageId]?.show,
        text: prev[messageId]?.text || "",
        attachments: prev[messageId]?.attachments || []
      }
    }));
  };

  const updateReplyText = (messageId: string, text: string) => {
    setReplyStates(prev => ({
      ...prev,
      [messageId]: {
        ...prev[messageId],
        text
      }
    }));
  };

  const handleReplyFileSelect = (messageId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter(file => {
      if (file.size > 10 * 1024 * 1024) {
        i18nToast.error("error.fileTooLarge", { filename: file.name, size: "10" });
        return false;
      }
      return true;
    });
    
    setReplyStates(prev => ({
      ...prev,
      [messageId]: {
        ...prev[messageId],
        attachments: [...(prev[messageId]?.attachments || []), ...validFiles]
      }
    }));
  };

  const removeReplyAttachment = (messageId: string, index: number) => {
    setReplyStates(prev => ({
      ...prev,
      [messageId]: {
        ...prev[messageId],
        attachments: prev[messageId]?.attachments.filter((_, i) => i !== index) || []
      }
    }));
  };

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

  const replyToMessage = async (messageId: string, replyText: string) => {
    if (!replyText.trim() || !profile) return;
    
    try {
      const originalMessage = messages.find(m => m.id === messageId);
      const replyState = replyStates[messageId];
      
      let attachmentData: any[] = [];
      
      if (replyState?.attachments && replyState.attachments.length > 0) {
        i18nToast.info("info.uploadingFiles");
        attachmentData = await uploadAttachments(replyState.attachments);
      }
      
      const { error } = await supabase
        .from("messages")
        .insert([{
          sender_name: profile.full_name || "Cliente",
          sender_email: profile.email,
          message: replyText,
          subject: `Re: ${originalMessage?.subject || 'Respuesta'}`,
          parent_message_id: messageId,
          is_admin_message: false,
          user_id: profile.id,
          attachments: attachmentData
        }]);

      if (error) throw error;
      i18nToast.success("success.replySent");
      
      // Clear reply state
      setReplyStates(prev => ({
        ...prev,
        [messageId]: { show: false, text: "", attachments: [] }
      }));
      
      loadUserData(profile.id);
    } catch (error: any) {
      logger.error("Error sending reply:", error);
      i18nToast.error("error.replyFailed");
    }
  };

  const renderAttachment = (attachment: any) => {
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

  if (loading) return <div>{t('account:loading')}</div>;

  return (
    <div className="container mx-auto px-4 py-4 pb-24 md:px-6 md:py-6 md:pb-12 min-h-screen">
      <h1 className="text-2xl md:text-3xl font-bold mb-4 md:mb-6">{t('account:title')}</h1>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 md:grid-cols-7 gap-1 h-auto p-1 bg-muted/50">
          <TabsTrigger value="profile" className="flex-col md:flex-row gap-1 py-2 md:py-2.5 text-xs md:text-sm">
            <User className="h-4 w-4" />
            <span className="hidden md:inline">{t('account:tabs.profile')}</span>
            <span className="md:hidden">{t('account:tabs.profileShort')}</span>
          </TabsTrigger>
          <TabsTrigger value="orders" className="flex-col md:flex-row gap-1 py-2 md:py-2.5 text-xs md:text-sm">
            <Package className="h-4 w-4" />
            <span className="hidden md:inline">{t('account:tabs.orders')}</span>
            <span className="md:hidden">{t('account:tabs.ordersShort')}</span>
          </TabsTrigger>
          <TabsTrigger value="invoices" className="flex-col md:flex-row gap-1 py-2 md:py-2.5 text-xs md:text-sm">
            <FileText className="h-4 w-4" />
            <span className="hidden md:inline">{t('account:tabs.invoices')}</span>
            <span className="md:hidden">{t('account:tabs.invoicesShort')}</span>
          </TabsTrigger>
          <TabsTrigger value="quotes" className="flex-col md:flex-row gap-1 py-2 md:py-2.5 text-xs md:text-sm">
            <MessageSquare className="h-4 w-4" />
            <span className="hidden md:inline">{t('account:tabs.quotes')}</span>
            <span className="md:hidden">{t('account:tabs.quotesShort')}</span>
          </TabsTrigger>
          <TabsTrigger value="messages" className="flex-col md:flex-row gap-1 py-2 md:py-2.5 text-xs md:text-sm">
            <MessageSquare className="h-4 w-4" />
            <span className="hidden md:inline">{t('account:tabs.messages')}</span>
            <span className="md:hidden">{t('account:tabs.messagesShort')}</span>
          </TabsTrigger>
          <TabsTrigger value="points" className="flex-col md:flex-row gap-1 py-2 md:py-2.5 text-xs md:text-sm">
            <Award className="h-4 w-4" />
            <span className="hidden md:inline">{t('account:tabs.points')}</span>
            <span className="md:hidden">{t('account:tabs.pointsShort')}</span>
          </TabsTrigger>
          <TabsTrigger value="giftcards" className="flex-col md:flex-row gap-1 py-2 md:py-2.5 text-xs md:text-sm">
            <Gift className="h-4 w-4" />
            <span className="hidden md:inline">{t('account:tabs.giftcards')}</span>
            <span className="md:hidden">{t('account:tabs.giftcardsShort')}</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>{t('account:profile.title')}</CardTitle>
              <CardDescription>{t('account:profile.description')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>{t('account:profile.fullName')}</Label>
                <Input
                  value={profile?.full_name || ""}
                  onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                />
              </div>
              <div>
                <Label>{t('account:profile.email')}</Label>
                <Input value={profile?.email || ""} disabled />
              </div>
              <div>
                <Label>{t('account:profile.phone')}</Label>
                <Input
                  value={profile?.phone || ""}
                  onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                />
              </div>
              <div>
                <Label>{t('account:profile.address')}</Label>
                <Textarea
                  value={profile?.address || ""}
                  onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>{t('account:profile.city')}</Label>
                  <Input
                    value={profile?.city || ""}
                    onChange={(e) => setProfile({ ...profile, city: e.target.value })}
                    placeholder="Bruselas"
                  />
                </div>
                <div>
                  <Label>{t('account:profile.postalCode')}</Label>
                  <Input
                    value={profile?.postal_code || ""}
                    onChange={(e) => setProfile({ ...profile, postal_code: e.target.value })}
                    placeholder="1000"
                  />
                </div>
              </div>
              <div>
                <Label>{t('account:profile.country')}</Label>
                <Input
                  value={profile?.country || "Bélgica"}
                  onChange={(e) => setProfile({ ...profile, country: e.target.value })}
                  placeholder="Bélgica"
                />
              </div>
              <Button onClick={updateProfile}>{t('account:profile.saveChanges')}</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="orders">
          <Card>
            <CardHeader>
              <CardTitle>{t('account:orders.title')}</CardTitle>
              <CardDescription>{t('account:orders.description')}</CardDescription>
            </CardHeader>
            <CardContent>
              {orders.length > 0 ? (
                <div className="space-y-4">
                  {orders.map((order) => (
                    <div 
                      key={order.id} 
                      className="border p-4 rounded-lg cursor-pointer hover:bg-accent transition-colors"
                      onClick={() => navigate(`/pedido/${order.id}`)}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <p className="font-semibold text-lg">{order.order_number}</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(order.created_at).toLocaleDateString('es-ES', {
                              day: '2-digit',
                              month: 'long',
                              year: 'numeric'
                            })}
                          </p>
                          <div className="mt-2">
                            <Badge variant={order.payment_status === 'paid' ? 'default' : 'secondary'}>
                              {order.payment_status === 'paid' ? t('account:orders.paid') : t('account:orders.pending')}
                            </Badge>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-xl">€{Number(order.total).toFixed(2)}</p>
                          <Button variant="outline" size="sm" className="mt-2">
                            {t('account:orders.viewDetails')}
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">{t('account:orders.noOrders')}</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="quotes">
          <Card>
            <CardHeader>
              <CardTitle>{t('account:quotes.title')}</CardTitle>
              <CardDescription>{t('account:quotes.description')}</CardDescription>
            </CardHeader>
            <CardContent>
              {quotes.length > 0 ? (
                <div className="space-y-4">
                  {quotes.map((quote) => (
                    <div 
                      key={quote.id} 
                      className="border p-4 rounded-lg hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => navigate(`/cotizacion/${quote.id}`)}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <p className="font-semibold">
                            {quote.quote_type === 'file_upload' ? t('account:quotes.file3d') : 
                             quote.quote_type === 'service' ? t('account:quotes.service') : 
                             quote.quote_type}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(quote.created_at).toLocaleDateString('es-ES', { 
                              year: 'numeric', 
                              month: 'short', 
                              day: 'numeric' 
                            })}
                          </p>
                          {(quote.service_description || quote.additional_notes || quote.description) && (
                            <div className="text-sm text-muted-foreground mt-1 line-clamp-3">
                              <RichTextDisplay content={(quote.service_description || quote.additional_notes || quote.description) as string} />
                            </div>
                          )}
                        </div>
                        <div className="text-right flex flex-col items-end gap-2">
                          {quote.estimated_price && (
                            <p className="font-bold text-primary">€{parseFloat(quote.estimated_price).toFixed(2)}</p>
                          )}
                          <Button variant="outline" size="sm" onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/cotizacion/${quote.id}`);
                          }}>
                            {t('account:quotes.viewDetails')}
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">{t('account:quotes.noQuotes')}</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="giftcards">
          <Card>
            <CardHeader>
              <CardTitle>{t('account:giftcards.title')}</CardTitle>
              <CardDescription>{t('account:giftcards.description')}</CardDescription>
            </CardHeader>
            <CardContent>
              {giftCards.length > 0 ? (
                <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
                  {giftCards.map((card) => (
                    <div 
                      key={card.id} 
                      className="border rounded-lg overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
                      onClick={() => navigate(`/mis-tarjetas-regalo`, { state: { selectedCardId: card.id } })}
                    >
                      <div className="p-4 space-y-3">
                        {/* Tarjeta visual mejorada */}
                        <div className="w-full flex justify-center">
                          <GiftCardPrintable
                            code={card.code}
                            amount={card.current_balance}
                            message={card.message}
                            senderName={card.sender_name}
                            expiresAt={card.expires_at}
                            recipientEmail={card.recipient_email}
                          />
                        </div>
                        
                        {/* Estado y acciones */}
                        <div className="flex justify-between items-center pt-3 border-t">
                          <Badge variant={
                            !card.is_active ? 'secondary' : 
                            card.current_balance > 0 ? 'default' : 
                            'outline'
                          }>
                            {!card.is_active ? t('account:giftcards.notActivated') : 
                             card.current_balance > 0 ? t('account:giftcards.active') : 
                             t('account:giftcards.depleted')}
                          </Badge>
                          <Button variant="outline" size="sm">
                            {t('account:giftcards.viewCard')}
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">{t('account:giftcards.noGiftCards')}</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="messages">
          <Card>
            <CardHeader>
              <CardTitle>{t('account:messages.title')}</CardTitle>
              <CardDescription>{t('account:messages.description')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <SendAdminMessage />
              {messages.length > 0 ? (
                <div className="space-y-4">
                  {messages.map((message) => {
                    const replyState = replyStates[message.id] || { show: false, text: "", attachments: [] };
                    
                    return (
                      <div key={message.id} className="border p-4 rounded-lg">
                        <div className="flex justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold">{message.subject}</p>
                            {message.is_admin_message && (
                              <Badge variant="outline">{t('account:messages.fromAdmin')}</Badge>
                            )}
                          </div>
                          <span className={`text-xs px-2 py-1 rounded ${message.is_read ? 'bg-muted' : 'bg-primary text-primary-foreground'}`}>
                            {message.is_read ? t('account:messages.read') : t('account:messages.new')}
                          </span>
                        </div>
                        <p className="text-sm whitespace-pre-line">{message.message}</p>
                        <p className="text-xs text-muted-foreground mt-2">
                          {new Date(message.created_at).toLocaleString(i18n.language)}
                        </p>
                        
                        {message.attachments && message.attachments.length > 0 && (
                          <div className="mt-4 border-t pt-3">
                            <p className="text-sm font-medium mb-2">📎 {t('account:messages.attachments')} ({message.attachments.length})</p>
                            <div className="space-y-2">
                              {message.attachments.map((attachment: any, index: number) => (
                                <div key={index}>
                                  {renderAttachment(attachment)}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {message.is_admin_message && (
                          <div className="mt-4">
                            {!replyState.show ? (
                            <Button size="sm" variant="outline" onClick={() => toggleReply(message.id)}>
                              {t('account:messages.reply')}
                            </Button>
                            ) : (
                              <div className="space-y-2">
                                <Textarea
                                  value={replyState.text}
                                  onChange={(e) => updateReplyText(message.id, e.target.value)}
                                  placeholder={t('account:messages.writeReply')}
                                  rows={3}
                                />
                                
                                <div className="space-y-2">
                                  <Input
                                    type="file"
                                    multiple
                                    onChange={(e) => handleReplyFileSelect(message.id, e)}
                                    accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip"
                                    className="hidden"
                                    id={`reply-file-${message.id}`}
                                  />
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => document.getElementById(`reply-file-${message.id}`)?.click()}
                                  >
                                    <Paperclip className="h-4 w-4 mr-2" />
                                    {t('account:messages.attachFiles')}
                                  </Button>
                                  
                                  {replyState.attachments && replyState.attachments.length > 0 && (
                                    <div className="space-y-2">
                                      {replyState.attachments.map((file, index) => (
                                        <div key={index} className="flex items-center gap-2 p-2 border rounded text-sm">
                                          {file.type.startsWith('image/') ? (
                                            <ImageIcon className="h-4 w-4" />
                                          ) : (
                                            <FileText className="h-4 w-4" />
                                          )}
                                          <span className="flex-1 truncate">{file.name}</span>
                                          <span className="text-xs text-muted-foreground">
                                            {(file.size / 1024).toFixed(2)} KB
                                          </span>
                                          <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => removeReplyAttachment(message.id, index)}
                                          >
                                            <X className="h-3 w-3" />
                                          </Button>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                                
                                <div className="flex gap-2">
                                  <Button size="sm" onClick={() => {
                                    replyToMessage(message.id, replyState.text);
                                  }}>
                                    {t('account:messages.sendReply')}
                                  </Button>
                                  <Button size="sm" variant="outline" onClick={() => {
                                    toggleReply(message.id);
                                  }}>
                                    {t('account:messages.cancel')}
                                  </Button>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">{t('account:messages.noMessages')}</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="points">
          <div className="space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="h-5 w-5" />
                    {t('account:points.availablePoints')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-5xl font-bold text-primary">{loyaltyPoints}</p>
                  <p className="text-sm text-muted-foreground mt-2">{t('account:points.lifetime')}: {lifetimePoints} {t('account:points.points')}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Gift className="h-5 w-5" />
                    {t('account:points.myRedemptions')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-5xl font-bold">{myRedemptions.length}</p>
                  <p className="text-sm text-muted-foreground mt-2">{t('account:points.redeemed')}</p>
                </CardContent>
              </Card>
            </div>

            {/* Cupones Disponibles */}
            <Card>
              <CardHeader>
                <CardTitle>{t('account:points.availableCoupons')}</CardTitle>
                <CardDescription>{t('account:points.availableCouponsDesc')}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {availableCoupons.map((coupon) => {
                    const canRedeem = loyaltyPoints >= (coupon.points_required || 0);
                    return (
                      <Card key={coupon.id} className={canRedeem ? "border-primary" : "opacity-60"}>
                        <CardHeader>
                          <CardTitle className="text-lg flex items-center justify-between">
                            <span>{coupon.code}</span>
                            <Badge variant="outline">
                              {coupon.discount_type === 'percentage' ? `${coupon.discount_value}%` : 
                               coupon.discount_type === 'fixed' ? `€${coupon.discount_value}` : 
                               t('account:points.freeShipping')}
                            </Badge>
                          </CardTitle>
                          <CardDescription>
                            {coupon.product ? t('account:points.forProduct', { product: coupon.product.name }) : t('account:points.allProducts')}
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-2xl font-bold">{coupon.points_required}</p>
                              <p className="text-xs text-muted-foreground">{t('account:points.points')}</p>
                            </div>
                            <Button 
                              disabled={!canRedeem}
                              onClick={async () => {
                                try {
                                  const { data: { user } } = await supabase.auth.getUser();
                                  if (!user) throw new Error("No autenticado");
                                  
                                  const response = await supabase.functions.invoke('redeem-loyalty-coupon', {
                                    body: { coupon_id: coupon.id }
                                  });

                                  if (response.error) throw response.error;
                                  
                                  i18nToast.success("success.couponGenerated", { code: response.data.coupon_code });
                                  await loadUserData(user.id);
                                } catch (error: any) {
                                  i18nToast.error("error.redeemFailed");
                                }
                              }}
                            >
                              {canRedeem ? t('account:points.redeem') : t('account:points.locked')}
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                  {availableCoupons.length === 0 && (
                    <p className="col-span-full text-center text-muted-foreground py-4">
                      {t('account:points.noCouponsAvailable')}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Mis Cupones Canjeados */}
            <Card>
              <CardHeader>
                <CardTitle>{t('account:points.myCoupons')}</CardTitle>
                <CardDescription>{t('account:points.myCouponsDesc')}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {myCoupons.map((coupon) => (
                    <div key={coupon.id} className="border p-4 rounded-lg bg-muted">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <p className="text-lg font-bold font-mono text-primary">{coupon.code}</p>
                            <Badge variant={coupon.status === 'active' ? "default" : "secondary"}>
                              {coupon.status === 'active' ? t('account:points.active') : coupon.status}
                            </Badge>
                          </div>
                          <p className="text-sm font-medium mb-1">{coupon.reward_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {t('account:points.redeemed_on')} {new Date(coupon.created_at).toLocaleDateString(i18n.language)}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            navigator.clipboard.writeText(coupon.code);
                            i18nToast.success("success.codeCopied");
                          }}
                        >
                          {t('account:points.copy')}
                        </Button>
                      </div>
                    </div>
                  ))}
                  {myCoupons.length === 0 && (
                    <p className="text-center text-muted-foreground py-4">
                      {t('account:points.noCouponsRedeemed')}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Recompensas Disponibles */}
            <Card>
              <CardHeader>
                <CardTitle>{t('account:points.otherRewards')}</CardTitle>
                <CardDescription>{t('account:points.otherRewardsDesc')}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {availableRewards.map((reward) => {
                    const canRedeem = loyaltyPoints >= reward.points_required;
                    return (
                      <Card key={reward.id} className={canRedeem ? "border-primary" : "opacity-60"}>
                        <CardHeader>
                          <CardTitle className="text-lg">{reward.name}</CardTitle>
                          <CardDescription>
                            {reward.reward_type === 'percentage' ? t('account:points.percentageDiscount', { value: reward.reward_value }) : 
                             t('account:points.fixedDiscount', { value: reward.reward_value })}
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-2xl font-bold">{reward.points_required}</p>
                              <p className="text-xs text-muted-foreground">{t('account:points.points')}</p>
                            </div>
                            <Button 
                              disabled={!canRedeem}
                              onClick={async () => {
                                try {
                                  const { data, error } = await supabase.rpc('redeem_loyalty_reward', {
                                    p_user_id: profile.id,
                                    p_reward_id: reward.id
                                  });
                                  if (error) throw error;
                                  i18nToast.success("success.couponGenerated", { code: data });
                                  loadUserData(profile.id);
                                } catch (error: any) {
                                  i18nToast.error("error.redeemFailed");
                                }
                              }}
                            >
                              {canRedeem ? t('account:points.redeem') : t('account:points.locked')}
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Historial de Canjes */}
            <Card>
              <CardHeader>
                <CardTitle>{t('account:points.myRedemptions')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {myRedemptions.map((redemption) => (
                    <div key={redemption.id} className="border p-4 rounded-lg">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium">{redemption.loyalty_rewards?.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(redemption.created_at).toLocaleDateString(i18n.language)}
                          </p>
                          <code className="text-xs bg-muted px-2 py-1 rounded mt-2 inline-block">
                            {redemption.coupon_code}
                          </code>
                        </div>
                        <Badge>{redemption.status === 'active' ? t('account:points.active') : redemption.status}</Badge>
                      </div>
                    </div>
                  ))}
                  {myRedemptions.length === 0 && (
                    <p className="text-center text-muted-foreground py-4">{t('account:points.noRewardsRedeemed')}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="invoices">
          <Card>
            <CardHeader>
              <CardTitle>{t('account:invoices.title')}</CardTitle>
              <CardDescription>{t('account:invoices.description')}</CardDescription>
            </CardHeader>
            <CardContent>
              {invoices.length > 0 ? (
                <div className="space-y-4">
                  {invoices.map((invoice) => (
                    <div key={invoice.id} className="border p-4 rounded-lg">
                      <div className="flex justify-between items-start gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <p className="font-semibold font-mono">{invoice.invoice_number}</p>
                            <Badge variant={
                              invoice.payment_status === 'paid' ? 'default' :
                              invoice.payment_status === 'pending' ? 'secondary' :
                              'destructive'
                            }>
                              {invoice.payment_status === 'paid' ? t('account:invoices.paidStatus') :
                               invoice.payment_status === 'pending' ? t('account:invoices.pendingStatus') :
                               invoice.payment_status === 'cancelled' ? t('account:invoices.cancelledStatus') :
                               invoice.payment_status}
                            </Badge>
                          </div>
                          
                          {invoice.order?.order_number && (
                            <p className="text-sm text-muted-foreground">
                              {t('account:invoices.order')}: {invoice.order.order_number}
                            </p>
                          )}
                          
                          <p className="text-sm text-muted-foreground">
                            {t('account:invoices.date')}: {new Date(invoice.issue_date).toLocaleDateString(i18n.language)}
                          </p>
                          
                          {invoice.notes && (
                            <div className="text-sm mt-2 text-muted-foreground">
                              <RichTextDisplay content={invoice.notes} />
                            </div>
                          )}
                        </div>
                        
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">{t('account:orders.total')}</p>
                          <p className="font-bold text-2xl">€{Number(invoice.total).toFixed(2)}</p>
                          
                          <div className="flex gap-2 mt-3">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => navigate(`/factura/${invoice.id}`)}
                            >
                              <FileText className="h-4 w-4 mr-1" />
                              {t('account:invoices.view')}
                            </Button>
                            
                            {invoice.payment_status === 'pending' && (
                              <Button
                                size="sm"
                                onClick={() => {
                                  // Guardar datos de factura en sessionStorage para el pago
                                  sessionStorage.setItem('invoice_payment', JSON.stringify({
                                    invoiceId: invoice.id,
                                    invoiceNumber: invoice.invoice_number,
                                    total: invoice.total,
                                    subtotal: invoice.subtotal,
                                    tax: invoice.tax,
                                    shipping: invoice.shipping || 0,
                                    discount: invoice.discount || 0
                                  }));
                                  navigate('/pago');
                                }}
                              >
                                💳 {t('account:invoices.payNow')}
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">{t('account:invoices.noInvoices')}</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
