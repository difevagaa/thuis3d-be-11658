import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2, GripVertical, Upload, X, Image as ImageIcon } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface SectionImage {
  id?: string;
  image_url: string;
  image_name: string;
  display_order: number;
  file?: File;
}

interface CustomizationSection {
  id?: string;
  section_name: string;
  display_order: number;
  is_required: boolean;
  section_type: 'color' | 'image' | 'file_upload';
  selectedColors: string[];
  selectedImages: SectionImage[];
}

interface ProductCustomizationSectionsProps {
  productId: string | null;
  availableColors: any[];
  onSectionsChange?: (sections: CustomizationSection[]) => void;
  showSaveButton?: boolean;
}

export default function ProductCustomizationSections({ 
  productId, 
  availableColors,
  onSectionsChange,
  showSaveButton
}: ProductCustomizationSectionsProps) {
  const [sections, setSections] = useState<CustomizationSection[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Use ref to avoid re-running effect when onSectionsChange changes
  const onSectionsChangeRef = useRef(onSectionsChange);
  onSectionsChangeRef.current = onSectionsChange;

  const loadSections = useCallback(async () => {
    if (!productId) return;
    
    try {
      setLoading(true);
      const { data: sectionsData, error: sectionsError } = await supabase
        .from('product_customization_sections' as any)
        .select('*')
        .eq('product_id', productId)
        .order('display_order');

      if (sectionsError) throw sectionsError;

      if (sectionsData && sectionsData.length > 0) {
        const sectionsWithColors = await Promise.all(
          sectionsData.map(async (section: any) => {
            const { data: colorsData } = await supabase
              .from('product_section_colors' as any)
              .select('color_id')
              .eq('section_id', section.id);

            // Cargar imágenes (tanto para tipo imagen como para imágenes de referencia en tipo color)
            const { data: imagesData } = await supabase
              .from('product_section_images' as any)
              .select('*')
              .eq('section_id', section.id)
              .order('display_order');

            return {
              id: section.id,
              section_name: section.section_name,
              display_order: section.display_order,
              is_required: section.is_required,
              section_type: section.section_type || 'color',
              selectedColors: colorsData?.map((c: any) => c.color_id) || [],
              selectedImages: imagesData?.map((img: any) => ({
                id: img.id,
                image_url: img.image_url,
                image_name: img.image_name,
                display_order: img.display_order
              })) || []
            };
          })
        );
        setSections(sectionsWithColors);
        onSectionsChangeRef.current?.(sectionsWithColors);
      }
    } catch (error) {
      console.error('Error loading sections:', error);
      toast.error('Error al cargar secciones de personalización');
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    if (productId) {
      loadSections();
    } else {
      setSections([]);
      onSectionsChangeRef.current?.([]);
    }
  }, [productId, loadSections]);

  const addSection = () => {
    const newSections = [...sections, {
      section_name: '',
      display_order: sections.length,
      is_required: false,
      section_type: 'color' as const,
      selectedColors: [],
      selectedImages: []
    }];
    setSections(newSections);
    onSectionsChange?.(newSections);
  };

  const updateSection = (index: number, field: string, value: any) => {
    const newSections = [...sections];
    newSections[index] = { ...newSections[index], [field]: value };
    setSections(newSections);
    onSectionsChange?.(newSections);
  };

  const removeSection = (index: number) => {
    const newSections = sections.filter((_, i) => i !== index);
    setSections(newSections);
    onSectionsChange?.(newSections);
  };

  const toggleColor = (sectionIndex: number, colorId: string) => {
    const section = sections[sectionIndex];
    const isSelected = section.selectedColors.includes(colorId);
    
    updateSection(
      sectionIndex, 
      'selectedColors',
      isSelected 
        ? section.selectedColors.filter(id => id !== colorId)
        : [...section.selectedColors, colorId]
    );
  };

  const handleImageUpload = async (sectionIndex: number, files: FileList | null) => {
    if (!files || files.length === 0) return;
    
    const section = sections[sectionIndex];
    const newImages: SectionImage[] = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      newImages.push({
        image_url: URL.createObjectURL(file),
        image_name: file.name,
        display_order: section.selectedImages.length + i,
        file: file
      });
    }
    
    updateSection(sectionIndex, 'selectedImages', [...section.selectedImages, ...newImages]);
  };

  const removeImage = (sectionIndex: number, imageIndex: number) => {
    const section = sections[sectionIndex];
    const newImages = section.selectedImages.filter((_, i) => i !== imageIndex);
    updateSection(sectionIndex, 'selectedImages', newImages);
  };

  const saveSections = async () => {
    if (!productId) {
      toast.error('Debe guardar el producto primero');
      return;
    }

    try {
      setLoading(true);
      console.log('💾 [ProductCustomization] Guardando secciones para producto:', productId);

      // 1. Eliminar secciones existentes del producto
      const { error: deleteError } = await (supabase as any)
        .from('product_customization_sections')
        .delete()
        .eq('product_id', productId);

      if (deleteError) {
        console.error('❌ [ProductCustomization] Error eliminando secciones existentes:', deleteError);
        throw deleteError;
      }

      console.log('🗑️ [ProductCustomization] Secciones anteriores eliminadas');

      // 2. Insertar nuevas secciones de forma transaccional
      let insertedCount = 0;
      for (const section of sections) {
        if (!section.section_name.trim()) {
          console.warn('⚠️ [ProductCustomization] Sección sin nombre, omitiendo');
          continue;
        }

        console.log(`📝 [ProductCustomization] Insertando sección: "${section.section_name}" (tipo: ${section.section_type})`);

        const { data: insertedSection, error: sectionError } = await (supabase as any)
          .from('product_customization_sections')
          .insert({
            product_id: productId,
            section_name: section.section_name,
            display_order: section.display_order,
            is_required: section.is_required,
            section_type: section.section_type
          })
          .select()
          .single();

        if (sectionError) {
          console.error('❌ [ProductCustomization] Error insertando sección:', sectionError);
          throw sectionError;
        }

        console.log(`✅ [ProductCustomization] Sección creada con ID: ${insertedSection.id}`);

        // 3. Insertar colores o imágenes según el tipo de sección
        if (section.section_type === 'color') {
          // Guardar colores disponibles
          if (section.selectedColors.length > 0 && insertedSection) {
            console.log(`🎨 [ProductCustomization] Insertando ${section.selectedColors.length} colores para sección ${insertedSection.id}`);
            
            const sectionColors = section.selectedColors.map((colorId: string) => ({
              section_id: insertedSection.id,
              color_id: colorId
            }));

            const { error: colorsError } = await (supabase as any)
              .from('product_section_colors')
              .insert(sectionColors);

            if (colorsError) {
              console.error('❌ [ProductCustomization] Error insertando colores:', colorsError);
              throw colorsError;
            }

            console.log(`✅ [ProductCustomization] Colores insertados correctamente`);
          }
          
          // Guardar imagen de referencia si existe (para mostrar al cliente)
          if (section.selectedImages.length > 0 && insertedSection) {
            console.log(`🖼️ [ProductCustomization] Subiendo imagen de referencia para sección ${insertedSection.id}`);
            
            const image = section.selectedImages[0]; // Solo la primera imagen como referencia
            let imageUrl = image.image_url;
            
            // Si la imagen tiene un archivo (es nueva), subirla a storage
            if (image.file) {
              const fileExt = image.file.name.split('.').pop();
              const fileName = `${productId}/${insertedSection.id}/reference.${fileExt}`;
              
              const { error: uploadError } = await supabase.storage
                .from('product-customization-images')
                .upload(fileName, image.file, { upsert: true });

              if (uploadError) {
                console.error('❌ Error subiendo imagen de referencia:', uploadError);
                throw uploadError;
              }

              const { data: { publicUrl } } = supabase.storage
                .from('product-customization-images')
                .getPublicUrl(fileName);
              
              imageUrl = publicUrl;
            }

            const { error: imageError } = await (supabase as any)
              .from('product_section_images')
              .insert({
                section_id: insertedSection.id,
                image_url: imageUrl,
                image_name: image.image_name,
                display_order: 0
              });

            if (imageError) {
              console.error('❌ Error guardando referencia de imagen:', imageError);
              throw imageError;
            }
            
            console.log(`✅ [ProductCustomization] Imagen de referencia guardada`);
          }
        } else if (section.section_type === 'image' && section.selectedImages.length > 0 && insertedSection) {
          console.log(`🖼️ [ProductCustomization] Subiendo ${section.selectedImages.length} imágenes para sección ${insertedSection.id}`);
          
          for (const image of section.selectedImages) {
            let imageUrl = image.image_url;
            
            // Si la imagen tiene un archivo (es nueva), subirla a storage
            if (image.file) {
              const fileExt = image.file.name.split('.').pop();
              const fileName = `${productId}/${insertedSection.id}/${Date.now()}.${fileExt}`;
              
              const { error: uploadError } = await supabase.storage
                .from('product-customization-images')
                .upload(fileName, image.file);

              if (uploadError) {
                console.error('❌ Error subiendo imagen:', uploadError);
                throw uploadError;
              }

              const { data: { publicUrl } } = supabase.storage
                .from('product-customization-images')
                .getPublicUrl(fileName);
              
              imageUrl = publicUrl;
            }

            const { error: imageError } = await (supabase as any)
              .from('product_section_images')
              .insert({
                section_id: insertedSection.id,
                image_url: imageUrl,
                image_name: image.image_name,
                display_order: image.display_order
              });

            if (imageError) {
              console.error('❌ Error guardando referencia de imagen:', imageError);
              throw imageError;
            }
          }

          console.log(`✅ [ProductCustomization] Imágenes insertadas correctamente`);
        }

        insertedCount++;
      }

      console.log(`✨ [ProductCustomization] Proceso completado: ${insertedCount} secciones guardadas`);
      toast.success(`✓ ${insertedCount} sección(es) de personalización guardada(s) correctamente`);
      await loadSections();
    } catch (error: any) {
      console.error('❌ [ProductCustomization] Error crítico:', error);
      toast.error(`Error al guardar: ${error.message || 'Error desconocido'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Personalización por Secciones</span>
          <Button onClick={addSection} size="sm" variant="outline">
            <Plus className="h-4 w-4 mr-2" />
            Añadir Sección
          </Button>
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Define secciones donde el cliente puede seleccionar colores, imágenes o subir archivos para personalizar el producto
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {sections.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>Sin secciones personalizables</p>
            <p className="text-xs mt-2">El producto usará el selector de color tradicional</p>
          </div>
        ) : (
          <>
            {sections.map((section, index) => (
              <Card key={index} className="border-2">
                <CardContent className="pt-4 space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 pt-2 cursor-move">
                      <GripVertical className="h-5 w-5 text-muted-foreground" />
                    </div>
                    
                    <div className="flex-1 space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Nombre de la Sección *</Label>
                          <Input
                            placeholder="Ej: Cabeza, Cuerpo, Base..."
                            value={section.section_name}
                            onChange={(e) => updateSection(index, 'section_name', e.target.value)}
                          />
                        </div>
                        <div className="flex items-center space-x-2 pt-6">
                          <Switch
                            checked={section.is_required}
                            onCheckedChange={(checked) => updateSection(index, 'is_required', checked)}
                          />
                          <Label>Selección Obligatoria</Label>
                        </div>
                      </div>

                      <div>
                        <Label>Tipo de Personalización</Label>
                        <RadioGroup
                          value={section.section_type}
                          onValueChange={(value) => updateSection(index, 'section_type', value)}
                          className="flex gap-4 mt-2"
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="color" id={`color-${index}`} />
                            <Label htmlFor={`color-${index}`}>Colores</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="image" id={`image-${index}`} />
                            <Label htmlFor={`image-${index}`}>Imágenes</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="file_upload" id={`file_upload-${index}`} />
                            <Label htmlFor={`file_upload-${index}`}>Carga de Archivo (Cliente)</Label>
                          </div>
                        </RadioGroup>
                      </div>

                      {section.section_type === 'color' ? (
                        <div className="space-y-3">
                          <div>
                            <Label>Imagen de Referencia (Opcional)</Label>
                            <p className="text-xs text-muted-foreground mb-2">
                              Sube una imagen para mostrar al cliente de qué sección hablas
                            </p>
                            <div className="border-2 border-dashed rounded-lg p-3 text-center hover:bg-muted/50 transition-colors">
                              <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => handleImageUpload(index, e.target.files)}
                                className="hidden"
                                id={`section-reference-${index}`}
                              />
                              <label 
                                htmlFor={`section-reference-${index}`}
                                className="cursor-pointer flex flex-col items-center gap-2"
                              >
                                <ImageIcon className="h-6 w-6 text-muted-foreground" />
                                <span className="text-sm text-muted-foreground">
                                  Clic para subir imagen de referencia
                                </span>
                              </label>
                            </div>
                            
                            {section.selectedImages.length > 0 && (
                              <div className="mt-2 relative">
                                <img
                                  src={section.selectedImages[0].image_url}
                                  alt={section.selectedImages[0].image_name}
                                  className="w-32 h-32 object-cover rounded border"
                                />
                                <button
                                  onClick={() => removeImage(index, 0)}
                                  className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-1"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </div>
                            )}
                          </div>
                          
                          <div>
                            <Label>Colores Disponibles ({section.selectedColors.length} seleccionados)</Label>
                            <div className="grid grid-cols-3 gap-2 mt-2 p-3 border rounded-md max-h-48 overflow-y-auto">
                              {availableColors.length > 0 ? (
                                availableColors.map((color) => (
                                  <div key={color.id} className="flex items-center space-x-2">
                                    <Checkbox
                                      checked={section.selectedColors.includes(color.id)}
                                      onCheckedChange={() => toggleColor(index, color.id)}
                                    />
                                    <div className="flex items-center gap-2">
                                      <div
                                        className="w-4 h-4 rounded border"
                                        style={{ backgroundColor: color.hex_code }}
                                      />
                                      <span className="text-sm">{color.name}</span>
                                    </div>
                                  </div>
                                ))
                              ) : (
                                <p className="text-sm text-muted-foreground col-span-3">
                                  Debe añadir colores al producto primero
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      ) : section.section_type === 'file_upload' ? (
                        <div className="space-y-3 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200">
                          <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400">
                            <Upload className="h-5 w-5" />
                            <span className="font-medium text-sm">Carga de Archivo por el Cliente</span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Al activar esta opción, el cliente deberá subir un archivo de imagen al momento de comprar. 
                            Usa el campo "Nombre de la Sección" para indicar las instrucciones al cliente 
                            (ej: "Sube tu foto para la litofanía - La imagen debe ser clara y de alta resolución").
                          </p>
                          <div className="p-2 bg-white dark:bg-background rounded border">
                            <p className="text-xs font-medium mb-1">Vista previa del mensaje al cliente:</p>
                            <p className="text-sm italic text-muted-foreground">
                              "{section.section_name || 'Sube tu imagen aquí...'}"
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <Label>Imágenes Disponibles ({section.selectedImages.length} imágenes)</Label>
                          <div className="mt-2 space-y-2">
                            <div className="border-2 border-dashed rounded-lg p-4 text-center hover:bg-muted/50 transition-colors">
                              <input
                                type="file"
                                accept="image/*,video/*"
                                multiple
                                onChange={(e) => handleImageUpload(index, e.target.files)}
                                className="hidden"
                                id={`image-upload-${index}`}
                              />
                              <label 
                                htmlFor={`image-upload-${index}`}
                                className="cursor-pointer flex flex-col items-center gap-2"
                              >
                                <Upload className="h-8 w-8 text-muted-foreground" />
                                <span className="text-sm text-muted-foreground">
                                  Clic para subir imágenes o videos
                                </span>
                              </label>
                            </div>
                            
                            {section.selectedImages.length > 0 && (
                              <div className="grid grid-cols-3 gap-2 p-3 border rounded-md max-h-48 overflow-y-auto">
                                {section.selectedImages.map((image, imgIndex) => (
                                  <div key={imgIndex} className="relative group">
                                    <img
                                      src={image.image_url}
                                      alt={image.image_name}
                                      className="w-full h-20 object-cover rounded border"
                                    />
                                    <button
                                      onClick={() => removeImage(index, imgIndex)}
                                      className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                      <X className="h-3 w-3" />
                                    </button>
                                    <p className="text-xs truncate mt-1">{image.image_name}</p>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    <Button
                      variant="destructive"
                      size="icon"
                      onClick={() => removeSection(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}

          </>
)}

        {showSaveButton && (
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button onClick={saveSections} disabled={loading || !productId}>
              {loading ? 'Guardando...' : 'Guardar Secciones'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
