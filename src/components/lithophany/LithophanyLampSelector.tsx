import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Box, HelpCircle, Check } from "lucide-react";
import type { LampTemplate } from "@/pages/Lithophany";
import { cn } from "@/lib/utils";

// Import lamp preview images
import lampFlatSquare from "@/assets/lithophany/lamp-flat-square.jpg";
import lampFlatRectangle from "@/assets/lithophany/lamp-flat-rectangle.jpg";
import lampCylinderSmall from "@/assets/lithophany/lamp-cylinder-small.jpg";
import lampCylinderMedium from "@/assets/lithophany/lamp-cylinder-medium.jpg";
import lampCylinderLarge from "@/assets/lithophany/lamp-cylinder-large.jpg";
import lampHalfCylinder from "@/assets/lithophany/lamp-half-cylinder.jpg";
import lampCircular from "@/assets/lithophany/lamp-circular.jpg";
import lampPanoramic from "@/assets/lithophany/lamp-panoramic.jpg";
import lampPortrait from "@/assets/lithophany/lamp-portrait.jpg";
import lampFramedSquare from "@/assets/lithophany/lamp-framed-square.jpg";
import lampCurvedSoft from "@/assets/lithophany/lamp-curved-soft.jpg";
import lampCurvedDeep from "@/assets/lithophany/lamp-curved-deep.jpg";
import lampDiamond from "@/assets/lithophany/lamp-diamond.jpg";
import lampArch from "@/assets/lithophany/lamp-arch.jpg";
import lampGothic from "@/assets/lithophany/lamp-gothic.jpg";
import lampOrnamental from "@/assets/lithophany/lamp-ornamental.jpg";
import lampFlatOval from "@/assets/lithophany/lamp-flat-oval.jpg";
import lampHeart from "@/assets/lithophany/lamp-heart.jpg";
import lampWave from "@/assets/lithophany/lamp-wave.jpg";
import lampHexagonal from "@/assets/lithophany/lamp-hexagonal.jpg";
import lampOctagonal from "@/assets/lithophany/lamp-octagonal.jpg";
import lampStar from "@/assets/lithophany/lamp-star.jpg";
import lampCloud from "@/assets/lithophany/lamp-cloud.jpg";
import lampMoon from "@/assets/lithophany/lamp-moon.jpg";
import lampMinimalist from "@/assets/lithophany/lamp-minimalist.jpg";

interface LithophanyLampSelectorProps {
  templates: LampTemplate[];
  selectedLamp: LampTemplate | null;
  onSelect: (lamp: LampTemplate) => void;
  dimensions: { width: number; height: number };
  onDimensionsChange: (width: number, height: number) => void;
  isLoading: boolean;
}

// Image mapping for lamp shapes
const shapeImages: Record<string, string> = {
  flat_square: lampFlatSquare,
  flat_rectangle: lampFlatRectangle,
  cylinder_small: lampCylinderSmall,
  cylinder_medium: lampCylinderMedium,
  cylinder_large: lampCylinderLarge,
  half_cylinder: lampHalfCylinder,
  circular: lampCircular,
  panoramic: lampPanoramic,
  portrait: lampPortrait,
  framed_square: lampFramedSquare,
  curved_soft: lampCurvedSoft,
  curved_deep: lampCurvedDeep,
  diamond: lampDiamond,
  arch: lampArch,
  gothic: lampGothic,
  ornamental: lampOrnamental,
  flat_oval: lampFlatOval,
  heart: lampHeart,
  wave: lampWave,
  hexagonal: lampHexagonal,
  octagonal: lampOctagonal,
  star: lampStar,
  cloud: lampCloud,
  moon: lampMoon,
  minimalist: lampMinimalist,
};

// Category labels
const categoryLabels: Record<string, { en: string; es: string }> = {
  flat: { en: 'Flat', es: 'Planas' },
  curved: { en: 'Curved', es: 'Curvas' },
  cylindrical: { en: 'Cylindrical', es: 'Cilíndricas' },
  special: { en: 'Special Shapes', es: 'Formas Especiales' },
};

