export interface ThemePreset {
  id: string;
  name: string;
  description: string;
  colors: {
    primary: string;
    secondary: string;
    background: string;
    homeHeroBg: string;
    cardBg: string;
    textLight: string;
    textDark: string;
    adminSidebarBg: string;
    adminSidebarText: string;
    adminSidebarActive: string;
  };
  fonts: {
    heading: string;
    body: string;
  };
  borderRadius: string;
  buttonStyle: 'rounded' | 'sharp' | 'pill';
}

export const themePresets: ThemePreset[] = [
  {
    id: 'modern-bold',
    name: 'Moderno Audaz',
    description: 'Rojo vibrante con tipografías elegantes',
    colors: {
      primary: '#E02C2C',
      secondary: '#2C3E50',
      background: '#FFFFFF',
      homeHeroBg: '#FEF2F2',
      cardBg: '#FFFFFF',
      textLight: '#1A1A1A',
      textDark: '#FFFFFF',
      adminSidebarBg: '#1E293B',
      adminSidebarText: '#F1F5F9',
      adminSidebarActive: '#E02C2C'
    },
    fonts: {
      heading: 'Playfair Display',
      body: 'Inter'
    },
    borderRadius: '0.75rem',
    buttonStyle: 'rounded'
  },
  {
    id: 'minimalist',
    name: 'Minimalista',
    description: 'Limpio y profesional',
    colors: {
      primary: '#000000',
      secondary: '#666666',
      background: '#FFFFFF',
      homeHeroBg: '#F9FAFB',
      cardBg: '#FFFFFF',
      textLight: '#000000',
      textDark: '#FFFFFF',
      adminSidebarBg: '#0F172A',
      adminSidebarText: '#F8FAFC',
      adminSidebarActive: '#334155'
    },
    fonts: {
      heading: 'Inter',
      body: 'Inter'
    },
    borderRadius: '0.375rem',
    buttonStyle: 'sharp'
  },
  {
    id: 'tech-blue',
    name: 'Tecnológico Azul',
    description: 'Azul eléctrico y moderno',
    colors: {
      primary: '#3B82F6',
      secondary: '#1E40AF',
      background: '#FFFFFF',
      homeHeroBg: '#EFF6FF',
      cardBg: '#F8FAFC',
      textLight: '#0F172A',
      textDark: '#FFFFFF',
      adminSidebarBg: '#1E3A8A',
      adminSidebarText: '#DBEAFE',
      adminSidebarActive: '#3B82F6'
    },
    fonts: {
      heading: 'Poppins',
      body: 'Inter'
    },
    borderRadius: '0.5rem',
    buttonStyle: 'rounded'
  },
  {
    id: 'warm-orange',
    name: 'Cálido Naranja',
    description: 'Energético y acogedor',
    colors: {
      primary: '#F97316',
      secondary: '#DC2626',
      background: '#FFFFFF',
      homeHeroBg: '#FFF7ED',
      cardBg: '#FFFBEB',
      textLight: '#1C1917',
      textDark: '#FFFFFF',
      adminSidebarBg: '#78350F',
      adminSidebarText: '#FEF3C7',
      adminSidebarActive: '#F97316'
    },
    fonts: {
      heading: 'Montserrat',
      body: 'Open Sans'
    },
    borderRadius: '1rem',
    buttonStyle: 'pill'
  },
  {
    id: 'purple-luxury',
    name: 'Lujo Púrpura',
    description: 'Elegante y sofisticado',
    colors: {
      primary: '#8B5CF6',
      secondary: '#6366F1',
      background: '#FAFAFA',
      homeHeroBg: '#FAF5FF',
      cardBg: '#FFFFFF',
      textLight: '#18181B',
      textDark: '#FAFAFA',
      adminSidebarBg: '#4C1D95',
      adminSidebarText: '#EDE9FE',
      adminSidebarActive: '#8B5CF6'
    },
    fonts: {
      heading: 'Playfair Display',
      body: 'Poppins'
    },
    borderRadius: '0.75rem',
    buttonStyle: 'rounded'
  },
  {
    id: 'green-eco',
    name: 'Verde Eco',
    description: 'Natural y sostenible',
    colors: {
      primary: '#10B981',
      secondary: '#059669',
      background: '#FFFFFF',
      homeHeroBg: '#ECFDF5',
      cardBg: '#F0FDF4',
      textLight: '#064E3B',
      textDark: '#FFFFFF',
      adminSidebarBg: '#064E3B',
      adminSidebarText: '#D1FAE5',
      adminSidebarActive: '#10B981'
    },
    fonts: {
      heading: 'Montserrat',
      body: 'Inter'
    },
    borderRadius: '0.5rem',
    buttonStyle: 'rounded'
  },
  {
    id: 'dark-mode',
    name: 'Modo Oscuro',
    description: 'Elegante y suave para los ojos',
    colors: {
      primary: '#EF4444',
      secondary: '#F59E0B',
      background: '#121214',
      homeHeroBg: '#1a1a1d',
      cardBg: '#1e1e22',
      textLight: '#F5F5F5',
      textDark: '#0a0a0b',
      adminSidebarBg: '#0a0a0b',
      adminSidebarText: '#E8E8E8',
      adminSidebarActive: '#EF4444'
    },
    fonts: {
      heading: 'Poppins',
      body: 'Inter'
    },
    borderRadius: '0.75rem',
    buttonStyle: 'rounded'
  },
  {
    id: 'ocean-calm',
    name: 'Océano Calmado',
    description: 'Azules profundos y relajantes',
    colors: {
      primary: '#0891B2',
      secondary: '#0369A1',
      background: '#FFFFFF',
      homeHeroBg: '#ECFEFF',
      cardBg: '#F0F9FF',
      textLight: '#164E63',
      textDark: '#FFFFFF',
      adminSidebarBg: '#164E63',
      adminSidebarText: '#CFFAFE',
      adminSidebarActive: '#0891B2'
    },
    fonts: {
      heading: 'Playfair Display',
      body: 'Inter'
    },
    borderRadius: '0.5rem',
    buttonStyle: 'rounded'
  },
  {
    id: 'sunset-vibes',
    name: 'Atardecer Vibrante',
    description: 'Colores cálidos de atardecer',
    colors: {
      primary: '#EA580C',
      secondary: '#DC2626',
      background: '#FFFBEB',
      homeHeroBg: '#FFF7ED',
      cardBg: '#FFFFFF',
      textLight: '#1C1917',
      textDark: '#FFFFFF',
      adminSidebarBg: '#7C2D12',
      adminSidebarText: '#FED7AA',
      adminSidebarActive: '#EA580C'
    },
    fonts: {
      heading: 'Montserrat',
      body: 'Open Sans'
    },
    borderRadius: '1rem',
    buttonStyle: 'rounded'
  },
  {
    id: 'forest-nature',
    name: 'Bosque Natural',
    description: 'Verdes naturales y terrosos',
    colors: {
      primary: '#15803D',
      secondary: '#166534',
      background: '#F0FDF4',
      homeHeroBg: '#DCFCE7',
      cardBg: '#FFFFFF',
      textLight: '#14532D',
      textDark: '#FFFFFF',
      adminSidebarBg: '#14532D',
      adminSidebarText: '#BBF7D0',
      adminSidebarActive: '#15803D'
    },
    fonts: {
      heading: 'Poppins',
      body: 'Inter'
    },
    borderRadius: '0.75rem',
    buttonStyle: 'rounded'
  },
  {
    id: 'berry-sweet',
    name: 'Dulce de Bayas',
    description: 'Tonos dulces de bayas',
    colors: {
      primary: '#BE185D',
      secondary: '#9F1239',
      background: '#FFFFFF',
      homeHeroBg: '#FDF2F8',
      cardBg: '#FCE7F3',
      textLight: '#1F2937',
      textDark: '#FFFFFF',
      adminSidebarBg: '#831843',
      adminSidebarText: '#FCE7F3',
      adminSidebarActive: '#BE185D'
    },
    fonts: {
      heading: 'Playfair Display',
      body: 'Poppins'
    },
    borderRadius: '0.5rem',
    buttonStyle: 'pill'
  },
  {
    id: 'midnight-blue',
    name: 'Azul Medianoche',
    description: 'Azul oscuro profesional',
    colors: {
      primary: '#1E40AF',
      secondary: '#1E3A8A',
      background: '#F8FAFC',
      homeHeroBg: '#EFF6FF',
      cardBg: '#FFFFFF',
      textLight: '#0F172A',
      textDark: '#FFFFFF',
      adminSidebarBg: '#1E3A8A',
      adminSidebarText: '#DBEAFE',
      adminSidebarActive: '#3B82F6'
    },
    fonts: {
      heading: 'Montserrat',
      body: 'Inter'
    },
    borderRadius: '0.375rem',
    buttonStyle: 'sharp'
  },
  {
    id: 'lavender-dream',
    name: 'Sueño de Lavanda',
    description: 'Púrpuras suaves y relajantes',
    colors: {
      primary: '#A78BFA',
      secondary: '#8B5CF6',
      background: '#FAFAFA',
      homeHeroBg: '#FAF5FF',
      cardBg: '#FFFFFF',
      textLight: '#1F2937',
      textDark: '#FAFAFA',
      adminSidebarBg: '#5B21B6',
      adminSidebarText: '#EDE9FE',
      adminSidebarActive: '#A78BFA'
    },
    fonts: {
      heading: 'Poppins',
      body: 'Open Sans'
    },
    borderRadius: '1rem',
    buttonStyle: 'pill'
  },
  {
    id: 'coral-reef',
    name: 'Arrecife de Coral',
    description: 'Corales vibrantes y alegres',
    colors: {
      primary: '#FF6B6B',
      secondary: '#FA5252',
      background: '#FFFFFF',
      homeHeroBg: '#FFF5F5',
      cardBg: '#FEF2F2',
      textLight: '#2B2B2B',
      textDark: '#FFFFFF',
      adminSidebarBg: '#991B1B',
      adminSidebarText: '#FEE2E2',
      adminSidebarActive: '#FF6B6B'
    },
    fonts: {
      heading: 'Montserrat',
      body: 'Inter'
    },
    borderRadius: '0.75rem',
    buttonStyle: 'rounded'
  },
  {
    id: 'industrial-steel',
    name: 'Acero Industrial',
    description: 'Grises modernos y profesionales',
    colors: {
      primary: '#64748B',
      secondary: '#475569',
      background: '#F8FAFC',
      homeHeroBg: '#F1F5F9',
      cardBg: '#FFFFFF',
      textLight: '#0F172A',
      textDark: '#F8FAFC',
      adminSidebarBg: '#334155',
      adminSidebarText: '#E2E8F0',
      adminSidebarActive: '#64748B'
    },
    fonts: {
      heading: 'Inter',
      body: 'Inter'
    },
    borderRadius: '0.25rem',
    buttonStyle: 'sharp'
  },
  {
    id: 'golden-elegance',
    name: 'Elegancia Dorada',
    description: 'Dorados lujosos y cálidos',
    colors: {
      primary: '#D97706',
      secondary: '#B45309',
      background: '#FFFBEB',
      homeHeroBg: '#FEF3C7',
      cardBg: '#FFFFFF',
      textLight: '#1C1917',
      textDark: '#FFFFFF',
      adminSidebarBg: '#78350F',
      adminSidebarText: '#FEF3C7',
      adminSidebarActive: '#D97706'
    },
    fonts: {
      heading: 'Playfair Display',
      body: 'Poppins'
    },
    borderRadius: '0.5rem',
    buttonStyle: 'rounded'
  }
];