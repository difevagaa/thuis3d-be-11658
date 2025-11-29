import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { CreditCard, Banknote, Building2, ShieldCheck, Copy, QrCode, AlertTriangle, Info, CheckCircle2 } from "lucide-react";
import { logger } from "@/lib/logger";
import { 
  createOrder, 
  createOrderItems, 
  convertCartToOrderItems, 
  calculateOrderTotals,
  generateOrderNotes,
  updateGiftCardBalance,
  calculateCouponDiscount as calculateCouponDiscountUtil,
  generatePaymentReference
} from "@/lib/paymentUtils";
import { useShippingCalculator } from "@/hooks/useShippingCalculator";
import { useTaxSettings } from "@/hooks/useTaxSettings";

export default function Payment() {
  const navigate = useNavigate();
  const { t } = useTranslation(['payment', 'common']);
  const [shippingInfo, setShippingInfo] = useState<any>(null);
  const [cartItems, setCartItems] = useState<any[]>([]);
  const [processing, setProcessing] = useState(false);
  const [shippingCost, setShippingCost] = useState<number>(0);
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string | null>(null);
  const [orderCreated, setOrderCreated] = useState<{ orderNumber: string; total: number } | null>(null);
  const [paymentImages, setPaymentImages] = useState<string[]>([]);
  const [paymentConfig, setPaymentConfig] = useState({
    bank_transfer_enabled: true,
    card_enabled: true,
    paypal_enabled: false,
    revolut_enabled: false,
    paypal_email: "",
    revolut_link: "",
    card_payment_link: "",
    company_info: "",
    bank_account_number: "",
    bank_account_name: "",
    bank_name: "",
    bank_instructions: ""
  });
  
  const { calculateShipping } = useShippingCalculator();
  const { taxSettings, calculateTax: calculateTaxFromSettings } = useTaxSettings();

  useEffect(() => {
    loadPaymentConfig();
  }, []);

  const loadPaymentConfig = async () => {
    try {
      // Read all payment configuration keys including bank account details
      const settingKeys = [
        'bank_transfer_enabled', 'card_enabled', 'paypal_enabled', 'revolut_enabled',
        'paypal_email', 'revolut_link', 'card_payment_link', 'company_info',
        'bank_account_number', 'bank_account_name', 'bank_name', 'bank_instructions',
        'payment_images'
      ];

      const { data } = await supabase
        .from("site_settings")
        .select("*")
        .in("setting_key", settingKeys);

      if (data && data.length > 0) {
        const settings: any = {};
        data.forEach((setting) => {
          if (setting.setting_key === 'payment_images') {
            try {
              setPaymentImages(JSON.parse(setting.setting_value));
            } catch (e) {
              setPaymentImages([]);
            }
          } else if (setting.setting_key.includes('enabled')) {
            settings[setting.setting_key] = setting.setting_value === "true";
          } else {
            settings[setting.setting_key] = setting.setting_value;
          }
        });

        setPaymentConfig({
          bank_transfer_enabled: settings.bank_transfer_enabled ?? true,
          card_enabled: settings.card_enabled ?? true,
          paypal_enabled: settings.paypal_enabled ?? false,
          revolut_enabled: settings.revolut_enabled ?? false,
          paypal_email: settings.paypal_email || "",
          revolut_link: settings.revolut_link || "",
          card_payment_link: settings.card_payment_link || "",
          company_info: settings.company_info || "",
          bank_account_number: settings.bank_account_number || "",
          bank_account_name: settings.bank_account_name || "",
          bank_name: settings.bank_name || "",
          bank_instructions: settings.bank_instructions || ""
        });
      }
    } catch (error) {
      logger.error("Error loading payment config:", error);
    }
  };

  useEffect(() => {
    // Check if this is an invoice payment
    const invoicePaymentData = sessionStorage.getItem("invoice_payment");
    
    if (invoicePaymentData) {
      // This is an invoice payment - load invoice data
      try {
        const invoiceData = JSON.parse(invoicePaymentData);
        setShippingInfo({ isInvoicePayment: true, ...invoiceData });
        setCartItems([]);
      } catch (error) {
        logger.error("Error parsing invoice payment data:", error);
        toast.error(t('payment:messages.errorLoadingInvoice'));
        navigate("/mi-cuenta");
      }
    } else {
      // Normal cart checkout flow
      loadShippingInfo();

      // Load cart items from localStorage
      const savedCart = localStorage.getItem("cart");
      logger.debug('Cart load', { savedCart });
      
      if (savedCart) {
        try {
          const parsedCart = JSON.parse(savedCart);
          logger.debug('Cart parsed successfully', { count: parsedCart.length });
          setCartItems(parsedCart);
        } catch (error) {
          logger.error("Error parsing cart:", error);
          setCartItems([]);
        }
      } else {
        logger.warn('No cart found in localStorage');
        setCartItems([]);
      }

      // Load applied coupon from sessionStorage
      const savedCoupon = sessionStorage.getItem("applied_coupon");
      if (savedCoupon) {
        try {
          const parsedCoupon = JSON.parse(savedCoupon);
          logger.debug('Applied coupon loaded', parsedCoupon);
          setAppliedCoupon(parsedCoupon);
        } catch (error) {
          logger.error("Error parsing applied coupon:", error);
          setAppliedCoupon(null);
        }
      }
    }
  }, [navigate]);

  // Calculate shipping when shipping info and cart items are loaded
  useEffect(() => {
    const calculateShippingCost = async () => {
      if (!shippingInfo || shippingInfo.isInvoicePayment || cartItems.length === 0) {
        return;
      }

      try {
        const productIds = cartItems
          .filter(item => !item.isGiftCard && item.productId)
          .map(item => item.productId);
        
        const cartTotal = calculateSubtotal();
        
        const shippingResult = await calculateShipping(
          shippingInfo.country || 'BE',
          shippingInfo.postal_code || '',
          cartTotal,
          productIds
        );
        
        logger.info('Shipping calculated:', shippingResult);
        setShippingCost(shippingResult.cost);
      } catch (error) {
        logger.error('Error calculating shipping:', error);
        setShippingCost(0);
      }
    };

    calculateShippingCost();
  }, [shippingInfo, cartItems]);

  const loadShippingInfo = async () => {
    try {
      // Get session ID from session storage
      const sessionId = sessionStorage.getItem("checkout_session_id");
      if (!sessionId) {
        toast.error(t('payment:messages.mustCompleteShipping'));
        navigate("/informacion-envio");
        return;
      }

      // Load shipping info from database
      const { data: session, error } = await supabase
        .from('checkout_sessions')
        .select('shipping_info')
        .eq('id', sessionId)
        .single();

      if (error || !session) {
        toast.error(t('payment:messages.mustCompleteShipping'));
        navigate("/informacion-envio");
        return;
      }

      setShippingInfo(session.shipping_info);
    } catch (error) {
      logger.error("Error loading shipping info:", error);
      navigate("/informacion-envio");
    }
  };

  // Calcular subtotal (precio sin IVA)
  const calculateSubtotal = () => {
    const subtotal = cartItems.reduce((sum, item) => {
      const itemPrice = Number(item.price) || 0;
      const itemQuantity = Number(item.quantity) || 1;
      return sum + (itemPrice * itemQuantity);
    }, 0);
    return subtotal;
  };

  // Calcular descuento de cupón - using shared utility
  const calculateCouponDiscount = () => {
    return calculateCouponDiscountUtil(cartItems, appliedCoupon);
  };

  // Get effective shipping cost (considering free shipping coupons)
  const getEffectiveShippingCost = () => {
    if (appliedCoupon && appliedCoupon.discount_type === "free_shipping") {
      return 0;
    }
    return shippingCost;
  };

  // Calcular IVA solo para productos con tax_enabled=true (no tarjetas regalo)
  const calculateTax = () => {
    const subtotal = calculateSubtotal();
    const couponDiscount = calculateCouponDiscount();
    
    const taxableAmount = cartItems
      .filter(item => !item.isGiftCard && (item.tax_enabled ?? true))
      .reduce((sum, item) => {
        const itemPrice = Number(item.price) || 0;
        const itemQuantity = Number(item.quantity) || 1;
        return sum + (itemPrice * itemQuantity);
      }, 0);
    
    // Calculate proportional discount for taxable amount
    const taxableRatio = subtotal > 0 ? taxableAmount / subtotal : 0;
    const taxableDiscount = couponDiscount * taxableRatio;
    const taxableAfterDiscount = Math.max(0, taxableAmount - taxableDiscount);
    
    // Use tax rate from settings
    const taxRate = taxSettings.enabled ? taxSettings.rate / 100 : 0;
    return Number((taxableAfterDiscount * taxRate).toFixed(2));
  };

  // Total = subtotal - descuento + IVA + envío
  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    const couponDiscount = calculateCouponDiscount();
    const effectiveShipping = getEffectiveShippingCost();
    const tax = calculateTax();
    return Number((subtotal - couponDiscount + tax + effectiveShipping).toFixed(2));
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success(t('payment:messages.copiedToClipboard'));
  };

  const handlePayment = async (method: string) => {
    // Validar método de pago
    if (method !== "bank_transfer" && method !== "card" && method !== "paypal" && method !== "revolut") {
      toast.error(t('payment:messages.invalidPaymentMethod'));
      return;
    }

    setProcessing(true);
    
    try {
      // Check if this is an invoice payment
      const invoicePaymentData = sessionStorage.getItem("invoice_payment");
      
      if (invoicePaymentData) {
        // Handle invoice payment
        const invoiceData = JSON.parse(invoicePaymentData);
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          toast.error(t('payment:messages.loginRequired'));
          navigate("/auth");
          return;
        }

        // CRITICAL: Payment status should ALWAYS be "pending" until payment is confirmed externally
        // The order/invoice should NOT be marked as "paid" until the payment is actually received
        const { error: updateError } = await supabase
          .from("invoices")
          .update({
            payment_status: "pending", // ALWAYS pending - payment confirmation happens externally
            payment_method: method
          })
          .eq("id", invoiceData.invoiceId)
          .eq("user_id", user.id);

        if (updateError) throw updateError;

        // Navigate based on payment method - show payment instructions
        if (method === "bank_transfer") {
          // Clear invoice payment data after navigation is initiated
          sessionStorage.removeItem("invoice_payment");
          toast.success(t('payment:messages.paymentRegistered'));
          navigate("/pago-instrucciones", { 
            state: { 
              orderNumber: invoiceData.invoiceNumber,
              method: "bank_transfer",
              total: invoiceData.total,
              isPending: false,
              isInvoicePayment: true
            } 
          });
        } else if (method === "card") {
          // For card payment on invoices, show payment info page before redirecting to bank
          // DO NOT clear invoice payment data yet - keep it for the payment instructions page
          toast.success(t('payment:messages.cardPaymentSelected'));
          navigate("/pago-instrucciones", { 
            state: { 
              orderNumber: invoiceData.invoiceNumber,
              method: "card",
              total: invoiceData.total,
              isPending: false,
              isInvoicePayment: true
            } 
          });
          sessionStorage.removeItem("invoice_payment");
        } else if (method === "paypal") {
          // For PayPal payment on invoices, show payment info page FIRST before redirecting to PayPal
          // DO NOT open PayPal link directly - let the payment instructions page handle it
          toast.success(t('payment:messages.paypalSelected'));
          navigate("/pago-instrucciones", { 
            state: { 
              orderNumber: invoiceData.invoiceNumber,
              method: "paypal",
              total: invoiceData.total,
              isPending: false,
              isInvoicePayment: true
            } 
          });
          sessionStorage.removeItem("invoice_payment");
        } else if (method === "revolut") {
          // For Revolut payment on invoices, show payment info page FIRST before redirecting to Revolut
          // DO NOT open Revolut link directly - let the payment instructions page handle it
          toast.success(t('payment:messages.revolutSelected'));
          navigate("/pago-instrucciones", { 
            state: { 
              orderNumber: invoiceData.invoiceNumber,
              method: "revolut",
              total: invoiceData.total,
              isPending: false,
              isInvoicePayment: true
            } 
          });
          sessionStorage.removeItem("invoice_payment");
        } else {
          sessionStorage.removeItem("invoice_payment");
          navigate("/mi-cuenta?tab=invoices");
        }

        setProcessing(false);
        return;
      }

      // Normal cart checkout flow
      // CRITICAL: Authentication is required for all purchases
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error(t('payment:messages.loginRequired'));
        navigate("/auth");
        setProcessing(false);
        return;
      }

      // IMPORTANTE: Calcular correctamente subtotal, IVA, envío y total
      const isGiftCardPurchase = cartItems.some(item => item.isGiftCard);
      const hasOnlyGiftCards = cartItems.every(item => item.isGiftCard);
      
      const subtotal = calculateSubtotal(); // Precio sin IVA
      const couponDiscount = calculateCouponDiscount(); // Descuento de cupón
      const effectiveShipping = getEffectiveShippingCost(); // Shipping (0 if has free shipping coupon)
      const tax = calculateTax(); // Tax calculated according to settings (after discount)
      const total = calculateTotal(); // subtotal - discount + tax + shipping

      // Get the payment reference from shipping info (generated in PaymentSummary)
      // This ensures the same reference is used across all payment methods
      // Fallback to generating a new one if not found (maintains same format: 3 numbers + 3 letters)
      const paymentReference = shippingInfo?.payment_reference || generatePaymentReference();

      // For bank transfer, show payment info on the same page
      if (method === "bank_transfer") {
        
        // Save temporary info in sessionStorage
        // CRITICAL: Include shipping and coupon in the pending_order
        sessionStorage.setItem("pending_order", JSON.stringify({
          cartItems,
          shippingInfo,
          total,
          subtotal,
          tax,
          shipping: effectiveShipping,
          couponDiscount,
          appliedCoupon,
          method: "bank_transfer"
        }));

        // Use the consistent payment reference
        const orderNumber = paymentReference;
        
        // Show payment info on the same page
        setSelectedPaymentMethod("bank_transfer");
        setOrderCreated({ orderNumber, total });
        
        toast.success(t('payment:messages.bankTransferSelected'));
        setProcessing(false);
        return;
      }

      // For card payment, navigate to payment instructions page which will create the order
      // The order will be created with "pending" status when user clicks "Go to bank"
      if (method === "card") {
        // Save pending order info to sessionStorage
        sessionStorage.setItem("pending_order", JSON.stringify({
          cartItems,
          shippingInfo,
          total,
          subtotal,
          tax,
          shipping: effectiveShipping,
          couponDiscount,
          appliedCoupon,
          method: "card"
        }));

        // Use the consistent payment reference
        const orderNumber = paymentReference;
        
        // Navigate to payment instructions page which will create the order
        // The page will show payment info and a button to go to the bank
        toast.success(t('payment:messages.cardPaymentSelected'));
        navigate("/pago-instrucciones", { 
          state: { 
            orderNumber,
            method: "card",
            total: total,
            isPending: true
          } 
        });
        
        setProcessing(false);
        return;
      }

      // For PayPal payment, navigate to payment instructions page which will create the order
      // The order will be created with "pending" status when user clicks "Go to PayPal"
      if (method === "paypal") {
        // Save pending order info to sessionStorage
        sessionStorage.setItem("pending_order", JSON.stringify({
          cartItems,
          shippingInfo,
          total,
          subtotal,
          tax,
          shipping: effectiveShipping,
          couponDiscount,
          appliedCoupon,
          method: "paypal"
        }));

        // Use the consistent payment reference
        const orderNumber = paymentReference;
        
        // Navigate to payment instructions page
        toast.success(t('payment:messages.paypalSelected'));
        navigate("/pago-instrucciones", { 
          state: { 
            orderNumber,
            method: "paypal",
            total: total,
            isPending: true
          } 
        });
        
        setProcessing(false);
        return;
      }

      // For Revolut payment, navigate to payment instructions page which will create the order
      // The order will be created with "pending" status when user clicks "Go to Revolut"
      if (method === "revolut") {
        // Save pending order info to sessionStorage
        sessionStorage.setItem("pending_order", JSON.stringify({
          cartItems,
          shippingInfo,
          total,
          subtotal,
          tax,
          shipping: effectiveShipping,
          couponDiscount,
          appliedCoupon,
          method: "revolut"
        }));

        // Use the consistent payment reference
        const orderNumber = paymentReference;
        
        // Navigate to payment instructions page
        toast.success(t('payment:messages.revolutSelected'));
        navigate("/pago-instrucciones", { 
          state: { 
            orderNumber,
            method: "revolut",
            total: total,
            isPending: true
          } 
        });
        
        setProcessing(false);
        return;
      }

      // This code should not be reached for normal payment methods
      // But keep it as fallback for any edge cases
      toast.error(t('payment:messages.invalidPaymentMethod'));
      setProcessing(false);
    } catch (error) {
      logger.error("Error creating order:", error);
      toast.error(t('payment:messages.errorProcessingOrder'));
    } finally {
      setProcessing(false);
    }
  };

  if (!shippingInfo) {
    return <div className="container mx-auto px-4 py-12">{t('common:loading')}</div>;
  }

  // Check if this is an invoice payment
  const isInvoicePayment = shippingInfo.isInvoicePayment;

  return (
    <div className="container mx-auto px-2 xs:px-3 sm:px-4 py-3 xs:py-4 md:py-8 lg:py-12 max-w-4xl">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 xs:gap-3 md:gap-6">
        {/* Order Summary */}
        <Card>
          <CardHeader className="p-2.5 xs:p-3 sm:p-6 pb-2 xs:pb-2 sm:pb-4">
            <CardTitle className="text-sm xs:text-base sm:text-xl">{isInvoicePayment ? t('payment:invoiceSummary') : t('payment:orderSummary')}</CardTitle>
          </CardHeader>
          <CardContent className="p-2.5 xs:p-3 sm:p-6 pt-0">
            <div className="space-y-2 xs:space-y-3">
              {isInvoicePayment ? (
                // Invoice payment summary
                <>
                  <div className="flex justify-between items-center py-1.5 xs:py-2">
                    <div>
                      <p className="font-medium text-xs xs:text-sm sm:text-base">{t('payment:invoice')} {shippingInfo.invoiceNumber}</p>
                      <p className="text-[10px] xs:text-xs sm:text-sm text-muted-foreground">{t('payment:invoicePayment')}</p>
                    </div>
                  </div>
                  
                  <div className="border-t pt-2 xs:pt-3 space-y-1.5 xs:space-y-2">
                    <div className="flex justify-between text-xs xs:text-sm sm:text-base">
                      <span className="text-muted-foreground">{t('payment:subtotal')}</span>
                      <span>€{Number(shippingInfo.subtotal || 0).toFixed(2)}</span>
                    </div>
                    {shippingInfo.shipping > 0 && (
                      <div className="flex justify-between text-xs xs:text-sm sm:text-base">
                        <span className="text-muted-foreground">{t('payment:shipping')}</span>
                        <span>€{Number(shippingInfo.shipping).toFixed(2)}</span>
                      </div>
                    )}
                    {shippingInfo.tax > 0 && (
                      <div className="flex justify-between text-xs xs:text-sm">
                        <span className="text-muted-foreground">{t('payment:tax')} (21%)</span>
                        <span>€{Number(shippingInfo.tax).toFixed(2)}</span>
                      </div>
                    )}
                    {shippingInfo.discount > 0 && (
                      <div className="flex justify-between text-green-600 text-xs xs:text-sm">
                        <span>{t('payment:discount')}</span>
                        <span>-€{Number(shippingInfo.discount).toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm xs:text-base sm:text-lg font-bold pt-1.5 xs:pt-2 border-t">
                      <span>{t('payment:totalToPay')}</span>
                      <span>€{Number(shippingInfo.total).toFixed(2)}</span>
                    </div>
                  </div>
                </>
              ) : (
                // Normal cart checkout
                <>
                  {cartItems.map((item, index) => (
                    <div key={index} className="flex justify-between text-xs xs:text-sm sm:text-base">
                      <div className="min-w-0 flex-1 pr-2">
                        <p className="font-medium truncate">{item.name}</p>
                        <p className="text-[10px] xs:text-xs sm:text-sm text-muted-foreground">
                          {t('payment:quantity')}: {item.quantity} x €{Number(item.price).toFixed(2)}
                        </p>
                      </div>
                      <p className="font-medium whitespace-nowrap">€{(Number(item.price) * Number(item.quantity)).toFixed(2)}</p>
                    </div>
                  ))}
                  
                   <div className="border-t pt-2 xs:pt-3 space-y-1.5 xs:space-y-2">
                    <div className="flex justify-between text-xs xs:text-sm">
                      <span className="text-muted-foreground">{t('payment:subtotal')}</span>
                      <span>€{calculateSubtotal().toFixed(2)}</span>
                    </div>
                    {appliedCoupon && calculateCouponDiscount() > 0 && (
                      <div className="flex justify-between text-green-600 text-xs xs:text-sm">
                        <span className="truncate mr-2">{t('payment:coupon')} ({appliedCoupon.code})</span>
                        <span className="whitespace-nowrap">-€{calculateCouponDiscount().toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-xs xs:text-sm">
                      <span className="text-muted-foreground">
                        {appliedCoupon?.discount_type === 'free_shipping' ? t('payment:shippingFree') : t('payment:shipping')}
                      </span>
                      <span>€{getEffectiveShippingCost().toFixed(2)}</span>
                    </div>
                    {(() => {
                      const tax = calculateTax();
                      const total = calculateTotal();
                      
                      return (
                        <>
                          {tax > 0 && (
                            <div className="flex justify-between text-xs xs:text-sm">
                              <span className="text-muted-foreground">{t('payment:tax')} ({taxSettings.rate}%)</span>
                              <span>€{tax.toFixed(2)}</span>
                            </div>
                          )}
                          <div className="flex justify-between text-sm xs:text-base sm:text-lg font-bold pt-1.5 xs:pt-2 border-t">
                            <span>{t('payment:total')}</span>
                            <span>€{total.toFixed(2)}</span>
                          </div>
                        </>
                      );
                    })()}
                  </div>

                  <div className="border-t pt-2 xs:pt-3">
                    <h4 className="font-semibold mb-1 xs:mb-2 text-xs xs:text-sm">{t('payment:shippingAddress')}</h4>
                    <p className="text-[10px] xs:text-xs sm:text-sm text-muted-foreground leading-relaxed">
                      {shippingInfo.full_name}<br />
                      {shippingInfo.address}<br />
                      {shippingInfo.city}, {shippingInfo.postal_code}<br />
                      {shippingInfo.country}
                    </p>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Bank Transfer Payment Info - Show when bank transfer is selected */}
        {selectedPaymentMethod === "bank_transfer" && orderCreated && (
          <Card className="md:col-span-2 shadow-lg border-2 border-success/30">
            <CardHeader className="text-center bg-success/5 rounded-t-lg p-3 xs:p-4 md:p-6">
              <div className="mx-auto w-10 h-10 xs:w-12 xs:h-12 md:w-16 md:h-16 bg-success/10 rounded-full flex items-center justify-center mb-2 xs:mb-3 md:mb-4">
                <Building2 className="w-5 h-5 xs:w-6 xs:h-6 md:w-8 md:h-8 text-success" />
              </div>
              <CardTitle className="text-base xs:text-lg md:text-2xl text-success">
                {t('payment:instructions.bankTransferTitle')}
              </CardTitle>
              <CardDescription className="text-success/80 text-xs xs:text-sm">
                {t('payment:instructions.orderNumber')}: <strong className="text-success">{orderCreated.orderNumber}</strong>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 xs:space-y-4 md:space-y-6 p-2.5 xs:p-3 md:p-6">
              {/* Amount to Transfer */}
              <div className="bg-gradient-to-r from-primary/10 to-primary/5 border-2 border-primary rounded-xl p-3 xs:p-4 md:p-6 text-center">
                <p className="text-xs xs:text-sm font-medium text-foreground/70 mb-1 xs:mb-2">{t('payment:instructions.amountToTransfer')}:</p>
                <p className="text-2xl xs:text-3xl md:text-4xl font-bold text-primary">€{orderCreated.total.toFixed(2)}</p>
                <p className="text-[10px] xs:text-xs text-foreground/60 mt-1 xs:mt-2">{t('payment:instructions.vatIncluded')}</p>
              </div>

              {/* Bank Information - Using theme-consistent colors */}
              <div className="bg-card dark:bg-card border-2 border-border rounded-xl p-2.5 xs:p-3 md:p-6 space-y-2 xs:space-y-3 md:space-y-4">
                <h3 className="font-semibold text-sm xs:text-base md:text-lg flex items-center gap-2 text-foreground border-b border-border pb-2 xs:pb-3">
                  <Building2 className="h-4 w-4 xs:h-5 xs:w-5" />
                  {t('payment:instructions.bankDetails')}
                </h3>
                
                <div className="grid gap-2 xs:gap-3 md:gap-4">
                  {paymentConfig.company_info && (
                    <div className="bg-muted/50 rounded-lg p-2 xs:p-3 md:p-4">
                      <p className="font-medium text-muted-foreground text-[10px] xs:text-xs md:text-sm mb-0.5 xs:mb-1">{t('payment:instructions.companyInfo')}:</p>
                      <p className="whitespace-pre-line text-foreground text-xs xs:text-sm">{paymentConfig.company_info}</p>
                    </div>
                  )}
                  
                  {paymentConfig.bank_name && (
                    <div className="bg-muted/50 rounded-lg p-2 xs:p-3 md:p-4">
                      <p className="font-medium text-muted-foreground text-[10px] xs:text-xs md:text-sm mb-0.5 xs:mb-1">{t('payment:instructions.bankName')}:</p>
                      <p className="text-foreground font-medium text-xs xs:text-sm">{paymentConfig.bank_name}</p>
                    </div>
                  )}
                  
                  {paymentConfig.bank_account_name && (
                    <div className="bg-muted/50 rounded-lg p-2 xs:p-3 md:p-4">
                      <p className="font-medium text-muted-foreground text-[10px] xs:text-xs md:text-sm mb-0.5 xs:mb-1">{t('payment:instructions.accountHolder')}:</p>
                      <p className="text-foreground font-medium text-xs xs:text-sm">{paymentConfig.bank_account_name}</p>
                    </div>
                  )}
                  
                  {paymentConfig.bank_account_number && (
                    <div className="bg-muted/50 rounded-lg p-2 xs:p-3 md:p-4">
                      <p className="font-medium text-muted-foreground text-[10px] xs:text-xs md:text-sm mb-0.5 xs:mb-1">{t('payment:instructions.iban')}:</p>
                      <div className="flex items-center gap-1.5 xs:gap-2 mt-1 xs:mt-2">
                        <code className="bg-primary/10 text-primary px-2 py-1.5 xs:px-3 xs:py-2 md:px-4 md:py-3 rounded-lg flex-1 font-mono text-[10px] xs:text-xs md:text-lg font-bold break-all">
                          {paymentConfig.bank_account_number}
                        </code>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => copyToClipboard(paymentConfig.bank_account_number)}
                          className="h-8 xs:h-9 md:h-12 px-2 xs:px-3 md:px-4 shrink-0"
                        >
                          <Copy className="h-3 w-3 xs:h-4 xs:w-4" />
                        </Button>
                      </div>
                    </div>
                  )}

                  <div className="bg-muted/50 rounded-lg p-2 xs:p-3 md:p-4">
                    <p className="font-medium text-muted-foreground text-[10px] xs:text-xs md:text-sm mb-0.5 xs:mb-1">{t('payment:instructions.transferReference')}:</p>
                    <div className="flex items-center gap-1.5 xs:gap-2 mt-1 xs:mt-2">
                      <code className="bg-primary/10 text-primary px-2 py-1.5 xs:px-3 xs:py-2 md:px-4 md:py-3 rounded-lg flex-1 font-mono text-[10px] xs:text-xs md:text-lg font-bold">
                        {orderCreated.orderNumber}
                      </code>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => copyToClipboard(orderCreated.orderNumber)}
                        className="h-8 xs:h-9 md:h-12 px-2 xs:px-3 md:px-4 shrink-0"
                      >
                        <Copy className="h-3 w-3 xs:h-4 xs:w-4" />
                      </Button>
                    </div>
                  </div>

                  {paymentConfig.bank_instructions && (
                    <div className="bg-muted/50 rounded-lg p-2 xs:p-3 md:p-4">
                      <p className="font-medium text-muted-foreground text-[10px] xs:text-xs md:text-sm mb-0.5 xs:mb-1">{t('payment:instructions.additionalInstructions')}:</p>
                      <p className="whitespace-pre-line text-foreground/80 text-[10px] xs:text-xs md:text-sm">
                        {paymentConfig.bank_instructions}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* QR Codes - Theme consistent */}
              {paymentImages.length > 0 && (
                <div className="space-y-2 xs:space-y-3 md:space-y-4">
                  <div className="flex items-center gap-1.5 xs:gap-2">
                    <QrCode className="h-4 w-4 xs:h-5 xs:w-5 text-primary" />
                    <h4 className="font-semibold text-sm xs:text-base md:text-lg text-foreground">{t('payment:instructions.qrCodes')}</h4>
                  </div>
                  <p className="text-[10px] xs:text-xs md:text-sm text-muted-foreground">
                    {t('payment:instructions.scanQr')}
                  </p>
                  <div className="grid grid-cols-2 gap-2 xs:gap-3 md:gap-4">
                    {paymentImages.map((img, index) => (
                      <div key={index} className="border-2 border-border rounded-lg xs:rounded-xl p-2 xs:p-3 md:p-4 space-y-1.5 xs:space-y-2 md:space-y-3 bg-card shadow-sm hover:shadow-md transition-shadow">
                        <img 
                          src={img} 
                          alt={`${t('payment:instructions.qrCode')} ${index + 1}`}
                          className="w-full h-24 xs:h-32 md:h-56 object-contain rounded-lg bg-white p-1 xs:p-2"
                        />
                        <div className="text-center space-y-0.5 xs:space-y-1">
                          <p className="font-semibold text-foreground text-[10px] xs:text-xs md:text-base">
                            {index === 0 ? t('payment:instructions.qrBankTransfer') : 
                             index === 1 ? t('payment:instructions.qrRevolut') : 
                             `${t('payment:instructions.qrCode')} ${index + 1}`}
                          </p>
                          <p className="text-[9px] xs:text-[10px] md:text-xs text-muted-foreground hidden xs:block">
                            {index === 0 ? t('payment:instructions.scanForDirectTransfer') : 
                             index === 1 ? t('payment:instructions.fastRevolutPayment') : 
                             t('payment:instructions.alternativePayment')}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Warning - Theme consistent */}
              <div className="bg-warning/10 border-2 border-warning/30 rounded-lg xs:rounded-xl p-2 xs:p-3 md:p-4 flex items-start gap-2 xs:gap-3">
                <AlertTriangle className="h-4 w-4 xs:h-5 xs:w-5 text-warning flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-[10px] xs:text-xs md:text-sm font-medium text-warning">
                    {t('payment:instructions.pendingWarning')}
                  </p>
                  <p className="text-[10px] xs:text-xs md:text-sm text-warning/80 mt-0.5 xs:mt-1">
                    {t('payment:instructions.includeOrderNumber')} <strong>{orderCreated.orderNumber}</strong> {t('payment:instructions.inTransferReference')}
                  </p>
                </div>
              </div>

              {/* Confirm Order Button - VERY PROMINENT */}
              <div className="flex flex-col gap-2 xs:gap-3 md:gap-4 pt-3 xs:pt-4 md:pt-6 border-t-2 border-primary/30">
                {/* Primary action - Create Order - VERY LARGE AND VISIBLE */}
                <div className="bg-gradient-to-r from-primary/10 to-primary/5 border-2 border-primary rounded-lg xs:rounded-xl p-2.5 xs:p-3 md:p-6">
                  <p className="text-center text-[10px] xs:text-xs md:text-base font-medium text-foreground/80 mb-2 xs:mb-3 md:mb-4 flex items-center justify-center gap-1.5 xs:gap-2">
                    <AlertTriangle className="h-3.5 w-3.5 xs:h-4 xs:w-4 md:h-5 md:w-5 text-warning shrink-0" />
                    <span className="leading-tight">{t('payment:importantCreateOrderMessage')}</span>
                  </p>
                  <Button 
                    onClick={() => {
                      navigate("/pago-instrucciones", { 
                        state: { 
                          orderNumber: orderCreated.orderNumber,
                          method: "bank_transfer",
                          total: orderCreated.total,
                          isPending: true
                        } 
                      });
                    }}
                    className="w-full py-3 xs:py-4 md:py-8 text-sm xs:text-base md:text-xl font-bold bg-primary hover:bg-primary/90 shadow-lg hover:shadow-xl transition-all duration-200" 
                    size="lg"
                  >
                    <CheckCircle2 className="h-4 w-4 xs:h-5 xs:w-5 md:h-6 md:w-6 mr-1.5 xs:mr-2" />
                    {t('payment:confirmAndCreateOrder')}
                  </Button>
                </div>
                <Button 
                  onClick={() => {
                    setSelectedPaymentMethod(null);
                    setOrderCreated(null);
                  }}
                  variant="outline" 
                  className="w-full text-xs xs:text-sm" 
                  size="default"
                >
                  {t('payment:changePaymentMethod')}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Payment Methods - Only show if no payment method is selected */}
        {!selectedPaymentMethod && (
        <div className="space-y-2 xs:space-y-3 md:space-y-4">
          {/* QR Codes Section - Show FIRST before payment methods */}
          {paymentImages.length > 0 && (
            <Card className="shadow-lg border-2 border-primary/30 bg-primary/5">
              <CardHeader className="p-2.5 xs:p-3 md:p-6 pb-2 xs:pb-2 md:pb-3">
                <CardTitle className="text-sm xs:text-base md:text-xl flex items-center gap-1.5 xs:gap-2 text-primary">
                  <QrCode className="h-4 w-4 xs:h-5 xs:w-5 md:h-6 md:w-6" />
                  {t('payment:instructions.qrCodes')}
                </CardTitle>
                <CardDescription className="text-[10px] xs:text-xs md:text-base">
                  {t('payment:instructions.scanQr')}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-2.5 xs:p-3 md:p-6 pt-0">
                <div className="grid grid-cols-2 gap-2 xs:gap-3 md:gap-4">
                  {paymentImages.map((img, index) => (
                    <div key={index} className="border-2 border-border rounded-lg xs:rounded-xl p-2 xs:p-3 md:p-4 space-y-1.5 xs:space-y-2 md:space-y-3 bg-card shadow-sm hover:shadow-md transition-shadow">
                      <img 
                        src={img} 
                        alt={`${t('payment:instructions.qrCode')} ${index + 1}`}
                        className="w-full h-24 xs:h-32 md:h-56 object-contain rounded-lg bg-white p-1 xs:p-2"
                      />
                      <div className="text-center space-y-0.5 xs:space-y-1">
                        <p className="font-semibold text-foreground text-[10px] xs:text-xs md:text-base">
                          {index === 0 ? t('payment:instructions.qrBankTransfer') : 
                           index === 1 ? t('payment:instructions.qrRevolut') : 
                           `${t('payment:instructions.qrCode')} ${index + 1}`}
                        </p>
                        <p className="text-[9px] xs:text-[10px] md:text-xs text-muted-foreground hidden xs:block">
                          {index === 0 ? t('payment:instructions.scanForDirectTransfer') : 
                           index === 1 ? t('payment:instructions.fastRevolutPayment') : 
                           t('payment:instructions.alternativePayment')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {paymentConfig.company_info && (
            <Card className="border-primary/20 bg-primary/5">
              <CardHeader className="p-2.5 xs:p-3 md:p-6 pb-1 xs:pb-2">
                <CardTitle className="text-xs xs:text-sm md:text-lg flex items-center gap-1.5 xs:gap-2">
                  <Building2 className="h-3.5 w-3.5 xs:h-4 xs:w-4 md:h-5 md:w-5" />
                  {t('payment:companyInfo')}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-2.5 xs:p-3 md:p-6 pt-0">
                <p className="text-[10px] xs:text-xs md:text-sm text-foreground whitespace-pre-line">{paymentConfig.company_info}</p>
              </CardContent>
            </Card>
          )}
          
          <Card className="shadow-lg">
            <CardHeader className="bg-primary/5 rounded-t-lg p-2.5 xs:p-3 md:p-6">
              <CardTitle className="flex items-center gap-1.5 xs:gap-2 text-xs xs:text-sm md:text-lg">
                <ShieldCheck className="h-3.5 w-3.5 xs:h-4 xs:w-4 md:h-5 md:w-5 text-primary" />
                {t('payment:paymentMethodTitle')}
              </CardTitle>
              <CardDescription className="text-foreground/70 text-[10px] xs:text-xs md:text-sm">{t('payment:paymentMethod')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 xs:space-y-3 md:space-y-4 p-2.5 xs:p-3 md:p-6">
              {/* TARJETA - Pago con tarjeta */}
              {paymentConfig.card_enabled && (
                <Button
                  onClick={() => handlePayment("card")}
                  disabled={processing}
                  className="w-full h-auto py-2 xs:py-2.5 md:py-4 text-sm md:text-lg border-2 hover:bg-accent/50"
                  variant="outline"
                >
                  <div className="flex items-center w-full">
                    <CreditCard className="h-6 w-6 xs:h-7 xs:w-7 md:h-10 md:w-10 mr-2 xs:mr-3 md:mr-4 text-primary shrink-0" />
                    <div className="text-left flex-grow min-w-0">
                      <div className="font-bold text-foreground text-xs xs:text-sm md:text-base">{t('payment:methods.creditCard')}</div>
                      <div className="text-[10px] xs:text-xs text-muted-foreground mt-0.5 xs:mt-1">
                        💳 {t('payment:methods.creditCardDesc')}
                      </div>
                      <div className="flex flex-wrap gap-0.5 xs:gap-1 md:gap-2 mt-1 xs:mt-1.5 md:mt-2">
                        <span className="inline-flex items-center px-1 xs:px-1.5 md:px-2 py-0.5 rounded-full text-[9px] xs:text-[10px] md:text-xs bg-primary/10 text-primary">Visa</span>
                        <span className="inline-flex items-center px-1 xs:px-1.5 md:px-2 py-0.5 rounded-full text-[9px] xs:text-[10px] md:text-xs bg-primary/10 text-primary">Mastercard</span>
                        <span className="inline-flex items-center px-1 xs:px-1.5 md:px-2 py-0.5 rounded-full text-[9px] xs:text-[10px] md:text-xs bg-primary/10 text-primary">Bancontact</span>
                        <span className="inline-flex items-center px-1 xs:px-1.5 md:px-2 py-0.5 rounded-full text-[9px] xs:text-[10px] md:text-xs bg-primary/10 text-primary hidden xs:inline-flex">Google Pay</span>
                        <span className="inline-flex items-center px-1 xs:px-1.5 md:px-2 py-0.5 rounded-full text-[9px] xs:text-[10px] md:text-xs bg-primary/10 text-primary hidden xs:inline-flex">Apple Pay</span>
                      </div>
                    </div>
                  </div>
                </Button>
              )}

              {/* TRANSFERENCIA BANCARIA */}
              {paymentConfig.bank_transfer_enabled && (
                <Button
                  onClick={() => handlePayment("bank_transfer")}
                  disabled={processing}
                  className="w-full h-auto py-2 xs:py-2.5 md:py-4 text-sm md:text-lg border-2 hover:bg-accent/50"
                  variant="outline"
                >
                  <div className="flex items-center w-full">
                    <Banknote className="h-6 w-6 xs:h-7 xs:w-7 md:h-10 md:w-10 mr-2 xs:mr-3 md:mr-4 text-success shrink-0" />
                    <div className="text-left flex-grow min-w-0">
                      <div className="font-bold text-foreground text-xs xs:text-sm md:text-base">{t('payment:methods.bankTransfer')}</div>
                      <div className="text-[10px] xs:text-xs text-muted-foreground mt-0.5 xs:mt-1">
                        🏦 {t('payment:methods.bankTransferDesc')}
                      </div>
                    </div>
                  </div>
                </Button>
              )}

              {/* PAYPAL */}
              {paymentConfig.paypal_enabled && paymentConfig.paypal_email && (
                <Button
                  onClick={() => handlePayment("paypal")}
                  disabled={processing}
                  className="w-full h-auto py-2 xs:py-2.5 md:py-4 text-sm md:text-lg border-2 hover:bg-accent/50"
                  variant="outline"
                >
                  <div className="flex items-center w-full">
                    <svg className="h-6 w-6 xs:h-7 xs:w-7 md:h-10 md:w-10 mr-2 xs:mr-3 md:mr-4 text-primary shrink-0" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M20.067 8.478c.492.88.556 2.014.3 3.327-.74 3.806-3.276 5.12-6.514 5.12h-.5a.805.805 0 00-.794.68l-.04.22-.63 3.993-.028.15a.806.806 0 01-.795.68H8.934c-.414 0-.629-.29-.535-.67l.105-.67.629-3.99.04-.22a.806.806 0 01.794-.68h.5c3.238 0 5.774-1.314 6.514-5.12.256-1.313.192-2.447-.3-3.327z"/>
                      <path d="M19.107 5.663c-.382-.636-1.016-1.04-1.922-1.04H9.772C9.274 4.623 8.9 5.05 8.817 5.584L6.456 20.883c-.1.536.22.977.756.977h4.124l1.035-6.572-.032.202c.083-.534.457-.96.955-.96h1.99c3.904 0 6.96-1.586 7.85-6.172.025-.127.048-.251.068-.374.258-1.656-.006-2.78-.745-3.76-.236-.313-.516-.58-.85-.797z"/>
                    </svg>
                    <div className="text-left flex-grow min-w-0">
                      <div className="font-bold text-foreground text-xs xs:text-sm md:text-base">{t('payment:methods.paypal')}</div>
                      <div className="text-[10px] xs:text-xs text-muted-foreground mt-0.5 xs:mt-1">
                        🔒 {t('payment:methods.paypalDesc')}
                      </div>
                    </div>
                  </div>
                </Button>
              )}

              {/* REVOLUT */}
              {paymentConfig.revolut_enabled && paymentConfig.revolut_link && (
                <Button
                  onClick={() => handlePayment("revolut")}
                  disabled={processing}
                  className="w-full h-auto py-2 xs:py-2.5 md:py-4 text-sm md:text-lg border-2 hover:bg-accent/50"
                  variant="outline"
                >
                  <div className="flex items-center w-full">
                    <svg className="h-6 w-6 xs:h-7 xs:w-7 md:h-10 md:w-10 mr-2 xs:mr-3 md:mr-4 text-primary shrink-0" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.31-8.86c-1.77-.45-2.34-.94-2.34-1.67 0-.84.79-1.43 2.1-1.43 1.38 0 1.9.66 1.94 1.64h1.71c-.05-1.34-.87-2.57-2.49-2.97V5H10.9v1.69c-1.51.32-2.72 1.3-2.72 2.81 0 1.79 1.49 2.69 3.66 3.21 1.95.46 2.34 1.15 2.34 1.87 0 .53-.39 1.39-2.1 1.39-1.6 0-2.23-.72-2.32-1.64H8.04c.1 1.7 1.36 2.66 2.86 2.97V19h2.34v-1.67c1.52-.29 2.72-1.16 2.73-2.77-.01-2.2-1.9-2.96-3.66-3.42z"/>
                    </svg>
                    <div className="text-left flex-grow min-w-0">
                      <div className="font-bold text-foreground text-xs xs:text-sm md:text-base">{t('payment:methods.revolut')}</div>
                      <div className="text-[10px] xs:text-xs text-muted-foreground mt-0.5 xs:mt-1">
                        💳 {t('payment:methods.revolutDesc')}
                      </div>
                      <div className="flex flex-wrap gap-0.5 xs:gap-1 md:gap-2 mt-1 xs:mt-1.5 md:mt-2">
                        <span className="inline-flex items-center px-1 xs:px-1.5 md:px-2 py-0.5 rounded-full text-[9px] xs:text-[10px] md:text-xs bg-accent/50 text-accent-foreground">Visa</span>
                        <span className="inline-flex items-center px-1 xs:px-1.5 md:px-2 py-0.5 rounded-full text-[9px] xs:text-[10px] md:text-xs bg-accent/50 text-accent-foreground">Mastercard</span>
                        <span className="inline-flex items-center px-1 xs:px-1.5 md:px-2 py-0.5 rounded-full text-[9px] xs:text-[10px] md:text-xs bg-accent/50 text-accent-foreground hidden xs:inline-flex">Google Pay</span>
                        <span className="inline-flex items-center px-1 xs:px-1.5 md:px-2 py-0.5 rounded-full text-[9px] xs:text-[10px] md:text-xs bg-accent/50 text-accent-foreground hidden xs:inline-flex">Apple Pay</span>
                      </div>
                    </div>
                  </div>
                </Button>
              )}

              {!paymentConfig.bank_transfer_enabled && !paymentConfig.card_enabled && !paymentConfig.paypal_enabled && !paymentConfig.revolut_enabled && (
                <div className="text-center text-muted-foreground py-4 xs:py-6 md:py-8 bg-muted/30 rounded-lg">
                  <p className="text-xs xs:text-sm">{t('payment:noPaymentMethods')}</p>
                </div>
              )}

              {/* Security Notice - We don't store payment data */}
              <div className="bg-success/5 border border-success/20 rounded-lg p-2 xs:p-3 md:p-4 mt-2 xs:mt-3 md:mt-4">
                <div className="flex items-start gap-1.5 xs:gap-2 md:gap-3">
                  <ShieldCheck className="h-4 w-4 xs:h-5 xs:w-5 md:h-6 md:w-6 text-success flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-success text-[10px] xs:text-xs md:text-sm">
                      {t('payment:securityNotice.title')}
                    </h4>
                    <p className="text-[10px] xs:text-xs text-success/80 mt-0.5 xs:mt-1 leading-relaxed">
                      {t('payment:securityNotice.description')}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-center gap-1.5 xs:gap-2 pt-2 xs:pt-3 md:pt-4 text-[10px] xs:text-xs text-muted-foreground border-t">
                <ShieldCheck className="h-3 w-3 xs:h-4 xs:w-4 text-success" />
                <span>{t('payment:securePayment')}</span>
              </div>
            </CardContent>
          </Card>

          {!isInvoicePayment && (
            <Button
              onClick={() => navigate("/informacion-envio")}
              variant="ghost"
              className="w-full text-xs xs:text-sm"
              size="sm"
            >
              ← {t('payment:backToShipping')}
            </Button>
          )}
        </div>
        )}
      </div>
    </div>
  );
}
