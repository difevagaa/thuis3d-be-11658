import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  Link2, 
  Settings2,
  Home,
  ArrowRight,
  Info,
  Layout
} from "lucide-react";
import FooterLinks from "./content/FooterLinks";

export default function ContentManagement() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("info");

  const tabItems = [
    {
      id: "info",
      label: "Información",
      icon: Info,
      description: "Información sobre la gestión de contenido"
    },
    {
      id: "footer",
      label: "Footer",
      icon: Link2,
      description: "Enlaces del pie de página",
      badge: null
    }
  ];

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Settings2 className="h-8 w-8 text-primary" />
            <h1 className="text-2xl md:text-3xl font-bold">Gestión de Contenido</h1>
          </div>
          <p className="text-muted-foreground">
            Personaliza el contenido de tu sitio web de forma sencilla
          </p>
        </div>
        <Badge variant="outline" className="w-fit flex items-center gap-2">
          <Home className="h-4 w-4" />
          Página Principal
        </Badge>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        {/* Modern Tab Navigation */}
        <div className="border rounded-lg p-1 bg-muted/30 mb-6">
          <TabsList className="grid w-full grid-cols-2 gap-1 bg-transparent h-auto">
            {tabItems.map((tab) => {
              const Icon = tab.icon;
              return (
                <TabsTrigger
                  key={tab.id}
                  value={tab.id}
                  className="flex flex-col md:flex-row items-center gap-2 py-3 px-4 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-md"
                >
                  <Icon className="h-5 w-5" />
                  <span className="text-sm font-medium">{tab.label}</span>
                  {tab.badge && (
                    <Badge variant="secondary" className="ml-1 text-xs hidden md:inline-flex">
                      {tab.badge}
                    </Badge>
                  )}
                </TabsTrigger>
              );
            })}
          </TabsList>
        </div>
        
        {/* Information Tab */}
        <TabsContent value="info" className="space-y-4">
          <Alert>
            <Layout className="h-4 w-4" />
            <AlertTitle>Editor de Páginas Unificado</AlertTitle>
            <AlertDescription className="space-y-3 mt-2">
              <p>
                Las secciones, banners y tarjetas de la página de inicio ahora se gestionan desde el <strong>Editor de Páginas</strong> unificado.
              </p>
              <p className="text-sm text-muted-foreground">
                El nuevo editor permite gestionar TODO el contenido de TODAS las páginas del sitio desde un solo lugar, 
                con más de 116 opciones de personalización por sección.
              </p>
              <Button 
                onClick={() => navigate('/admin/page-builder?page=home')}
                className="mt-2"
              >
                <Layout className="h-4 w-4 mr-2" />
                Ir al Editor de Páginas
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </AlertDescription>
          </Alert>

          <Card>
            <CardHeader>
              <CardTitle>¿Qué puedo editar en el Editor de Páginas?</CardTitle>
              <CardDescription>
                El Editor de Páginas te permite gestionar contenido de todas las páginas
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <h4 className="font-semibold flex items-center gap-2">
                    <Home className="h-4 w-4 text-primary" />
                    Páginas Principales
                  </h4>
                  <ul className="text-sm space-y-1 text-muted-foreground ml-6">
                    <li>• Inicio (Home)</li>
                    <li>• Productos</li>
                    <li>• Cotizaciones</li>
                    <li>• Tarjetas Regalo</li>
                    <li>• Blog</li>
                    <li>• Galería</li>
                    <li>• Mi Cuenta</li>
                  </ul>
                </div>
                
                <div className="space-y-2">
                  <h4 className="font-semibold flex items-center gap-2">
                    <Link2 className="h-4 w-4 text-primary" />
                    Páginas Legales
                  </h4>
                  <ul className="text-sm space-y-1 text-muted-foreground ml-6">
                    <li>• Política de Privacidad</li>
                    <li>• Términos y Condiciones</li>
                    <li>• Política de Cookies</li>
                    <li>• Aviso Legal</li>
                    <li>• Política de Envíos</li>
                    <li>• Política de Devoluciones</li>
                    <li>• Sobre Nosotros</li>
                    <li>• Contacto</li>
                    <li>• Preguntas Frecuentes</li>
                  </ul>
                </div>
              </div>

              <div className="pt-4 border-t">
                <h4 className="font-semibold mb-2">Tipos de Secciones Disponibles</h4>
                <div className="flex flex-wrap gap-2">
                  {[
                    'Hero', 'Banners', 'Texto', 'Imágenes', 'Galería', 
                    'Carrusel de Productos', 'Carrusel de Imágenes', 'Características',
                    'Testimonios', 'Precios', 'Formularios', 'CTA', 'Acordeón',
                    'Contador', 'Estadísticas', 'Video', 'Redes Sociales', 'Espaciador'
                  ].map((section) => (
                    <Badge key={section} variant="secondary">{section}</Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Footer Tab */}
        <TabsContent value="footer" className="space-y-4">
          <Card className="border-none shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Link2 className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">Enlaces del Footer</CardTitle>
              </div>
              <CardDescription>
                Configura los enlaces del pie de página organizados por secciones
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FooterLinks />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
