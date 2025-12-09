import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Palette, Check } from 'lucide-react';

const RECENT_COLORS_KEY = 'page-builder-recent-colors';
const MAX_RECENT_COLORS = 12;

// Predefined color palettes for consistency
const PRESET_COLORS = [
  // Whites/Lights
  '#FFFFFF', '#F8FAFC', '#F1F5F9', '#E2E8F0',
  // Grays
  '#94A3B8', '#64748B', '#475569', '#334155',
  // Primary blues
  '#3B82F6', '#2563EB', '#1D4ED8', '#1E40AF',
  // Greens
  '#22C55E', '#16A34A', '#15803D', '#166534',
  // Reds/Oranges
  '#EF4444', '#DC2626', '#F97316', '#EA580C',
  // Purples
  '#A855F7', '#9333EA', '#7C3AED', '#6D28D9',
  // Yellows
  '#EAB308', '#CA8A04', '#FACC15', '#FDE047',
  // Dark
  '#1E293B', '#0F172A', '#020617', '#000000'
];

interface RecentColorsPickerProps {
  value: string;
  onChange: (color: string) => void;
  label?: string;
  className?: string;
}

export function RecentColorsPicker({ value, onChange, label = "Color", className = "" }: RecentColorsPickerProps) {
  const [recentColors, setRecentColors] = useState<string[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  // Load recent colors from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(RECENT_COLORS_KEY);
      if (stored) {
        setRecentColors(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Error loading recent colors:', e);
    }
  }, []);

  // Save color to recent colors
  const saveRecentColor = (color: string) => {
    if (!color || color === 'transparent') return;
    
    const normalizedColor = color.toUpperCase();
    const newRecent = [normalizedColor, ...recentColors.filter(c => c.toUpperCase() !== normalizedColor)].slice(0, MAX_RECENT_COLORS);
    setRecentColors(newRecent);
    
    try {
      localStorage.setItem(RECENT_COLORS_KEY, JSON.stringify(newRecent));
    } catch (e) {
      console.error('Error saving recent colors:', e);
    }
  };

  const handleColorSelect = (color: string) => {
    onChange(color);
    saveRecentColor(color);
    setIsOpen(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  const handleInputBlur = () => {
    if (value && value.startsWith('#')) {
      saveRecentColor(value);
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <Label className="text-xs">{label}</Label>
      <div className="flex gap-2">
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button 
              variant="outline" 
              size="icon" 
              className="h-9 w-9 flex-shrink-0"
              style={{ backgroundColor: value || '#FFFFFF' }}
            >
              <Palette className="h-4 w-4" style={{ color: isLightColor(value) ? '#000' : '#FFF' }} />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72 p-3" align="start">
            <div className="space-y-3">
              {/* Recent colors */}
              {recentColors.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">Colores Recientes</p>
                  <div className="grid grid-cols-6 gap-1">
                    {recentColors.map((color, index) => (
                      <button
                        key={`recent-${index}-${color}`}
                        onClick={() => handleColorSelect(color)}
                        className="relative h-8 w-8 rounded border border-border hover:scale-110 transition-transform"
                        style={{ backgroundColor: color }}
                        title={color}
                      >
                        {value?.toUpperCase() === color.toUpperCase() && (
                          <Check className="absolute inset-0 m-auto h-4 w-4" style={{ color: isLightColor(color) ? '#000' : '#FFF' }} />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Preset colors */}
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">Colores Predefinidos</p>
                <div className="grid grid-cols-8 gap-1">
                  {PRESET_COLORS.map((color) => (
                    <button
                      key={color}
                      onClick={() => handleColorSelect(color)}
                      className="relative h-6 w-6 rounded border border-border hover:scale-110 transition-transform"
                      style={{ backgroundColor: color }}
                      title={color}
                    >
                      {value?.toUpperCase() === color.toUpperCase() && (
                        <Check className="absolute inset-0 m-auto h-3 w-3" style={{ color: isLightColor(color) ? '#000' : '#FFF' }} />
                      )}
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Custom color input */}
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">Color Personalizado</p>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={value || '#FFFFFF'}
                    onChange={(e) => handleColorSelect(e.target.value)}
                    className="h-9 w-12 rounded border cursor-pointer"
                  />
                  <Input
                    value={value || ''}
                    onChange={(e) => onChange(e.target.value)}
                    onBlur={handleInputBlur}
                    placeholder="#FFFFFF"
                    className="flex-1 h-9 font-mono text-xs"
                  />
                </div>
              </div>
            </div>
          </PopoverContent>
        </Popover>
        
        <Input
          value={value || ''}
          onChange={handleInputChange}
          onBlur={handleInputBlur}
          placeholder="#FFFFFF"
          className="flex-1 font-mono text-xs"
        />
      </div>
    </div>
  );
}

// Helper function to determine if a color is light
function isLightColor(color: string): boolean {
  if (!color) return true;
  
  // Convert hex to RGB
  let hex = color.replace('#', '');
  if (hex.length === 3) {
    hex = hex.split('').map(c => c + c).join('');
  }
  
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  
  // Calculate relative luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  
  return luminance > 0.5;
}
