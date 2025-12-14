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
  const theme = themeId ? getThemeById(themeId) : DEFAULT_THEME;
  const icon = iconId ? getIconById(iconId) : DEFAULT_ICON;

  return (
    <div className="w-full max-w-[420px] relative overflow-hidden rounded-2xl shadow-2xl print:shadow-none print:max-w-[100mm]">
      {/* Main gradient background */}
      <div className={`absolute inset-0 ${theme.bgGradient}`} />
      
      {/* Subtle pattern overlay */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white rounded-full blur-2xl translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 left-0 w-40 h-40 bg-white rounded-full blur-2xl -translate-x-1/2 translate-y-1/2" />
      </div>

      {/* Card content */}
      <div className={`relative p-6 ${theme.textColor}`}>
        {/* Top row: Logo/Brand + Badge */}
        <div className="flex justify-between items-start mb-6">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{icon.emoji}</span>
            <div>
              <h2 className="text-lg font-bold tracking-tight leading-none">Tarjeta Regalo</h2>
              <p className="text-xs opacity-80 font-medium">Thuis3D.be</p>
            </div>
          </div>
          <div className="bg-white/25 backdrop-blur-sm px-2.5 py-1 rounded-full text-[10px] font-semibold">
            GIFT CARD
          </div>
        </div>

        {/* Center: Amount - Clean and prominent */}
        <div className="text-center py-6">
          <div className="inline-flex items-baseline gap-1">
            <span className="text-2xl font-medium opacity-80">€</span>
            <span className="text-6xl font-bold tracking-tight drop-shadow-lg">
              {amount.toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* Code - Clean pill design */}
        <div className="flex justify-center mb-5">
          <div className="bg-white/30 backdrop-blur-sm px-5 py-2 rounded-full">
            <span className="font-mono font-bold text-sm tracking-widest">{code}</span>
          </div>
        </div>

        {/* Message (if exists) */}
        {message && (
          <div className="bg-white/15 backdrop-blur-sm rounded-lg p-3 mb-4">
            <p className="text-xs italic text-center leading-relaxed line-clamp-2">"{message}"</p>
          </div>
        )}

        {/* Footer info - Clean layout */}
        <div className="pt-3 border-t border-white/20 space-y-2">
          {senderName && (
            <p className="text-xs text-center">
              De: <span className="font-semibold">{senderName}</span>
            </p>
          )}
          <div className="flex justify-between items-center text-[10px] opacity-70">
            <span className="truncate max-w-[45%]">{recipientEmail}</span>
            {expiresAt && (
              <span>Válida: {new Date(expiresAt).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: '2-digit' })}</span>
            )}
          </div>
          <p className="text-[10px] text-center opacity-60 font-medium">
            www.thuis3d.be
          </p>
        </div>
      </div>
    </div>
  );
}
