import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { HelpCircle, Palette, Check } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";

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

// Helper function to determine if a color is light
function isLightColor(color: string): boolean {
  if (!color) return true;
  
  let hex = color.replace('#', '');
  if (hex.length === 3) {
    hex = hex.split('').map(c => c + c).join('');
  }
  
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5;
}

interface BaseFieldProps {
  label: string;
  help?: string;
  className?: string;
}

interface InputFieldProps extends BaseFieldProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
}

interface SwitchFieldProps extends BaseFieldProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}

interface TextareaFieldProps extends BaseFieldProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
}

interface SelectFieldProps extends BaseFieldProps {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}

interface SliderFieldProps extends BaseFieldProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  showValue?: boolean;
}

interface ColorFieldProps extends BaseFieldProps {
  value: string;
  onChange: (value: string) => void;
}

export function FieldWithHelp({ 
  label, 
  help, 
  value, 
  onChange, 
  placeholder, 
  type = "text",
  className 
}: InputFieldProps) {
  return (
    <div className={`space-y-2 ${className || ''}`}>
      <div className="flex items-center gap-2">
        <Label className="text-sm">{label}</Label>
        {help && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="text-xs">{help}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
      <Input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full"
      />
    </div>
  );
}

export function ColorFieldWithHelp({ 
  label, 
  help, 
  value, 
  onChange,
  className 
}: ColorFieldProps) {
  const [recentColors, setRecentColors] = useState<string[]>([]);
  const [isOpen, setIsOpen] = useState(false);

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

  return (
    <div className={`space-y-2 ${className || ''}`}>
      <div className="flex items-center gap-2">
        <Label className="text-sm">{label}</Label>
        {help && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="text-xs">{help}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
      <div className="flex gap-2">
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button 
              variant="outline" 
              size="icon" 
              className="h-9 w-9 flex-shrink-0 border-2"
              style={{ backgroundColor: value || '#FFFFFF' }}
            >
              <Palette className="h-4 w-4" style={{ color: isLightColor(value) ? '#000' : '#FFF' }} />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72 p-3 z-50" align="start">
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
                        className="relative h-7 w-7 rounded border border-border hover:scale-110 transition-transform"
                        style={{ backgroundColor: color }}
                        title={color}
                      >
                        {value?.toUpperCase() === color.toUpperCase() && (
                          <Check className="absolute inset-0 m-auto h-3.5 w-3.5" style={{ color: isLightColor(color) ? '#000' : '#FFF' }} />
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
                    onBlur={() => value && saveRecentColor(value)}
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
          onChange={(e) => onChange(e.target.value)}
          onBlur={() => value && saveRecentColor(value)}
          placeholder="#FFFFFF"
          className="flex-1 font-mono text-xs"
        />
      </div>
    </div>
  );
}

export function SwitchFieldWithHelp({ 
  label, 
  help, 
  checked, 
  onCheckedChange,
  className 
}: SwitchFieldProps) {
  return (
    <div className={`flex items-center justify-between ${className || ''}`}>
      <div className="flex items-center gap-2">
        <Label className="text-sm">{label}</Label>
        {help && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="text-xs">{help}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}

export function TextareaFieldWithHelp({ 
  label, 
  help, 
  value, 
  onChange, 
  placeholder,
  rows = 3,
  className 
}: TextareaFieldProps) {
  return (
    <div className={`space-y-2 ${className || ''}`}>
      <div className="flex items-center gap-2">
        <Label className="text-sm">{label}</Label>
        {help && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="text-xs">{help}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="w-full"
      />
    </div>
  );
}

export function SelectFieldWithHelp({ 
  label, 
  help, 
  value, 
  onChange, 
  options,
  className 
}: SelectFieldProps) {
  return (
    <div className={`space-y-2 ${className || ''}`}>
      <div className="flex items-center gap-2">
        <Label className="text-sm">{label}</Label>
        {help && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="text-xs">{help}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map(option => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function SliderFieldWithHelp({ 
  label, 
  help, 
  value, 
  onChange, 
  min = 0,
  max = 100,
  step = 1,
  showValue = true,
  className 
}: SliderFieldProps) {
  return (
    <div className={`space-y-2 ${className || ''}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Label className="text-sm">{label}</Label>
          {help && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="text-xs">{help}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
        {showValue && <span className="text-sm text-muted-foreground">{value}</span>}
      </div>
      <Slider
        value={[value]}
        onValueChange={([val]) => onChange(val)}
        min={min}
        max={max}
        step={step}
        className="w-full"
      />
    </div>
  );
}
