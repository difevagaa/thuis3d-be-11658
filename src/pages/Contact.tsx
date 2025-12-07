import { SectionRenderer, usePageSections } from "@/components/page-builder/SectionRenderer";
import { SEOHead } from "@/components/SEOHead";

export default function Contact() {
  // Load page builder sections for contact page
  const { sections: pageBuilderSections, loading } = usePageSections('contact');
  
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
        title="Contacto"
        description="Ponte en contacto con nosotros para cualquier consulta sobre nuestros servicios de impresión 3D"
      />
      
      <div className="min-h-screen">
        {/* Render all content from Page Builder Sections */}
        <SectionRenderer sections={pageBuilderSections} />
        
        {/* Show message if no sections configured */}
        {pageBuilderSections.length === 0 && (
          <div className="container mx-auto px-4 py-20 text-center">
            <h2 className="text-2xl font-bold mb-4">Contacto</h2>
            <p className="text-muted-foreground mb-8">
              Esta página está en construcción. Por favor, configura las secciones desde el editor de páginas.
            </p>
          </div>
        )}
      </div>
    </>
  );
}
