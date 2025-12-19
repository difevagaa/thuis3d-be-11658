import { useState, useCallback, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  HelpCircle, 
  RotateCcw, 
  ChevronDown, 
  ChevronRight,
  Wand2,
  Eye,
  EyeOff,
  ArrowRight,
  Sliders,
  Sun,
  Palette,
  TrendingUp,
  Focus,
  Circle,
  Sparkles,
  Move,
  Crop,
  Filter,
  Layers,
  Layers3,
  Brain,
  Eraser,
  Square,
  Droplet,
  Split,
  Camera,
  Search,
  AlertTriangle
} from "lucide-react";
import { EDITING_CATEGORIES, EDITING_OPTIONS, type EditingOption, type EditingCategory } from "@/constants/lithophanyOptions";
import { cn } from "@/lib/utils";

interface LithophanyImageEditorProps {
  originalImage: string;
  processedImage: string | null;
  settings: Record<string, number | boolean | string>;
  onUpdateSetting: (id: string, value: number | boolean | string) => void;
  onResetSettings: () => void;
  onImageProcessed: (imageDataUrl: string) => void;
  onApplyAI: (type: string) => Promise<void>;
  isProcessing: boolean;
  onNext: () => void;
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Sliders, Sun, Palette, TrendingUp, Focus, Circle, Sparkles, Move, Crop, 
  Filter, Wand2, Layers, Layers3, Brain, Eraser, Square, Droplet, Split, Camera
};

