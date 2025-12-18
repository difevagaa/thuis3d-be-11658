import { useState, useCallback, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Search
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
  
  const [showOriginal, setShowOriginal] = useState(false);
  const [activeCategory, setActiveCategory] = useState('basic');
  const [expandedCategories, setExpandedCategories] = useState<string[]>(['basic']);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [compareMode, setCompareMode] = useState(false);

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

  // Apply image processing
  useEffect(() => {
    if (!originalImage || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Apply transformations
      ctx.save();
      
      // Build filter string
      const filters: string[] = [];
      
      // Basic adjustments
      const brightness = (settings.brightness as number || 0);
      const contrast = (settings.contrast as number || 0);
      const saturation = (settings.saturation as number || 0);
      const hue = (settings.hue as number || 0);
      const sepia = (settings.sepia as number || 0);
      const grayscale = settings.grayscale ? 100 : 0;
      const invert = settings.invert ? 100 : 0;
      
      filters.push(`brightness(${100 + brightness}%)`);
      filters.push(`contrast(${100 + contrast}%)`);
      filters.push(`saturate(${100 + saturation}%)`);
      filters.push(`hue-rotate(${hue}deg)`);
      filters.push(`sepia(${sepia}%)`);
      filters.push(`grayscale(${grayscale}%)`);
      filters.push(`invert(${invert}%)`);
      
      // Blur
      const blur = (settings.gaussianBlur as number || 0);
      if (blur > 0) {
        filters.push(`blur(${blur}px)`);
      }
      
      ctx.filter = filters.join(' ');
      
      // Draw image
      ctx.drawImage(img, 0, 0);
      
      ctx.restore();
      
      // Get processed image data
      const processedDataUrl = canvas.toDataURL('image/png');
      onImageProcessed(processedDataUrl);
    };
    img.src = originalImage;
  }, [originalImage, settings, onImageProcessed]);

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev => 
      prev.includes(categoryId) 
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const renderOption = (option: EditingOption) => {
    // Skip advanced options if not showing
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
                  // Show search results
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground mb-3">
                      {filteredOptions.length} {language === 'es' ? 'resultados' : 'results'}
                    </p>
                    {filteredOptions.map(renderOption)}
                  </div>
                ) : (
                  // Show categories
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
              <Button onClick={onNext} size="lg">
                {language === 'es' ? 'Continuar' : 'Continue'}
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
