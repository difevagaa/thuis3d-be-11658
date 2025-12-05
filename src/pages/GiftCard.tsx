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
import { useTranslation } from "react-i18next";
import { Gift, CreditCard, Mail, Search, Sparkles, Send, CheckCircle2, ShoppingCart, Heart, Palette } from "lucide-react";
import GiftCardPrintable from "@/components/GiftCardPrintable";
import { GIFT_CARD_THEMES, GIFT_CARD_ICONS, DEFAULT_THEME, DEFAULT_ICON } from "@/constants/giftCardThemes";

function generateGiftCardCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 16; i++) {
    if (i > 0 && i % 4 === 0) code += "-";
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Predefined amounts for gift cards
const GIFT_CARD_AMOUNTS = [25, 50, 100, 200];

export default function GiftCard() {
  const { t } = useTranslation('giftCards');
  const navigate = useNavigate();
  const [buyForm, setBuyForm] = useState({
    amount: "",
    customAmount: "",
    recipientEmail: "",
    senderName: "",
    message: "",
    themeId: DEFAULT_THEME.id,
    iconId: DEFAULT_ICON.id
  });
  const [checkCode, setCheckCode] = useState("");
  const [balance, setBalance] = useState<number | null>(null);
  const [showCustomAmount, setShowCustomAmount] = useState(false);

  // Calculate the display amount for preview
  // Show 0 when no amount selected yet, otherwise show the selected amount
  const displayAmount = buyForm.amount === "custom" 
    ? parseFloat(buyForm.customAmount) || 0
    : buyForm.amount ? parseFloat(buyForm.amount) : 0;

  // Handle amount selection
  const handleAmountSelect = (amount: number | "custom") => {
    if (amount === "custom") {
      setShowCustomAmount(true);
      setBuyForm({ ...buyForm, amount: "custom" });
    } else {
      setShowCustomAmount(false);
      setBuyForm({ ...buyForm, amount: amount.toString(), customAmount: "" });
    }
  };

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

      // Store customization in message as JSON metadata (backwards compatible)
      const customizationData = {
        themeId: buyForm.themeId,
        iconId: buyForm.iconId,
        userMessage: buyForm.message || null
      };
      const messageWithMetadata = JSON.stringify(customizationData);

      // Create gift card in database (NO crear el pedido aquí)
      // Crear tarjeta vía función (soporta invitados)
      const { data: fcRes, error: fcError } = await supabase.functions.invoke('create-gift-card', {
        body: {
          code,
          amount,
          recipient_email: buyForm.recipientEmail,
          sender_name: buyForm.senderName,
          message: messageWithMetadata
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
        giftCardMessage: buyForm.message || null,
        giftCardThemeId: buyForm.themeId,
        giftCardIconId: buyForm.iconId
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
    <div className="min-h-screen">
      {/* Hero Section with gradient background - Updated to neutral ocean theme */}
      <div className="relative overflow-hidden bg-gradient-to-br from-blue-400 via-cyan-400 to-teal-400 py-12 md:py-20">
        {/* Decorative elements */}
        <div className="absolute inset-0 opacity-20">
          <svg width="100%" height="100%">
            <defs>
              <pattern id="gift-hero-pattern" x="0" y="0" width="60" height="60" patternUnits="userSpaceOnUse">
                <circle cx="30" cy="30" r="3" fill="white" opacity="0.6" />
                <circle cx="10" cy="10" r="2" fill="white" opacity="0.4" />
                <circle cx="50" cy="50" r="2" fill="white" opacity="0.4" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#gift-hero-pattern)" />
          </svg>
        </div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-white/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
        
        <div className="container mx-auto px-4 relative z-10 text-center">
          <div className="flex justify-center mb-4">
            <div className="bg-white/20 backdrop-blur-md p-4 rounded-full">
              <Gift className="h-12 w-12 md:h-16 md:w-16 text-white" />
            </div>
          </div>
          <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold text-white mb-4 drop-shadow-lg">
            {t('title')}
          </h1>
          <p className="text-lg md:text-xl text-white/90 max-w-2xl mx-auto">
            {t('heroSubtitle', { defaultValue: 'El regalo perfecto para cualquier ocasión. Personalízala con tu mensaje especial.' })}
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 md:py-12">
        {/* How It Works Section */}
        <div className="mb-12">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-8">
            {t('howItWorks', { defaultValue: '¿Cómo funciona?' })}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <div className="text-center p-6 rounded-xl bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-800/20 border border-blue-200 dark:border-blue-700">
              <div className="bg-blue-500 text-white w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">1</div>
              <ShoppingCart className="h-8 w-8 text-blue-500 mx-auto mb-3" />
              <h3 className="font-semibold mb-2">{t('step1Title', { defaultValue: 'Elige el monto' })}</h3>
              <p className="text-sm text-muted-foreground">{t('step1Description', { defaultValue: 'Selecciona un monto predefinido o personalizado para tu tarjeta de regalo.' })}</p>
            </div>
            <div className="text-center p-6 rounded-xl bg-gradient-to-br from-teal-50 to-emerald-50 dark:from-teal-900/20 dark:to-emerald-800/20 border border-teal-200 dark:border-teal-700">
              <div className="bg-teal-500 text-white w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">2</div>
              <Mail className="h-8 w-8 text-teal-500 mx-auto mb-3" />
              <h3 className="font-semibold mb-2">{t('step2Title', { defaultValue: 'Personaliza' })}</h3>
              <p className="text-sm text-muted-foreground">{t('step2Description', { defaultValue: 'Añade un mensaje personal y los datos del destinatario.' })}</p>
            </div>
            <div className="text-center p-6 rounded-xl bg-gradient-to-br from-cyan-50 to-sky-50 dark:from-cyan-900/20 dark:to-sky-800/20 border border-cyan-200 dark:border-cyan-700">
              <div className="bg-cyan-500 text-white w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">3</div>
              <Send className="h-8 w-8 text-cyan-500 mx-auto mb-3" />
              <h3 className="font-semibold mb-2">{t('step3Title', { defaultValue: 'Envía' })}</h3>
              <p className="text-sm text-muted-foreground">{t('step3Description', { defaultValue: 'El destinatario recibirá la tarjeta digital lista para usar.' })}</p>
            </div>
          </div>
        </div>

        {/* Main Content with Tabs */}
        <Tabs defaultValue="buy" className="w-full max-w-5xl mx-auto">
          <TabsList className="grid w-full grid-cols-2 mb-8 h-14">
            <TabsTrigger value="buy" className="text-base md:text-lg gap-2 h-full">
              <Gift className="h-5 w-5" />
              {t('buyCard')}
            </TabsTrigger>
            <TabsTrigger value="check" className="text-base md:text-lg gap-2 h-full">
              <Search className="h-5 w-5" />
              {t('checkBalance')}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="buy">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Left side - Form */}
              <Card className="border-2 shadow-lg">
                <CardHeader className="bg-gradient-to-r from-blue-500/10 to-teal-500/10 border-b">
                  <div className="flex items-center gap-3">
                    <div className="bg-gradient-to-br from-blue-500 to-teal-600 p-2 rounded-lg">
                      <CreditCard className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <CardTitle>{t('buyCardTitle')}</CardTitle>
                      <CardDescription>{t('buyCardDescription')}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6 pt-6">
                  {/* Amount Selection */}
                  <div className="space-y-3">
                    <Label className="text-base font-semibold flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-blue-500" />
                      {t('amount')}
                    </Label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {GIFT_CARD_AMOUNTS.map((amount) => (
                        <button
                          key={amount}
                          type="button"
                          onClick={() => handleAmountSelect(amount)}
                          className={`p-4 rounded-xl border-2 transition-all duration-200 hover:scale-105 ${
                            buyForm.amount === amount.toString() && !showCustomAmount
                              ? 'bg-gradient-to-br from-blue-500 to-teal-600 text-white border-transparent shadow-lg'
                              : 'bg-card hover:bg-muted border-border hover:border-blue-300'
                          }`}
                        >
                          <span className="text-xl font-bold">€{amount}</span>
                        </button>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleAmountSelect("custom")}
                      className={`w-full p-3 rounded-xl border-2 transition-all duration-200 ${
                        showCustomAmount
                          ? 'bg-gradient-to-br from-blue-500 to-teal-600 text-white border-transparent'
                          : 'bg-card hover:bg-muted border-border hover:border-blue-300'
                      }`}
                    >
                      {t('customAmount', { defaultValue: 'Monto personalizado' })}
                    </button>
                    
                    {showCustomAmount && (
                      <div className="mt-3">
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold">€</span>
                          <Input
                            type="number"
                            placeholder={t('customAmountPlaceholder', { defaultValue: 'Ingresa el monto' })}
                            value={buyForm.customAmount}
                            onChange={(e) => setBuyForm({ ...buyForm, customAmount: e.target.value })}
                            className="pl-8 text-lg font-semibold h-12"
                            min="1"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Recipient Email */}
                  <div className="space-y-2">
                    <Label className="text-base font-semibold flex items-center gap-2">
                      <Mail className="h-4 w-4 text-teal-500" />
                      {t('recipientEmail')} *
                    </Label>
                    <Input
                      type="email"
                      placeholder={t('recipientEmailPlaceholder')}
                      value={buyForm.recipientEmail}
                      onChange={(e) => setBuyForm({ ...buyForm, recipientEmail: e.target.value })}
                      className="h-12"
                    />
                  </div>

                  {/* Sender Name */}
                  <div className="space-y-2">
                    <Label className="text-base font-semibold flex items-center gap-2">
                      <Heart className="h-4 w-4 text-cyan-500" />
                      {t('yourName')} *
                    </Label>
                    <Input
                      placeholder={t('yourNamePlaceholder')}
                      value={buyForm.senderName}
                      onChange={(e) => setBuyForm({ ...buyForm, senderName: e.target.value })}
                      className="h-12"
                    />
                  </div>

                  {/* Message */}
                  <div className="space-y-2">
                    <Label className="text-base font-semibold">{t('message')}</Label>
                    <Textarea
                      placeholder={t('messagePlaceholder')}
                      value={buyForm.message}
                      onChange={(e) => setBuyForm({ ...buyForm, message: e.target.value })}
                      rows={4}
                      className="resize-none"
                    />
                  </div>

                  {/* Color Theme Selection */}
                  <div className="space-y-3">
                    <Label className="text-base font-semibold flex items-center gap-2">
                      <Palette className="h-4 w-4 text-blue-500" />
                      Color de la Tarjeta
                    </Label>
                    <div className="grid grid-cols-4 gap-2">
                      {GIFT_CARD_THEMES.map((theme) => (
                        <button
                          key={theme.id}
                          type="button"
                          onClick={() => setBuyForm({ ...buyForm, themeId: theme.id })}
                          className={`relative p-3 rounded-lg border-2 transition-all duration-200 hover:scale-105 ${
                            buyForm.themeId === theme.id
                              ? 'border-blue-500 shadow-lg ring-2 ring-blue-300'
                              : 'border-gray-200 hover:border-blue-300'
                          }`}
                          title={theme.name}
                        >
                          <div className={`w-full h-8 rounded ${theme.bgGradient}`}></div>
                          {buyForm.themeId === theme.id && (
                            <div className="absolute -top-1 -right-1 bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">
                              ✓
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Icon Selection */}
                  <div className="space-y-3">
                    <Label className="text-base font-semibold flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-teal-500" />
                      Ícono de la Tarjeta
                    </Label>
                    <div className="grid grid-cols-5 gap-2">
                      {GIFT_CARD_ICONS.map((icon) => (
                        <button
                          key={icon.id}
                          type="button"
                          onClick={() => setBuyForm({ ...buyForm, iconId: icon.id })}
                          className={`p-3 rounded-lg border-2 transition-all duration-200 hover:scale-105 ${
                            buyForm.iconId === icon.id
                              ? 'border-teal-500 shadow-lg bg-teal-50 dark:bg-teal-900/20'
                              : 'border-gray-200 hover:border-teal-300'
                          }`}
                          title={icon.name}
                        >
                          <span className="text-2xl">{icon.emoji}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <Button 
                    onClick={handleBuyGiftCard} 
                    className="w-full h-14 text-lg font-semibold bg-gradient-to-r from-blue-500 to-teal-600 hover:from-blue-600 hover:to-teal-700 transition-all duration-300 shadow-lg hover:shadow-xl"
                    disabled={!buyForm.amount || (showCustomAmount && !buyForm.customAmount) || !buyForm.recipientEmail || !buyForm.senderName}
                  >
                    <Gift className="mr-2 h-5 w-5" />
                    {t('buyGiftCard')}
                  </Button>
                </CardContent>
              </Card>

              {/* Right side - Preview */}
              <div className="space-y-6">
                <div className="text-center lg:text-left">
                  <h3 className="text-lg font-semibold mb-2">{t('preview', { defaultValue: 'Vista previa' })}</h3>
                  <p className="text-sm text-muted-foreground">{t('previewDescription', { defaultValue: 'Así se verá tu tarjeta de regalo' })}</p>
                </div>
                
                <div className="flex justify-center lg:justify-start">
                  <GiftCardPrintable
                    code="XXXX-XXXX-XXXX-XXXX"
                    amount={displayAmount}
                    message={buyForm.message || t('defaultMessage', { defaultValue: '¡Felicidades! Este regalo es para ti.' })}
                    senderName={buyForm.senderName || t('yourNamePlaceholder')}
                    recipientEmail={buyForm.recipientEmail || t('recipientEmailPlaceholder')}
                    themeId={buyForm.themeId}
                    iconId={buyForm.iconId}
                  />
                </div>

                {/* Benefits */}
                <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-700">
                  <CardContent className="pt-6">
                    <h4 className="font-semibold mb-4 flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                      {t('benefitsTitle', { defaultValue: 'Beneficios' })}
                    </h4>
                    <ul className="space-y-3">
                      <li className="flex items-start gap-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span>{t('benefit1', { defaultValue: 'Entrega instantánea por correo electrónico' })}</span>
                      </li>
                      <li className="flex items-start gap-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span>{t('benefit2', { defaultValue: 'Válida para todos los productos de la tienda' })}</span>
                      </li>
                      <li className="flex items-start gap-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span>{t('benefit3', { defaultValue: 'Sin fecha de caducidad' })}</span>
                      </li>
                      <li className="flex items-start gap-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span>{t('benefit4', { defaultValue: 'Personalizable con tu mensaje' })}</span>
                      </li>
                    </ul>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="check">
            <div className="max-w-xl mx-auto">
              <Card className="border-2 shadow-lg">
                <CardHeader className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border-b">
                  <div className="flex items-center gap-3">
                    <div className="bg-gradient-to-br from-blue-500 to-cyan-600 p-2 rounded-lg">
                      <Search className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <CardTitle>{t('checkBalanceTitle')}</CardTitle>
                      <CardDescription>{t('checkBalanceDescription')}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6 pt-6">
                  <div className="space-y-2">
                    <Label className="text-base font-semibold flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-blue-500" />
                      {t('cardCode')}
                    </Label>
                    <Input
                      placeholder={t('cardCodePlaceholder')}
                      value={checkCode}
                      onChange={(e) => setCheckCode(e.target.value.toUpperCase())}
                      className="h-12 font-mono text-center text-lg tracking-widest"
                    />
                  </div>

                  <Button 
                    onClick={handleCheckBalance} 
                    className="w-full h-14 text-lg font-semibold bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700"
                    disabled={!checkCode}
                  >
                    <Search className="mr-2 h-5 w-5" />
                    {t('checkBalance')}
                  </Button>

                  {balance !== null && (
                    <div className="mt-6 p-6 bg-gradient-to-br from-green-500/10 to-emerald-500/10 rounded-xl border-2 border-green-200 dark:border-green-700">
                      <div className="text-center">
                        <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-3" />
                        <p className="text-sm text-muted-foreground mb-2">{t('availableBalance', { defaultValue: 'Saldo Disponible' })}</p>
                        <p className="text-4xl md:text-5xl font-bold text-green-600 dark:text-green-400">
                          €{balance.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
