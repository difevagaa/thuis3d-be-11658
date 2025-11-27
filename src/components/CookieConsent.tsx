import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { X } from "lucide-react";

export default function CookieConsent() {
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem("cookieConsent");
    if (!consent) {
      setShowBanner(true);
    }
  }, []);

  const acceptCookies = () => {
    localStorage.setItem("cookieConsent", "accepted");
    setShowBanner(false);
  };

  const rejectCookies = () => {
    localStorage.setItem("cookieConsent", "rejected");
    setShowBanner(false);
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4">
      <Card className="max-w-4xl mx-auto p-6 shadow-lg">
        <div className="flex items-start gap-4">
          <div className="flex-1">
            <h3 className="text-lg font-semibold mb-2">Utilizamos Cookies</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Utilizamos cookies para mejorar tu experiencia de navegación, personalizar contenido y analizar nuestro tráfico. 
              Al hacer clic en "Aceptar", consientes el uso de TODAS las cookies. 
              Puedes consultar nuestra{" "}
              <a href="/legal/cookies" className="underline">Política de Cookies</a> para más información.
            </p>
            <div className="flex gap-3">
              <Button onClick={acceptCookies}>
                Aceptar Todas
              </Button>
              <Button variant="outline" onClick={rejectCookies}>
                Rechazar
              </Button>
            </div>
          </div>
          <button
            onClick={rejectCookies}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </Card>
    </div>
  );
}
