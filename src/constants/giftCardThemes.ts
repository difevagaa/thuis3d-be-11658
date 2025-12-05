// Gift card color themes with neutral, pleasant palettes
export interface GiftCardTheme {
  id: string;
  name: string;
  gradient: string;
  bgGradient: string;
  textColor: string;
  accentColor: string;
  borderColor: string;
}

export const GIFT_CARD_THEMES: GiftCardTheme[] = [
  {
    id: 'ocean',
    name: 'Océano Sereno',
    gradient: 'from-blue-400 via-cyan-400 to-teal-400',
    bgGradient: 'bg-gradient-to-br from-blue-400 via-cyan-400 to-teal-400',
    textColor: 'text-white',
    accentColor: 'blue-500',
    borderColor: 'border-blue-300'
  },
  {
    id: 'forest',
    name: 'Bosque Tranquilo',
    gradient: 'from-emerald-400 via-green-400 to-lime-400',
    bgGradient: 'bg-gradient-to-br from-emerald-400 via-green-400 to-lime-400',
    textColor: 'text-white',
    accentColor: 'green-500',
    borderColor: 'border-green-300'
  },
  {
    id: 'sunset',
    name: 'Atardecer Cálido',
    gradient: 'from-amber-400 via-orange-300 to-yellow-400',
    bgGradient: 'bg-gradient-to-br from-amber-400 via-orange-300 to-yellow-400',
    textColor: 'text-white',
    accentColor: 'amber-500',
    borderColor: 'border-amber-300'
  },
  {
    id: 'lavender',
    name: 'Lavanda Suave',
    gradient: 'from-purple-300 via-violet-300 to-indigo-300',
    bgGradient: 'bg-gradient-to-br from-purple-300 via-violet-300 to-indigo-300',
    textColor: 'text-white',
    accentColor: 'purple-500',
    borderColor: 'border-purple-300'
  },
  {
    id: 'rose',
    name: 'Rosa Elegante',
    gradient: 'from-pink-300 via-rose-300 to-red-300',
    bgGradient: 'bg-gradient-to-br from-pink-300 via-rose-300 to-red-300',
    textColor: 'text-white',
    accentColor: 'pink-500',
    borderColor: 'border-pink-300'
  },
  {
    id: 'slate',
    name: 'Pizarra Moderna',
    gradient: 'from-slate-400 via-gray-400 to-zinc-400',
    bgGradient: 'bg-gradient-to-br from-slate-400 via-gray-400 to-zinc-400',
    textColor: 'text-white',
    accentColor: 'slate-500',
    borderColor: 'border-slate-300'
  },
  {
    id: 'mint',
    name: 'Menta Fresca',
    gradient: 'from-teal-300 via-cyan-300 to-sky-300',
    bgGradient: 'bg-gradient-to-br from-teal-300 via-cyan-300 to-sky-300',
    textColor: 'text-white',
    accentColor: 'teal-500',
    borderColor: 'border-teal-300'
  },
  {
    id: 'peach',
    name: 'Melocotón Dulce',
    gradient: 'from-orange-200 via-pink-200 to-rose-200',
    bgGradient: 'bg-gradient-to-br from-orange-200 via-pink-200 to-rose-200',
    textColor: 'text-gray-800',
    accentColor: 'orange-400',
    borderColor: 'border-orange-200'
  }
];

// Gift card icon options
export interface GiftCardIcon {
  id: string;
  name: string;
  emoji: string;
  description: string;
}

export const GIFT_CARD_ICONS: GiftCardIcon[] = [
  {
    id: 'gift',
    name: 'Regalo',
    emoji: '🎁',
    description: 'Clásico regalo'
  },
  {
    id: 'celebration',
    name: 'Celebración',
    emoji: '🎉',
    description: 'Fiesta y celebración'
  },
  {
    id: 'heart',
    name: 'Corazón',
    emoji: '❤️',
    description: 'Amor y afecto'
  },
  {
    id: 'star',
    name: 'Estrella',
    emoji: '⭐',
    description: 'Especial y brillante'
  },
  {
    id: 'cake',
    name: 'Pastel',
    emoji: '🎂',
    description: 'Cumpleaños'
  },
  {
    id: 'balloon',
    name: 'Globo',
    emoji: '🎈',
    description: 'Diversión y alegría'
  },
  {
    id: 'flower',
    name: 'Flor',
    emoji: '🌸',
    description: 'Belleza y naturaleza'
  },
  {
    id: 'sparkles',
    name: 'Destellos',
    emoji: '✨',
    description: 'Mágico y especial'
  },
  {
    id: 'rocket',
    name: 'Cohete',
    emoji: '🚀',
    description: 'Aventura'
  },
  {
    id: 'trophy',
    name: 'Trofeo',
    emoji: '🏆',
    description: 'Logro y éxito'
  }
];

// Helper function to get theme by ID
export function getThemeById(themeId: string): GiftCardTheme {
  return GIFT_CARD_THEMES.find(t => t.id === themeId) || GIFT_CARD_THEMES[0];
}

// Helper function to get icon by ID
export function getIconById(iconId: string): GiftCardIcon {
  return GIFT_CARD_ICONS.find(i => i.id === iconId) || GIFT_CARD_ICONS[0];
}

// Default theme (ocean - neutral and pleasant)
export const DEFAULT_THEME = GIFT_CARD_THEMES[0];
export const DEFAULT_ICON = GIFT_CARD_ICONS[0];
