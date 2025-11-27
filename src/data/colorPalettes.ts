export interface ColorPalette {
  id: string;
  name: string;
  description: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    textLight: string;
    textDark: string;
  };
}

/**
 * Paletas de colores optimizadas para accesibilidad WCAG 2.1 AA
 * - Contraste mínimo 4.5:1 para texto normal sobre fondos claros
 * - Contraste mínimo 3:1 para texto grande y elementos gráficos
 * - textLight: para usar sobre fondos claros (contraste alto)
 * - textDark: para usar sobre fondos oscuros (contraste alto)
 */
export const colorPalettes: ColorPalette[] = [
  {
    id: "ocean-breeze",
    name: "Océano Fresco",
    description: "Azules suaves y turquesa - Profesional y moderno",
    colors: {
      primary: "#0369a1",
      secondary: "#0e7490",
      accent: "#0891b2",
      textLight: "#0f0f0f",
      textDark: "#f8fafc"
    }
  },
  {
    id: "sunset-glow",
    name: "Resplandor del Atardecer",
    description: "Naranjas y rojos cálidos - Energético y vibrante",
    colors: {
      primary: "#c2410c",
      secondary: "#b91c1c",
      accent: "#dc2626",
      textLight: "#0f0f0f",
      textDark: "#fefefe"
    }
  },
  {
    id: "forest-mist",
    name: "Niebla del Bosque",
    description: "Verdes naturales y frescos - Orgánico y tranquilo",
    colors: {
      primary: "#047857",
      secondary: "#0f766e",
      accent: "#0d9488",
      textLight: "#0f0f0f",
      textDark: "#f0fdf4"
    }
  },
  {
    id: "royal-purple",
    name: "Púrpura Real",
    description: "Violetas elegantes y profundos - Sofisticado y premium",
    colors: {
      primary: "#6d28d9",
      secondary: "#7c3aed",
      accent: "#8b5cf6",
      textLight: "#0f0f0f",
      textDark: "#faf5ff"
    }
  },
  {
    id: "cherry-blossom",
    name: "Flor de Cerezo",
    description: "Rosas delicados y frescos - Elegante y femenino",
    colors: {
      primary: "#be185d",
      secondary: "#db2777",
      accent: "#ec4899",
      textLight: "#0f0f0f",
      textDark: "#fdf2f8"
    }
  },
  {
    id: "midnight-sky",
    name: "Cielo de Medianoche",
    description: "Azules oscuros y profundos - Profesional y confiable",
    colors: {
      primary: "#1e40af",
      secondary: "#1e3a8a",
      accent: "#2563eb",
      textLight: "#0f0f0f",
      textDark: "#eff6ff"
    }
  },
  {
    id: "golden-hour",
    name: "Hora Dorada",
    description: "Amarillos y ámbar brillantes - Cálido y acogedor",
    colors: {
      primary: "#b45309",
      secondary: "#a16207",
      accent: "#d97706",
      textLight: "#0f0f0f",
      textDark: "#fffbeb"
    }
  },
  {
    id: "arctic-frost",
    name: "Escarcha Ártica",
    description: "Azules helados y plateados - Limpio y moderno",
    colors: {
      primary: "#0e7490",
      secondary: "#155e75",
      accent: "#0891b2",
      textLight: "#0f0f0f",
      textDark: "#ecfeff"
    }
  },
  {
    id: "autumn-leaves",
    name: "Hojas de Otoño",
    description: "Marrones cálidos y naranjas - Acogedor y terrenal",
    colors: {
      primary: "#9a3412",
      secondary: "#7c2d12",
      accent: "#c2410c",
      textLight: "#0f0f0f",
      textDark: "#fff7ed"
    }
  },
  {
    id: "lavender-dream",
    name: "Sueño de Lavanda",
    description: "Púrpuras suaves y pasteles - Sereno y creativo",
    colors: {
      primary: "#7c3aed",
      secondary: "#6d28d9",
      accent: "#8b5cf6",
      textLight: "#0f0f0f",
      textDark: "#faf5ff"
    }
  },
  {
    id: "emerald-valley",
    name: "Valle Esmeralda",
    description: "Verdes vibrantes y naturales - Fresco y orgánico",
    colors: {
      primary: "#047857",
      secondary: "#065f46",
      accent: "#059669",
      textLight: "#0f0f0f",
      textDark: "#ecfdf5"
    }
  },
  {
    id: "crimson-fire",
    name: "Fuego Carmesí",
    description: "Rojos intensos y dramáticos - Apasionado y audaz",
    colors: {
      primary: "#b91c1c",
      secondary: "#991b1b",
      accent: "#dc2626",
      textLight: "#0f0f0f",
      textDark: "#fef2f2"
    }
  },
  {
    id: "slate-modern",
    name: "Pizarra Moderna",
    description: "Grises sofisticados y neutros - Elegante y minimalista",
    colors: {
      primary: "#334155",
      secondary: "#1e293b",
      accent: "#475569",
      textLight: "#0f0f0f",
      textDark: "#f8fafc"
    }
  },
  {
    id: "coral-reef",
    name: "Arrecife de Coral",
    description: "Coral y turquesa tropical - Vibrante y alegre",
    colors: {
      primary: "#be123c",
      secondary: "#0e7490",
      accent: "#e11d48",
      textLight: "#0f0f0f",
      textDark: "#fff1f2"
    }
  },
  {
    id: "mint-fresh",
    name: "Menta Fresca",
    description: "Verde menta suave y limpio - Refrescante y moderno",
    colors: {
      primary: "#0f766e",
      secondary: "#115e59",
      accent: "#0d9488",
      textLight: "#0f0f0f",
      textDark: "#f0fdfa"
    }
  },
  {
    id: "plum-wine",
    name: "Vino de Ciruela",
    description: "Púrpuras profundos y vino - Lujoso y elegante",
    colors: {
      primary: "#7c3aed",
      secondary: "#6d28d9",
      accent: "#8b5cf6",
      textLight: "#0f0f0f",
      textDark: "#faf5ff"
    }
  },
  {
    id: "steel-blue",
    name: "Azul Acero",
    description: "Azules metálicos y fríos - Industrial y moderno",
    colors: {
      primary: "#1e40af",
      secondary: "#334155",
      accent: "#2563eb",
      textLight: "#0f0f0f",
      textDark: "#f1f5f9"
    }
  },
  {
    id: "tangerine-burst",
    name: "Explosión de Mandarina",
    description: "Naranjas vibrantes y energéticos - Dinámico y alegre",
    colors: {
      primary: "#c2410c",
      secondary: "#9a3412",
      accent: "#ea580c",
      textLight: "#0f0f0f",
      textDark: "#fff7ed"
    }
  },
  {
    id: "sage-garden",
    name: "Jardín Salvia",
    description: "Verdes salvia suaves - Natural y relajante",
    colors: {
      primary: "#4d7c0f",
      secondary: "#3f6212",
      accent: "#65a30d",
      textLight: "#0f0f0f",
      textDark: "#f7fee7"
    }
  },
  {
    id: "rose-gold",
    name: "Oro Rosa",
    description: "Rosas metálicos y elegantes - Sofisticado y femenino",
    colors: {
      primary: "#be123c",
      secondary: "#9f1239",
      accent: "#e11d48",
      textLight: "#0f0f0f",
      textDark: "#fff1f2"
    }
  },
  {
    id: "navy-classic",
    name: "Navy Clásico",
    description: "Azul marino tradicional - Confiable y profesional",
    colors: {
      primary: "#1e3a8a",
      secondary: "#1e40af",
      accent: "#2563eb",
      textLight: "#0f0f0f",
      textDark: "#f9fafb"
    }
  },
  {
    id: "lime-zest",
    name: "Ralladura de Lima",
    description: "Verdes lima brillantes - Fresco y energético",
    colors: {
      primary: "#4d7c0f",
      secondary: "#3f6212",
      accent: "#65a30d",
      textLight: "#0f0f0f",
      textDark: "#f7fee7"
    }
  },
  {
    id: "indigo-night",
    name: "Noche Índigo",
    description: "Índigos oscuros y místicos - Misterioso y profundo",
    colors: {
      primary: "#4338ca",
      secondary: "#3730a3",
      accent: "#4f46e5",
      textLight: "#0f0f0f",
      textDark: "#eef2ff"
    }
  },
  {
    id: "amber-warm",
    name: "Ámbar Cálido",
    description: "Ámbar y dorado acogedor - Cálido y confortable",
    colors: {
      primary: "#92400e",
      secondary: "#78350f",
      accent: "#b45309",
      textLight: "#0f0f0f",
      textDark: "#fffbeb"
    }
  },
  {
    id: "teal-wave",
    name: "Ola Teal",
    description: "Verde azulado fresco - Moderno y limpio",
    colors: {
      primary: "#0f766e",
      secondary: "#115e59",
      accent: "#0d9488",
      textLight: "#0f0f0f",
      textDark: "#f0fdfa"
    }
  },
  {
    id: "magenta-pop",
    name: "Pop Magenta",
    description: "Magentas vibrantes y llamativos - Audaz y moderno",
    colors: {
      primary: "#a21caf",
      secondary: "#86198f",
      accent: "#c026d3",
      textLight: "#0f0f0f",
      textDark: "#fdf4ff"
    }
  },
  {
    id: "olive-earth",
    name: "Oliva Tierra",
    description: "Verdes oliva naturales - Orgánico y terrenal",
    colors: {
      primary: "#3f6212",
      secondary: "#365314",
      accent: "#4d7c0f",
      textLight: "#0f0f0f",
      textDark: "#f7fee7"
    }
  },
  {
    id: "sky-light",
    name: "Cielo Luminoso",
    description: "Azules cielo claros - Optimista y fresco",
    colors: {
      primary: "#0369a1",
      secondary: "#075985",
      accent: "#0284c7",
      textLight: "#0f0f0f",
      textDark: "#f0f9ff"
    }
  },
  {
    id: "raspberry-red",
    name: "Rojo Frambuesa",
    description: "Rojos frambuesa dulces - Vibrante y dulce",
    colors: {
      primary: "#9f1239",
      secondary: "#881337",
      accent: "#be123c",
      textLight: "#0f0f0f",
      textDark: "#fff1f2"
    }
  },
  {
    id: "bronze-earth",
    name: "Bronce Tierra",
    description: "Tonos bronce y tierra - Premium y terrenal",
    colors: {
      primary: "#78350f",
      secondary: "#713f12",
      accent: "#92400e",
      textLight: "#0f0f0f",
      textDark: "#fef3c7"
    }
  },
  {
    id: "aqua-marine",
    name: "Agua Marina",
    description: "Turquesas marinos - Refrescante y limpio",
    colors: {
      primary: "#0e7490",
      secondary: "#155e75",
      accent: "#0891b2",
      textLight: "#0f0f0f",
      textDark: "#ecfeff"
    }
  },
  {
    id: "fuchsia-bright",
    name: "Fucsia Brillante",
    description: "Fucsias intensos y modernos - Audaz y vibrante",
    colors: {
      primary: "#a21caf",
      secondary: "#86198f",
      accent: "#c026d3",
      textLight: "#0f0f0f",
      textDark: "#fdf4ff"
    }
  },
  {
    id: "charcoal-pro",
    name: "Carbón Pro",
    description: "Negros y grises profesionales - Minimalista y elegante",
    colors: {
      primary: "#18181b",
      secondary: "#27272a",
      accent: "#3f3f46",
      textLight: "#0f0f0f",
      textDark: "#fafafa"
    }
  },
  {
    id: "peach-soft",
    name: "Durazno Suave",
    description: "Melocotón y coral suaves - Cálido y amigable",
    colors: {
      primary: "#c2410c",
      secondary: "#9a3412",
      accent: "#ea580c",
      textLight: "#0f0f0f",
      textDark: "#fff7ed"
    }
  },
  {
    id: "violet-electric",
    name: "Violeta Eléctrico",
    description: "Violetas neón vibrantes - Moderno y energético",
    colors: {
      primary: "#6d28d9",
      secondary: "#5b21b6",
      accent: "#7c3aed",
      textLight: "#0f0f0f",
      textDark: "#f5f3ff"
    }
  },
  {
    id: "moss-green",
    name: "Verde Musgo",
    description: "Verdes musgo naturales - Orgánico y tranquilo",
    colors: {
      primary: "#3f6212",
      secondary: "#365314",
      accent: "#4d7c0f",
      textLight: "#0f0f0f",
      textDark: "#f7fee7"
    }
  },
  {
    id: "ruby-red",
    name: "Rojo Rubí",
    description: "Rojos rubí profundos - Lujoso y apasionado",
    colors: {
      primary: "#991b1b",
      secondary: "#7f1d1d",
      accent: "#b91c1c",
      textLight: "#0f0f0f",
      textDark: "#fef2f2"
    }
  },
  {
    id: "ice-blue",
    name: "Azul Hielo",
    description: "Azules hielo cristalinos - Limpio y refrescante",
    colors: {
      primary: "#0369a1",
      secondary: "#075985",
      accent: "#0284c7",
      textLight: "#0f0f0f",
      textDark: "#f0f9ff"
    }
  },
  {
    id: "honey-gold",
    name: "Oro Miel",
    description: "Dorados miel cálidos - Acogedor y lujoso",
    colors: {
      primary: "#92400e",
      secondary: "#78350f",
      accent: "#b45309",
      textLight: "#0f0f0f",
      textDark: "#fefce8"
    }
  },
  {
    id: "jungle-green",
    name: "Verde Selva",
    description: "Verdes selva profundos - Natural y vibrante",
    colors: {
      primary: "#047857",
      secondary: "#065f46",
      accent: "#059669",
      textLight: "#0f0f0f",
      textDark: "#ecfdf5"
    }
  },
  {
    id: "strawberry-pink",
    name: "Rosa Fresa",
    description: "Rosas fresa dulces - Dulce y femenino",
    colors: {
      primary: "#be185d",
      secondary: "#9d174d",
      accent: "#db2777",
      textLight: "#0f0f0f",
      textDark: "#fdf2f8"
    }
  },
  {
    id: "denim-blue",
    name: "Azul Denim",
    description: "Azules denim casuales - Casual y confiable",
    colors: {
      primary: "#1d4ed8",
      secondary: "#1e40af",
      accent: "#2563eb",
      textLight: "#0f0f0f",
      textDark: "#eff6ff"
    }
  },
  {
    id: "copper-warm",
    name: "Cobre Cálido",
    description: "Cobres metálicos cálidos - Premium y terrenal",
    colors: {
      primary: "#9a3412",
      secondary: "#7c2d12",
      accent: "#c2410c",
      textLight: "#0f0f0f",
      textDark: "#fff7ed"
    }
  },
  {
    id: "mint-chocolate",
    name: "Menta Chocolate",
    description: "Menta y chocolate oscuro - Sofisticado y fresco",
    colors: {
      primary: "#047857",
      secondary: "#1e293b",
      accent: "#059669",
      textLight: "#0f0f0f",
      textDark: "#ecfdf5"
    }
  },
  {
    id: "blush-pink",
    name: "Rosa Rubor",
    description: "Rosas rubor delicados - Suave y elegante",
    colors: {
      primary: "#be185d",
      secondary: "#9d174d",
      accent: "#db2777",
      textLight: "#0f0f0f",
      textDark: "#fdf2f8"
    }
  },
  {
    id: "sapphire-deep",
    name: "Zafiro Profundo",
    description: "Azules zafiro ricos - Lujoso y profundo",
    colors: {
      primary: "#1e3a8a",
      secondary: "#1e40af",
      accent: "#2563eb",
      textLight: "#0f0f0f",
      textDark: "#dbeafe"
    }
  },
  {
    id: "tangerine-lime",
    name: "Mandarina Lima",
    description: "Naranja y lima energéticos - Vibrante y fresco",
    colors: {
      primary: "#c2410c",
      secondary: "#4d7c0f",
      accent: "#ea580c",
      textLight: "#0f0f0f",
      textDark: "#fff7ed"
    }
  },
  {
    id: "storm-gray",
    name: "Gris Tormenta",
    description: "Grises tormenta dramáticos - Profesional y serio",
    colors: {
      primary: "#1f2937",
      secondary: "#111827",
      accent: "#374151",
      textLight: "#0f0f0f",
      textDark: "#f9fafb"
    }
  },
  {
    id: "berry-blast",
    name: "Explosión de Bayas",
    description: "Morados baya intensos - Vibrante y creativo",
    colors: {
      primary: "#7c3aed",
      secondary: "#6d28d9",
      accent: "#8b5cf6",
      textLight: "#0f0f0f",
      textDark: "#faf5ff"
    }
  },
  {
    id: "seafoam-green",
    name: "Verde Espuma Marina",
    description: "Verdes espuma suaves - Tranquilo y refrescante",
    colors: {
      primary: "#0f766e",
      secondary: "#115e59",
      accent: "#0d9488",
      textLight: "#0f0f0f",
      textDark: "#f0fdfa"
    }
  },
  {
    id: "wine-burgundy",
    name: "Vino Borgoña",
    description: "Borgoñas elegantes - Lujoso y sofisticado",
    colors: {
      primary: "#881337",
      secondary: "#9f1239",
      accent: "#be123c",
      textLight: "#0f0f0f",
      textDark: "#fff1f2"
    }
  },
  {
    id: 'teal-dream',
    name: 'Sueño Turquesa',
    description: 'Turquesas refrescantes - Moderno y limpio',
    colors: {
      primary: '#0f766e',
      secondary: '#115e59',
      accent: '#0d9488',
      textLight: '#0f0f0f',
      textDark: '#F0FDFA'
    }
  },
  {
    id: 'coral-passion',
    name: 'Pasión Coral',
    description: 'Corales cálidos y rosas - Vibrante y apasionado',
    colors: {
      primary: '#be123c',
      secondary: '#9f1239',
      accent: '#e11d48',
      textLight: '#0f0f0f',
      textDark: '#FFFFFF'
    }
  },
  {
    id: 'sage-green',
    name: 'Verde Salvia',
    description: 'Verdes salvia calmantes - Natural y sereno',
    colors: {
      primary: '#4d7c0f',
      secondary: '#3f6212',
      accent: '#65a30d',
      textLight: '#0f0f0f',
      textDark: '#FAFAFA'
    }
  },
  {
    id: 'golden-hour-alt',
    name: 'Hora Dorada Alt',
    description: 'Dorados cálidos de atardecer - Cálido y acogedor',
    colors: {
      primary: '#92400e',
      secondary: '#78350f',
      accent: '#b45309',
      textLight: '#0f0f0f',
      textDark: '#FFFBEB'
    }
  },
  {
    id: 'arctic-blue-alt',
    name: 'Azul Ártico Alt',
    description: 'Azules fríos de hielo - Limpio y fresco',
    colors: {
      primary: '#0369a1',
      secondary: '#075985',
      accent: '#0284c7',
      textLight: '#0f0f0f',
      textDark: '#F0F9FF'
    }
  },
  {
    id: 'berry-bliss',
    name: 'Bendición de Bayas',
    description: 'Bayas ricas y vinos - Elegante y sofisticado',
    colors: {
      primary: '#9f1239',
      secondary: '#881337',
      accent: '#be123c',
      textLight: '#0f0f0f',
      textDark: '#FDF2F8'
    }
  },
  {
    id: 'forest-moss',
    name: 'Musgo de Bosque',
    description: 'Verdes profundos de bosque - Natural y sereno',
    colors: {
      primary: '#166534',
      secondary: '#15803d',
      accent: '#059669',
      textLight: '#0f0f0f',
      textDark: '#F0FDF4'
    }
  },
  {
    id: 'sunset-orange-alt',
    name: 'Naranja Atardecer Alt',
    description: 'Naranjas vibrantes de atardecer - Energético',
    colors: {
      primary: '#c2410c',
      secondary: '#9a3412',
      accent: '#ea580c',
      textLight: '#0f0f0f',
      textDark: '#FFF7ED'
    }
  },
  {
    id: 'lavender-mist',
    name: 'Niebla Lavanda',
    description: 'Lavandas suaves y púrpuras - Creativo y sereno',
    colors: {
      primary: '#7c3aed',
      secondary: '#6d28d9',
      accent: '#8b5cf6',
      textLight: '#0f0f0f',
      textDark: '#FAF5FF'
    }
  },
  {
    id: 'steel-gray-alt',
    name: 'Gris Acero Alt',
    description: 'Tonos industriales de acero - Profesional',
    colors: {
      primary: '#334155',
      secondary: '#1e293b',
      accent: '#475569',
      textLight: '#0f0f0f',
      textDark: '#F8FAFC'
    }
  },
  {
    id: 'tropical-paradise',
    name: 'Paraíso Tropical',
    description: 'Colores tropicales brillantes - Vibrante y alegre',
    colors: {
      primary: '#0e7490',
      secondary: '#155e75',
      accent: '#0891b2',
      textLight: '#0f0f0f',
      textDark: '#ECFEFF'
    }
  },
  {
    id: 'autumn-leaves-alt',
    name: 'Hojas de Otoño Alt',
    description: 'Colores cálidos de otoño - Acogedor',
    colors: {
      primary: '#b91c1c',
      secondary: '#991b1b',
      accent: '#dc2626',
      textLight: '#0f0f0f',
      textDark: '#FEF2F2'
    }
  },
  {
    id: 'mint-fresh-alt',
    name: 'Menta Fresca Alt',
    description: 'Verdes menta frescos - Limpio y moderno',
    colors: {
      primary: '#047857',
      secondary: '#065f46',
      accent: '#059669',
      textLight: '#0f0f0f',
      textDark: '#ECFDF5'
    }
  },
  {
    id: 'royal-purple-alt',
    name: 'Púrpura Real Alt',
    description: 'Tonos púrpura regios - Sofisticado',
    colors: {
      primary: '#6d28d9',
      secondary: '#5b21b6',
      accent: '#7c3aed',
      textLight: '#0f0f0f',
      textDark: '#F5F3FF'
    }
  },
  {
    id: 'peachy-keen',
    name: 'Durazno Perfecto',
    description: 'Duraznos suaves y crema - Cálido y amigable',
    colors: {
      primary: '#c2410c',
      secondary: '#9a3412',
      accent: '#ea580c',
      textLight: '#0f0f0f',
      textDark: '#FFF7ED'
    }
  },
  {
    id: 'midnight-navy-alt',
    name: 'Azul Marino Medianoche Alt',
    description: 'Azules marinos profundos - Profesional',
    colors: {
      primary: '#1E3A8A',
      secondary: '#1E40AF',
      accent: '#2563eb',
      textLight: '#0f0f0f',
      textDark: '#EFF6FF'
    }
  },
  {
    id: 'rose-gold-alt',
    name: 'Oro Rosa Alt',
    description: 'Tonos elegantes de oro rosa - Sofisticado',
    colors: {
      primary: '#be185d',
      secondary: '#9d174d',
      accent: '#db2777',
      textLight: '#0f0f0f',
      textDark: '#FDF2F8'
    }
  },
  {
    id: 'emerald-city',
    name: 'Ciudad Esmeralda',
    description: 'Verdes esmeralda ricos - Natural y vibrante',
    colors: {
      primary: '#047857',
      secondary: '#065f46',
      accent: '#059669',
      textLight: '#0f0f0f',
      textDark: '#ECFDF5'
    }
  },
  {
    id: 'chocolate-brown',
    name: 'Chocolate Marrón',
    description: 'Tonos ricos de chocolate - Cálido y lujoso',
    colors: {
      primary: '#78350F',
      secondary: '#713f12',
      accent: '#92400e',
      textLight: '#0f0f0f',
      textDark: '#FEF3C7'
    }
  },
  {
    id: 'cosmic-purple',
    name: 'Púrpura Cósmico',
    description: 'Púrpuras cósmicos profundos - Místico y elegante',
    colors: {
      primary: '#581C87',
      secondary: '#6B21A8',
      accent: '#7c3aed',
      textLight: '#0f0f0f',
      textDark: '#FAF5FF'
    }
  }
];
