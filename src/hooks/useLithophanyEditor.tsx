import { useState, useCallback } from "react";
import { EDITING_OPTIONS } from "@/constants/lithophanyOptions";
import { toast } from "sonner";

export const useLithophanyEditor = () => {
  // Initialize settings with defaults
  const getDefaultSettings = (): Record<string, number | boolean | string> => {
    const defaults: Record<string, number | boolean | string> = {};
    EDITING_OPTIONS.forEach(option => {
      defaults[option.id] = option.default;
    });
    return defaults;
  };

  const [editorSettings, setEditorSettings] = useState<Record<string, number | boolean | string>>(getDefaultSettings);
  const [isProcessing, setIsProcessing] = useState(false);

  const updateSetting = useCallback((id: string, value: number | boolean | string) => {
    setEditorSettings(prev => ({
      ...prev,
      [id]: value
    }));
  }, []);

  const resetSettings = useCallback(() => {
    setEditorSettings(getDefaultSettings());
    toast.success('Settings reset to defaults');
  }, []);

  const resetCategory = useCallback((categoryId: string) => {
    setEditorSettings(prev => {
      const updated = { ...prev };
      EDITING_OPTIONS
        .filter(opt => opt.category === categoryId)
        .forEach(opt => {
          updated[opt.id] = opt.default;
        });
      return updated;
    });
  }, []);

  const applyPreset = useCallback((presetSettings: Record<string, number | boolean | string>) => {
    setEditorSettings(prev => ({
      ...prev,
      ...presetSettings
    }));
  }, []);

  const applyAIEnhancement = useCallback(async (type: string) => {
    setIsProcessing(true);
    
    try {
      // Simulate AI enhancement with optimal settings for lithophany
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      switch (type) {
        case 'enhance':
          // Apply optimal settings for lithophany
          applyPreset({
            contrast: 25,
            clarity: 20,
            definition: 15,
            shadows: 10,
            highlights: -10,
            grayscale: true,
            grayscaleMethod: 'luminosity',
            sharpness: 15,
            lithophanyOptimize: true,
            depthContrast: 30,
            surfaceSmoothing: 20
          });
          toast.success('AI enhancement applied for optimal lithophany');
          break;
          
        case 'portrait':
          applyPreset({
            contrast: 20,
            clarity: 15,
            faceEnhance: true,
            skinSmoothing: 20,
            eyeEnhance: true,
            grayscale: true
          });
          toast.success('Portrait enhancement applied');
          break;
          
        case 'landscape':
          applyPreset({
            contrast: 30,
            clarity: 25,
            dehaze: 15,
            vibrance: -30,
            grayscale: true,
            sharpness: 20
          });
          toast.success('Landscape enhancement applied');
          break;
          
        case 'highContrast':
          applyPreset({
            contrast: 50,
            clarity: 30,
            blacks: 10,
            whites: 10,
            grayscale: true
          });
          toast.success('High contrast preset applied');
          break;
          
        default:
          // General enhancement
          applyPreset({
            autoAdjust: true,
            autoContrast: true,
            grayscale: true,
            sharpness: 10
          });
      }
    } catch (error) {
      console.error('AI enhancement error:', error);
      toast.error('Error applying AI enhancement');
    } finally {
      setIsProcessing(false);
    }
  }, [applyPreset]);

  const getModifiedSettings = useCallback(() => {
    const defaults = getDefaultSettings();
    const modified: Record<string, number | boolean | string> = {};
    
    Object.entries(editorSettings).forEach(([key, value]) => {
      if (value !== defaults[key]) {
        modified[key] = value;
      }
    });
    
    return modified;
  }, [editorSettings]);

  const exportSettings = useCallback(() => {
    const settings = getModifiedSettings();
    const blob = new Blob([JSON.stringify(settings, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'lithophany-settings.json';
    a.click();
    URL.revokeObjectURL(url);
  }, [getModifiedSettings]);

  const importSettings = useCallback((settingsJson: string) => {
    try {
      const settings = JSON.parse(settingsJson);
      applyPreset(settings);
      toast.success('Settings imported successfully');
    } catch (error) {
      toast.error('Invalid settings file');
    }
  }, [applyPreset]);

  return {
    editorSettings,
    updateSetting,
    resetSettings,
    resetCategory,
    applyPreset,
    applyAIEnhancement,
    isProcessing,
    getModifiedSettings,
    exportSettings,
    importSettings
  };
};