export const LithophanyLampSelector = ({
  templates,
  selectedLamp,
  onSelect,
  dimensions,
  onDimensionsChange,
  isLoading
}: LithophanyLampSelectorProps) => {
  const { i18n } = useTranslation();
  const language = i18n.language;

  // Group templates by category
  const templatesByCategory = templates.reduce((acc, template) => {
    const category = template.category || 'flat';
    if (!acc[category]) acc[category] = [];
    acc[category].push(template);
    return acc;
  }, {} as Record<string, LampTemplate[]>);

  const categories = Object.keys(templatesByCategory);

  const getTemplateName = (template: LampTemplate) => {
    if (language === 'es' && template.name_es) return template.name_es;
    if (language === 'en' && template.name_en) return template.name_en;
    return template.name;
  };

  const getTemplateDescription = (template: LampTemplate) => {
    if (language === 'es' && template.description_es) return template.description_es;
    if (language === 'en' && template.description_en) return template.description_en;
    return template.description;
  };

  const handleWidthChange = (value: number) => {
    const minWidth = selectedLamp?.min_width_mm || 50;
    const maxWidth = selectedLamp?.max_width_mm || 300;
    const clampedValue = Math.max(minWidth, Math.min(maxWidth, value));
    onDimensionsChange(clampedValue, dimensions.height);
  };

  const handleHeightChange = (value: number) => {
    const minHeight = selectedLamp?.min_height_mm || 50;
    const maxHeight = selectedLamp?.max_height_mm || 300;
    const clampedValue = Math.max(minHeight, Math.min(maxHeight, value));
    onDimensionsChange(dimensions.width, clampedValue);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="aspect-square rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Box className="h-5 w-5" />
            {language === 'es' ? 'Selecciona tu Lámpara' : 'Select Your Lamp'}
          </CardTitle>
          <Badge variant="secondary">
            {templates.length} {language === 'es' ? 'diseños' : 'designs'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Lamp Categories */}
        <Tabs defaultValue={categories[0]} className="w-full">
          <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${Math.min(categories.length, 4)}, 1fr)` }}>
            {categories.map(category => (
              <TabsTrigger key={category} value={category} className="text-xs sm:text-sm">
                {categoryLabels[category]?.[language === 'es' ? 'es' : 'en'] || category}
              </TabsTrigger>
            ))}
          </TabsList>

          {categories.map(category => (
            <TabsContent key={category} value={category} className="mt-4">
              <ScrollArea className="h-[400px] pr-4">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {templatesByCategory[category]?.map(template => {
                    const isSelected = selectedLamp?.id === template.id;

                    return (
                      <Card
                        key={template.id}
                        className={cn(
                          "cursor-pointer transition-all hover:shadow-md relative overflow-hidden",
                          isSelected && "ring-2 ring-primary"
                        )}
                        onClick={() => onSelect(template)}
                      >
                        {isSelected && (
                          <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full p-1 z-10">
                            <Check className="h-3 w-3" />
                          </div>
                        )}
                        
                        <div className="aspect-square bg-muted flex items-center justify-center overflow-hidden">
                          {shapeImages[template.shape_type] ? (
                            <img 
                              src={shapeImages[template.shape_type]} 
                              alt={getTemplateName(template)}
                              className="w-full h-full object-cover"
                            />
                          ) : template.preview_image_url ? (
                            <img 
                              src={template.preview_image_url} 
                              alt={getTemplateName(template)}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Box className="h-16 w-16 text-muted-foreground/50" />
                          )}
                        </div>
                        
                        <CardContent className="p-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-sm truncate">
                                {getTemplateName(template)}
                              </h4>
                              {template.base_price && (
                                <p className="text-xs text-muted-foreground">
                                  {language === 'es' ? 'Desde' : 'From'} €{template.base_price.toFixed(2)}
                                </p>
                              )}
                            </div>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <HelpCircle className="h-4 w-4 text-muted-foreground shrink-0" />
                              </TooltipTrigger>
                              <TooltipContent side="left" className="max-w-xs">
                                <p>{getTemplateDescription(template)}</p>
                                <p className="mt-1 text-xs opacity-75">
                                  {template.default_width_mm}x{template.default_height_mm}mm
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </ScrollArea>
            </TabsContent>
          ))}
        </Tabs>

        {/* Dimension Controls */}
        {selectedLamp && (
          <Card className="p-4 bg-muted/50">
            <h4 className="font-medium mb-4 flex items-center gap-2">
              {language === 'es' ? 'Tamaño de la Lámpara' : 'Lamp Size'}
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="h-4 w-4 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>{language === 'es' 
                    ? 'Ajusta el tamaño de tu lámpara en milímetros. El precio varía según el tamaño.'
                    : 'Adjust your lamp size in millimeters. Price varies by size.'}</p>
                </TooltipContent>
              </Tooltip>
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Width */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>{language === 'es' ? 'Ancho' : 'Width'}</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={dimensions.width}
                      onChange={(e) => handleWidthChange(parseInt(e.target.value) || 0)}
                      className="w-20 h-8 text-center"
                      min={selectedLamp.min_width_mm || 50}
                      max={selectedLamp.max_width_mm || 300}
                    />
                    <span className="text-sm text-muted-foreground">mm</span>
                  </div>
                </div>
                <Slider
                  value={[dimensions.width]}
                  min={selectedLamp.min_width_mm || 50}
                  max={selectedLamp.max_width_mm || 300}
                  step={1}
                  onValueChange={([v]) => handleWidthChange(v)}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{selectedLamp.min_width_mm || 50}mm</span>
                  <span>{selectedLamp.max_width_mm || 300}mm</span>
                </div>
              </div>

              {/* Height */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>{language === 'es' ? 'Alto' : 'Height'}</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={dimensions.height}
                      onChange={(e) => handleHeightChange(parseInt(e.target.value) || 0)}
                      className="w-20 h-8 text-center"
                      min={selectedLamp.min_height_mm || 50}
                      max={selectedLamp.max_height_mm || 300}
                    />
                    <span className="text-sm text-muted-foreground">mm</span>
                  </div>
                </div>
                <Slider
                  value={[dimensions.height]}
                  min={selectedLamp.min_height_mm || 50}
                  max={selectedLamp.max_height_mm || 300}
                  step={1}
                  onValueChange={([v]) => handleHeightChange(v)}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{selectedLamp.min_height_mm || 50}mm</span>
                  <span>{selectedLamp.max_height_mm || 300}mm</span>
                </div>
              </div>
            </div>

            {/* Area calculation */}
            <div className="mt-4 pt-4 border-t border-border/50">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {language === 'es' ? 'Área de la imagen' : 'Image area'}
                </span>
                <span className="font-medium">
                  {((dimensions.width * dimensions.height) / 100).toFixed(1)} cm²
                </span>
              </div>
            </div>
          </Card>
        )}
      </CardContent>
    </Card>
  );
};
