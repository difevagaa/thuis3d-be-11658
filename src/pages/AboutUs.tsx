import { SectionRenderer, usePageSections } from "@/components/page-builder/SectionRenderer";
import { SEOHead } from "@/components/SEOHead";
import { Lightbulb, Award, Heart } from "lucide-react";

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
        {pageBuilderSections.length > 0 ? (
          <SectionRenderer sections={pageBuilderSections} />
        ) : (
          /* Default content when no sections are configured */
          <>
            {/* Hero Section */}
            <section className="bg-gradient-to-b from-gray-50 to-white py-16">
              <div className="container mx-auto px-4 text-center">
                <h1 className="text-4xl font-bold mb-4">Sobre Nosotros</h1>
                <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                  Expertos en impresión 3D desde 2018
                </p>
              </div>
            </section>

            {/* Story Section */}
            <section className="py-16 bg-white">
              <div className="container mx-auto px-4 max-w-4xl">
                <h2 className="text-3xl font-bold mb-6">Nuestra Historia</h2>
                <div className="prose prose-lg max-w-none">
                  <p className="text-muted-foreground mb-4">
                    Comenzamos como un pequeño taller de prototipado en Sint-Niklaas y hemos crecido hasta convertirnos en un referente en servicios de impresión 3D profesional en Bélgica.
                  </p>
                  <p className="text-muted-foreground mb-4">
                    Nuestra misión es hacer accesible la tecnología de impresión 3D a empresas y particulares, ofreciendo soluciones de calidad a precios competitivos.
                  </p>
                  <p className="text-muted-foreground">
                    Contamos con un equipo de profesionales altamente capacitados y maquinaria de última generación para garantizar los mejores resultados en cada proyecto.
                  </p>
                </div>
              </div>
            </section>

            {/* Values Section */}
            <section className="py-16 bg-gray-50">
              <div className="container mx-auto px-4">
                <h2 className="text-3xl font-bold text-center mb-12">Nuestros Valores</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
                  <div className="text-center p-6 bg-white rounded-lg shadow-sm">
                    <div className="flex justify-center mb-4">
                      <div className="p-3 bg-primary/10 rounded-full">
                        <Lightbulb className="w-8 h-8 text-primary" />
                      </div>
                    </div>
                    <h3 className="text-xl font-semibold mb-3">Innovación</h3>
                    <p className="text-muted-foreground">
                      Estamos siempre a la vanguardia de la tecnología, explorando nuevas técnicas y materiales
                    </p>
                  </div>
                  <div className="text-center p-6 bg-white rounded-lg shadow-sm">
                    <div className="flex justify-center mb-4">
                      <div className="p-3 bg-primary/10 rounded-full">
                        <Award className="w-8 h-8 text-primary" />
                      </div>
                    </div>
                    <h3 className="text-xl font-semibold mb-3">Calidad</h3>
                    <p className="text-muted-foreground">
                      Cada proyecto recibe nuestra máxima atención al detalle y control de calidad riguroso
                    </p>
                  </div>
                  <div className="text-center p-6 bg-white rounded-lg shadow-sm">
                    <div className="flex justify-center mb-4">
                      <div className="p-3 bg-primary/10 rounded-full">
                        <Heart className="w-8 h-8 text-primary" />
                      </div>
                    </div>
                    <h3 className="text-xl font-semibold mb-3">Compromiso</h3>
                    <p className="text-muted-foreground">
                      Tu satisfacción es nuestra prioridad. Trabajamos contigo hasta lograr el resultado perfecto
                    </p>
                  </div>
                </div>
              </div>
            </section>
          </>
        )}
      </div>
    </>
  );
}
