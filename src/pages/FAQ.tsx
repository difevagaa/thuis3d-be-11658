import { SectionRenderer, usePageSections } from "@/components/page-builder/SectionRenderer";
import { SEOHead } from "@/components/SEOHead";
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export default function FAQ() {
  // Load page builder sections for faq page
  const { sections: pageBuilderSections, loading } = usePageSections('faq');
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <>
      <SEOHead 
        title="Preguntas Frecuentes"
        description="Encuentra respuestas a las preguntas más frecuentes sobre nuestros servicios de impresión 3D"
      />
      
      <div className="min-h-screen">
        {/* Render all content from Page Builder Sections */}
        {pageBuilderSections.length > 0 ? (
          <SectionRenderer sections={pageBuilderSections} />
        ) : (
          /* Default content when no sections are configured */
          <div className="container mx-auto px-4 py-16 max-w-4xl">
            <div className="text-center mb-12">
              <h1 className="text-4xl font-bold mb-4">Preguntas Frecuentes</h1>
              <p className="text-lg text-muted-foreground">
                Encuentra respuestas a las preguntas más comunes sobre nuestros servicios
              </p>
            </div>

            <Accordion type="single" collapsible className="w-full space-y-4">
              <AccordionItem value="item-1" className="border rounded-lg px-6">
                <AccordionTrigger className="text-left font-semibold hover:no-underline">
                  ¿Qué formatos de archivo aceptan?
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  Aceptamos archivos STL, OBJ, 3MF y STEP. Si tienes otro formato, contáctanos y buscaremos una solución para poder trabajar con tu archivo.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-2" className="border rounded-lg px-6">
                <AccordionTrigger className="text-left font-semibold hover:no-underline">
                  ¿Cuánto cuesta un proyecto de impresión 3D?
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  El coste depende de varios factores: tamaño de la pieza, material seleccionado, complejidad del diseño y acabado deseado. Usa nuestra calculadora online para obtener un presupuesto instantáneo o solicita una cotización personalizada para proyectos más complejos.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-3" className="border rounded-lg px-6">
                <AccordionTrigger className="text-left font-semibold hover:no-underline">
                  ¿Cuánto tiempo tarda la producción?
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  Generalmente entre 3-7 días laborables, dependiendo de la complejidad del proyecto y nuestra carga de trabajo actual. Para proyectos urgentes, ofrecemos servicio express con entrega en 24-48 horas (consultar disponibilidad).
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-4" className="border rounded-lg px-6">
                <AccordionTrigger className="text-left font-semibold hover:no-underline">
                  ¿Puedo ver mi pieza antes de que sea producida?
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  Sí, te enviamos una vista previa 3D de tu modelo y confirmamos todos los detalles técnicos (orientación, soportes, acabado) antes de comenzar la producción. Así te aseguras de que el resultado final sea exactamente lo que esperas.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-5" className="border rounded-lg px-6">
                <AccordionTrigger className="text-left font-semibold hover:no-underline">
                  ¿Qué materiales están disponibles?
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  Ofrecemos una amplia gama de materiales: PLA, ABS, PETG, TPU, resinas fotopoliméricas, nylon y materiales especiales como PLA conductivo o materiales reforzados con fibra. Consulta nuestro catálogo completo para conocer todas las opciones y sus características.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-6" className="border rounded-lg px-6">
                <AccordionTrigger className="text-left font-semibold hover:no-underline">
                  ¿Ofrecen servicios de diseño?
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  Sí, nuestro equipo puede ayudarte a diseñar tu proyecto desde cero o modificar diseños existentes para optimizarlos para impresión 3D. Contamos con diseñadores especializados en modelado CAD y optimización de modelos.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-7" className="border rounded-lg px-6">
                <AccordionTrigger className="text-left font-semibold hover:no-underline">
                  ¿Realizan envíos internacionales?
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  Sí, enviamos a toda Europa y otros destinos internacionales. Los costes de envío varían según el destino y el peso del paquete. Ofrecemos envío gratuito en Bélgica para pedidos superiores a 100€.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-8" className="border rounded-lg px-6">
                <AccordionTrigger className="text-left font-semibold hover:no-underline">
                  ¿Qué garantía tienen los productos?
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  Garantizamos la calidad de nuestras impresiones. Si hay algún defecto de fabricación o el resultado no cumple con las especificaciones acordadas, lo reimprimimos sin coste adicional. Tu satisfacción es nuestra prioridad.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        )}
      </div>
    </>
  );
}
