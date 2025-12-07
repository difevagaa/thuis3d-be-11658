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
        <SectionRenderer sections={pageBuilderSections} />
        
        {/* Show message if no sections configured */}
        {pageBuilderSections.length === 0 && (
          <div className="container mx-auto px-4 py-20 text-center">
            <h2 className="text-2xl font-bold mb-4">{t('title', { defaultValue: 'Galería' })}</h2>
            <p className="text-muted-foreground mb-8">
              Esta página está en construcción. Por favor, configura las secciones desde el editor de páginas.
            </p>
          </div>
        )}
      </div>
    </>
  );
}
