import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  HelpCircle,
  Keyboard,
  Layout,
  MousePointer,
  Sparkles,
  Video,
  Zap
} from "lucide-react";

interface PageBuilderHelpProps {
  open: boolean;
  onClose: () => void;
}

export function PageBuilderHelp({ open, onClose }: PageBuilderHelpProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5" />
            Ayuda del Editor de Páginas
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Introducción</TabsTrigger>
            <TabsTrigger value="sections">Secciones</TabsTrigger>
            <TabsTrigger value="keyboard">Atajos</TabsTrigger>
            <TabsTrigger value="tips">Consejos</TabsTrigger>
          </TabsList>

          <ScrollArea className="h-[500px] mt-4">
            <TabsContent value="overview" className="space-y-4 p-4">
              <div>
                <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                  <Layout className="h-5 w-5 text-primary" />
                  ¿Qué es el Editor de Páginas?
                </h3>
                <p className="text-muted-foreground mb-4">
                  El Editor de Páginas es una herramienta visual poderosa que te permite crear y
                  personalizar las páginas de tu sitio web sin necesidad de programar. Similar a
                  editores profesionales como Shopify, puedes arrastrar, soltar y configurar
                  secciones para crear diseños únicos.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2">Características Principales</h3>
                <ul className="space-y-2 text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <Sparkles className="h-4 w-4 mt-1 text-primary flex-shrink-0" />
                    <span><strong>Editor Visual:</strong> Ve los cambios en tiempo real mientras editas</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <MousePointer className="h-4 w-4 mt-1 text-primary flex-shrink-0" />
                    <span><strong>Drag & Drop:</strong> Arrastra secciones para reordenarlas fácilmente</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Keyboard className="h-4 w-4 mt-1 text-primary flex-shrink-0" />
                    <span><strong>Atajos de Teclado:</strong> Trabaja más rápido con combinaciones de teclas</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Video className="h-4 w-4 mt-1 text-primary flex-shrink-0" />
                    <span><strong>Vista Previa Responsiva:</strong> Verifica cómo se ve en móvil, tablet y escritorio</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Zap className="h-4 w-4 mt-1 text-primary flex-shrink-0" />
                    <span><strong>Deshacer/Rehacer:</strong> Experimenta sin miedo, siempre puedes volver atrás</span>
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2">Cómo Empezar</h3>
                <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
                  <li>Selecciona una página del panel izquierdo (Inicio, Productos, etc.)</li>
                  <li>Haz clic en "+" en el panel derecho para añadir una nueva sección</li>
                  <li>Elige una plantilla predefinida o crea desde cero</li>
                  <li>Personaliza el contenido, colores y estilos</li>
                  <li>Usa el botón "Guardar" o Ctrl+S para guardar los cambios</li>
                  <li>Haz clic en "Vista previa" para ver tu página en acción</li>
                </ol>
              </div>
            </TabsContent>

            <TabsContent value="sections" className="space-y-4 p-4">
              <div>
                <h3 className="text-lg font-semibold mb-4">Tipos de Secciones Disponibles</h3>
                
                <div className="space-y-4">
                  <div className="border rounded-lg p-3">
                    <h4 className="font-semibold mb-1">Hero / Portada</h4>
                    <p className="text-sm text-muted-foreground">
                      Sección grande y llamativa para la parte superior de tu página. Ideal para
                      títulos principales, imágenes de fondo y llamados a la acción.
                    </p>
                  </div>

                  <div className="border rounded-lg p-3">
                    <h4 className="font-semibold mb-1">Texto</h4>
                    <p className="text-sm text-muted-foreground">
                      Sección simple para párrafos de texto. Perfecta para descripciones, artículos
                      o cualquier contenido textual.
                    </p>
                  </div>

                  <div className="border rounded-lg p-3">
                    <h4 className="font-semibold mb-1">Imagen</h4>
                    <p className="text-sm text-muted-foreground">
                      Muestra una imagen destacada. Útil para mostrar productos, trabajos realizados
                      o imágenes promocionales.
                    </p>
                  </div>

                  <div className="border rounded-lg p-3">
                    <h4 className="font-semibold mb-1">Banner Promocional</h4>
                    <p className="text-sm text-muted-foreground">
                      Banner horizontal para promociones, anuncios o información importante.
                      Incluye título, descripción y botón.
                    </p>
                  </div>

                  <div className="border rounded-lg p-3">
                    <h4 className="font-semibold mb-1">CTA (Llamada a la Acción)</h4>
                    <p className="text-sm text-muted-foreground">
                      Sección enfocada en convertir visitantes. Ideal para contacto, compras o
                      cualquier acción que quieras que realicen.
                    </p>
                  </div>

                  <div className="border rounded-lg p-3">
                    <h4 className="font-semibold mb-1">Características</h4>
                    <p className="text-sm text-muted-foreground">
                      Muestra múltiples características o beneficios en un grid. Configurable
                      en 2, 3 o 4 columnas.
                    </p>
                  </div>

                  <div className="border rounded-lg p-3">
                    <h4 className="font-semibold mb-1">Galería</h4>
                    <p className="text-sm text-muted-foreground">
                      Grid de imágenes personalizable. Perfecto para mostrar portafolio, trabajos
                      o productos.
                    </p>
                  </div>

                  <div className="border rounded-lg p-3">
                    <h4 className="font-semibold mb-1">Video</h4>
                    <p className="text-sm text-muted-foreground">
                      Incrusta videos de YouTube, Vimeo u otras plataformas. Ideal para tutoriales
                      o presentaciones.
                    </p>
                  </div>

                  <div className="border rounded-lg p-3">
                    <h4 className="font-semibold mb-1">Espaciador</h4>
                    <p className="text-sm text-muted-foreground">
                      Añade espacio vertical entre secciones. Útil para crear respiración visual.
                    </p>
                  </div>

                  <div className="border rounded-lg p-3">
                    <h4 className="font-semibold mb-1">Separador</h4>
                    <p className="text-sm text-muted-foreground">
                      Línea horizontal para dividir secciones visualmente.
                    </p>
                  </div>

                  <div className="border rounded-lg p-3">
                    <h4 className="font-semibold mb-1">HTML Personalizado</h4>
                    <p className="text-sm text-muted-foreground">
                      Para usuarios avanzados: inserta código HTML personalizado.
                    </p>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="keyboard" className="space-y-4 p-4">
              <div>
                <h3 className="text-lg font-semibold mb-4">Atajos de Teclado</h3>
                <p className="text-muted-foreground mb-4">
                  Usa estos atajos para trabajar más eficientemente:
                </p>

                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <span className="font-medium">Guardar cambios</span>
                    <kbd className="px-3 py-1 bg-muted rounded border">Ctrl + S</kbd>
                  </div>

                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <span className="font-medium">Deshacer</span>
                    <kbd className="px-3 py-1 bg-muted rounded border">Ctrl + Z</kbd>
                  </div>

                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <span className="font-medium">Rehacer</span>
                    <kbd className="px-3 py-1 bg-muted rounded border">Ctrl + Shift + Z</kbd>
                  </div>

                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <span className="font-medium">Rehacer (alternativo)</span>
                    <kbd className="px-3 py-1 bg-muted rounded border">Ctrl + Y</kbd>
                  </div>

                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <span className="font-medium">Deseleccionar sección</span>
                    <kbd className="px-3 py-1 bg-muted rounded border">Esc</kbd>
                  </div>
                </div>

                <p className="text-sm text-muted-foreground mt-4">
                  <strong>Nota:</strong> En Mac, usa Cmd (⌘) en lugar de Ctrl
                </p>
              </div>
            </TabsContent>

            <TabsContent value="tips" className="space-y-4 p-4">
              <div>
                <h3 className="text-lg font-semibold mb-4">Consejos y Mejores Prácticas</h3>

                <div className="space-y-4">
                  <div className="border-l-4 border-primary pl-4">
                    <h4 className="font-semibold mb-1">💡 Usa Vista Previa Responsiva</h4>
                    <p className="text-sm text-muted-foreground">
                      Más del 60% de los visitantes usan móviles. Siempre verifica cómo se ve tu
                      página en todos los dispositivos antes de publicar.
                    </p>
                  </div>

                  <div className="border-l-4 border-primary pl-4">
                    <h4 className="font-semibold mb-1">🎨 Mantén Consistencia Visual</h4>
                    <p className="text-sm text-muted-foreground">
                      Usa los mismos colores y estilos en toda la página para una apariencia
                      profesional. Define tu paleta de colores antes de empezar.
                    </p>
                  </div>

                  <div className="border-l-4 border-primary pl-4">
                    <h4 className="font-semibold mb-1">📸 Optimiza tus Imágenes</h4>
                    <p className="text-sm text-muted-foreground">
                      Usa imágenes de alta calidad pero optimizadas. Recomendamos WebP o JPG
                      comprimidos para tiempos de carga rápidos.
                    </p>
                  </div>

                  <div className="border-l-4 border-primary pl-4">
                    <h4 className="font-semibold mb-1">🎯 Llamadas a la Acción Claras</h4>
                    <p className="text-sm text-muted-foreground">
                      Cada página debe tener un objetivo claro. Usa botones y CTAs que guíen
                      a tus visitantes hacia la acción que deseas.
                    </p>
                  </div>

                  <div className="border-l-4 border-primary pl-4">
                    <h4 className="font-semibold mb-1">📝 Contenido Conciso</h4>
                    <p className="text-sm text-muted-foreground">
                      En web, menos es más. Mantén tus textos breves y al punto. Usa títulos
                      claros y párrafos cortos.
                    </p>
                  </div>

                  <div className="border-l-4 border-primary pl-4">
                    <h4 className="font-semibold mb-1">🔄 Guarda Frecuentemente</h4>
                    <p className="text-sm text-muted-foreground">
                      Usa Ctrl+S regularmente para guardar tu trabajo. Aunque hay undo/redo,
                      es mejor prevenir.
                    </p>
                  </div>

                  <div className="border-l-4 border-primary pl-4">
                    <h4 className="font-semibold mb-1">✨ Usa Espacios en Blanco</h4>
                    <p className="text-sm text-muted-foreground">
                      No llenes cada pixel. Los espacios en blanco ayudan a que el contenido
                      respire y sea más fácil de leer.
                    </p>
                  </div>

                  <div className="border-l-4 border-primary pl-4">
                    <h4 className="font-semibold mb-1">🚀 Rendimiento Primero</h4>
                    <p className="text-sm text-muted-foreground">
                      Evita usar demasiadas secciones en una sola página. Una página rápida
                      convierte mejor que una página bonita pero lenta.
                    </p>
                  </div>
                </div>
              </div>
            </TabsContent>
          </ScrollArea>
        </Tabs>

        <div className="flex justify-end mt-4">
          <Button onClick={onClose}>Entendido</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
