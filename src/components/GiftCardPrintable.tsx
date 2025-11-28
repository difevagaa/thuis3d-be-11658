import { Card } from "@/components/ui/card";

interface GiftCardPrintableProps {
  code: string;
  amount: number;
  message?: string;
  senderName?: string;
  expiresAt?: string;
  recipientEmail: string;
}

export default function GiftCardPrintable({
  code,
  amount,
  message,
  senderName,
  expiresAt,
  recipientEmail
}: GiftCardPrintableProps) {
  return (
    <div className="w-full aspect-[16/10] max-w-[450px] relative overflow-hidden rounded-2xl shadow-2xl print:shadow-none print:max-w-[120mm] print:aspect-[16/10]">
      {/* Enhanced gradient background - Professional slate/neutral tones */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900" />
      
      {/* Subtle pattern overlay */}
      <div className="absolute inset-0 opacity-10">
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
      <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

      {/* Content */}
      <div className="relative h-full p-6 md:p-8 flex flex-col justify-between text-white">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <div className="text-4xl md:text-5xl mb-2">🎁</div>
            <h2 className="text-xl md:text-2xl font-bold tracking-tight">Tarjeta Regalo</h2>
            <p className="text-sm md:text-base opacity-80 font-medium">Thuis3D.be</p>
          </div>
          <div className="bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-lg text-xs font-semibold border border-white/20">
            No vendible
          </div>
        </div>

        {/* Amount - Centered and prominent */}
        <div className="text-center space-y-4">
          <div className="text-6xl md:text-7xl font-bold drop-shadow-lg">
            €{amount.toFixed(2)}
          </div>
          <div className="bg-white text-slate-800 px-6 py-3 rounded-xl font-mono font-bold text-sm md:text-base tracking-widest shadow-lg inline-block">
            {code}
          </div>
        </div>

        {/* Footer */}
        <div className="space-y-3">
          {message && (
            <div className="bg-white/10 backdrop-blur-md p-3 rounded-lg border border-white/20">
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
          <div className="flex justify-between items-end text-[10px] md:text-xs opacity-70 font-medium">
            <span className="truncate max-w-[55%]">{recipientEmail}</span>
            {expiresAt && (
              <span className="whitespace-nowrap">Válida hasta {new Date(expiresAt).toLocaleDateString('es-ES')}</span>
            )}
          </div>
          <p className="text-[10px] md:text-xs text-center opacity-60 font-medium">
            www.thuis3d.be • Uso exclusivo tienda online
          </p>
        </div>
      </div>
    </div>
  );
}
