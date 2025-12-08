import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Palette, Check } from 'lucide-react';
import { STANDARD_COLORS, COLOR_CATEGORIES, getColorName, isStandardColor } from '@/constants/standardColors';
import { cn } from '@/lib/utils';

interface StandardColorPickerProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  allowCustom?: boolean;
  className?: string;
}

export function StandardColorPicker({
  label,
  value,
  onChange,
  placeholder = 'Seleccionar color',
  allowCustom = true,
  className,
}: StandardColorPickerProps) {
  const [customColor, setCustomColor] = useState(value || '#FFFFFF');
  const [isOpen, setIsOpen] = useState(false);

  const handleColorSelect = (colorValue: string) => {
    onChange(colorValue);
    setCustomColor(colorValue);
    setIsOpen(false);
  };

  const handleCustomColorChange = (newColor: string) => {
    setCustomColor(newColor);
    onChange(newColor);
  };

  const currentColorName = getColorName(value);
  const isStandard = isStandardColor(value);

  return (
    <div className={cn('space-y-2', className)}>
      {label && <Label>{label}</Label>}
      <div className="flex gap-2">
        {/* Color preview and input */}
        <div className="flex-1 flex gap-2">
          <div
            className="w-12 h-10 rounded border-2 border-input cursor-pointer hover:border-primary transition-colors"
            style={{ backgroundColor: value || '#FFFFFF' }}
            title={currentColorName}
          />
          <Input
            type="text"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="flex-1"
          />
        </div>

        {/* Palette picker button */}
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="icon" type="button">
              <Palette className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80" align="end">
            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-sm mb-2">Colores Estándar</h4>
                <p className="text-xs text-muted-foreground mb-3">
                  Selecciona un color de la paleta estándar para mantener consistencia visual
                </p>
              </div>

              {/* Standard color palette */}
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {Object.entries(COLOR_CATEGORIES).map(([category, categoryName]) => {
                  const colors = STANDARD_COLORS.filter((c) => c.category === category);
                  return (
                    <div key={category}>
                      <h5 className="text-xs font-medium text-muted-foreground mb-2">
                        {categoryName}
                      </h5>
                      <div className="grid grid-cols-4 gap-2">
                        {colors.map((color) => (
                          <button
                            key={color.value}
                            type="button"
                            onClick={() => handleColorSelect(color.value)}
                            className={cn(
                              'relative h-10 rounded border-2 transition-all hover:scale-110 hover:shadow-md',
                              value?.toUpperCase() === color.value.toUpperCase()
                                ? 'border-primary ring-2 ring-primary ring-offset-2'
                                : 'border-input hover:border-primary'
                            )}
                            style={{ backgroundColor: color.value }}
                            title={color.name}
                          >
                            {value?.toUpperCase() === color.value.toUpperCase() && (
                              <div className="absolute inset-0 flex items-center justify-center">
                                <Check className="h-5 w-5 text-primary drop-shadow-lg" />
                              </div>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Custom color picker */}
              {allowCustom && (
                <div className="pt-3 border-t space-y-2">
                  <h5 className="text-xs font-medium text-muted-foreground">Color Personalizado</h5>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={customColor}
                      onChange={(e) => handleCustomColorChange(e.target.value)}
                      className="w-14 h-10 p-1 cursor-pointer"
                    />
                    <Input
                      type="text"
                      value={customColor}
                      onChange={(e) => handleCustomColorChange(e.target.value)}
                      placeholder="#000000"
                      className="flex-1 font-mono text-sm"
                    />
                  </div>
                  {!isStandard && value && (
                    <p className="text-xs text-amber-600">
                      ⚠️ Usando color personalizado. Considera usar un color estándar.
                    </p>
                  )}
                </div>
              )}

              {/* Transparent option */}
              <div className="pt-3 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleColorSelect('transparent')}
                  className="w-full"
                  type="button"
                >
                  Transparente
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>
      
      {/* Show color name if it's a standard color */}
      {isStandard && value && (
        <p className="text-xs text-muted-foreground">
          {currentColorName}
        </p>
      )}
    </div>
  );
}
