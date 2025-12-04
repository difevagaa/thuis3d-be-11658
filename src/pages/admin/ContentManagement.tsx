import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  LayoutGrid, 
  ImageIcon, 
  Link2, 
  Layers, 
  CreditCard, 
  Award,
  Home,
  Settings2
} from "lucide-react";
import HomepageBanners from "./content/HomepageBanners";
import FooterLinks from "./content/FooterLinks";
import HomepageSections from "./content/HomepageSections";
import HomepageQuickAccessCards from "./content/HomepageQuickAccessCards";
import HomepageFeatures from "./content/HomepageFeatures";

export default function ContentManagement() {
  const [activeTab, setActiveTab] = useState("sections");

  const tabItems = [
    {
      id: "sections",
      label: "Secciones",
      icon: LayoutGrid,
      description: "Gestiona las secciones de la página de inicio",
      badge: null
    },
    {
      id: "cards",
      label: "Tarjetas",
      icon: CreditCard,
      description: "Tarjetas de acceso rápido y características",
      badge: "2 tipos"
    },
    {
      id: "banners",
      label: "Banners",
      icon: ImageIcon,
      description: "Banners y sliders del hero",
      badge: null
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
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 gap-1 bg-transparent h-auto">
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
        
        {/* Sections Tab */}
        <TabsContent value="sections" className="space-y-4">
          <Card className="border-none shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Layers className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">Secciones de la Página</CardTitle>
              </div>
              <CardDescription>
                Configura títulos, subtítulos y orden de las secciones principales
              </CardDescription>
            </CardHeader>
            <CardContent>
              <HomepageSections />
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Cards Tab - Unified View for Quick Access and Features */}
        <TabsContent value="cards" className="space-y-6">
          {/* Sub-tabs for card types */}
          <Tabs defaultValue="quick-access" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="quick-access" className="flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Tarjetas de Acceso Rápido
              </TabsTrigger>
              <TabsTrigger value="features" className="flex items-center gap-2">
                <Award className="h-4 w-4" />
                ¿Por Qué Elegirnos?
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="quick-access">
              <Card className="border-none shadow-sm">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg">Tarjetas de Acceso Rápido</CardTitle>
                  </div>
                  <CardDescription>
                    Tarjetas con enlaces directos a las secciones más importantes (catálogo, presupuestos, etc.)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <HomepageQuickAccessCards />
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="features">
              <Card className="border-none shadow-sm">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <Award className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg">Características "¿Por Qué Elegirnos?"</CardTitle>
                  </div>
                  <CardDescription>
                    Destaca los beneficios y valores de tu negocio
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <HomepageFeatures />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </TabsContent>
        
        {/* Banners Tab */}
        <TabsContent value="banners" className="space-y-4">
          <Card className="border-none shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <ImageIcon className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">Banners Hero</CardTitle>
              </div>
              <CardDescription>
                Gestiona los banners y sliders de la sección principal
              </CardDescription>
            </CardHeader>
            <CardContent>
              <HomepageBanners />
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
