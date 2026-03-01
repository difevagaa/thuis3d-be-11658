import { Truck } from "lucide-react";
import { useTranslation } from "react-i18next";
import { addDays, format } from "date-fns";

interface DeliveryEstimateProps {
  estimatedDays: number;
}

export function DeliveryEstimate({ estimatedDays }: DeliveryEstimateProps) {
  const { t } = useTranslation('products');
  
  const minDate = addDays(new Date(), estimatedDays);
  const maxDate = addDays(new Date(), estimatedDays + 2);

  return (
    <div className="flex items-center gap-2 p-2.5 bg-accent/30 rounded-lg border border-border/50">
      <Truck className="h-5 w-5 text-primary flex-shrink-0" />
      <div>
        <p className="text-xs font-medium">{t('delivery.estimate')}</p>
        <p className="text-sm text-muted-foreground">
          {format(minDate, "dd/MM")} - {format(maxDate, "dd/MM")}
        </p>
      </div>
    </div>
  );
}
