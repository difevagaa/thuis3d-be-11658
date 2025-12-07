import { SectionRenderer, usePageSections } from "@/components/page-builder/SectionRenderer";
import { SEOHead } from "@/components/SEOHead";
import { Mail, Phone, MapPin, Clock } from "lucide-react";

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
        {pageBuilderSections.length > 0 ? (
          <SectionRenderer sections={pageBuilderSections} />
        ) : (
          /* Default content when no sections are configured */
          <>
            <div className="bg-gradient-to-b from-gray-50 to-white py-16">
              <div className="container mx-auto px-4 text-center">
                <h1 className="text-4xl font-bold mb-4">Contáctanos</h1>
                <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                  Estamos aquí para ayudarte con tu proyecto de impresión 3D
                </p>
              </div>
            </div>

            <div className="container mx-auto px-4 py-16 max-w-6xl">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                {/* Contact Information */}
                <div>
                  <h2 className="text-2xl font-bold mb-8">Información de Contacto</h2>
                  <div className="space-y-6">
                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-primary/10 rounded-full flex-shrink-0">
                        <Mail className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold mb-1">Email</h3>
                        <p className="text-muted-foreground">info@thuis3d.be</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Respondemos en menos de 24 horas
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-primary/10 rounded-full flex-shrink-0">
                        <Phone className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold mb-1">Teléfono</h3>
                        <p className="text-muted-foreground">+32 3 XXX XX XX</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Lun - Vie: 9:00 - 18:00
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-primary/10 rounded-full flex-shrink-0">
                        <MapPin className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold mb-1">Ubicación</h3>
                        <p className="text-muted-foreground">Sint-Niklaas, Bélgica</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Servicio en toda Bélgica y Europa
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-primary/10 rounded-full flex-shrink-0">
                        <Clock className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold mb-1">Horario de Atención</h3>
                        <p className="text-muted-foreground">
                          Lunes a Viernes: 9:00 - 18:00
                        </p>
                        <p className="text-muted-foreground">
                          Sábados: 10:00 - 14:00
                        </p>
                        <p className="text-muted-foreground">
                          Domingos: Cerrado
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Additional Info */}
                <div className="bg-gray-50 p-8 rounded-lg">
                  <h2 className="text-2xl font-bold mb-4">¿Cómo podemos ayudarte?</h2>
                  <div className="space-y-4">
                    <p className="text-muted-foreground">
                      Nuestro equipo está disponible para responder a tus consultas sobre:
                    </p>
                    <ul className="space-y-3">
                      <li className="flex items-start gap-2">
                        <span className="text-primary mt-1">✓</span>
                        <span className="text-muted-foreground">Presupuestos y cotizaciones personalizadas</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-primary mt-1">✓</span>
                        <span className="text-muted-foreground">Asesoría sobre materiales y tecnologías</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-primary mt-1">✓</span>
                        <span className="text-muted-foreground">Optimización de diseños para impresión 3D</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-primary mt-1">✓</span>
                        <span className="text-muted-foreground">Seguimiento de pedidos en curso</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-primary mt-1">✓</span>
                        <span className="text-muted-foreground">Consultas técnicas y soporte post-venta</span>
                      </li>
                    </ul>
                    <div className="pt-4 border-t mt-6">
                      <p className="font-semibold mb-2">¿Tienes un proyecto en mente?</p>
                      <p className="text-sm text-muted-foreground">
                        Envíanos tu archivo 3D y te responderemos con un presupuesto detallado en menos de 24 horas.
                      </p>
                    </div>
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