export const LithophanyImageEditor = ({
  originalImage,
  processedImage,
  settings,
  onUpdateSetting,
  onResetSettings,
  onImageProcessed,
  onApplyAI,
  isProcessing,
  onNext
}: LithophanyImageEditorProps) => {
  const { i18n } = useTranslation();
  const language = i18n.language;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  
  const [showOriginal, setShowOriginal] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<string[]>(['basic']);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [compareMode, setCompareMode] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageQuality, setImageQuality] = useState<'good' | 'warning' | 'error'>('good');

  // Group options by category
  const optionsByCategory = EDITING_OPTIONS.reduce((acc, option) => {
    if (!acc[option.category]) acc[option.category] = [];
    acc[option.category].push(option);
    return acc;
  }, {} as Record<string, EditingOption[]>);

  // Filter options based on search
  const filteredOptions = searchTerm 
    ? EDITING_OPTIONS.filter(opt => 
        opt.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        opt.nameEs.toLowerCase().includes(searchTerm.toLowerCase()) ||
        opt.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        opt.descriptionEs.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : null;

  // Load image once
  useEffect(() => {
    if (!originalImage) return;
    
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      imageRef.current = img;
      setImageLoaded(true);
      
      // Check image quality for lithophany
      if (img.width < 100 || img.height < 100) {
        setImageQuality('error');
      } else if (img.width < 300 || img.height < 300) {
        setImageQuality('warning');
      } else {
        setImageQuality('good');
      }
    };
    img.src = originalImage;
  }, [originalImage]);

  // Apply ALL image processing effects
  useEffect(() => {
    if (!imageLoaded || !imageRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const img = imageRef.current;
    canvas.width = img.width;
    canvas.height = img.height;

    // Start with clean canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // === STEP 1: Apply CSS Filters ===
    const cssFilters: string[] = [];
    
    // Basic adjustments
    const brightness = 100 + (settings.brightness as number || 0);
    const contrast = 100 + (settings.contrast as number || 0);
    const saturation = 100 + (settings.saturation as number || 0);
    const hue = settings.hue as number || 0;
    const sepia = settings.sepia as number || 0;
    const blur = settings.gaussianBlur as number || 0;
    
    cssFilters.push(`brightness(${brightness}%)`);
    cssFilters.push(`contrast(${contrast}%)`);
    cssFilters.push(`saturate(${saturation}%)`);
    cssFilters.push(`hue-rotate(${hue}deg)`);
    cssFilters.push(`sepia(${sepia}%)`);
    
    if (settings.grayscale) {
      cssFilters.push('grayscale(100%)');
    }
    if (settings.invert) {
      cssFilters.push('invert(100%)');
    }
    if (blur > 0) {
      cssFilters.push(`blur(${blur}px)`);
    }
    
    ctx.filter = cssFilters.join(' ');
    ctx.drawImage(img, 0, 0);
    ctx.filter = 'none';

    // === STEP 2: Pixel-level manipulations ===
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    // Exposure adjustment
    const exposure = settings.exposure as number || 0;
    const exposureMultiplier = Math.pow(2, exposure);

    // Highlights and Shadows
    const highlights = (settings.highlights as number || 0) / 100;
    const shadows = (settings.shadows as number || 0) / 100;
    const whites = (settings.whites as number || 0) / 100;
    const blacks = (settings.blacks as number || 0) / 100;

    // Vibrance
    const vibrance = (settings.vibrance as number || 0) / 100;

    // Temperature and Tint
    const temperature = (settings.temperature as number || 0) / 100;
    const tint = (settings.tint as number || 0) / 100;

    // Clarity and Definition
    const clarity = (settings.clarity as number || 0) / 100;
    const definition = (settings.definition as number || 0) / 100;

    // Gamma
    const gamma = settings.gamma as number || 1;

    // Posterize
    const posterize = settings.posterize as number || 256;

    // Threshold
    const thresholdEnabled = settings.thresholdEnabled as boolean || false;
    const threshold = settings.threshold as number || 128;

    // Vignette
    const vignetteAmount = (settings.vignetteAmount as number || 0) / 100;
    const vignetteMidpoint = (settings.vignetteMidpoint as number || 50) / 100;
    const vignetteFeather = (settings.vignetteFeather as number || 50) / 100;

    // Grain/Noise
    const grainAmount = (settings.grainAmount as number || 0) / 100;

    // Film simulation
    const filmSimulation = settings.filmSimulation as string || 'none';

    // Center for vignette
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const maxDist = Math.sqrt(centerX * centerX + centerY * centerY);

    for (let i = 0; i < data.length; i += 4) {
      let r = data[i];
      let g = data[i + 1];
      let b = data[i + 2];

      // Exposure
      if (exposure !== 0) {
        r = Math.min(255, r * exposureMultiplier);
        g = Math.min(255, g * exposureMultiplier);
        b = Math.min(255, b * exposureMultiplier);
      }

      // Gamma correction
      if (gamma !== 1) {
        r = 255 * Math.pow(r / 255, 1 / gamma);
        g = 255 * Math.pow(g / 255, 1 / gamma);
        b = 255 * Math.pow(b / 255, 1 / gamma);
      }

      // Calculate luminance
      const luminance = 0.299 * r + 0.587 * g + 0.114 * b;

      // Highlights adjustment (affects bright areas)
      if (highlights !== 0) {
        const highlightFactor = luminance / 255;
        const adjustment = highlights * highlightFactor * 50;
        r = Math.min(255, Math.max(0, r + adjustment));
        g = Math.min(255, Math.max(0, g + adjustment));
        b = Math.min(255, Math.max(0, b + adjustment));
      }

      // Shadows adjustment (affects dark areas)
      if (shadows !== 0) {
        const shadowFactor = 1 - (luminance / 255);
        const adjustment = shadows * shadowFactor * 50;
        r = Math.min(255, Math.max(0, r + adjustment));
        g = Math.min(255, Math.max(0, g + adjustment));
        b = Math.min(255, Math.max(0, b + adjustment));
      }

      // Whites adjustment
      if (whites !== 0 && luminance > 200) {
        const whiteFactor = (luminance - 200) / 55;
        const adjustment = whites * whiteFactor * 30;
        r = Math.min(255, Math.max(0, r + adjustment));
        g = Math.min(255, Math.max(0, g + adjustment));
        b = Math.min(255, Math.max(0, b + adjustment));
      }

      // Blacks adjustment
      if (blacks !== 0 && luminance < 55) {
        const blackFactor = (55 - luminance) / 55;
        const adjustment = blacks * blackFactor * 30;
        r = Math.min(255, Math.max(0, r + adjustment));
        g = Math.min(255, Math.max(0, g + adjustment));
        b = Math.min(255, Math.max(0, b + adjustment));
      }

      // Vibrance (smart saturation)
      if (vibrance !== 0) {
        const max = Math.max(r, g, b);
        const avg = (r + g + b) / 3;
        const amt = ((Math.abs(max - avg) * 2 / 255) * vibrance) / 2;
        r = r + (r - avg) * amt;
        g = g + (g - avg) * amt;
        b = b + (b - avg) * amt;
      }

      // Temperature (warm/cool)
      if (temperature !== 0) {
        r = Math.min(255, Math.max(0, r + temperature * 30));
        b = Math.min(255, Math.max(0, b - temperature * 30));
      }

      // Tint (green/magenta)
      if (tint !== 0) {
        g = Math.min(255, Math.max(0, g + tint * 30));
      }

      // Clarity/Definition (local contrast simulation)
      if (clarity !== 0 || definition !== 0) {
        const factor = 1 + (clarity + definition) * 0.3;
        const intercept = 128 * (1 - factor);
        r = Math.min(255, Math.max(0, factor * r + intercept));
        g = Math.min(255, Math.max(0, factor * g + intercept));
        b = Math.min(255, Math.max(0, factor * b + intercept));
      }

      // Film simulation effects
      if (filmSimulation !== 'none') {
        switch (filmSimulation) {
          case 'kodak':
            r = Math.min(255, r * 1.1);
            g = Math.min(255, g * 1.05);
            b = b * 0.9;
            break;
          case 'fuji':
            r = r * 0.95;
            g = Math.min(255, g * 1.1);
            b = Math.min(255, b * 1.05);
            break;
          case 'polaroid':
            r = Math.min(255, r * 1.15);
            g = Math.min(255, g * 1.05);
            b = b * 0.85;
            // Add slight fade
            r = r * 0.9 + 25;
            g = g * 0.9 + 25;
            b = b * 0.9 + 25;
            break;
          case 'vintage':
            const vintageSepia = 0.3;
            const vr = r, vg = g, vb = b;
            r = Math.min(255, vr * (1 - vintageSepia) + (vr * 0.393 + vg * 0.769 + vb * 0.189) * vintageSepia);
            g = Math.min(255, vg * (1 - vintageSepia) + (vr * 0.349 + vg * 0.686 + vb * 0.168) * vintageSepia);
            b = Math.min(255, vb * (1 - vintageSepia) + (vr * 0.272 + vg * 0.534 + vb * 0.131) * vintageSepia);
            break;
          case 'noir':
            const gray = luminance;
            r = gray;
            g = gray;
            b = gray;
            // Increase contrast
            r = Math.min(255, Math.max(0, (r - 128) * 1.3 + 128));
            g = Math.min(255, Math.max(0, (g - 128) * 1.3 + 128));
            b = Math.min(255, Math.max(0, (b - 128) * 1.3 + 128));
            break;
        }
      }

      // Posterize
      if (posterize < 256) {
        const levels = posterize;
        const step = 255 / (levels - 1);
        r = Math.round(Math.round(r / step) * step);
        g = Math.round(Math.round(g / step) * step);
        b = Math.round(Math.round(b / step) * step);
      }

      // Threshold (pure black and white)
      if (thresholdEnabled) {
        const lum = 0.299 * r + 0.587 * g + 0.114 * b;
        const val = lum > threshold ? 255 : 0;
        r = val;
        g = val;
        b = val;
      }

      // Grain/Noise
      if (grainAmount > 0) {
        const noise = (Math.random() - 0.5) * grainAmount * 100;
        r = Math.min(255, Math.max(0, r + noise));
        g = Math.min(255, Math.max(0, g + noise));
        b = Math.min(255, Math.max(0, b + noise));
      }

      // Vignette
      if (vignetteAmount > 0) {
        const px = (i / 4) % canvas.width;
        const py = Math.floor((i / 4) / canvas.width);
        const dist = Math.sqrt(Math.pow(px - centerX, 2) + Math.pow(py - centerY, 2));
        const normalizedDist = dist / maxDist;
        
        if (normalizedDist > vignetteMidpoint) {
          const falloff = (normalizedDist - vignetteMidpoint) / (1 - vignetteMidpoint);
          const smoothFalloff = Math.pow(falloff, 1 / (vignetteFeather + 0.01));
          const darken = 1 - (vignetteAmount * smoothFalloff);
          r *= darken;
          g *= darken;
          b *= darken;
        }
      }

      // Clamp values
      data[i] = Math.min(255, Math.max(0, Math.round(r)));
      data[i + 1] = Math.min(255, Math.max(0, Math.round(g)));
      data[i + 2] = Math.min(255, Math.max(0, Math.round(b)));
    }

    ctx.putImageData(imageData, 0, 0);

    // === STEP 3: Apply Frame/Border ===
    const frameEnabled = settings.frameEnabled as boolean || false;
    const frameWidth = settings.frameWidth as number || 0;
    const frameColor = settings.frameColor as string || '#ffffff';

    if (frameEnabled && frameWidth > 0) {
      ctx.strokeStyle = frameColor;
      ctx.lineWidth = frameWidth * 2;
      ctx.strokeRect(0, 0, canvas.width, canvas.height);
    }

    // === STEP 4: Lens Flare Effect ===
    const lensFlareEnabled = settings.lensFlareEnabled as boolean || false;
    const lensFlareIntensity = (settings.lensFlareIntensity as number || 50) / 100;

    if (lensFlareEnabled && lensFlareIntensity > 0) {
      const flareX = canvas.width * 0.7;
      const flareY = canvas.height * 0.3;
      const flareRadius = Math.min(canvas.width, canvas.height) * 0.15 * lensFlareIntensity;
      
      const gradient = ctx.createRadialGradient(flareX, flareY, 0, flareX, flareY, flareRadius);
      gradient.addColorStop(0, `rgba(255, 255, 200, ${0.8 * lensFlareIntensity})`);
      gradient.addColorStop(0.3, `rgba(255, 200, 100, ${0.4 * lensFlareIntensity})`);
      gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
      
      ctx.globalCompositeOperation = 'screen';
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(flareX, flareY, flareRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
    }

    // === STEP 5: Drop Shadow (drawn outside canvas bounds effect) ===
    const dropShadowEnabled = settings.dropShadowEnabled as boolean || false;
    const dropShadowOpacity = (settings.dropShadowOpacity as number || 50) / 100;
    const dropShadowOffset = settings.dropShadowOffset as number || 10;

    if (dropShadowEnabled && dropShadowOpacity > 0) {
      // Shadow effect is visual only, we'll add it as an overlay indicator
      ctx.fillStyle = `rgba(0, 0, 0, ${dropShadowOpacity * 0.3})`;
      ctx.fillRect(dropShadowOffset, canvas.height - 20, canvas.width - dropShadowOffset, 20);
      ctx.fillRect(canvas.width - 20, dropShadowOffset, 20, canvas.height - dropShadowOffset);
    }

    // Get processed image data
    const processedDataUrl = canvas.toDataURL('image/png');
    onImageProcessed(processedDataUrl);
  }, [imageLoaded, settings, onImageProcessed]);

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev => 
      prev.includes(categoryId) 
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const renderOption = (option: EditingOption) => {
    if (option.advanced && !showAdvanced) return null;
    
    const name = language === 'es' ? option.nameEs : option.name;
    const description = language === 'es' ? option.descriptionEs : option.description;
    const value = settings[option.id] ?? option.default;

    return (
      <div key={option.id} className="py-3 border-b border-border/50 last:border-0">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Label className="text-sm font-medium">{name}</Label>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent side="right" className="max-w-xs">
                <p>{description}</p>
              </TooltipContent>
            </Tooltip>
            {option.advanced && (
              <Badge variant="outline" className="text-[10px] px-1 py-0">
                {language === 'es' ? 'Avanzado' : 'Advanced'}
              </Badge>
            )}
          </div>
          {option.type === 'slider' && (
            <span className="text-xs text-muted-foreground tabular-nums">
              {typeof value === 'number' ? value.toFixed(option.step && option.step < 1 ? 2 : 0) : value}
              {option.unit || ''}
            </span>
          )}
        </div>

        {option.type === 'slider' && (
          <Slider
            value={[value as number]}
            min={option.min}
            max={option.max}
            step={option.step}
            onValueChange={([v]) => onUpdateSetting(option.id, v)}
            className="w-full"
          />
        )}

        {option.type === 'toggle' && (
          <Switch
            checked={value as boolean}
            onCheckedChange={(v) => onUpdateSetting(option.id, v)}
          />
        )}

        {option.type === 'select' && option.options && (
          <Select 
            value={value as string} 
            onValueChange={(v) => onUpdateSetting(option.id, v)}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {option.options.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>
                  {language === 'es' ? opt.labelEs : opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {option.type === 'number' && (
          <Input
            type="number"
            value={value as number}
            min={option.min}
            max={option.max}
            step={option.step}
            onChange={(e) => onUpdateSetting(option.id, parseFloat(e.target.value))}
            className="w-full"
          />
        )}

        {option.type === 'color' && (
          <Input
            type="color"
            value={value as string}
            onChange={(e) => onUpdateSetting(option.id, e.target.value)}
            className="w-full h-10"
          />
        )}
      </div>
    );
  };

  const getCategoryIcon = (iconName: string) => {
    const IconComponent = iconMap[iconName] || Sliders;
    return <IconComponent className="h-4 w-4" />;
  };

  const modifiedCount = Object.entries(settings).filter(([key, value]) => {
    const option = EDITING_OPTIONS.find(o => o.id === key);
    return option && value !== option.default;
  }).length;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Left Panel - Options */}
      <div className="lg:col-span-4 xl:col-span-3">
        <Card className="sticky top-4">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">
                {language === 'es' ? 'Opciones de Edición' : 'Editing Options'}
              </CardTitle>
              <Badge variant="secondary">
                {EDITING_OPTIONS.length} {language === 'es' ? 'opciones' : 'options'}
              </Badge>
            </div>
            
            {/* Search */}
            <div className="relative mt-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={language === 'es' ? 'Buscar opciones...' : 'Search options...'}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Controls */}
            <div className="flex items-center gap-2 mt-3">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={onResetSettings}
                className="flex-1"
              >
                <RotateCcw className="h-3.5 w-3.5 mr-1" />
                {language === 'es' ? 'Resetear' : 'Reset'}
              </Button>
              <Button
                variant={showAdvanced ? "secondary" : "outline"}
                size="sm"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex-1"
              >
                {showAdvanced 
                  ? (language === 'es' ? 'Ocultar Avanzado' : 'Hide Advanced')
                  : (language === 'es' ? 'Ver Avanzado' : 'Show Advanced')
                }
              </Button>
            </div>
            
            {modifiedCount > 0 && (
              <p className="text-xs text-muted-foreground mt-2">
                {modifiedCount} {language === 'es' ? 'opciones modificadas' : 'options modified'}
              </p>
            )}
          </CardHeader>
          
          <CardContent className="p-0">
            <ScrollArea className="h-[60vh]">
              <div className="p-4 pt-0">
                {filteredOptions ? (
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground mb-3">
                      {filteredOptions.length} {language === 'es' ? 'resultados' : 'results'}
                    </p>
                    {filteredOptions.map(renderOption)}
                  </div>
                ) : (
                  EDITING_CATEGORIES.map(category => {
                    const categoryOptions = optionsByCategory[category.id] || [];
                    const visibleOptions = showAdvanced 
                      ? categoryOptions 
                      : categoryOptions.filter(o => !o.advanced);
                    
                    if (visibleOptions.length === 0) return null;

                    return (
                      <Collapsible
                        key={category.id}
                        open={expandedCategories.includes(category.id)}
                        onOpenChange={() => toggleCategory(category.id)}
                        className="mb-2"
                      >
                        <CollapsibleTrigger asChild>
                          <Button
                            variant="ghost"
                            className="w-full justify-between p-3 h-auto hover:bg-muted"
                          >
                            <div className="flex items-center gap-2">
                              {getCategoryIcon(category.icon)}
                              <span className="font-medium">
                                {language === 'es' ? category.nameEs : category.name}
                              </span>
                              <Badge variant="outline" className="text-xs">
                                {visibleOptions.length}
                              </Badge>
                            </div>
                            {expandedCategories.includes(category.id) 
                              ? <ChevronDown className="h-4 w-4" />
                              : <ChevronRight className="h-4 w-4" />
                            }
                          </Button>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="pl-4 pr-2">
                          {visibleOptions.map(renderOption)}
                        </CollapsibleContent>
                      </Collapsible>
                    );
                  })
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Right Panel - Preview */}
      <div className="lg:col-span-8 xl:col-span-9">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <CardTitle className="text-lg">
                {language === 'es' ? 'Vista Previa' : 'Preview'}
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  variant={compareMode ? "secondary" : "outline"}
                  size="sm"
                  onClick={() => setCompareMode(!compareMode)}
                >
                  {compareMode 
                    ? (language === 'es' ? 'Vista Normal' : 'Normal View')
                    : (language === 'es' ? 'Comparar' : 'Compare')
                  }
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onMouseDown={() => setShowOriginal(true)}
                  onMouseUp={() => setShowOriginal(false)}
                  onMouseLeave={() => setShowOriginal(false)}
                >
                  {showOriginal ? <EyeOff className="h-4 w-4 mr-1" /> : <Eye className="h-4 w-4 mr-1" />}
                  {language === 'es' ? 'Original' : 'Original'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onApplyAI('enhance')}
                  disabled={isProcessing}
                >
                  <Wand2 className="h-4 w-4 mr-1" />
                  {language === 'es' ? 'Mejorar con IA' : 'AI Enhance'}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Image Quality Warning */}
            {imageQuality !== 'good' && (
              <Alert variant={imageQuality === 'error' ? 'destructive' : 'default'} className="mb-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  {imageQuality === 'error' 
                    ? (language === 'es' 
                        ? 'La imagen es muy pequeña (menos de 100×100px). La calidad de la litofanía será muy baja.'
                        : 'Image is too small (less than 100×100px). Lithophane quality will be very poor.')
                    : (language === 'es'
                        ? 'La imagen es pequeña. Para mejores resultados, usa una imagen de al menos 300×300px.'
                        : 'Image is small. For best results, use an image of at least 300×300px.')
                  }
                </AlertDescription>
              </Alert>
            )}

            <div className={cn(
              "relative rounded-lg overflow-hidden bg-muted",
              compareMode ? "grid grid-cols-2 gap-1" : ""
            )}>
              {compareMode ? (
                <>
                  <div className="relative">
                    <img 
                      src={originalImage} 
                      alt="Original" 
                      className="w-full h-auto"
                    />
                    <span className="absolute top-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                      {language === 'es' ? 'Original' : 'Original'}
                    </span>
                  </div>
                  <div className="relative">
                    <img 
                      src={processedImage || originalImage} 
                      alt="Edited" 
                      className="w-full h-auto"
                    />
                    <span className="absolute top-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                      {language === 'es' ? 'Editada' : 'Edited'}
                    </span>
                  </div>
                </>
              ) : (
                <img 
                  src={showOriginal ? originalImage : (processedImage || originalImage)} 
                  alt="Preview" 
                  className="w-full h-auto max-h-[70vh] object-contain mx-auto"
                />
              )}
              
              {isProcessing && (
                <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              )}
            </div>

            {/* Hidden canvas for processing */}
            <canvas ref={canvasRef} className="hidden" />

            <div className="mt-6 flex justify-end">
              <Button onClick={onNext} size="lg" disabled={imageQuality === 'error'}>
                {language === 'es' ? 'Continuar' : 'Continue'}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};