import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Printer, Gift } from "lucide-react";
import GiftCardPrintable from "@/components/GiftCardPrintable";
import { i18nToast } from "@/lib/i18nToast";
import { DEFAULT_THEME, DEFAULT_ICON } from "@/constants/giftCardThemes";

// Helper function to extract customization from message
function parseGiftCardMessage(message: string | null) {
  if (!message) return { userMessage: null, themeId: DEFAULT_THEME.id, iconId: DEFAULT_ICON.id };
  
  try {
    const parsed = JSON.parse(message);
    return {
      userMessage: parsed.userMessage || null,
      themeId: parsed.themeId || DEFAULT_THEME.id,
      iconId: parsed.iconId || DEFAULT_ICON.id
    };
  } catch {
    // If not JSON, treat as plain message (backwards compatible)
    return { userMessage: message, themeId: DEFAULT_THEME.id, iconId: DEFAULT_ICON.id };
  }
}

export default function GiftCardView() {
  const { t } = useTranslation(['common', 'account']);
  const location = useLocation();
  const selectedCardId = location.state?.selectedCardId;
  const [giftCards, setGiftCards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadGiftCards();
  }, []);

  const loadGiftCards = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("email")
        .eq("id", user.id)
        .single();

      if (!profile?.email) return;

      const { data, error } = await supabase
        .from("gift_cards")
        .select("*")
        .eq("recipient_email", profile.email)
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setGiftCards(data || []);
    } catch (error) {
      console.error("Error loading gift cards:", error);
      i18nToast.error("error.loadingGiftCardsFailed");
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = (card: any) => {
    const printContent = document.getElementById(`gift-card-${card.id}`);
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    // Get all CSS rules
    const styles = Array.from(document.styleSheets)
      .map(styleSheet => {
        try {
          return Array.from(styleSheet.cssRules)
            .map(rule => rule.cssText)
            .join('\n');
        } catch (e) {
          return '';
        }
      })
      .join('\n');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Tarjeta de Regalo - ${card.code}</title>
          <meta charset="UTF-8">
          <style>
            ${styles}
            body {
              margin: 0;
              padding: 20px;
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 100vh;
              background: #f5f5f5;
            }
            @media print {
              body { padding: 0; background: white; }
              @page { margin: 0; }
            }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
          <script>
            window.onload = function() {
              setTimeout(function() { window.print(); }, 500);
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleDownload = async (card: any) => {
    try {
      // For download, we'll use print dialog which allows saving as PDF
      handlePrint(card);
      i18nToast.info("info.saveToPdf");
    } catch (error) {
      i18nToast.error("error.downloadFailed");
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">{t('common:loading')}</div>
      </div>
    );
  }

  if (giftCards.length === 0) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="pt-6 text-center">
            <Gift className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">No tienes tarjetas de regalo activas</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6">
      <h1 className="text-2xl md:text-3xl font-bold mb-6">Mis Tarjetas de Regalo</h1>
      
      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-2">
        {giftCards
          .filter(card => !selectedCardId || card.id === selectedCardId)
          .map((card) => {
            const { userMessage, themeId, iconId } = parseGiftCardMessage(card.message);
            return (
          <Card key={card.id} className="overflow-hidden">
            <CardHeader className="bg-gradient-to-br from-blue-400 via-cyan-400 to-teal-400 text-white">
              <CardTitle className="flex items-center gap-2">
                <Gift className="h-5 w-5" />
                Tarjeta de Regalo
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              {/* Printable version (hidden) */}
              <div id={`gift-card-${card.id}`} className="hidden print:block">
                <GiftCardPrintable
                  code={card.code}
                  amount={card.current_balance}
                  message={userMessage}
                  senderName={card.sender_name}
                  expiresAt={card.expires_at}
                  recipientEmail={card.recipient_email}
                  themeId={themeId}
                  iconId={iconId}
                />
              </div>

              {/* Display preview - Full width container */}
              <div className="w-full flex justify-center">
                <GiftCardPrintable
                  code={card.code}
                  amount={card.current_balance}
                  message={userMessage}
                  senderName={card.sender_name}
                  expiresAt={card.expires_at}
                  recipientEmail={card.recipient_email}
                  themeId={themeId}
                  iconId={iconId}
                />
              </div>

              <div className="flex gap-2 mt-4">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex-1"
                  onClick={() => handlePrint(card)}
                >
                  <Printer className="h-4 w-4 mr-2" />
                  Imprimir
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex-1"
                  onClick={() => handleDownload(card)}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Descargar
                </Button>
              </div>

              {card.expires_at && (
                <p className="text-xs text-muted-foreground text-center mt-2">
                  Válida hasta: {new Date(card.expires_at).toLocaleDateString('es-ES')}
                </p>
              )}
            </CardContent>
          </Card>
        )})}
      </div>
    </div>
  );
}
