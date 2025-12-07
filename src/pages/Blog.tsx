import { useTranslation } from "react-i18next";
import { SectionRenderer, usePageSections } from "@/components/page-builder/SectionRenderer";
import { SEOHead } from "@/components/SEOHead";
import { Calendar, User, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Blog() {
  const { t } = useTranslation('blog');
  
  // Load page builder sections for blog page
  const { sections: pageBuilderSections, loading } = usePageSections('blog');
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Sample blog posts for fallback content
  const samplePosts = [
    {
      title: "¿Qué es la impresión 3D y cómo funciona?",
      excerpt: "Descubre cómo funciona la tecnología de impresión 3D y sus principales aplicaciones en la industria moderna.",
      date: "2024-12-01",
      author: "Equipo Thuis3D"
    },
    {
      title: "Materiales de Impresión 3D: Guía Completa",
      excerpt: "Guía completa sobre los materiales más utilizados en impresión 3D y sus aplicaciones específicas.",
      date: "2024-11-28",
      author: "Equipo Thuis3D"
    },
    {
      title: "Consejos para Diseñar Modelos Optimizados",
      excerpt: "Aprende a diseñar modelos 3D optimizados para obtener los mejores resultados de impresión.",
      date: "2024-11-25",
      author: "Equipo Thuis3D"
    }
  ];

  return (
    <>
      <SEOHead 
        title={t('title', { defaultValue: 'Blog' })}
        description={t('description', { defaultValue: 'Lee nuestros artículos y noticias' })}
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
                <h1 className="text-4xl font-bold mb-4">Blog y Noticias</h1>
                <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                  Mantente al día con las últimas tendencias en impresión 3D
                </p>
              </div>
            </div>

            <div className="container mx-auto px-4 py-16">
              <div className="max-w-4xl mx-auto">
                <div className="text-center mb-12">
                  <h2 className="text-2xl font-bold mb-4">Conocimiento y Experiencia Compartida</h2>
                  <p className="text-muted-foreground max-w-2xl mx-auto">
                    En nuestro blog compartimos consejos, tutoriales, casos de éxito y las últimas 
                    novedades del mundo de la impresión 3D. Nuestro objetivo es ayudarte a aprovechar 
                    al máximo esta tecnología revolucionaria.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {samplePosts.map((post, index) => (
                    <article key={index} className="bg-white border rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
                      <div className="p-6">
                        <h3 className="text-lg font-semibold mb-3 line-clamp-2">
                          {post.title}
                        </h3>
                        <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
                          {post.excerpt}
                        </p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground mb-4">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            <span>{new Date(post.date).toLocaleDateString('es-ES')}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            <span>{post.author}</span>
                          </div>
                        </div>
                        <Button variant="link" className="p-0 h-auto text-primary">
                          Leer más <ArrowRight className="w-4 h-4 ml-1" />
                        </Button>
                      </div>
                    </article>
                  ))}
                </div>

                <div className="mt-12 text-center bg-gray-50 p-8 rounded-lg">
                  <h3 className="text-xl font-semibold mb-3">Próximamente más contenido</h3>
                  <p className="text-muted-foreground">
                    Estamos trabajando en nuevos artículos y tutoriales. 
                    Vuelve pronto para descubrir más sobre el fascinante mundo de la impresión 3D.
                  </p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
