import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTranslation } from "react-i18next";

function generateGiftCardCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 16; i++) {
    if (i > 0 && i % 4 === 0) code += "-";
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export default function GiftCard() {
  const { t } = useTranslation('giftCards');
  const navigate = useNavigate();
  const [buyForm, setBuyForm] = useState({
    amount: "",
    customAmount: "",
    recipientEmail: "",
    senderName: "",
    message: ""
  });
  const [checkCode, setCheckCode] = useState("");
  const [balance, setBalance] = useState<number | null>(null);

  const handleBuyGiftCard = async () => {
    try {
      const amount = buyForm.amount === "custom" 
        ? parseFloat(buyForm.customAmount)
        : parseFloat(buyForm.amount);

      if (!amount || amount <= 0) {
        toast.error(t('invalidAmount'));
        return;
      }

      if (!buyForm.recipientEmail || !buyForm.senderName) {
        toast.error(t('fillRequiredFields'));
        return;
      }

      // Generate gift card code
      const code = generateGiftCardCode();

      // Create gift card in database (NO crear el pedido aquí)
      // Crear tarjeta vía función (soporta invitados)
      const { data: fcRes, error: fcError } = await supabase.functions.invoke('create-gift-card', {
        body: {
          code,
          amount,
          recipient_email: buyForm.recipientEmail,
          sender_name: buyForm.senderName,
          message: buyForm.message || null
        }
      });

      if (fcError || !fcRes?.success) {
        throw new Error(fcRes?.message || t('errorLoadingCard'));
      }

      // Store gift card info for Payment page (incluir código para las notas del pedido)
      const cartItem = {
        id: `giftcard-${code}`,
        productId: null,
        name: `${t('title')} €${amount}`,
        price: amount,
        quantity: 1,
        isGiftCard: true,
        giftCardCode: code,
        giftCardRecipient: buyForm.recipientEmail,
        giftCardSender: buyForm.senderName,
        giftCardMessage: buyForm.message || null
      };
      
      localStorage.setItem("cart", JSON.stringify([cartItem]));

      // Save shipping info in session storage (required for payment flow)
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      // Preparar información de envío (funciona con o sin usuario autenticado)
      const shippingInfo = {
        full_name: buyForm.senderName,
        email: buyForm.recipientEmail,
        phone: "",
        address: "N/A - Tarjeta Digital",
        city: "N/A",
        postal_code: "00000",
        country: "Digital"
      };

      if (currentUser) {
        // Si hay usuario, cargar sus datos del perfil
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, email, phone")
          .eq("id", currentUser.id)
          .single();

        if (profile) {
          shippingInfo.full_name = profile.full_name || buyForm.senderName;
          shippingInfo.email = profile.email || buyForm.recipientEmail;
          shippingInfo.phone = profile.phone || "";
        }

        // Create checkout session para usuarios autenticados
        const { data: session } = await supabase
          .from("checkout_sessions")
          .insert({
            user_id: currentUser.id,
            shipping_info: shippingInfo
          })
          .select()
          .single();

        if (session) {
          sessionStorage.setItem("checkout_session_id", session.id);
        }
      } else {
        // Para usuarios NO autenticados, crear sesión sin user_id
        const { data: session } = await supabase
          .from("checkout_sessions")
          .insert({
            user_id: null,
            shipping_info: shippingInfo
          })
          .select()
          .single();

        if (session) {
          sessionStorage.setItem("checkout_session_id", session.id);
        }
      }

      toast.success("Tarjeta creada. Redirigiendo al pago...");
      
      // Redirect to payment page (el pedido se creará allí)
      navigate("/pago");
      
    } catch (error) {
      toast.error(t('errorProcessing', { defaultValue: 'Error al procesar la solicitud' }));
    }
  };

  const handleCheckBalance = async () => {
    try {
      const { data, error } = await supabase
        .from("gift_cards")
        .select("current_balance, is_active")
        .eq("code", checkCode.toUpperCase())
        .single();

      if (error || !data) {
        toast.error(t('cardNotFound'));
        setBalance(null);
        return;
      }

      if (!data.is_active) {
        toast.error(t('inactive'));
        setBalance(null);
        return;
      }

      setBalance(data.current_balance);
      toast.success(t('balanceSuccess', { defaultValue: 'Saldo consultado exitosamente' }));
    } catch (error) {
      toast.error(t('errorCheckingBalance', { defaultValue: 'Error al consultar saldo' }));
      setBalance(null);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-4xl font-bold mb-8">{t('title')}</h1>

      <Tabs defaultValue="buy" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="buy">{t('buyCard')}</TabsTrigger>
          <TabsTrigger value="check">{t('checkBalance')}</TabsTrigger>
        </TabsList>

        <TabsContent value="buy">
          <Card>
            <CardHeader>
              <CardTitle>{t('buyCardTitle')}</CardTitle>
              <CardDescription>{t('buyCardDescription')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>{t('amount')}</Label>
                <Select
                  value={buyForm.amount}
                  onValueChange={(value) => setBuyForm({ ...buyForm, amount: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('selectAmount')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="25">€25</SelectItem>
                    <SelectItem value="50">€50</SelectItem>
                    <SelectItem value="100">€100</SelectItem>
                    <SelectItem value="200">€200</SelectItem>
                    <SelectItem value="custom">{t('customAmount')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {buyForm.amount === "custom" && (
                <div>
                  <Label>{t('customAmount')}</Label>
                  <Input
                    type="number"
                    placeholder={t('customAmountPlaceholder')}
                    value={buyForm.customAmount}
                    onChange={(e) => setBuyForm({ ...buyForm, customAmount: e.target.value })}
                  />
                </div>
              )}

              <div>
                <Label>{t('recipientEmail')} *</Label>
                <Input
                  type="email"
                  placeholder={t('recipientEmailPlaceholder')}
                  value={buyForm.recipientEmail}
                  onChange={(e) => setBuyForm({ ...buyForm, recipientEmail: e.target.value })}
                />
              </div>

              <div>
                <Label>{t('yourName')} *</Label>
                <Input
                  placeholder={t('yourNamePlaceholder')}
                  value={buyForm.senderName}
                  onChange={(e) => setBuyForm({ ...buyForm, senderName: e.target.value })}
                />
              </div>

              <div>
                <Label>{t('message')}</Label>
                <Textarea
                  placeholder={t('messagePlaceholder')}
                  value={buyForm.message}
                  onChange={(e) => setBuyForm({ ...buyForm, message: e.target.value })}
                  rows={4}
                />
              </div>

              <Button onClick={handleBuyGiftCard} className="w-full">
                {t('buyGiftCard')}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="check">
          <Card>
            <CardHeader>
              <CardTitle>{t('checkBalanceTitle')}</CardTitle>
              <CardDescription>{t('checkBalanceDescription')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>{t('cardCode')}</Label>
                <Input
                  placeholder={t('cardCodePlaceholder')}
                  value={checkCode}
                  onChange={(e) => setCheckCode(e.target.value.toUpperCase())}
                />
              </div>

              <Button onClick={handleCheckBalance} className="w-full">
                {t('checkBalance')}
              </Button>

              {balance !== null && (
                <div className="mt-4 p-4 bg-primary/10 rounded-lg">
                  <p className="text-center text-2xl font-bold">
                    {t('availableBalance', { defaultValue: 'Saldo Disponible' })}: €{balance.toFixed(2)}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
