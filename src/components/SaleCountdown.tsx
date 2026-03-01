import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Timer } from "lucide-react";
import { cn } from "@/lib/utils";

interface SaleCountdownProps {
  saleEndDate: string;
  compact?: boolean;
  className?: string;
}

export function SaleCountdown({ saleEndDate, compact = false, className }: SaleCountdownProps) {
  const { t } = useTranslation('products');
  const [timeLeft, setTimeLeft] = useState(getTimeLeft(saleEndDate));

  useEffect(() => {
    const interval = setInterval(() => {
      const remaining = getTimeLeft(saleEndDate);
      setTimeLeft(remaining);
      if (remaining.total <= 0) clearInterval(interval);
    }, 1000);
    return () => clearInterval(interval);
  }, [saleEndDate]);

  if (timeLeft.total <= 0) return null;

  if (compact) {
    return (
      <div className={cn("flex items-center gap-1 text-[9px] md:text-[10px] font-bold text-destructive", className)}>
        <Timer className="h-3 w-3" />
        <span>{timeLeft.days > 0 ? `${timeLeft.days}d ` : ''}{pad(timeLeft.hours)}:{pad(timeLeft.minutes)}:{pad(timeLeft.seconds)}</span>
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-3 p-3 bg-destructive/10 border border-destructive/20 rounded-lg", className)}>
      <Timer className="h-5 w-5 text-destructive flex-shrink-0" />
      <div className="flex-1">
        <p className="text-xs font-semibold text-destructive mb-1">{t('countdown.title')}</p>
        <div className="flex gap-2">
          {timeLeft.days > 0 && (
            <TimeUnit value={timeLeft.days} label={t('countdown.days')} />
          )}
          <TimeUnit value={timeLeft.hours} label={t('countdown.hours')} />
          <TimeUnit value={timeLeft.minutes} label={t('countdown.minutes')} />
          <TimeUnit value={timeLeft.seconds} label={t('countdown.seconds')} />
        </div>
      </div>
    </div>
  );
}

function TimeUnit({ value, label }: { value: number; label: string }) {
  return (
    <div className="text-center">
      <div className="bg-destructive text-destructive-foreground rounded px-2 py-1 text-sm font-bold min-w-[36px]">
        {pad(value)}
      </div>
      <p className="text-[9px] text-muted-foreground mt-0.5">{label}</p>
    </div>
  );
}

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

function getTimeLeft(endDate: string) {
  const total = new Date(endDate).getTime() - Date.now();
  if (total <= 0) return { total: 0, days: 0, hours: 0, minutes: 0, seconds: 0 };
  return {
    total,
    days: Math.floor(total / (1000 * 60 * 60 * 24)),
    hours: Math.floor((total / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((total / (1000 * 60)) % 60),
    seconds: Math.floor((total / 1000) % 60),
  };
}
