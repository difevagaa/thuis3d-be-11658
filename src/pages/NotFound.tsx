import { Button } from "@/components/ui/button";
import { Home, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

export default function NotFound() {
  const { t } = useTranslation('errors');
  
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <h1 className="text-9xl font-bold text-primary mb-4">{t('404')}</h1>
        <h2 className="text-3xl font-semibold mb-4">{t('pageNotFound')}</h2>
        <p className="text-muted-foreground mb-8">
          {t('pageNotFoundMessage')}
        </p>
        <div className="flex gap-4 justify-center">
          <Button asChild>
            <Link to="/">
              <Home className="mr-2 h-4 w-4" />
              {t('goHome')}
            </Link>
          </Button>
          <Button variant="outline" onClick={() => window.history.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('goBack')}
          </Button>
        </div>
      </div>
    </div>
  );
}
