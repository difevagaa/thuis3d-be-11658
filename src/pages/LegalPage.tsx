import { useParams } from "react-router-dom";
import { SectionRenderer, usePageSections } from "@/components/page-builder/SectionRenderer";
import { SEOHead } from "@/components/SEOHead";

// Map URL type parameter to page_key
const typeToPageKeyMap: Record<string, string> = {
  'privacy': 'privacy-policy',
  'privacy-policy': 'privacy-policy',
  'terms': 'terms-of-service',
  'terms-of-service': 'terms-of-service',
  'cookies': 'cookies-policy',
  'cookies-policy': 'cookies-policy',
  'legal': 'legal-notice',
  'legal-notice': 'legal-notice',
  'shipping': 'shipping-policy',
  'shipping-policy': 'shipping-policy',
  'returns': 'return-policy',
  'return-policy': 'return-policy',
};

// Map page_key to display title
const pageTitles: Record<string, string> = {
  'privacy-policy': 'Política de Privacidad',
  'terms-of-service': 'Términos y Condiciones',
  'cookies-policy': 'Política de Cookies',
  'legal-notice': 'Aviso Legal',
  'shipping-policy': 'Política de Envíos',
  'return-policy': 'Política de Devoluciones',
};

export default function LegalPage() {
  const { type } = useParams();
  
  // Get the page_key from the URL type parameter
  const pageKey = type ? typeToPageKeyMap[type] : undefined;
  
  // Load page builder sections for the legal page
  const { sections: pageBuilderSections, loading } = usePageSections(pageKey || '');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // If no valid page key or no sections found
  if (!pageKey || pageBuilderSections.length === 0) {
    return (
      <>
        <SEOHead 
          title="Página no encontrada"
          description="La página legal que buscas no existe"
        />
        <div className="container mx-auto px-4 py-20 text-center">
          <h1 className="text-3xl font-bold mb-4">Página no encontrada</h1>
          <p className="text-muted-foreground mb-8">
            La página legal que buscas no existe o no está publicada.
          </p>
        </div>
      </>
    );
  }

  const pageTitle = pageTitles[pageKey] || 'Página Legal';

  return (
    <>
      <SEOHead 
        title={pageTitle}
        description={`Consulta nuestra ${pageTitle.toLowerCase()}`}
      />
      
      <div className="min-h-screen">
        {/* Render all content from Page Builder Sections */}
        <SectionRenderer sections={pageBuilderSections} />
      </div>
    </>
  );
}