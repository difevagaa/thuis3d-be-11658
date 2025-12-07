import { useTranslation } from "react-i18next";
import { SectionRenderer, usePageSections } from "@/components/page-builder/SectionRenderer";
import { SEOHead } from "@/components/SEOHead";

export default function Gallery() {
  const { t } = useTranslation('gallery');
  
  // Load page builder sections for gallery page
  const { sections: pageBuilderSections, loading } = usePageSections('gallery');
  
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
        title={t('title', { defaultValue: 'Galería' })}
        description={t('seoDescription', { defaultValue: 'Explora nuestra galería de proyectos y trabajos realizados' })}
      />
      
      <div className="min-h-screen">
        {/* Render all content from Page Builder Sections */}
        {pageBuilderSections.length > 0 ? (
          <SectionRenderer sections={pageBuilderSections} />
        ) : (
          /* Default content when no sections are configured */
          <>
            <div className="bg-gradient-to-b from-gray-50 to-white py-16">
              <div className="container mx-auto px-4 text-center">
                <h1 className="text-4xl font-bold mb-4">Galería de Proyectos</h1>
                <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                  Explora algunos de los proyectos que hemos realizado para nuestros clientes
                </p>
              </div>
            </div>

            <div className="container mx-auto px-4 py-16">
              <div className="max-w-3xl mx-auto text-center">
                <h2 className="text-2xl font-bold mb-4">Nuestros Trabajos</h2>
                <p className="text-muted-foreground mb-8">
                  Cada proyecto es único y representa nuestro compromiso con la excelencia. 
                  Trabajamos en estrecha colaboración con nuestros clientes para asegurar que 
                  cada pieza cumpla con sus expectativas y especificaciones.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
                  <div className="bg-gray-50 p-6 rounded-lg">
                    <h3 className="font-semibold mb-2">Prototipos Funcionales</h3>
                    <p className="text-sm text-muted-foreground">
                      Piezas técnicas para validación de diseños y pruebas de concepto
                    </p>
                  </div>
                  <div className="bg-gray-50 p-6 rounded-lg">
                    <h3 className="font-semibold mb-2">Modelos Arquitectónicos</h3>
                    <p className="text-sm text-muted-foreground">
                      Maquetas a escala para presentación de proyectos
                    </p>
                  </div>
                  <div className="bg-gray-50 p-6 rounded-lg">
                    <h3 className="font-semibold mb-2">Piezas de Repuesto</h3>
                    <p className="text-sm text-muted-foreground">
                      Componentes de reemplazo y piezas personalizadas
                    </p>
                  </div>
                  <div className="bg-gray-50 p-6 rounded-lg">
                    <h3 className="font-semibold mb-2">Arte y Decoración</h3>
                    <p className="text-sm text-muted-foreground">
                      Esculturas y piezas decorativas únicas
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
