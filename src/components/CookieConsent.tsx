import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { X } from "lucide-react";
import { Trans, useTranslation } from "react-i18next";

export default function CookieConsent() {
  const { t } = useTranslation(["common"]);
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
            <h3 className="text-lg font-semibold mb-2">{t("common:cookieConsent.title")}</h3>
            <p className="text-sm text-muted-foreground mb-4">
              <Trans
                ns="common"
                i18nKey="cookieConsent.description"
                components={[<a key="cookies" href="/legal/cookies" className="underline" />]}
              />
            </p>
            <div className="flex gap-3">
              <Button onClick={acceptCookies}>{t("common:cookieConsent.acceptAll")}</Button>
              <Button variant="outline" onClick={rejectCookies}>
                {t("common:cookieConsent.reject")}
              </Button>
            </div>
          </div>
          <button
            onClick={rejectCookies}
            className="text-muted-foreground hover:text-foreground"
            aria-label={t("common:close")}
            type="button"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </Card>
    </div>
  );
}
