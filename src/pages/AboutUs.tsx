import { SectionRenderer, usePageSections } from "@/components/page-builder/SectionRenderer";
import { SEOHead } from "@/components/SEOHead";

export default function AboutUs() {
  // Load page builder sections for about-us page
  const { sections: pageBuilderSections, loading } = usePageSections('about-us');
  
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
        title="Sobre Nosotros"
        description="Conoce más sobre nuestro equipo y nuestra pasión por la impresión 3D"
      />
      
      <div className="min-h-screen">
        {/* Render all content from Page Builder Sections */}
        <SectionRenderer sections={pageBuilderSections} />
        
        {/* Show message if no sections configured */}
        {pageBuilderSections.length === 0 && (
          <div className="container mx-auto px-4 py-20 text-center">
            <h2 className="text-2xl font-bold mb-4">Sobre Nosotros</h2>
            <p className="text-muted-foreground mb-8">
              Esta página está en construcción. Por favor, configura las secciones desde el editor de páginas.
            </p>
          </div>
        )}
      </div>
    </>
  );
}
