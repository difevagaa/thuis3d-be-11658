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
import { Gift, CreditCard, Mail, Search, Send, CheckCircle2, ShoppingCart, Heart, Palette, ChevronRight, Eye } from "lucide-react";
import GiftCardPrintable from "@/components/GiftCardPrintable";
import { GIFT_CARD_THEMES, GIFT_CARD_ICONS, DEFAULT_THEME, DEFAULT_ICON } from "@/constants/giftCardThemes";
import { cn } from "@/lib/utils";

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

// Steps for gift card wizard
const STEPS = ['amount', 'personalize', 'preview'] as const;
type Step = typeof STEPS[number];

export default function GiftCard() {
  const { t } = useTranslation('giftCards');
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState<Step>('amount');
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
  const [activeTab, setActiveTab] = useState<'buy' | 'check'>('buy');

  // Calculate the display amount for preview
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

  const canProceedToStep = (step: Step): boolean => {
    switch (step) {
      case 'amount':
        return true;
      case 'personalize':
        return displayAmount > 0;
      case 'preview':
        return displayAmount > 0 && !!buyForm.recipientEmail && !!buyForm.senderName;
      default:
        return false;
    }
  };

  const goToNextStep = () => {
    const currentIndex = STEPS.indexOf(currentStep);
    if (currentIndex < STEPS.length - 1) {
      const nextStep = STEPS[currentIndex + 1];
      if (canProceedToStep(nextStep)) {
        setCurrentStep(nextStep);
      }
    }
  };

  const goToPrevStep = () => {
    const currentIndex = STEPS.indexOf(currentStep);
    if (currentIndex > 0) {
      setCurrentStep(STEPS[currentIndex - 1]);
    }
  };

  const getStepIcon = (step: Step) => {
    switch (step) {
      case 'amount': return <ShoppingCart className="h-4 w-4" />;
      case 'personalize': return <Mail className="h-4 w-4" />;
      case 'preview': return <Eye className="h-4 w-4" />;
    }
  };

  const getStepLabel = (step: Step) => {
    switch (step) {
      case 'amount': return t('step1Title', { defaultValue: 'Monto' });
      case 'personalize': return t('step2Title', { defaultValue: 'Personalizar' });
      case 'preview': return t('preview', { defaultValue: 'Vista previa' });
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

      const code = generateGiftCardCode();

      const customizationData = {
        themeId: buyForm.themeId,
        iconId: buyForm.iconId,
        userMessage: buyForm.message || null
      };
      const messageWithMetadata = JSON.stringify(customizationData);

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

      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
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
    <div className="container mx-auto px-4 py-4 md:py-8">
      {/* Page Header */}
      <div className="mb-6 text-center">
        <h1 className="text-2xl md:text-3xl font-bold mb-2">{t('title')}</h1>
        <p className="text-sm md:text-base text-muted-foreground">
          {t('heroSubtitle', { defaultValue: 'El regalo perfecto para cualquier ocasión' })}
        </p>
      </div>

      <div className="max-w-4xl mx-auto">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'buy' | 'check')} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="buy" className="text-xs md:text-sm gap-2">
              <Gift className="h-4 w-4" />
              <span className="hidden sm:inline">{t('buyCard')}</span>
              <span className="sm:hidden">{t('step1Title', { defaultValue: 'Comprar' })}</span>
            </TabsTrigger>
            <TabsTrigger value="check" className="text-xs md:text-sm gap-2">
              <Search className="h-4 w-4" />
              {t('checkBalance')}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="buy" className="space-y-6">
            {/* Progress Steps */}
            <div className="flex items-center justify-between mb-8">
              {STEPS.map((step, index) => {
                const isActive = step === currentStep;
                const isCompleted = STEPS.indexOf(currentStep) > index;
                const canGo = canProceedToStep(step);
                
                return (
                  <div key={step} className="flex items-center flex-1">
                    <button
                      onClick={() => canGo && setCurrentStep(step)}
                      disabled={!canGo}
                      className={cn(
                        "flex items-center justify-center gap-2 transition-all",
                        "w-full py-2 px-3 rounded-lg text-sm font-medium",
                        isActive && "bg-primary text-primary-foreground shadow-lg",
                        isCompleted && !isActive && "bg-primary/20 text-primary",
                        !isActive && !isCompleted && "bg-muted text-muted-foreground",
                        canGo && !isActive && "hover:bg-primary/10 cursor-pointer",
                        !canGo && "opacity-50 cursor-not-allowed"
                      )}
                    >
                      {isCompleted && !isActive ? (
                        <CheckCircle2 className="h-4 w-4 text-primary" />
                      ) : (
                        getStepIcon(step)
                      )}
                      <span className="hidden md:inline">{getStepLabel(step)}</span>
                      <span className="md:hidden">{index + 1}</span>
                    </button>
                    {index < STEPS.length - 1 && (
                      <ChevronRight className={cn(
                        "h-4 w-4 mx-1 shrink-0",
                        isCompleted ? "text-primary" : "text-muted-foreground/30"
                      )} />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Step 1: Amount */}
            {currentStep === 'amount' && (
              <Card className="border-2 border-dashed">
                <CardHeader className="text-center pb-2">
                  <CardTitle className="flex items-center justify-center gap-2">
                    <ShoppingCart className="h-5 w-5" />
                    {t('step1Title', { defaultValue: 'Elige el monto' })}
                  </CardTitle>
                  <CardDescription>{t('step1Description', { defaultValue: 'Selecciona un monto predefinido o personalizado' })}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {GIFT_CARD_AMOUNTS.map((amount) => (
                      <button
                        key={amount}
                        type="button"
                        onClick={() => handleAmountSelect(amount)}
                        className={cn(
                          "p-4 rounded-xl border-2 transition-all duration-200",
                          buyForm.amount === amount.toString() && !showCustomAmount
                            ? 'bg-primary text-primary-foreground border-primary shadow-lg'
                            : 'bg-card hover:bg-muted border-border hover:border-primary/50'
                        )}
                      >
                        <span className="text-xl font-bold">€{amount}</span>
                      </button>
                    ))}
                  </div>
                  
                  <button
                    type="button"
                    onClick={() => handleAmountSelect("custom")}
                    className={cn(
                      "w-full p-3 rounded-xl border-2 transition-all duration-200",
                      showCustomAmount
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-card hover:bg-muted border-border hover:border-primary/50'
                    )}
                  >
                    {t('customAmount', { defaultValue: 'Monto personalizado' })}
                  </button>
                  
                  {showCustomAmount && (
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
                  )}

                  {displayAmount > 0 && (
                    <div className="bg-primary/10 rounded-lg p-4 text-center">
                      <p className="text-sm text-muted-foreground">{t('selectedAmount', { defaultValue: 'Monto seleccionado' })}</p>
                      <p className="text-2xl font-bold text-primary">€{displayAmount.toFixed(2)}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Step 2: Personalize */}
            {currentStep === 'personalize' && (
              <div className="grid lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Mail className="h-5 w-5" />
                      {t('step2Title', { defaultValue: 'Personaliza' })}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>{t('recipientEmail')} *</Label>
                      <Input
                        type="email"
                        placeholder={t('recipientEmailPlaceholder')}
                        value={buyForm.recipientEmail}
                        onChange={(e) => setBuyForm({ ...buyForm, recipientEmail: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>{t('yourName')} *</Label>
                      <Input
                        placeholder={t('yourNamePlaceholder')}
                        value={buyForm.senderName}
                        onChange={(e) => setBuyForm({ ...buyForm, senderName: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>{t('message')}</Label>
                      <Textarea
                        placeholder={t('messagePlaceholder')}
                        value={buyForm.message}
                        onChange={(e) => setBuyForm({ ...buyForm, message: e.target.value })}
                        rows={3}
                        className="resize-none"
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Palette className="h-5 w-5" />
                      {t('cardDesign', { defaultValue: 'Diseño' })}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-sm">{t('cardColor', { defaultValue: 'Color de la tarjeta' })}</Label>
                      <div className="grid grid-cols-4 gap-2">
                        {GIFT_CARD_THEMES.map((theme) => (
                          <button
                            key={theme.id}
                            type="button"
                            onClick={() => setBuyForm({ ...buyForm, themeId: theme.id })}
                            className={cn(
                              "relative p-2 rounded-lg border-2 transition-all",
                              buyForm.themeId === theme.id
                                ? 'border-primary shadow-md'
                                : 'border-border hover:border-primary/50'
                            )}
                            title={theme.name}
                          >
                            <div className={`w-full h-6 rounded ${theme.bgGradient}`}></div>
                            {buyForm.themeId === theme.id && (
                              <div className="absolute -top-1 -right-1 bg-primary text-primary-foreground rounded-full w-4 h-4 flex items-center justify-center text-xs">
                                ✓
                              </div>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm">{t('cardIcon', { defaultValue: 'Ícono' })}</Label>
                      <div className="grid grid-cols-5 gap-2">
                        {GIFT_CARD_ICONS.map((icon) => (
                          <button
                            key={icon.id}
                            type="button"
                            onClick={() => setBuyForm({ ...buyForm, iconId: icon.id })}
                            className={cn(
                              "p-2 rounded-lg border-2 transition-all",
                              buyForm.iconId === icon.id
                                ? 'border-primary shadow-md bg-primary/10'
                                : 'border-border hover:border-primary/50'
                            )}
                            title={icon.name}
                          >
                            <span className="text-xl">{icon.emoji}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Step 3: Preview & Submit */}
            {currentStep === 'preview' && (
              <div className="space-y-6">
                <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-primary" />
                      {t('preview', { defaultValue: 'Vista previa' })}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Gift Card Preview */}
                    <div className="flex justify-center">
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

                    {/* Summary */}
                    <div className="bg-background/80 rounded-lg p-4 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>{t('recipient', { defaultValue: 'Destinatario' })}</span>
                        <span className="font-medium">{buyForm.recipientEmail}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>{t('from', { defaultValue: 'De' })}</span>
                        <span className="font-medium">{buyForm.senderName}</span>
                      </div>
                      <div className="border-t pt-2 flex justify-between">
                        <span className="font-bold">{t('total', { defaultValue: 'Total' })}</span>
                        <span className="text-xl font-bold text-primary">€{displayAmount.toFixed(2)}</span>
                      </div>
                    </div>

                    {/* Benefits */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        <span>{t('benefit1', { defaultValue: 'Entrega instantánea' })}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        <span>{t('benefit3', { defaultValue: 'Sin caducidad' })}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Button 
                  onClick={handleBuyGiftCard} 
                  className="w-full gap-2"
                  size="lg"
                >
                  <Send className="h-4 w-4" />
                  {t('buyGiftCard')}
                </Button>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={goToPrevStep}
                disabled={currentStep === 'amount'}
                className="gap-2"
              >
                {t('back', { defaultValue: 'Anterior' })}
              </Button>
              
              {currentStep !== 'preview' && (
                <Button
                  type="button"
                  onClick={goToNextStep}
                  disabled={!canProceedToStep(STEPS[STEPS.indexOf(currentStep) + 1] as Step)}
                  className="gap-2"
                >
                  {t('next', { defaultValue: 'Siguiente' })}
                  <ChevronRight className="h-4 w-4" />
                </Button>
              )}
            </div>
          </TabsContent>

          <TabsContent value="check">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                  <Search className="h-5 w-5" />
                  {t('checkBalanceTitle')}
                </CardTitle>
                <CardDescription>{t('checkBalanceDescription')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>{t('cardCode')}</Label>
                  <Input
                    placeholder={t('cardCodePlaceholder')}
                    value={checkCode}
                    onChange={(e) => setCheckCode(e.target.value.toUpperCase())}
                    className="font-mono text-center tracking-widest"
                  />
                </div>

                <Button 
                  onClick={handleCheckBalance} 
                  className="w-full gap-2"
                  disabled={!checkCode}
                >
                  <Search className="h-4 w-4" />
                  {t('checkBalance')}
                </Button>

                {balance !== null && (
                  <div className="p-6 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
                    <div className="text-center">
                      <CheckCircle2 className="h-10 w-10 text-green-500 mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">{t('availableBalance', { defaultValue: 'Saldo Disponible' })}</p>
                      <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                        €{balance.toFixed(2)}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
