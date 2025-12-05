import { Card } from "@/components/ui/card";
import { getThemeById, getIconById, DEFAULT_THEME, DEFAULT_ICON } from "@/constants/giftCardThemes";
import React from "react";

interface GiftCardPrintableProps {
  code: string;
  amount: number;
  message?: string;
  senderName?: string;
  expiresAt?: string;
  recipientEmail: string;
  themeId?: string;
  iconId?: string;
}

export default function GiftCardPrintable({
  code,
  amount,
  message,
  senderName,
  expiresAt,
  recipientEmail,
  themeId,
  iconId
}: GiftCardPrintableProps) {
  // Get theme and icon, fallback to defaults
  const theme = themeId ? getThemeById(themeId) : DEFAULT_THEME;
  const icon = iconId ? getIconById(iconId) : DEFAULT_ICON;

  // Map accent colors to actual color values for inline styles
  const accentColorMap: Record<string, string> = {
    'blue-500': '#3b82f6',
    'green-500': '#22c55e',
    'amber-500': '#f59e0b',
    'purple-500': '#a855f7',
    'pink-500': '#ec4899',
    'slate-500': '#64748b',
    'teal-500': '#14b8a6',
    'orange-400': '#fb923c'
  };

  const accentColorValue = accentColorMap[theme.accentColor] || '#3b82f6';

  return (
    <div className="w-full aspect-[16/10] max-w-[450px] relative overflow-hidden rounded-2xl shadow-2xl print:shadow-none print:max-w-[120mm] print:aspect-[16/10]" style={{ '--accent-color': accentColorValue } as React.CSSProperties}>
      {/* Enhanced gradient background with selected theme */}
      <div className={`absolute inset-0 ${theme.bgGradient}`} />
      
      {/* Animated pattern overlay */}
      <div className="absolute inset-0 opacity-20">
        <svg width="100%" height="100%">
          <defs>
            <pattern id="gift-pattern" x="0" y="0" width="60" height="60" patternUnits="userSpaceOnUse">
              <circle cx="30" cy="30" r="3" fill="white" opacity="0.8" />
              <circle cx="10" cy="10" r="2" fill="white" opacity="0.5" />
              <circle cx="50" cy="50" r="2" fill="white" opacity="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#gift-pattern)" />
        </svg>
      </div>

      {/* Decorative shapes */}
      <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

      {/* Content */}
      <div className={`relative h-full p-6 md:p-8 flex flex-col justify-between ${theme.textColor}`}>
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <div className="text-4xl md:text-5xl mb-2">{icon.emoji}</div>
            <h2 className="text-xl md:text-2xl font-bold tracking-tight">Tarjeta Regalo</h2>
            <p className="text-sm md:text-base opacity-90 font-medium">Thuis3D.be</p>
          </div>
          <div className="bg-white/20 backdrop-blur-md px-3 py-1.5 rounded-lg text-xs font-semibold border border-white/30">
            No vendible
          </div>
        </div>

        {/* Amount - Centered and prominent */}
        <div className="text-center space-y-3">
          <div className="text-5xl md:text-6xl font-bold drop-shadow-lg">
            €{amount.toFixed(2)}
          </div>
          <div className="bg-white/25 backdrop-blur-sm px-5 py-2.5 rounded-lg font-mono font-bold text-sm md:text-base tracking-widest border-2 border-white/50 inline-block shadow-lg">
            {code}
          </div>
        </div>

        {/* Footer */}
        <div className="space-y-3">
          {message && (
            <div className="bg-white/20 backdrop-blur-md p-3 rounded-lg border border-white/30">
              <p className="text-xs md:text-sm italic leading-relaxed line-clamp-2">
                "{message}"
              </p>
            </div>
          )}
          {senderName && (
            <p className="text-xs md:text-sm text-center font-medium">
              De: <span className="font-bold">{senderName}</span>
            </p>
          )}
          <div className="flex justify-between items-end text-[10px] md:text-xs opacity-80 font-medium">
            <span className="truncate max-w-[55%]">{recipientEmail}</span>
            {expiresAt && (
              <span className="whitespace-nowrap">Válida hasta {new Date(expiresAt).toLocaleDateString('es-ES')}</span>
            )}
          </div>
          <p className="text-[10px] md:text-xs text-center opacity-70 font-medium">
            www.thuis3d.be • Uso exclusivo tienda online
          </p>
        </div>
      </div>
    </div>
  );
}
