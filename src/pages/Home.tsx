import { useTranslation } from "react-i18next";
import { SectionRenderer, usePageSections } from "@/components/page-builder/SectionRenderer";
import { Button } from "@/components/ui/button";
import { Zap, Star, Users, DollarSign } from "lucide-react";
import { Link } from "react-router-dom";

const Home = () => {
  const { t } = useTranslation('home');
  
  // Load page builder sections for home page
  const { sections: pageBuilderSections, loading } = usePageSections('home');
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Render all content from Page Builder Sections */}
      {pageBuilderSections.length > 0 ? (
        <SectionRenderer sections={pageBuilderSections} />
      ) : (
        /* Default content when no sections are configured */
        <>
          {/* Hero Section */}
          <section className="bg-gradient-to-b from-gray-50 to-white py-20">
            <div className="container mx-auto px-4 text-center">
              <h1 className="text-5xl font-bold mb-6">Impresión 3D Profesional</h1>
              <p className="text-xl text-muted-foreground mb-4 max-w-2xl mx-auto">
                Transformamos tus ideas en realidad con tecnología de vanguardia
              </p>
              <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
                Servicio de impresión 3D de alta calidad para profesionales y entusiastas en Sint-Niklaas y toda Bélgica
              </p>
              <div className="flex gap-4 justify-center flex-wrap">
                <Button asChild size="lg">
                  <Link to="/productos">Ver Productos</Link>
                </Button>
                <Button asChild variant="outline" size="lg">
                  <Link to="/cotizaciones">Solicitar Cotización</Link>
                </Button>
              </div>
            </div>
          </section>

          {/* Features Section */}
          <section className="py-16 bg-white">
            <div className="container mx-auto px-4">
              <h2 className="text-3xl font-bold text-center mb-12">¿Por Qué Elegirnos?</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                <div className="text-center p-6">
                  <div className="flex justify-center mb-4">
                    <div className="p-3 bg-primary/10 rounded-full">
                      <Star className="w-8 h-8 text-primary" />
                    </div>
                  </div>
                  <h3 className="text-xl font-semibold mb-3">Calidad Premium</h3>
                  <p className="text-muted-foreground">
                    Utilizamos las mejores tecnologías de impresión 3D del mercado para garantizar resultados excepcionales
                  </p>
                </div>
                <div className="text-center p-6">
                  <div className="flex justify-center mb-4">
                    <div className="p-3 bg-primary/10 rounded-full">
                      <Zap className="w-8 h-8 text-primary" />
                    </div>
                  </div>
                  <h3 className="text-xl font-semibold mb-3">Entrega Rápida</h3>
                  <p className="text-muted-foreground">
                    Tiempos de producción optimizados sin comprometer la calidad de tus proyectos
                  </p>
                </div>
                <div className="text-center p-6">
                  <div className="flex justify-center mb-4">
                    <div className="p-3 bg-primary/10 rounded-full">
                      <Users className="w-8 h-8 text-primary" />
                    </div>
                  </div>
                  <h3 className="text-xl font-semibold mb-3">Asesoría Experta</h3>
                  <p className="text-muted-foreground">
                    Nuestro equipo te acompaña en cada etapa, desde el diseño hasta la entrega final
                  </p>
                </div>
                <div className="text-center p-6">
                  <div className="flex justify-center mb-4">
                    <div className="p-3 bg-primary/10 rounded-full">
                      <DollarSign className="w-8 h-8 text-primary" />
                    </div>
                  </div>
                  <h3 className="text-xl font-semibold mb-3">Precios Competitivos</h3>
                  <p className="text-muted-foreground">
                    Cotizaciones transparentes y justas con la mejor relación calidad-precio
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* CTA Section */}
          <section className="py-20 bg-primary text-primary-foreground">
            <div className="container mx-auto px-4 text-center">
              <h2 className="text-3xl font-bold mb-4">¿Listo para dar vida a tu proyecto?</h2>
              <p className="text-lg mb-8 opacity-90 max-w-2xl mx-auto">
                Solicita una cotización gratuita y descubre cómo podemos ayudarte a materializar tus ideas
              </p>
              <Button asChild size="lg" variant="secondary">
                <Link to="/cotizaciones">Solicitar Cotización</Link>
              </Button>
            </div>
          </section>
        </>
      )}
    </div>
  );
};
export default Home;