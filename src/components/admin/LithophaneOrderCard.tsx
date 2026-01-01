/**
 * Admin Component: Lithophane Order Card
 * Shows lithophane order details with STL download functionality
 */

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Download, Loader2, Image as ImageIcon, Box, Layers } from "lucide-react";
import { generateCombinedSTL, downloadSTL } from "@/lib/lithophaneSTLGenerator";
import type { LampTemplate } from "@/pages/Lithophany";

interface LithophaneOrderCardProps {
  order: {
    id: string;
    original_image_url: string;
    processed_image_url: string;
    lamp_type: string;
    lamp_width_mm: number;
    lamp_height_mm: number;
    image_settings: Record<string, any>;
    lamp_custom_settings: Record<string, any>;
    status: string;
    created_at: string;
  };
}

export const LithophaneOrderCard = ({ order }: LithophaneOrderCardProps) => {
  const [isGenerating, setIsGenerating] = useState(false);
  
  const handleDownloadSTL = async () => {
    setIsGenerating(true);
    
    try {
      // Reconstruct lamp template from order data
      const lampTemplate: LampTemplate = {
        id: order.lamp_custom_settings?.template_id || '',
        name: order.lamp_custom_settings?.template_name || order.lamp_type,
        shape_type: order.lamp_type,
        category: 'standard',
        default_width_mm: order.lamp_width_mm,
        default_height_mm: order.lamp_height_mm,
        min_width_mm: 50,
        max_width_mm: 300,
        min_height_mm: 50,
        max_height_mm: 300,
        base_price: 0,
        price_per_cm2: 0,
        is_active: true,
        display_order: 0
      };
      
      // Extract lithophany settings from image_settings or use defaults
      const settings = order.image_settings || {};
      const lithSettings = {
        minThickness: (settings.lithMinThickness as number) || 0.6,
        maxThickness: (settings.lithMaxThickness as number) || 3.5,
        resolution: (settings.lithResolution as 'low' | 'medium' | 'high' | 'ultra') || 'high',
        border: (settings.lithBorder as number) || 2,
        curve: (settings.lithCurve as number) || 0,
        negative: (settings.lithNegative as boolean) || false,
        smoothing: (settings.lithSmoothing as number) || 20,
      };
      
      // Generate combined STL (lithophane + base)
      const stlBuffer = await generateCombinedSTL({
        processedImage: order.processed_image_url,
        lampTemplate,
        dimensions: {
          width: order.lamp_width_mm,
          height: order.lamp_height_mm
        },
        settings: lithSettings
      });
      
      // Download with descriptive filename
      const filename = `lithophane_order_${order.id}_${order.lamp_type}_${order.lamp_width_mm}x${order.lamp_height_mm}mm_with_base.stl`;
      downloadSTL(stlBuffer, filename);
      
      toast.success('STL file downloaded successfully!');
    } catch (error) {
      console.error('Error generating STL:', error);
      toast.error('Failed to generate STL file');
    } finally {
      setIsGenerating(false);
    }
  };
  
  return (
    <Card className="mb-4">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Layers className="h-5 w-5" />
            Lithophane Order
          </CardTitle>
          <Badge variant={order.status === 'completed' ? 'default' : 'secondary'}>
            {order.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Images */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground mb-2">Original Image</p>
            <div className="aspect-video bg-muted rounded-lg overflow-hidden">
              {order.original_image_url ? (
                <img 
                  src={order.original_image_url} 
                  alt="Original" 
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <ImageIcon className="h-8 w-8 text-muted-foreground" />
                </div>
              )}
            </div>
          </div>
          
          <div>
            <p className="text-sm text-muted-foreground mb-2">Processed Image</p>
            <div className="aspect-video bg-muted rounded-lg overflow-hidden">
              {order.processed_image_url ? (
                <img 
                  src={order.processed_image_url} 
                  alt="Processed" 
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <ImageIcon className="h-8 w-8 text-muted-foreground" />
                </div>
              )}
            </div>
          </div>
        </div>
        
        <Separator />
        
        {/* Specifications */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Lamp Type</p>
            <p className="font-medium">{order.lamp_type}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Width</p>
            <p className="font-medium">{order.lamp_width_mm} mm</p>
          </div>
          <div>
            <p className="text-muted-foreground">Height</p>
            <p className="font-medium">{order.lamp_height_mm} mm</p>
          </div>
          <div>
            <p className="text-muted-foreground">Area</p>
            <p className="font-medium">
              {((order.lamp_width_mm * order.lamp_height_mm) / 100).toFixed(1)} cm²
            </p>
          </div>
        </div>
        
        <Separator />
        
        {/* Download Section */}
        <div className="flex items-center justify-between bg-primary/5 p-4 rounded-lg">
          <div className="flex items-center gap-3">
            <Box className="h-8 w-8 text-primary" />
            <div>
              <p className="font-medium">Download Complete STL</p>
              <p className="text-sm text-muted-foreground">
                Includes lithophane panel + base with LED mounting
              </p>
            </div>
          </div>
          <Button 
            onClick={handleDownloadSTL}
            disabled={isGenerating || !order.processed_image_url}
            size="lg"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Download STL
              </>
            )}
          </Button>
        </div>
        
        {/* Info note */}
        <p className="text-xs text-muted-foreground">
          <strong>Note:</strong> The STL file includes both the lithophane panel and the base with a slot 
          ({order.lamp_width_mm + 1}mm wide) and LED mounting hole (16mm diameter). 
          Print with 100% infill for the lithophane and 20% for the base.
        </p>
      </CardContent>
    </Card>
  );
};
